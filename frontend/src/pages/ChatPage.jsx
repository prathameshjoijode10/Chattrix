import React, { useEffect, useState } from 'react'
import useAuthUser from "../hooks/useAuthUser"
import { useQuery } from '@tanstack/react-query';
import {Channel, ChannelHeader,Chat,MessageList,Window, Thread} from "stream-chat-react"
import {useNavigate, useParams} from "react-router"
import {StreamChat} from "stream-chat"
import toast from "react-hot-toast"
import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton"
import { getStreamToken } from '../lib/api';
import MessageInput from "../components/MessageInput";
import CollaborativeTab from "../components/CollaborativeTab";
import CustomMessage from "../components/CustomMessage";
import { HomeIcon } from "lucide-react";

const STREAM_API_KEY=import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {

  const {id:targetUserId}=useParams();
  const navigate = useNavigate();

  const [chatClient,setChatClient]=useState(null);
  const [channel,setChannel]=useState(null)
  const [loading,setLoading]=useState(true);

  const {authUser}=useAuthUser();

  const [activeTab, setActiveTab] = useState("chat");

  const {data:tokenData}=useQuery({
    queryKey:["streamToken"],
    queryFn:getStreamToken,
    enabled:!!authUser,
  })

  useEffect(()=>{
    const initChat=async()=>{
      if(!tokenData?.token || !authUser) return;

      try {
        console.log("Initializing stream chat client...");
        const client=StreamChat.getInstance(STREAM_API_KEY);
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

        const channelId=[authUser._id,targetUserId].sort().join("-");

        const currChannel=client.channel("messaging",channelId,{
          members:[authUser._id,targetUserId],
        })

        await currChannel.watch();

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat: ",error);
        toast.error("Could not connect to chat. Please try again")
      }finally{
        setLoading(false);
      }
    };
    initChat();
  },[tokenData,authUser,targetUserId])

  const buildCallUrl = (mode) => {
    const basePath = `/call/${encodeURIComponent(channel.id)}`;
    return `${window.location.origin}${basePath}?mode=${mode}`;
  }

  const handleVideoCall=async()=>{
    if(!channel) return;

    const callUrl= buildCallUrl("video");

    try {
      await channel.sendMessage({
        text:`I have started a video call. Join me here ${callUrl}`,
      });
      toast.success("Video call started");
    } catch (error) {
      console.error("Error sending call link message", error);
      toast.error("Could not send call link");
    }

    navigate(`/call/${encodeURIComponent(channel.id)}?mode=video`);
  }

  const handleAudioCall = async () => {
    if (!channel) return;

    const callUrl = buildCallUrl("audio");

    try {
      await channel.sendMessage({
        text: `I have started an audio call. Join me here ${callUrl}`,
      });
      toast.success("Audio call started");
    } catch (error) {
      console.error("Error sending audio call link message", error);
      toast.error("Could not send audio call link");
    }

    navigate(`/call/${encodeURIComponent(channel.id)}?mode=audio`);
  }

  if(loading || !chatClient || !channel) return <ChatLoader/>;

  return (
    <div className='h-full min-h-0'>
      <Chat client={chatClient}>
        <Channel channel={channel} Message={CustomMessage}>
          <div className='w-full relative'>
            <Window>
              <div className="h-full min-h-0 flex flex-col">
                <div className="px-3 py-2 border-b border-base-300 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate("/")}
                    aria-label="Return to home screen"
                    title="Home"
                  >
                    <HomeIcon className="size-5" />
                    <span className="hidden sm:inline">Home</span>
                  </button>
                  <CallButton handleVideoCall={handleVideoCall} handleAudioCall={handleAudioCall} />
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
                        <MessageInput focus enableImageCaptioning={false} />
                    </div>
                  ) : (
                    <CollaborativeTab className="h-full" roomId={channel.cid} userId={authUser?._id} />
                  )}
                </div>
              </div>
            </Window>
          </div>
          <Thread/>
        </Channel>
      </Chat>
      
    </div>
  )
}

export default ChatPage
