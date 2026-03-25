import { io } from "socket.io-client";

export const getSocketBaseUrl = () => {
  // Match axios dev convention: backend runs on :5001
  if (import.meta.env.MODE === "development") return "http://localhost:5001";
  // In production, use same-origin
  return undefined;
};

export const createSocket = () => {
  return io(getSocketBaseUrl(), {
    withCredentials: true,
    transports: ["websocket"],
  });
};
