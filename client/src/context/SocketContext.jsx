import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { SOCKET_EVENTS } from "../constants";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io("/", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on(SOCKET_EVENTS.CONNECT, () => setConnected(true));
    socket.on(SOCKET_EVENTS.DISCONNECT, () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const on  = useCallback((event, handler) => { socketRef.current?.on(event, handler); },  []);
  const off = useCallback((event, handler) => { socketRef.current?.off(event, handler); }, []);
  const emit = useCallback((event, data) => { socketRef.current?.emit(event, data); }, []);

  return (
    <SocketContext.Provider value={{ connected, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
