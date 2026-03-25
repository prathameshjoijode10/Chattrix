import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js";
import { captionImageMessage, geminiChat, getStreamToken } from "../controller/chat.controller.js";

const router=express.Router();

router.get("/token",protectRoute,getStreamToken)

// Preferred AI command endpoint
router.post("/groq", protectRoute, geminiChat);

// Backward-compatible alias
router.post("/gemini", protectRoute, geminiChat);

router.post("/caption", protectRoute, captionImageMessage);

export default router;