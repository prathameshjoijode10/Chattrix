import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { executeCode } from "../controller/code.controller.js";

const router = express.Router();

router.post("/execute", protectRoute, executeCode);

export default router;
