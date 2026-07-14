import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import { EyeIcon, Trash2Icon, UserMinus2Icon, UserPlus2Icon, UsersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import useAuthUser from "../hooks/useAuthUser";
import { addGroupMembers, getStreamToken, getUserFriends, removeGroupMember } from "../lib/api";

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
  const [activeManageMembers, setActiveManageMembers] = useState([]);
  const [activeViewCid, setActiveViewCid] = useState(null);
  const [activeViewMembers, setActiveViewMembers] = useState([]);
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
    setActiveManageMembers([]);
    setSelectedAddIds(new Set());
  };

  const closeViewMembers = () => {
    setActiveViewCid(null);
    setActiveViewMembers([]);
  };

  const loadMembers = async (ch) => {
  if (!ch) return [];

  try {
    await ch.watch();

    const response = await ch.queryMembers(
      {},
      { created_at: 1 },
      { limit: 100 }
    );

    const members = Array.isArray(response?.members)
      ? response.members
      : [];

    console.table(
      members.map((m) => ({
        id: m.user?.id,
        name: m.user?.name,
        role: m.role,
        created_at: m.created_at,
      }))
    );

    const uniqueMembers = Array.from(
      new Map(
        members.map((member) => [
          member.user?.id || member.user_id || member.id,
          member,
        ])
      ).values()
    );

    return uniqueMembers;
  } catch (error) {
    console.error(error);
    return [];
  }
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

    closeViewMembers();

    try {
      setActiveManageCid(ch.cid);
      const members = await loadMembers(ch);
      setActiveManageMembers(members);
      setSelectedAddIds(new Set());
    } catch (error) {
      console.error("Error loading group members", error);
      toast.error("Could not load group members");
    }
  };

  const openViewMembers = async (ch) => {
    if (!ch) return;
    if (!authUser || !tokenData?.token) return;

    if (activeViewCid === ch.cid) {
      closeViewMembers();
      return;
    }

    closeManageMembers();

    try {
      setActiveViewCid(ch.cid);
      const members = await loadMembers(ch);
      setActiveViewMembers(members);
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
      await addGroupMembers(ch.id, ids);

await ch.watch();

const members = await loadMembers(ch);

setActiveManageMembers(members);
setActiveViewMembers(members);

setSelectedAddIds(new Set());

toast.success("Members added");
    } catch (error) {
      console.error("Error adding members", error);
      toast.error("Could not add members");
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleRemoveMember = async (ch, memberId) => {
    if (!ch || !memberId) return;
    if (!window.confirm("Remove this person from the group?")) return;

    setIsUpdatingMembers(true);
    try {
      await removeGroupMember(ch.id, memberId);

await ch.watch();

const members = await loadMembers(ch);

setActiveManageMembers(members);
setActiveViewMembers(members);

toast.success("Member removed");
    } catch (error) {
      console.error("Error removing member", error);
      toast.error("Could not remove member");
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

  const activeManageMemberIds = useMemo(
    () => new Set(activeManageMembers.map((member) => member?.user?.id || member?.user_id || member?.id).filter(Boolean)),
    [activeManageMembers]
  );

  const addableFriends = friends.filter((f) => !activeManageMemberIds.has(f._id));

  const getMemberUserId = (member) => member?.user?.id || member?.user_id || member?.id;
  const getMemberName = (member) => member?.user?.name || member?.user?.fullname || member?.name || "Unknown";
  const getMemberImage = (member) => member?.user?.image || member?.image || member?.profilepic || null;

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

                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm ${activeViewCid === ch.cid ? "btn-active" : ""}`}
                        onClick={() => openViewMembers(ch)}
                        aria-label="View members"
                      >
                        <EyeIcon className="size-5" />
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
                          <h3 className="font-semibold flex items-center gap-2">
                            <UsersIcon className="size-4" />
                            {t("groups.addMembers")}
                          </h3>
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

                    {activeViewCid === ch.cid && (
                      <div className="modal modal-open">
                        <div className="modal-box max-w-2xl">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <UsersIcon className="size-5" />
                              Existing members
                            </h3>
                            <button className="btn btn-ghost btn-sm" type="button" onClick={closeViewMembers}>
                              Close
                            </button>
                          </div>

                          {activeViewMembers.length === 0 ? (
                            <p className="text-sm opacity-70">No members loaded yet.</p>
                          ) : (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                              {activeViewMembers.map((member) => {
                                const memberId = getMemberUserId(member);
                                const isCurrentUser = memberId === authUser?._id;
                                const memberName = getMemberName(member);
                                const memberImage = getMemberImage(member);
                                return (
                                  <div key={memberId} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-base-200">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="avatar">
                                        <div className="w-9 rounded-full">
                                          <img
                                            src={memberImage || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(memberId || memberName)}&size=64`}
                                            alt={memberName}
                                            loading="lazy"
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                          />
                                        </div>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate">{memberName}</p>
                                        <p className="text-xs opacity-60 truncate">{memberId}</p>
                                      </div>
                                    </div>

                                    {memberId && (
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${isCurrentUser ? "btn-outline" : "btn-error text-white"}`}
                                        onClick={() => handleRemoveMember(ch, memberId)}
                                        disabled={isUpdatingMembers}
                                        title={isCurrentUser ? "Leave group" : "Remove member"}
                                      >
                                        <UserMinus2Icon className="size-4" />
                                        <span className="hidden sm:inline">{isCurrentUser ? "Leave" : "Remove"}</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

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
