import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

export const GameContext = createContext(null);

// Player slot configuration
export const PLAYER_CONFIG = [
  { boardIdx: 0, color: 'w', team: 'A', label: 'Board 1 — White', teamLabel: 'Team A' },
  { boardIdx: 1, color: 'b', team: 'A', label: 'Board 2 — Black', teamLabel: 'Team A' },
  { boardIdx: 0, color: 'b', team: 'B', label: 'Board 1 — Black', teamLabel: 'Team B' },
  { boardIdx: 1, color: 'w', team: 'B', label: 'Board 2 — White', teamLabel: 'Team B' },
];

export function GameProvider({ children }) {
  const [state, setState] = useState(null);         // game state from server
  const [mySlot, setMySlot] = useState(null);       // which slot we joined as
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const wsRef = useRef(null);

  const connect = useCallback((serverUrl, slot, name) => {
    if (wsRef.current) wsRef.current.close();
    setError('');
    try {
      const ws = new WebSocket(serverUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: 'JOIN', slot: Number(slot), name }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'JOINED') {
            setMySlot(msg.slot);
          } else if (msg.type === 'STATE') {
            setState(msg.state);
          } else if (msg.type === 'ERROR') {
            setError(msg.message);
          }
        } catch(e) {}
      };

      ws.onclose = () => {
        setConnected(false);
        setState(prev => prev);
      };

      ws.onerror = () => {
        setError('Connection failed. Is the server running?');
        setConnected(false);
      };
    } catch(e) {
      setError('Invalid URL');
    }
  }, []);

  const sendMove = useCallback((boardIdx, fromR, fromC, toR, toC, promotion) => {
    wsRef.current?.send(JSON.stringify({ type:'MOVE', boardIdx, fromR, fromC, toR, toC, promotion }));
  }, []);

  const sendDrop = useCallback((boardIdx, pieceType, row, col) => {
    wsRef.current?.send(JSON.stringify({ type:'DROP', boardIdx, pieceType, row, col }));
  }, []);

  const sendReset = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type:'RESET' }));
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    setConnected(false);
    setMySlot(null);
    setState(null);
  }, []);

  return (
    <GameContext.Provider value={{
      state, mySlot, connected, error,
      connect, sendMove, sendDrop, sendReset, disconnect,
      myConfig: mySlot !== null ? PLAYER_CONFIG[mySlot] : null,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
