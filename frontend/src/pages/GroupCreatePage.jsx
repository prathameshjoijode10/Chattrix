import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import { Trash2Icon, UserPlus2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken, getUserFriends } from "../lib/api";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const GroupCreatePage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const { t } = useTranslation();

  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isCreating, setIsCreating] = useState(false);

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [activeManageCid, setActiveManageCid] = useState(null);
  const [activeManageMemberIds, setActiveManageMemberIds] = useState(() => new Set());
  const [selectedAddIds, setSelectedAddIds] = useState(() => new Set());
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser,
  });

  useEffect(() => {
    const loadGroups = async () => {
      if (!authUser || !tokenData?.token) return;

      setLoadingGroups(true);
      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);
        if (client.userID !== authUser._id) {
          if (client.userID) await client.disconnectUser();
          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullname,
              image: authUser.profilepic,
            },
            tokenData.token
          );
        }

        const filters = {
          type: "messaging",
          members: { $in: [authUser._id] },
          isGroup: true,
        };
        const sort = [{ last_message_at: -1 }];
        const channels = await client.queryChannels(filters, sort, { limit: 30 });
        setGroups(channels);
      } catch (error) {
        console.error("Error loading groups", error);
        setGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, [authUser, tokenData]);

  const closeManageMembers = () => {
    setActiveManageCid(null);
    setActiveManageMemberIds(new Set());
    setSelectedAddIds(new Set());
  };

  const toggleAddMember = (friendId) => {
    setSelectedAddIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const openManageMembers = async (ch) => {
    if (!ch) return;
    if (!authUser || !tokenData?.token) return;

    if (activeManageCid === ch.cid) {
      closeManageMembers();
      return;
    }

    try {
      // Ensure we have membership state loaded so we can filter friends properly.
      await ch.watch();
      const memberIds = new Set(Object.keys(ch.state?.members || {}));
      setActiveManageCid(ch.cid);
      setActiveManageMemberIds(memberIds);
      setSelectedAddIds(new Set());
    } catch (error) {
      console.error("Error loading group members", error);
      toast.error("Could not load group members");
    }
  };

  const handleAddMembersToActive = async () => {
    if (!activeManageCid) return;
    const ch = groups.find((g) => g.cid === activeManageCid);
    if (!ch) return;

    const ids = Array.from(selectedAddIds);
    if (ids.length === 0) return;

    setIsUpdatingMembers(true);
    try {
      await ch.addMembers(ids);
      toast.success("Members added");
      // Refresh member set locally
      await ch.watch();
      setActiveManageMemberIds(new Set(Object.keys(ch.state?.members || {})));
      setSelectedAddIds(new Set());
      closeManageMembers();
    } catch (error) {
      console.error("Error adding members", error);
      toast.error("Could not add members");
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleDeleteGroup = async (ch) => {
    if (!ch) return;
    if (!window.confirm("Delete this group permanently?")) return;

    try {
      await ch.delete();
      toast.success("Group deleted");
      setGroups((prev) => prev.filter((g) => g.cid !== ch.cid));
    } catch (error) {
      console.error("Error deleting group", error);
      toast.error("Could not delete group");
    }
  };

  const addableFriends = friends.filter((f) => !activeManageMemberIds.has(f._id));

  const canCreate = useMemo(() => {
    return Boolean(groupName.trim()) && selectedIds.size > 0 && Boolean(tokenData?.token);
  }, [groupName, selectedIds.size, tokenData?.token]);

  const toggleFriend = (friendId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!authUser) return;
    if (!tokenData?.token) {
      toast.error("Missing chat token");
      return;
    }

    const name = groupName.trim();
    if (!name) {
      toast.error("Enter a group name");
      return;
    }

    if (selectedIds.size === 0) {
      toast.error("Select at least one friend");
      return;
    }

    setIsCreating(true);
    try {
      const client = StreamChat.getInstance(STREAM_API_KEY);
      if (client.userID !== authUser._id) {
        if (client.userID) await client.disconnectUser();
        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullname,
            image: authUser.profilepic,
          },
          tokenData.token
        );
      }

      const memberIds = [authUser._id, ...Array.from(selectedIds)];
      const channelId = `group-${authUser._id}-${Date.now()}`;

      const channel = client.channel("messaging", channelId, {
        name,
        members: memberIds,
        isGroup: true,
      });

      await channel.create();

      toast.success("Group chat created");
      // Optimistically add to list
      setGroups((prev) => [channel, ...prev]);
      navigate(`/groups/${encodeURIComponent(channel.id)}`);
    } catch (error) {
      console.error("Error creating group channel", error);
      toast.error("Could not create group chat");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("groups.title")}</h1>

        <div className="card bg-base-200">
          <div className="card-body space-y-3">
            <h2 className="text-lg font-semibold">{t("groups.yourGroups")}</h2>

            {loadingGroups ? (
              <div className="py-2">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm opacity-70">{t("groups.noGroups")}</p>
            ) : (
              <div className="space-y-2">
                {groups.map((ch) => (
                  <div key={ch.cid} className="rounded-lg bg-base-100">
                    <div className="flex items-center gap-2 p-2">
                      <Link
                        to={`/groups/${encodeURIComponent(ch.id)}`}
                        className="btn btn-ghost justify-start flex-1 min-w-0 normal-case"
                      >
                        <span className="truncate">{ch.data?.name || ch.id}</span>
                      </Link>

                      <button
                        type="button"
                        className={`btn btn-primary btn-sm ${activeManageCid === ch.cid ? "btn-active" : ""}`}
                        onClick={() => openManageMembers(ch)}
                        aria-label={t("groups.addMembers")}
                      >
                        <UserPlus2Icon className="size-5" />
                      </button>

                      {(ch.data?.created_by?.id === authUser?._id || ch.data?.created_by_id === authUser?._id) && (
                        <button
                          type="button"
                          className="btn btn-error btn-sm text-white"
                          onClick={() => handleDeleteGroup(ch)}
                          aria-label={t("groups.delete")}
                        >
                          <Trash2Icon className="size-5" />
                        </button>
                      )}
                    </div>

                    {activeManageCid === ch.cid && (
                      <div className="border-t border-base-300 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold">{t("groups.addMembers")}</h3>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={closeManageMembers}>
                            {t("groups.close")}
                          </button>
                        </div>

                        {addableFriends.length === 0 ? (
                          <p className="text-sm opacity-70">{t("groups.allFriendsInGroup")}</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {addableFriends.map((friend) => {
                              const checked = selectedAddIds.has(friend._id);
                              return (
                                <label
                                  key={friend._id}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-base-200 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={checked}
                                    onChange={() => toggleAddMember(friend._id)}
                                  />
                                  <div className="avatar">
                                    <div className="w-9 rounded-full">
                                      <img
                                        src={friend.profilepic}
                                        alt={friend.fullname}
                                        loading="lazy"
                                        decoding="async"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold truncate">{friend.fullname}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <button className="btn btn-ghost" type="button" onClick={closeManageMembers}>
                            {t("groups.cancel")}
                          </button>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={handleAddMembersToActive}
                            disabled={selectedAddIds.size === 0 || isUpdatingMembers}
                          >
                            {isUpdatingMembers ? t("groups.adding") : t("groups.addSelected")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleCreate} className="card bg-base-200">
          <div className="card-body space-y-4">
            <h2 className="text-lg font-semibold">{t("groups.createNew")}</h2>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("groups.groupName")}</span>
              </label>
              <input
                className="input input-bordered w-full"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Study Buddies"
              />
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">{t("groups.pickFriends")}</p>

              {loadingFriends ? (
                <div className="py-4">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : friends.length === 0 ? (
                <p className="text-sm opacity-70">{t("groups.noFriendsFound")}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {friends.map((friend) => {
                    const checked = selectedIds.has(friend._id);
                    return (
                      <label
                        key={friend._id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-base-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={checked}
                          onChange={() => toggleFriend(friend._id)}
                        />
                        <div className="avatar">
                          <div className="w-9 rounded-full">
                            <img
                              src={friend.profilepic}
                              alt={friend.fullname}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{friend.fullname}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={!canCreate || isCreating}>
              {isCreating ? t("groups.creating") : t("groups.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupCreatePage;
