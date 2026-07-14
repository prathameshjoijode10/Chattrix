import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMyFriends,getRecommendedUsers,acceptFriendRequest,rejectFriendRequest,sendFriendRequest, getFriendRequest,getOutgoingFriendReqs,getGroupMembers,addGroupMembers,removeGroupMember } from "../controller/user.controller.js";
const router=express.Router();

router.use(protectRoute);

router.get("/",getRecommendedUsers);
router.get("/friends",getMyFriends);
router.post("/friend-request/:id",sendFriendRequest);
router.put("/friend-request/:id/accept",acceptFriendRequest);
router.put("/friend-request/:id/reject",rejectFriendRequest);
router.get("/friend-requests",getFriendRequest)
router.get("/outgoing-friend-requests",getOutgoingFriendReqs);
router.get("/groups/:id/members",getGroupMembers);
router.post("/groups/:id/members",addGroupMembers);
router.delete("/groups/:id/members/:memberId",removeGroupMember);
export default router;