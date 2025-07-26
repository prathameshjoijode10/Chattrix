import {StreamChat} from "stream-chat"
import "dotenv/config"

const apikey=process.env.STREAM_API_KEY
const apisecret=process.env.STREAM_API_SECRET

if(!apikey || !apisecret){
    console.error("Stream Api key or secret is missing");
}

const streamClient=StreamChat.getInstance(apikey,apisecret)

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