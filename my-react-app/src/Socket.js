// socket.js
import { io } from "socket.io-client";


const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const isSecure = SOCKET_URL.startsWith("https");

const Socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    path: "/socket.io",
    withCredentials: true,
    secure: isSecure,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
});

Socket.on("connect", () => {
    console.log("✅ Socket.IO connected with ID:", Socket.id);
});

Socket.on("connect_error", (err) => {
    console.warn("Socket connect_error:", err.message || err);
});

export default Socket;