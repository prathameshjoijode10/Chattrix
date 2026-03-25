import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Channel, ChannelHeader, Chat, MessageList, Window, Thread } from "stream-chat-react";
import { useNavigate, useParams } from "react-router";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import MessageInput from "../components/MessageInput";
import CallButton from "../components/CallButton";
import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken } from "../lib/api";
import CollaborativeTab from "../components/CollaborativeTab";
import CustomMessage from "../components/CustomMessage";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const GroupChatPage = () => {
  const { id: groupIdParam } = useParams();
  const groupId = decodeURIComponent(groupIdParam || "");
  const navigate = useNavigate();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("chat");

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initGroup = async () => {
      if (!tokenData?.token || !authUser || !groupId) return;

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

        const currChannel = client.channel("messaging", groupId);

        try {
          await currChannel.watch();
        } catch (e) {
          // Try joining if membership is required
          try {
            await currChannel.addMembers([authUser._id]);
            await currChannel.watch();
          } catch (inner) {
            throw inner;
          }
        }

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing group chat:", error);
        toast.error("Could not open group chat");
      } finally {
        setLoading(false);
      }
    };

    initGroup();
  }, [tokenData, authUser, groupId]);

  const handleVideoCall = async () => {
    if (!channel) return;

    const callUrl = `${window.location.origin}/call/${encodeURIComponent(channel.id)}`;
    try {
      await channel.sendMessage({
        text: `I have started a video call. Join me here ${callUrl}`,
      });
      toast.success("Video call started");
    } catch (error) {
      console.error("Error sending call link message", error);
      toast.error("Could not send call link");
    }

    navigate(`/call/${encodeURIComponent(channel.id)}`);
  };

  if (loading || !chatClient || !channel) return <ChatLoader />;

  return (
    <div className="h-full min-h-0">
      <Chat client={chatClient}>
        <Channel channel={channel} Message={CustomMessage}>
          <div className="w-full relative">
            <Window>
              <div className="h-full min-h-0 flex flex-col">
                <div className="px-3 py-2 border-b border-base-300 flex items-center justify-end">
                  <CallButton handleVideoCall={handleVideoCall} />
                </div>

                <ChannelHeader />

                <div className="px-3 pt-2">
                  <div className="tabs tabs-boxed">
                    <button
                      type="button"
                      className={`tab ${activeTab === "chat" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("chat")}
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      className={`tab ${activeTab === "collab" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("collab")}
                    >
                      Whiteboard
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  {activeTab === "chat" ? (
                    <div className="h-full flex flex-col min-h-0">
                      <div className="flex-1 min-h-0">
                        <MessageList messageActions={["react", "reply", "edit", "delete"]} />
                      </div>
                      <MessageInput focus />
                    </div>
                  ) : (
                    <CollaborativeTab className="h-full" roomId={channel.cid} userId={authUser?._id} />
                  )}
                </div>
              </div>
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};

export default GroupChatPage;
