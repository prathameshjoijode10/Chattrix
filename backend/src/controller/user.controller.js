import FriendRequest from '../models/FriendRequest.js'
import User from "../models/User.js";
import { streamClient, verifyUserInChannel } from "../lib/stream.js";

export async function getRecommendedUsers(req,res){
    try {
       const currentUserId=req.user.id;
       const currentUser=req.user;

       const recommendedUsers=await User.find({
        $and:[
            {_id:{$ne:currentUserId}},
            {_id:{$nin:currentUser.friends}},
            {isOnboarded:true}
        ]
       })
       res.status(200).json(recommendedUsers)
    } catch (error) {
        console.log("Error in getRecommendedUsers",error);
        res.status(500).json({message:"Internal server error"})
    }
}

export async function getMyFriends(req,res){
    try {
       const user=await User.findById(req.user.id)
       .select("friends")
       .populate("friends","fullname profilepic nativeLanguage learningLanguage"); 
       res.status(200).json(user.friends);
    } catch (error) {
        console.error("Error in getMyFriends controller",error.message);
        res.status(500).json({message:"Internal server error"});
    }
}

export async function sendFriendRequest(req,res){
    try {
        const myId=req.user.id;
        const {id:recipientId} =req.params;

        //prevent sending req to yourself
        if(myId==recipientId){
            return res.status(400).json({message:"You can't send friend request to yourself"});
        }

        const recipient=await User.findById(recipientId);
        if(!recipient){
            return res.status(404).json({message:"Recipient not found"});
        }

        //check if user is already friends
        if(recipient.friends.includes(myId)){
            return res.status(400).json({message:"you are already friends with this user"});
        }

        //check if a req already exists
        const exisitingRequest=await FriendRequest.findOne({
            $or:[
                {sender:myId,recipient:recipientId},
                {sender:recipientId,recipient:myId},
            ],
        })

        if(exisitingRequest){
            return res.status(400).json({message:"A friend reuest already exists between you and this user"})
        }

        const friendRequest=await FriendRequest.create({
            sender:myId,
            recipient:recipientId,
        });
        res.status(201).json(friendRequest)
    } catch (error) {
       console.log("Error in sendFriendRequest controller",error.message);
       res.status(500).json({message:"Internal Server Error"}); 
    }
}

export async function acceptFriendRequest(req,res){
    try {
        const {id:requestId}=req.params;
        const friendRequest = await FriendRequest.findById(requestId);

        if(!friendRequest){
            return res.status(404).json({message:"Friend request not found"});
        }

        //verify the current user is the recipient
        if(friendRequest.recipient.toString()!==req.user.id){
            return res.status(403).json({message:"You are not authorized to accept this request"});
        }

        friendRequest.status="accepted";
        await friendRequest.save();

        //add each user to the others friendlist
        await User.findByIdAndUpdate(friendRequest.sender,{
            $addToSet:{friends:friendRequest.recipient},
        });

        await User.findByIdAndUpdate(friendRequest.recipient,{
            $addToSet:{friends:friendRequest.sender},
        });
        res.status(200).json({message:"Friend request accepted"});
    } catch (error) {
        console.log("Error in acceptFriendRequest controller",error.message);
        res.status(500).json({message:"Internal server error"});
    }
}

export async function rejectFriendRequest(req,res){
    try {
        const {id:requestId}=req.params;
        const friendRequest = await FriendRequest.findById(requestId);

        if(!friendRequest){
            return res.status(404).json({message:"Friend request not found"});
        }

        if(friendRequest.recipient.toString()!==req.user.id){
            return res.status(403).json({message:"You are not authorized to reject this request"});
        }

        friendRequest.status="rejected";
        await friendRequest.save();

        return res.status(200).json({message:"Friend request rejected"});
    } catch (error) {
        console.log("Error in rejectFriendRequest controller",error.message);
        res.status(500).json({message:"Internal server error"});
    }
}

function safeGroupId(groupId) {
    return typeof groupId === "string" ? groupId.trim() : "";
}

async function assertGroupMember(groupId, userId) {
    return verifyUserInChannel("messaging", groupId, userId);
}

export async function getGroupMembers(req, res) {
    try {
        const groupId = safeGroupId(req.params.id);
        const userId = req.user?.id?.toString();

        if (!groupId) {
            return res.status(400).json({ message: "Group id is required" });
        }

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const allowed = await assertGroupMember(groupId, userId);
        if (!allowed) {
            return res.status(403).json({ message: "Not a member of this group" });
        }

        const channel = streamClient.channel("messaging", groupId);
        const response = await channel.queryMembers({}, { created_at: 1 }, { limit: 100 });

        return res.status(200).json({ members: response.members || [] });
    } catch (error) {
        console.error("Error in getGroupMembers controller", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function addGroupMembers(req, res) {
    try {
        const groupId = safeGroupId(req.params.id);
        const userId = req.user?.id?.toString();
        const ids = Array.isArray(req.body?.ids)
            ? req.body.ids.map((id) => (typeof id === "string" ? id.trim() : "")).filter(Boolean)
            : [];

        if (!groupId) {
            return res.status(400).json({ message: "Group id is required" });
        }

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (ids.length === 0) {
            return res.status(400).json({ message: "No members to add" });
        }

        const allowed = await assertGroupMember(groupId, userId);
        if (!allowed) {
            return res.status(403).json({ message: "Not a member of this group" });
        }

        const channel = streamClient.channel("messaging", groupId);
        console.log("Adding members:", ids);

const result = await channel.addMembers(ids);

console.log(result);

        return res.status(200).json({ message: "Members added" });
    } catch (error) {
    console.error("========== ADD MEMBER ERROR ==========");
    console.error(error);
    console.error(error.response?.data);
    console.error("====================================");

    return res.status(500).json({
        message: error.message,
        error: error.response?.data || error,
    });
}
}

export async function removeGroupMember(req, res) {
    try {
        const groupId = safeGroupId(req.params.id);
        const memberId = typeof req.params.memberId === "string" ? req.params.memberId.trim() : "";
        const userId = req.user?.id?.toString();

        if (!groupId || !memberId) {
            return res.status(400).json({ message: "Group id and member id are required" });
        }

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const allowed = await assertGroupMember(groupId, userId);
        if (!allowed) {
            return res.status(403).json({ message: "Not a member of this group" });
        }

        const channel = streamClient.channel("messaging", groupId);
        console.log("Removing:", memberId);

const result = await channel.removeMembers([memberId]);

console.log(result);

        return res.status(200).json({ message: "Member removed" });
    } catch (error) {
    console.error("========== REMOVE MEMBER ERROR ==========");
    console.error(error);
    console.error(error.response?.data);
    console.error("====================================");

    return res.status(500).json({
        message: error.message,
        error: error.response?.data || error,
    });
}
}

export async function getFriendRequest(req,res){
    try {
        const incomingReqs=await FriendRequest.find({
            recipient:req.user.id,
            status:"pending",
        }).populate("sender","fullname profilepic nativeLanguage learningLanguage");

        const acceptedReqs=await FriendRequest.find({
            sender:req.user.id,
            status:"accepted",
        }).populate("recipient","fullname profilepic")
        res.status(200).json({incomingReqs,acceptedReqs})
    } catch (error) {
        console.log("Error in getPendingFreindRequest controller",error.message);
        res.status(500).json({message:"Internal server error"});
    }
}

export async function getOutgoingFriendReqs(req,res) {
    try {
        const outgoingRequests=await FriendRequest.find({
            sender:req.user.id,
            status:"pending",
        }).populate("recipient","fullname profilepic nativeLanguage learningLanguage");
        res.status(200).json(outgoingRequests)
    } catch (error) {
        console.log("Error in getOutGoungrequets controller",error.message);
        res.status(500).json({message:"Internal server error"});
    }
}