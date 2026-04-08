'use strict';
const WebSocket = require('ws');
const crypto = require('crypto');
const { createInitialBoard, isInCheck, getValidMoves, applyBoardMove, hasAnyMoves } = require('./chessLogic');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// Teams:
//   Team A: Slot 0 (White, Board 0) + Slot 1 (Black, Board 1)
//   Team B: Slot 2 (Black, Board 0) + Slot 3 (White, Board 1)
//
// Capture routing: captured piece goes to teammate's reserve (as teammate's color)
//   Slot 0 captures → Slot 1's reserve  (board 1, black)
//   Slot 1 captures → Slot 0's reserve  (board 0, white)
//   Slot 2 captures → Slot 3's reserve  (board 1, white)
//   Slot 3 captures → Slot 2's reserve  (board 0, black)

const PLAYER_CONFIG = [
  { boardIdx: 0, color: 'w', team: 'A', label: 'Board 1 — White' },
  { boardIdx: 1, color: 'b', team: 'A', label: 'Board 2 — Black' },
  { boardIdx: 0, color: 'b', team: 'B', label: 'Board 1 — Black' },
  { boardIdx: 1, color: 'w', team: 'B', label: 'Board 2 — White' },
];

// Where a captured piece from slot X ends up
const CAPTURE_DEST = [
  { boardIdx: 1, color: 'b' }, // Slot 0 captures → board 1, black reserve
  { boardIdx: 0, color: 'w' }, // Slot 1 captures → board 0, white reserve
  { boardIdx: 1, color: 'w' }, // Slot 2 captures → board 1, white reserve
  { boardIdx: 0, color: 'b' }, // Slot 3 captures → board 0, black reserve
];

const createReserve = () => ({ P:0, R:0, N:0, B:0, Q:0 });

// games: gameId -> gameState
const games = new Map();
// clientMap: ws -> { gameId, slot }
const clientMap = new Map();

function generateGameId() {
  // 6 hex chars, e.g. "A3F9B2"
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function createFreshGame() {
  return {
    boards: [createInitialBoard(), createInitialBoard()],
    currentTurn: ['w', 'w'],
    reserves: [
      { w: createReserve(), b: createReserve() },
      { w: createReserve(), b: createReserve() },
    ],
    enPassant: [null, null],
    castling: [
      { wK:true, wQ:true, bK:true, bQ:true },
      { wK:true, wQ:true, bK:true, bQ:true },
    ],
    players: [null, null, null, null],
    gameOver: null,
    status: 'waiting', // 'waiting' | 'playing' | 'over'
    inCheck: [null, null],
  };
}

// ─── Game list helpers ────────────────────────────────────────────────────────

function gameListPublic() {
  return [...games.entries()].map(([id, g]) => ({
    id,
    players: g.players,
    status: g.status,
    playerCount: g.players.filter(p => p !== null).length,
  }));
}

/** Send the current game list to all clients not currently in a game. */
function broadcastGameList() {
  const msg = JSON.stringify({ type: 'GAME_LIST', games: gameListPublic() });
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN && !clientMap.has(ws)) {
      ws.send(msg);
    }
  }
}

/** Send a message to all clients inside a specific game. */
function broadcastToGame(gameId, msg) {
  const data = JSON.stringify(msg);
  for (const [ws, info] of clientMap.entries()) {
    if (info.gameId === gameId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function publicState(game) {
  return {
    boards: game.boards,
    currentTurn: game.currentTurn,
    reserves: game.reserves,
    enPassant: game.enPassant,
    castling: game.castling,
    players: game.players,
    gameOver: game.gameOver,
    status: game.status,
    inCheck: game.inCheck,
  };
}

// ─── Connection lifecycle ─────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  console.log('Client connected');
  // New connection gets the current game list (dashboard view)
  send(ws, { type: 'GAME_LIST', games: gameListPublic() });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handle(ws, msg);
    } catch(e) {
      console.error('Bad message', e);
    }
  });

  ws.on('close', () => {
    const info = clientMap.get(ws);
    if (info) {
      const { gameId, slot } = info;
      const game = games.get(gameId);
      if (game) {
        console.log(`Game ${gameId}: Slot ${slot} (${game.players[slot]}) disconnected`);
        game.players[slot] = null;
        // Clean up empty waiting games
        if (game.status === 'waiting' && game.players.every(p => p === null)) {
          games.delete(gameId);
          console.log(`Game ${gameId} removed (empty)`);
        } else {
          broadcastToGame(gameId, { type: 'STATE', state: publicState(game) });
        }
      }
      clientMap.delete(ws);
    }
    broadcastGameList();
  });
});

// ─── Message router ───────────────────────────────────────────────────────────

function handle(ws, msg) {
  switch(msg.type) {
    case 'CREATE_GAME':      return handleCreateGame(ws);
    case 'LIST_GAMES':       return send(ws, { type: 'GAME_LIST', games: gameListPublic() });
    case 'JOIN':             return handleJoin(ws, msg);
    case 'MOVE':             return handleMove(ws, msg);
    case 'DROP':             return handleDrop(ws, msg);
    case 'RESET':            return handleReset(ws);
    case 'GET_VALID_DROPS':  return handleGetDrops(ws, msg);
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleCreateGame(ws) {
  let gameId;
  do { gameId = generateGameId(); } while (games.has(gameId));
  games.set(gameId, createFreshGame());
  console.log(`Game ${gameId} created`);
  send(ws, { type: 'GAME_CREATED', gameId });
  broadcastGameList();
}

function handleJoin(ws, msg) {
  const { gameId, slot, name } = msg;

  const game = games.get(gameId);
  if (!game) return send(ws, { type: 'ERROR', message: 'Game not found' });
  if (slot < 0 || slot > 3) return send(ws, { type: 'ERROR', message: 'Invalid slot' });
  if (game.status === 'over') return send(ws, { type: 'ERROR', message: 'Game is already over' });

  // Block slot if taken by an active connection
  if (game.players[slot] !== null) {
    const existingEntry = [...clientMap.entries()].find(
      ([, info]) => info.gameId === gameId && info.slot === slot
    );
    if (existingEntry) {
      const [existingWs] = existingEntry;
      if (existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
        return send(ws, { type: 'ERROR', message: 'Slot already taken' });
      }
      // Dead connection — evict it
      clientMap.delete(existingWs);
    }
  }

  // If this ws was previously in a different game, vacate that slot
  const prevInfo = clientMap.get(ws);
  if (prevInfo && prevInfo.gameId !== gameId) {
    const prevGame = games.get(prevInfo.gameId);
    if (prevGame) {
      prevGame.players[prevInfo.slot] = null;
      broadcastToGame(prevInfo.gameId, { type: 'STATE', state: publicState(prevGame) });
    }
  }

  clientMap.set(ws, { gameId, slot });
  game.players[slot] = name || `Player ${slot + 1}`;

  // Auto-start once all 4 slots are filled
  if (game.players.every(p => p !== null) && game.status === 'waiting') {
    game.status = 'playing';
  }

  send(ws, { type: 'JOINED', slot, config: PLAYER_CONFIG[slot] });
  broadcastToGame(gameId, { type: 'STATE', state: publicState(game) });
  broadcastGameList();
}

function handleMove(ws, msg) {
  const info = clientMap.get(ws);
  if (!info) return send(ws, { type: 'ERROR', message: 'Not joined' });
  const { gameId, slot } = info;
  const game = games.get(gameId);
  if (!game) return send(ws, { type: 'ERROR', message: 'Game not found' });
  if (game.status !== 'playing') return send(ws, { type: 'ERROR', message: 'Game not started' });

  const { boardIdx, fromR, fromC, toR, toC, promotion } = msg;
  const cfg = PLAYER_CONFIG[slot];

  if (cfg.boardIdx !== boardIdx) return send(ws, { type: 'ERROR', message: 'Wrong board' });
  if (game.currentTurn[boardIdx] !== cfg.color) return send(ws, { type: 'ERROR', message: 'Not your turn' });

  const board = game.boards[boardIdx];
  const piece = board[fromR][fromC];
  if (!piece || piece.color !== cfg.color) return send(ws, { type: 'ERROR', message: 'Not your piece' });

  const validMoves = getValidMoves(board, fromR, fromC, game.enPassant[boardIdx], game.castling[boardIdx]);
  if (!validMoves.some(([r,c]) => r===toR && c===toC)) return send(ws, { type: 'ERROR', message: 'Illegal move' });

  const { newBoard, captured, newEnPassant, newCastling } = applyBoardMove(
    board, fromR, fromC, toR, toC, game.castling[boardIdx], promotion || 'Q'
  );

  game.boards[boardIdx] = newBoard;
  game.enPassant[boardIdx] = newEnPassant;
  game.castling[boardIdx] = newCastling;

  if (captured && captured.type !== 'K') {
    const dest = CAPTURE_DEST[slot];
    game.reserves[dest.boardIdx][dest.color][captured.type]++;
  }

  game.currentTurn[boardIdx] = game.currentTurn[boardIdx] === 'w' ? 'b' : 'w';

  const oppColor = cfg.color === 'w' ? 'b' : 'w';
  game.inCheck[boardIdx] = isInCheck(newBoard, oppColor) ? oppColor : null;

  checkGameOver(game, boardIdx, oppColor);
  broadcastToGame(gameId, { type: 'STATE', state: publicState(game) });
}

function handleDrop(ws, msg) {
  const info = clientMap.get(ws);
  if (!info) return send(ws, { type: 'ERROR', message: 'Not joined' });
  const { gameId, slot } = info;
  const game = games.get(gameId);
  if (!game) return send(ws, { type: 'ERROR', message: 'Game not found' });
  if (game.status !== 'playing') return send(ws, { type: 'ERROR', message: 'Game not started' });

  const { boardIdx, pieceType, row, col } = msg;
  const cfg = PLAYER_CONFIG[slot];

  if (cfg.boardIdx !== boardIdx) return send(ws, { type: 'ERROR', message: 'Wrong board' });
  if (game.currentTurn[boardIdx] !== cfg.color) return send(ws, { type: 'ERROR', message: 'Not your turn' });

  const board = game.boards[boardIdx];
  if (board[row][col]) return send(ws, { type: 'ERROR', message: 'Square occupied' });
  if (pieceType==='P' && (row===0||row===7)) return send(ws, { type: 'ERROR', message: 'Pawns cannot be placed on first or last rank' });

  const reserve = game.reserves[boardIdx][cfg.color];
  if (!reserve[pieceType] || reserve[pieceType] <= 0) return send(ws, { type: 'ERROR', message: 'Piece not in reserve' });

  board[row][col] = { type: pieceType, color: cfg.color };
  reserve[pieceType]--;

  game.currentTurn[boardIdx] = game.currentTurn[boardIdx] === 'w' ? 'b' : 'w';

  const oppColor = cfg.color === 'w' ? 'b' : 'w';
  game.inCheck[boardIdx] = isInCheck(board, oppColor) ? oppColor : null;

  checkGameOver(game, boardIdx, oppColor);
  broadcastToGame(gameId, { type: 'STATE', state: publicState(game) });
}

function handleGetDrops(ws, msg) {
  const info = clientMap.get(ws);
  if (!info) return;
  const game = games.get(info.gameId);
  if (!game) return;
  const { boardIdx, pieceType } = msg;
  const board = game.boards[boardIdx];
  const squares = [];
  for (let r=0; r<8; r++) {
    for (let c=0; c<8; c++) {
      if (!board[r][c]) {
        if (pieceType==='P' && (r===0||r===7)) continue;
        squares.push([r,c]);
      }
    }
  }
  send(ws, { type: 'DROP_SQUARES', squares });
}

function handleReset(ws) {
  const info = clientMap.get(ws);
  if (!info) return;
  const { gameId } = info;
  const game = games.get(gameId);
  if (!game) return;

  const freshGame = createFreshGame();
  // Re-register all currently connected players in this game
  for (const [, wInfo] of clientMap.entries()) {
    if (wInfo.gameId === gameId) {
      freshGame.players[wInfo.slot] = game.players[wInfo.slot] || `Player ${wInfo.slot + 1}`;
    }
  }
  if (freshGame.players.filter(p => p !== null).length === 4) freshGame.status = 'playing';
  games.set(gameId, freshGame);
  broadcastToGame(gameId, { type: 'STATE', state: publicState(freshGame) });
  broadcastGameList();
}

// ─── Game over ────────────────────────────────────────────────────────────────

function checkGameOver(game, boardIdx, colorToCheck) {
  if (game.gameOver) return;
  const board = game.boards[boardIdx];
  if (isInCheck(board, colorToCheck) &&
      !hasAnyMoves(board, colorToCheck, game.enPassant[boardIdx], game.castling[boardIdx])) {
    const winningTeam = colorToCheck === 'b' ? 'A' : 'B';
    game.gameOver = `Team ${winningTeam} wins by checkmate on Board ${boardIdx+1}!`;
    game.status = 'over';
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

console.log(`🎮 Bughouse Chess server running on ws://localhost:${PORT}`);
console.log('Waiting for players to connect...');
