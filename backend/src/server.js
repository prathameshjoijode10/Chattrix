import express from "express";
import "dotenv/config"
import authroutes from "./routes/auth.route.js"
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import userroutes from "./routes/user.route.js"
import chatRoutes from "./routes/chat.route.js"
import codeRoutes from "./routes/code.route.js"
import cors from "cors"
import path from "path";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

const PORT=process.env.PORT
const app=express();

const __dirname=path.resolve();

app.use(cors({
    origin: process.env.NODE_ENV === "production" ? true : "http://localhost:5173",
    credentials:true,
}))

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth",authroutes)
app.use("/api/users",userroutes)
app.use("/api/chat",chatRoutes)
app.use("/api/code",codeRoutes)

const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? true : "http://localhost:5173",
        credentials: true,
    },
});

// In-memory collab state (resets on server restart)
const collabStateByRoom = new Map();

const getRoomState = (roomId) => {
    if (!collabStateByRoom.has(roomId)) {
        collabStateByRoom.set(roomId, {
            canvasJson: null,
        });
    }
    return collabStateByRoom.get(roomId);
};

io.on("connection", (socket) => {
    socket.on("collab:join", ({ roomId, userId } = {}) => {
        if (!roomId) return;
        socket.data.roomId = roomId;
        socket.data.userId = userId || null;
        socket.join(roomId);

        const state = getRoomState(roomId);
        socket.emit("collab:state", {
            canvasJson: state.canvasJson,
        });
    });

    socket.on("whiteboard:mouse-move", ({ roomId, x, y } = {}) => {
        if (!roomId) roomId = socket.data.roomId;
        if (!roomId) return;
        socket.to(roomId).emit("whiteboard:mouse-move", {
            socketId: socket.id,
            userId: socket.data.userId,
            x,
            y,
        });
    });

    socket.on("whiteboard:canvas", ({ roomId, canvasJson } = {}) => {
        if (!roomId) roomId = socket.data.roomId;
        if (!roomId || !canvasJson) return;
        const state = getRoomState(roomId);
        state.canvasJson = canvasJson;
        socket.to(roomId).emit("whiteboard:canvas", { canvasJson });
    });

});

if(process.env.NODE_ENV==="production"){
    app.use(express.static(path.join(__dirname,"../frontend/dist")))
app.get("*",(req,res)=>{
    res.sendFile(path.join(__dirname,"../frontend","dist","index.html"));
})
}

server.listen(PORT,()=>{
    console.log("Server is running on this por");
    connectDB();
})

