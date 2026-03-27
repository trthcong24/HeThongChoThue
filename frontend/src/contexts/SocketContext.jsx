import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return undefined;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    const nextSocket = io(socketUrl, {
      auth: {
        token
      }
    });

    nextSocket.on("booking:created", (payload) => {
      window.dispatchEvent(new CustomEvent("booking:refresh", { detail: payload }));
    });

    nextSocket.on("booking:statusChanged", (payload) => {
      window.dispatchEvent(new CustomEvent("booking:refresh", { detail: payload }));
    });

    nextSocket.on("space:changed", (payload) => {
      window.dispatchEvent(new CustomEvent("space:refresh", { detail: payload }));
    });

    nextSocket.on("notification:new", (payload) => {
      window.dispatchEvent(new CustomEvent("notification:new", { detail: payload }));
    });

    nextSocket.on("chat:message", (payload) => {
      window.dispatchEvent(new CustomEvent("chat:message", { detail: payload }));
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [token]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
