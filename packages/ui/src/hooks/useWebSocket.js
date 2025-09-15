import { useState, useRef, useCallback } from 'react';

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const ws = useRef(null);

  const connect = useCallback((url) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setStatus('connected');
    
    // This onclose handler is the single source of truth for disconnection.
    ws.current.onclose = () => setStatus('disconnected');

    ws.current.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setStatus('error');
    };
    ws.current.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch (error) {
        console.error("Failed to parse WebSocket message:", event.data, error);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current) {
      // We ONLY tell the socket to close. The 'onclose' handler above will take care of updating the state.
      ws.current.close();
    }
  }, []);

  const sendMessage = useCallback((payload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    } else {
      console.error('Cannot send message, WebSocket is not connected.');
    }
  }, []);

  return { lastMessage, status, connect, disconnect, sendMessage };
}