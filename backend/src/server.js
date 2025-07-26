import express from "express";
import "dotenv/config"
import authroutes from "./routes/auth.route.js"
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import userroutes from "./routes/user.route.js"
import chatRoutes from "./routes/chat.route.js"
import cors from "cors"
import path from "path";

const PORT=process.env.PORT
const app=express();

const __dirname=path.resolve();

app.use(cors({
    origin:"http://localhost:5173",
    credentials:true,
}))

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth",authroutes)
app.use("/api/users",userroutes)
app.use("/api/chat",chatRoutes)

if(process.env.NODE_ENV==="production"){
    app.use(express.static(path.join(__dirname,"../frontend/dist")))
app.get("*",(req,res)=>{
    res.sendFile(path.join(__dirname,"../frontend","dist","index.html"));
})
}

app.listen(PORT,()=>{
    console.log("Server is running on this por");
    connectDB();
})

