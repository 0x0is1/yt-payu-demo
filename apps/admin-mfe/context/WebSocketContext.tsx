'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

export interface WebSocketMessage {
  event: string;
  orderId?: string;
  identifierId?: string;
  amount?: number;
  customerName?: string | null;
  platform?: string;
  timestamp: string;
  data?: Record<string, any>;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastMessage: null,
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:4000/ws/admin';
    let timeoutId: any;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
          } catch {
            return;
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          timeoutId = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        timeoutId = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      clearTimeout(timeoutId);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}
