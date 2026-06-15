import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

// In production the frontend is served from the same origin as the backend
// (behind nginx), so connect to the current origin. In dev, talk to the
// local backend directly on port 5000.
const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:5000';

export const SocketProvider = ({ children, currentPath }) => {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const [socket, setSocket] = useState(null);
  const [notificationTick, setNotificationTick] = useState(0);
  const currentPathRef = useRef(currentPath);

  // Keep currentPath ref updated
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Trigger notification refresh
  const triggerNotificationRefresh = useCallback(() => {
    setNotificationTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[SocketContext] Connected');
    });

    // Listen for incoming messages globally
    newSocket.on('message:received', (message) => {
      if (currentPathRef.current !== '/chats') {
        const senderName = message.sender?.name || 'Someone';
        const preview = message.content.length > 50 
          ? message.content.substring(0, 50) + '...' 
          : message.content;
        addToast(`💬 ${senderName}: ${preview}`, 'info');
        // Trigger notification bell refresh
        setNotificationTick(t => t + 1);
      }
    });

    // Listen for general notifications (appointments, etc.)
    newSocket.on('notification:received', (notification) => {
      if (notification.url === '/chats' && currentPathRef.current === '/chats') {
        return;
      }
      addToast(`${notification.title}: ${notification.body}`, 'info');
      // Trigger notification bell refresh
      setNotificationTick(t => t + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket, notificationTick, triggerNotificationRefresh }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
