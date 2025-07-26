import React, { useEffect, useState } from 'react'
import useAuthUser from "../hooks/useAuthUser"
import { useQuery } from '@tanstack/react-query';
import {Channel, ChannelHeader,Chat,MessageInput,MessageList,Window, Thread} from "stream-chat-react"
import {useParams} from "react-router"
import {StreamChat} from "stream-chat"
import toast from "react-hot-toast"
import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton"
import { getStreamToken } from '../lib/api';

const STREAM_API_KEY=import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {

  const {id:targetUserId}=useParams();

  const [chatClient,setChatClient]=useState(null);
  const [channel,setChannel]=useState(null)
  const [loading,setLoading]=useState(true);

  const {authUser}=useAuthUser();

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
        await client.connectUser(
          {
            id:authUser._id,
            name:authUser.fullname,
            image:authUser.profilepic,
          },
          tokenData.token
        );

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

  const handleVideoCall=()=>{
    if(channel){
      const callUrl= `${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text:`I have started a video call. Join me here ${callUrl}`,
      })

      toast.success("Video call link sent successfully!");
    }
  }

  if(loading || !chatClient || !channel) return <ChatLoader/>;

  return (
    <div className='h-[93vh]'>
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className='w-full relative'>
            <CallButton handleVideoCall={handleVideoCall}/>
            <Window>
              <ChannelHeader/>
              <MessageList/>
              <MessageInput focus/>
            </Window>
          </div>
          <Thread/>
        </Channel>
      </Chat>
      
    </div>
  )
}

export default ChatPage
