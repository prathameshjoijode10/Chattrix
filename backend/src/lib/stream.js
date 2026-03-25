import {StreamChat} from "stream-chat"
import "dotenv/config"

const apikey=process.env.STREAM_API_KEY
const apisecret=process.env.STREAM_API_SECRET

if(!apikey || !apisecret){
    console.error("Stream Api key or secret is missing");
}

const streamClient=StreamChat.getInstance(apikey,apisecret)
export { streamClient };

const BOT_USER = {
    id: "groq-bot",
    name: "Bot",
};

async function ensureBotUser() {
    try {
        await streamClient.upsertUsers([BOT_USER]);
    } catch (error) {
        console.error("ERROR upserting bot user", error?.message || error);
    }
}

export const upsertStreamUser=async function(userData){
    try{
        await streamClient.upsertUsers([userData])
        return userData
    }
    catch(error){
        console.error("ERROR upserting stream user",error.message);
    }
}

export const generateStreamToken=(userid)=>{
    try {
        //ensure userid is a string
        const userIdStr=userid.toString();
        return streamClient.createToken(userIdStr);
    } catch (error) {
        console.error("Error generating Stream token:",error);
    }
};

export async function sendBotMessageToChannel(channelType, channelId, text, extraData = {}) {
    await ensureBotUser();
    const channel = streamClient.channel(channelType, channelId);
    return channel.sendMessage({
        text,
        user_id: BOT_USER.id,
        ...extraData,
    });
}

export async function verifyUserInChannel(channelType, channelId, userId) {
    const channels = await streamClient.queryChannels(
        {
            type: channelType,
            id: { $eq: channelId },
            members: { $in: [userId] },
        },
        [{ last_message_at: -1 }],
        { limit: 1 }
    );
    return channels.length > 0;
}