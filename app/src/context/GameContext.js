import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

export const GameContext = createContext(null);

// Player slot configuration
export const PLAYER_CONFIG = [
  { boardIdx: 0, color: 'w', team: 'A', label: 'Board 1 — White', teamLabel: 'Team A' },
  { boardIdx: 1, color: 'b', team: 'A', label: 'Board 2 — Black', teamLabel: 'Team A' },
  { boardIdx: 0, color: 'b', team: 'B', label: 'Board 1 — Black', teamLabel: 'Team B' },
  { boardIdx: 1, color: 'w', team: 'B', label: 'Board 2 — White', teamLabel: 'Team B' },
];

export function GameProvider({ children }) {
  const [state, setState] = useState(null);       // active game state
  const [games, setGames] = useState([]);          // game list for dashboard
  const [gameId, setGameId] = useState(null);      // game we navigated into
  const [mySlot, setMySlot] = useState(null);      // slot we joined (null = not joined)
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const wsRef = useRef(null);

  // Open a WebSocket to the server (dashboard view — no game joined yet).
  const connectToServer = useCallback((serverUrl) => {
    if (wsRef.current) wsRef.current.close();
    setError('');
    try {
      const ws = new WebSocket(serverUrl.trim());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'GAME_LIST') {
            setGames(msg.games);
          } else if (msg.type === 'GAME_CREATED') {
            setGameId(msg.gameId);
          } else if (msg.type === 'JOINED') {
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
      };

      ws.onerror = () => {
        setError('Connection failed. Is the server running?');
        setConnected(false);
      };
    } catch(e) {
      setError('Invalid URL');
    }
  }, []);

  // Create a new game on the server. Server responds with GAME_CREATED which sets gameId.
  const createGame = useCallback(() => {
    setError('');
    wsRef.current?.send(JSON.stringify({ type: 'CREATE_GAME' }));
  }, []);

  // Navigate into a game's lobby (client-side only — no server message sent yet).
  const selectGame = useCallback((id) => {
    setGameId(id);
    setMySlot(null);
    setState(null);
    setError('');
  }, []);

  // Join a specific slot in the current game.
  const joinSlot = useCallback((slot, name) => {
    if (!gameId) return;
    setError('');
    wsRef.current?.send(JSON.stringify({ type: 'JOIN', gameId, slot: Number(slot), name }));
  }, [gameId]);

  // Go back to dashboard without disconnecting from the server.
  const leaveGame = useCallback(() => {
    setGameId(null);
    setMySlot(null);
    setState(null);
    setError('');
    // Request a fresh game list
    wsRef.current?.send(JSON.stringify({ type: 'LIST_GAMES' }));
  }, []);

  // Fully disconnect and reset all state.
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setGames([]);
    setGameId(null);
    setMySlot(null);
    setState(null);
    setError('');
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

  return (
    <GameContext.Provider value={{
      state, games, gameId, mySlot, connected, error,
      connectToServer, createGame, selectGame, joinSlot,
      leaveGame, disconnect,
      sendMove, sendDrop, sendReset,
      myConfig: mySlot !== null ? PLAYER_CONFIG[mySlot] : null,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
