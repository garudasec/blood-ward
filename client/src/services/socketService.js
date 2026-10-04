import { io } from "socket.io-client";

let socket = null;

export const socketService = {
  connect() {
    if (socket && socket.connected) return socket;
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/,"") ||
    window.location.origin;

    socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      // Socket connected successfully
    });

    socket.on("connect_error", (err) => {
      // Connection error log / handle
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  on(event, callback) {
    if (!socket || !socket.connected) this.connect();
    if (socket) {
      socket.off(event, callback);
      socket.on(event, callback);
    }
  },

  off(event, callback) {
    if (socket) {
      socket.off(event, callback);
    }
  },
};

export default socketService;
