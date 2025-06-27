import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';

const WebSocketContext = createContext();

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ role, playerId, children }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]); // все входящие сообщения

  // Подключение к серверу
  useEffect(() => {
    if (!role || !playerId) return;
    const ws = new window.WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', role, playerId }));
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(msgs => [...msgs, data]);
      } catch {}
    };
    return () => {
      ws.close();
      setConnected(false);
    };
  }, [role, playerId]);

  // Функция для отправки сообщений
  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Очистка сообщений (например, после обработки)
  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <WebSocketContext.Provider value={{ connected, send, messages, clearMessages }}>
      {children}
    </WebSocketContext.Provider>
  );
} 