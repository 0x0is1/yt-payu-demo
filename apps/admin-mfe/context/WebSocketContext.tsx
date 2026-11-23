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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const wsUrl = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:4000/ws/admin';
    let timeoutId: any;
    let pollInterval: any;
    let wsActive = false;

    async function checkHttpHealth() {
      try {
        const res = await fetch(`${backendUrl}/api/health`);
        if (res.ok) {
          setIsConnected(true);
        } else {
          if (!wsActive) setIsConnected(false);
        }
      } catch {
        if (!wsActive) setIsConnected(false);
      }
    }

    function connect() {
      if (typeof window === 'undefined') return;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          wsActive = true;
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
          wsActive = false;
          checkHttpHealth();
          timeoutId = setTimeout(connect, 10000);
        };

        ws.onerror = () => {
          wsActive = false;
          checkHttpHealth();
          try {
            ws.close();
          } catch {
            return;
          }
        };
      } catch {
        wsActive = false;
        checkHttpHealth();
        timeoutId = setTimeout(connect, 10000);
      }
    }

    checkHttpHealth();
    pollInterval = setInterval(checkHttpHealth, 5000);
    connect();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(pollInterval);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          return;
        }
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
