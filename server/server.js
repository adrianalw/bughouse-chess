'use strict';
const WebSocket = require('ws');
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

let gameState = createFreshGame();
const clientMap = new Map(); // ws -> slotIdx

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
    inCheck: [null, null], // which color is in check on each board
  };
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  // Send current state so they can see lobby
  send(ws, { type: 'STATE', state: publicState() });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handle(ws, msg);
    } catch(e) {
      console.error('Bad message', e);
    }
  });

  ws.on('close', () => {
    const slot = clientMap.get(ws);
    if (slot !== undefined) {
      console.log(`Slot ${slot} disconnected`);
      gameState.players[slot] = null;
      clientMap.delete(ws);
      broadcast({ type: 'STATE', state: publicState() });
    }
  });
});

function handle(ws, msg) {
  switch(msg.type) {
    case 'JOIN':    return handleJoin(ws, msg);
    case 'MOVE':    return handleMove(ws, msg);
    case 'DROP':    return handleDrop(ws, msg);
    case 'RESET':   return handleReset(ws);
    case 'GET_VALID_DROPS': return handleGetDrops(ws, msg);
  }
}

function handleJoin(ws, msg) {
  const { slot, name } = msg;
  if (slot < 0 || slot > 3) return send(ws, { type: 'ERROR', message: 'Invalid slot' });
  if (gameState.players[slot] !== null) {
    const existingWs = [...clientMap.entries()].find(([,s])=>s===slot)?.[0];
    if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN)
      return send(ws, { type: 'ERROR', message: 'Slot already taken' });
  }
  // Kick old ws for this slot if dead
  for (const [w,s] of clientMap.entries()) {
    if (s === slot && w !== ws) clientMap.delete(w);
  }
  clientMap.set(ws, slot);
  gameState.players[slot] = name || `Player ${slot+1}`;
  // Start game once all 4 joined
  if (gameState.players.every(p=>p!==null) && gameState.status==='waiting') {
    gameState.status = 'playing';
  }
  send(ws, { type: 'JOINED', slot, config: PLAYER_CONFIG[slot] });
  broadcast({ type: 'STATE', state: publicState() });
}

function handleMove(ws, msg) {
  const slot = clientMap.get(ws);
  if (slot === undefined) return send(ws, { type: 'ERROR', message: 'Not joined' });
  if (gameState.status !== 'playing') return send(ws, { type: 'ERROR', message: 'Game not started' });

  const { boardIdx, fromR, fromC, toR, toC, promotion } = msg;
  const cfg = PLAYER_CONFIG[slot];

  if (cfg.boardIdx !== boardIdx) return send(ws, { type: 'ERROR', message: 'Wrong board' });
  if (gameState.currentTurn[boardIdx] !== cfg.color) return send(ws, { type: 'ERROR', message: 'Not your turn' });

  const board = gameState.boards[boardIdx];
  const piece = board[fromR][fromC];
  if (!piece || piece.color !== cfg.color) return send(ws, { type: 'ERROR', message: 'Not your piece' });

  const validMoves = getValidMoves(board, fromR, fromC, gameState.enPassant[boardIdx], gameState.castling[boardIdx]);
  if (!validMoves.some(([r,c]) => r===toR && c===toC)) return send(ws, { type: 'ERROR', message: 'Illegal move' });

  const { newBoard, captured, newEnPassant, newCastling } = applyBoardMove(
    board, fromR, fromC, toR, toC, gameState.castling[boardIdx], promotion || 'Q'
  );

  gameState.boards[boardIdx] = newBoard;
  gameState.enPassant[boardIdx] = newEnPassant;
  gameState.castling[boardIdx] = newCastling;

  // Route captured piece to teammate's reserve
  if (captured && captured.type !== 'K') {
    const dest = CAPTURE_DEST[slot];
    gameState.reserves[dest.boardIdx][dest.color][captured.type]++;
  }

  // Switch turn
  gameState.currentTurn[boardIdx] = gameState.currentTurn[boardIdx] === 'w' ? 'b' : 'w';

  // Update check state
  const oppColor = cfg.color === 'w' ? 'b' : 'w';
  gameState.inCheck[boardIdx] = isInCheck(newBoard, oppColor) ? oppColor : null;

  // Check for game over
  checkGameOver(boardIdx, oppColor);
  broadcast({ type: 'STATE', state: publicState() });
}

function handleDrop(ws, msg) {
  const slot = clientMap.get(ws);
  if (slot === undefined) return send(ws, { type: 'ERROR', message: 'Not joined' });
  if (gameState.status !== 'playing') return send(ws, { type: 'ERROR', message: 'Game not started' });

  const { boardIdx, pieceType, row, col } = msg;
  const cfg = PLAYER_CONFIG[slot];

  if (cfg.boardIdx !== boardIdx) return send(ws, { type: 'ERROR', message: 'Wrong board' });
  if (gameState.currentTurn[boardIdx] !== cfg.color) return send(ws, { type: 'ERROR', message: 'Not your turn' });

  const board = gameState.boards[boardIdx];
  if (board[row][col]) return send(ws, { type: 'ERROR', message: 'Square occupied' });
  if (pieceType==='P' && (row===0||row===7)) return send(ws, { type: 'ERROR', message: 'Pawns cannot be placed on first or last rank' });

  const reserve = gameState.reserves[boardIdx][cfg.color];
  if (!reserve[pieceType] || reserve[pieceType] <= 0) return send(ws, { type: 'ERROR', message: 'Piece not in reserve' });

  // Apply drop
  board[row][col] = { type: pieceType, color: cfg.color };
  reserve[pieceType]--;

  // Switch turn
  gameState.currentTurn[boardIdx] = gameState.currentTurn[boardIdx] === 'w' ? 'b' : 'w';

  // Update check state on both boards (drop could create discovered... no, just update this board)
  const oppColor = cfg.color === 'w' ? 'b' : 'w';
  gameState.inCheck[boardIdx] = isInCheck(board, oppColor) ? oppColor : null;

  checkGameOver(boardIdx, oppColor);
  broadcast({ type: 'STATE', state: publicState() });
}

function handleGetDrops(ws, msg) {
  const slot = clientMap.get(ws);
  if (slot === undefined) return;
  const { boardIdx, pieceType } = msg;
  const board = gameState.boards[boardIdx];
  const squares = [];
  for (let r=0;r<8;r++) {
    for (let c=0;c<8;c++) {
      if (!board[r][c]) {
        if (pieceType==='P' && (r===0||r===7)) continue;
        squares.push([r,c]);
      }
    }
  }
  send(ws, { type: 'DROP_SQUARES', squares });
}

function handleReset(ws) {
  const slot = clientMap.get(ws);
  if (slot === undefined) return;
  gameState = createFreshGame();
  // Re-register all current clients
  for (const [w,s] of clientMap.entries()) {
    gameState.players[s] = `Player ${s+1}`;
  }
  if (gameState.players.filter(p=>p!==null).length === 4) gameState.status = 'playing';
  broadcast({ type: 'STATE', state: publicState() });
}

function checkGameOver(boardIdx, colorToCheck) {
  if (gameState.gameOver) return;
  const board = gameState.boards[boardIdx];
  // Checkmate: in check AND no valid moves AND partner has no pieces to bail them out
  // (Simplified: check + no moves = checkmate)
  if (isInCheck(board, colorToCheck) &&
      !hasAnyMoves(board, colorToCheck, gameState.enPassant[boardIdx], gameState.castling[boardIdx])) {
    const winningTeam = colorToCheck === 'b' ? 'A' : 'B';
    gameState.gameOver = `Team ${winningTeam} wins by checkmate on Board ${boardIdx+1}!`;
    gameState.status = 'over';
  }
}

function publicState() {
  return {
    boards: gameState.boards,
    currentTurn: gameState.currentTurn,
    reserves: gameState.reserves,
    enPassant: gameState.enPassant,
    castling: gameState.castling,
    players: gameState.players,
    gameOver: gameState.gameOver,
    status: gameState.status,
    inCheck: gameState.inCheck,
  };
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

console.log(`🎮 Bughouse Chess server running on ws://localhost:${PORT}`);
console.log('Waiting for 4 players to connect...');
