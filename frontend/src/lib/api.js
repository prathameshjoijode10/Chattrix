import { axiosInstance } from "./axios"

export const signup=async(signupData)=>{
    const response=await axiosInstance.post("/auth/signup",signupData);
    return response.data;
}

export const login=async(loginData)=>{
  const response=await axiosInstance.post("/auth/login",loginData);
    return response.data;
}

export const logout=async()=>{
  const response=await axiosInstance.post("/auth/logout");
    return response.data;
}

export const getAuthUser=async()=>{
      try {
        const res=await axiosInstance.get("/auth/me");
      return res.data;
      } catch (error) {
        console.log("Error in getAuthUser",error)
        return null;
      }
    }

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export async function getUserFriends (){
  const response = await axiosInstance.get("/users/friends");
  return response.data;
};

export async function getReccomendedUsers (){
  const response = await axiosInstance.get("/users");
  return response.data;
};

export async function getOutgoingFriendReqs (){
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
};

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken(){
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function postGroqPrompt({ cid, prompt }) {
  try {
    const response = await axiosInstance.post("/chat/groq", { cid, prompt });
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    if (status === 404) {
      // Backward compatibility: older backend builds only expose /chat/gemini.
      const response = await axiosInstance.post("/chat/gemini", { cid, prompt });
      return response.data;
    }
    throw error;
  }
}

// Backward-compatible alias
export const postGeminiPrompt = postGroqPrompt;

export async function captionImageMessage({ messageId }) {
  const response = await axiosInstance.post("/chat/caption", { messageId });
  return response.data;
}

export async function executeCode({ language, source, stdin }) {
  const response = await axiosInstance.post("/code/execute", { language, source, stdin });
  return response.data;
}