import React, { useEffect, useMemo, useState } from 'react'
import {useParams,useNavigate} from "react-router"
import useAuthUser from "../hooks/useAuthUser"
import { useQuery } from '@tanstack/react-query';
import { getStreamToken } from '../lib/api';
import { StreamChat } from "stream-chat";
import { Chat, Channel, MessageList, Thread, Window } from "stream-chat-react";
import MessageInput from "../components/MessageInput";
import CustomMessage from "../components/CustomMessage";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader"


const STREAM_API_KEY=import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const {id:callId}=useParams();
  const [client,setClient]=useState(null);
  const [call,setCall]=useState(null);
  const [isConnecting,setIsConnecting]=useState(true);

  const [chatClient, setChatClient] = useState(null);
  const [chatChannel, setChatChannel] = useState(null);

  const {authUser,isLoading}=useAuthUser();

  const decodedCallId = useMemo(() => decodeURIComponent(callId || ""), [callId]);

  const {data:tokenData}=useQuery({
    queryKey:["streamToken"],
    queryFn:getStreamToken,
    enabled:!!authUser
  });

  useEffect(()=>{
    let cancelled = false;
    let videoClient = null;
    let callInstance = null;
    let streamChatClient = null;
    let channelInstance = null;

    const cleanup = async () => {
      try {
        if (channelInstance) await channelInstance.stopWatching();
      } catch {
        // ignore
      }
      try {
        if (streamChatClient?.userID) await streamChatClient.disconnectUser();
      } catch {
        // ignore
      }
      try {
        if (callInstance) await callInstance.leave();
      } catch {
        // ignore
      }
      try {
        if (videoClient) await videoClient.disconnectUser();
      } catch {
        // ignore
      }
    };

    const initCall=async()=>{
      if(!tokenData?.token || !authUser || !decodedCallId) return;

      try {
        console.log("Initializing Stream video client...");

        const user={
          id:authUser._id,
          name:authUser.fullname,
          image:authUser.profilepic,
        };

        videoClient=new StreamVideoClient({
          apiKey:STREAM_API_KEY,
          user,
          token:tokenData.token,
        });

        callInstance=videoClient.call("default",decodedCallId);

        await callInstance.join({create:true})
        console.log("Joined call successfully");

        // In-call chat (same channel id as the call id)
        streamChatClient = StreamChat.getInstance(STREAM_API_KEY);
        if (streamChatClient.userID !== authUser._id) {
          if (streamChatClient.userID) await streamChatClient.disconnectUser();
          await streamChatClient.connectUser(
            {
              id: authUser._id,
              name: authUser.fullname,
              image: authUser.profilepic,
            },
            tokenData.token
          );
        }

        channelInstance = streamChatClient.channel("messaging", decodedCallId);
        await channelInstance.watch();

        if (cancelled) {
          await cleanup();
          return;
        }

        setClient(videoClient);
        setCall(callInstance);
        setChatClient(streamChatClient);
        setChatChannel(channelInstance);
      } catch (error) {
        console.error("Error joining call",error);
        toast.error("Could not join call. Please try again");
      }finally{
        if (!cancelled) setIsConnecting(false);
      }
    };
    initCall();

    return () => {
      cancelled = true;
      cleanup();
    };
  },[tokenData?.token,authUser,decodedCallId]);

  if(isLoading || isConnecting) return <PageLoader/>
    return (
    <div className='h-full min-h-0 w-full p-3'>
      {client && call ? (
        <div className='h-full min-h-0 w-full flex flex-col lg:flex-row gap-3'>
          <div className='flex-1 min-h-0 rounded-lg overflow-hidden bg-base-200'>
            <StreamVideo client={client}>
              <StreamCall call={call}>
                <CallContent />
              </StreamCall>
            </StreamVideo>
          </div>

          <div className='w-full lg:w-[420px] h-[40vh] lg:h-full min-h-0 rounded-lg overflow-hidden bg-base-200 border border-base-300'>
            {chatClient && chatChannel ? (
              <Chat client={chatClient}>
                <Channel channel={chatChannel} Message={CustomMessage}>
                  <Window>
                    <div className='h-full min-h-0 flex flex-col'>
                      <div className='px-3 py-2 border-b border-base-300 font-semibold'>Chat</div>
                      <div className='flex-1 min-h-0'>
                        <MessageList messageActions={["react", "reply", "edit", "delete"]} />
                      </div>
                      <MessageInput focus />
                    </div>
                  </Window>
                  <Thread />
                </Channel>
              </Chat>
            ) : (
              <div className='h-full flex items-center justify-center'>
                <p className='opacity-70'>Loading chat…</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='flex items-center justify-center h-full'>
          <p>Could not initialize call. Please refresh or try again later.</p>
        </div>
      )}
    </div>
  )
}

const CallContent=()=>{
  const {useCallCallingState}=useCallStateHooks();
  const callingState=useCallCallingState();

  const navigate=useNavigate();

  useEffect(() => {
    if (callingState === CallingState.LEFT) navigate("/");
  }, [callingState, navigate]);

  return(
    <StreamTheme>
      <SpeakerLayout/>
      <CallControls/>
    </StreamTheme>
  )
}

export default CallPage
