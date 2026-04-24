import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext({});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('🔌 Conectando ao WebSocket em:', API_URL);
      
      const newSocket = io(API_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        console.log('✅ WebSocket conectado! ID:', newSocket.id);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ WebSocket desconectado');
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Erro de conexão WebSocket:', error);
      });

      setSocket(newSocket);

      return () => {
        console.log('🔌 Desconectando WebSocket');
        newSocket.close();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};