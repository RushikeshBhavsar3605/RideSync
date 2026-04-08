import { useEffect, useState, useCallback, useRef } from 'react';
import { WEBSOCKET_URL } from "../constants";
import { ServerWsMessage, TripEvents, isValidWsMessage } from '../contracts';

interface useBaseWebSocketProps {
  endpoint: string;
  onMessage: (message: ServerWsMessage) => void;
  onOpen?: () => void;
}

export function useBaseWebSocket({ endpoint, onMessage, onOpen }: useBaseWebSocketProps) {
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);

  // Keep refs up to date to avoid effect re-runs
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
  }, [onMessage, onOpen]);

  useEffect(() => {
    const websocket = new WebSocket(`${WEBSOCKET_URL}${endpoint}`);
    setWs(websocket);

    websocket.onopen = () => {
      onOpenRef.current?.();
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerWsMessage;

        if (!message || !isValidWsMessage(message)) {
          console.error("Invalid message received:", message);
          setError(`Invalid message type received`);
          return;
        }

        onMessageRef.current(message);
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
        setError("Error parsing message");
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket closed');
    };

    websocket.onerror = (event) => {
      setError('WebSocket error occurred');
      console.error('WebSocket error:', event);
    };

    return () => {
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        websocket.close();
      }
    };
  }, [endpoint]);

  const sendMessage = useCallback((message: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not open. State:", ws?.readyState);
    }
  }, [ws]);

  return { ws, error, sendMessage, setError };
}
