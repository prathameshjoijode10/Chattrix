import User from "../models/User.js"
import jwt from "jsonwebtoken"
import { upsertStreamUser } from "../lib/stream.js";

export async function signup(req,res){
    const{email,password,fullname}=req.body;
    try{
        if(!email || !password || !fullname){
            return res.status(400).json({message:"Enter all required fields"});
        }

        if(password.length<6){
        return res.status(400).json({message:"Password should be of atleast 6 characters"});
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
        }

        const exisitingUser=await User.findOne({email})
        if(exisitingUser){
        return res.status(400).json({ message: "Email already exists" });
        }
        const idx=Math.floor(Math.random()*100)+1;
        const randomAvatar=`https://avatar-placeholder.iran.liara.run/public/${idx}`

        const newUser=await User.create({
            email,
            fullname,
            password,
            profilepic:randomAvatar
        })

            try {
            await upsertStreamUser({
            id:newUser._id.toString(),
            name:newUser.fullname,
            image:newUser.profilepic||""
            });
            console.log(`New user created: ${newUser.fullname}`)
        } catch (error) {
                console.error("Error creating stream user");
            }
        
        const token=jwt.sign({userId:newUser._id},process.env.JWT_SECRET_KEY,{
            expiresIn:"7d"
        })

        res.cookie("jwt",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV="production"
        })
        res.status(201).json({success:true,user:newUser})
    }catch(error){
        console.log("Error",error);
        res.status(500).json({message:"Internal server error"})
    }
}

export async function login(req,res){
   try{
 const {email,password}=req.body;

    if(!email || !password){
        return res.status(500).json({message:"Enter all required fields"})
    }

    const user=await User.findOne({email});
    if(!user){
    return res.status(400).json({message:"Invalid email or password"})
    }

    const ispassword=await user.matchPassword(password);
    if(!ispassword) res.status(401).json({message:"Invalid email or password"})

    const token=jwt.sign({userId:user._id},process.env.JWT_SECRET_KEY,{
    expiresIn:"7d"
    })

    res.cookie("jwt",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV="production"
        })
        res.status(200).json({success:true,user})
   }catch(error){
    console.log("error in login controller",error.message);
    res.status(500).json({message:"Internal server error"})
   }
}

export function logout(req,res){
    res.clearCookie("jwt")
    res.status(200).json({success:true,message:"Logout successful"})
}

export async function onboard(req,res){
    try{
    const userId=req.user._id;
    const{fullname,bio,nativeLanguage,learningLanguage,location}=req.body;

    if(!fullname || !bio || !nativeLanguage || !learningLanguage || !location){
        return res.status(400).json({
            message:"All fields are required",
            missingFields:[
                !fullname && "fullname",
                !bio && "bio",
                !nativeLanguage && "nativeLanguage",
                !learningLanguage && "learningLanguage",
                !location && "location",
            ].filter(Boolean),
        })
    }

    const updatedUser=await User.findByIdAndUpdate(userId,{
        ...req.body,
        isOnboarded:true,
    },{new:true})

    if(!updatedUser){
        res.status(404).json({message:"User not found"});
    }
    
    try {
        await upsertStreamUser({
      id:updatedUser._id.toString(),
      name:updatedUser.fullname,
      image:updatedUser.profilepic || "",  
    })
    console.log(`Stream user updated onboarding for ${updatedUser.fullname}`)
    } catch (error) {
        console.log("Error updating stream user during onboarding",error)
    }

    res.status(200).json({success:true,user:updatedUser})

    }catch(error){
        console.error("Onboarding error",error.message);
        res.status(500).json({message:"Internal server error"})
    }
}