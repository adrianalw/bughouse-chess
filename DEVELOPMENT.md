# Bughouse Chess — Developer Documentation

## Architecture Overview

The application follows a client-server architecture with a WebSocket-based real-time communication layer. All authoritative game logic runs on the server; the client is responsible for rendering, input handling, and requesting valid move squares.

```
┌──────────────────────────────────────────────────────────┐
│                   React Native App (Expo)                │
│                                                          │
│  LobbyScreen ──► GameContext (WebSocket) ──► GameScreen  │
│                        │                         │       │
│                        │                    ChessBoard   │
│                        │                    ReservePanel │
│                        │                 PromotionModal  │
└────────────────────────┼─────────────────────────────────┘
                         │ WebSocket (ws:// or wss://)
┌────────────────────────┼─────────────────────────────────┐
│              Node.js Server (server.js)                  │
│                        │                                 │
│            Game state management                         │
│            Player/slot management                        │
│                        │                                 │
│                  chessLogic.js                           │
│            (move validation, check detection,            │
│             castling, en passant, promotion)             │
└──────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Server is the single source of truth.** Clients never mutate local game state directly — they send messages and wait for the server to broadcast a `STATE` update.
- **Chess logic is duplicated.** `server/chessLogic.js` (CommonJS) and `app/src/chess/logic.js` (ES modules) share the same move validation logic. The server version is authoritative; the client version is used only for computing valid move highlights before a move is submitted.
- **Slot-based player model.** Players occupy one of 4 fixed slots that determine board, color, and team. This simplifies server-side state tracking.

---

## Project Structure

```
bughouse-chess/
├── server/
│   ├── server.js          # WebSocket server, game state, message handling
│   ├── chessLogic.js      # Authoritative chess move validation
│   └── package.json       # ws, nodemon
│
└── app/
    ├── App.js             # Root: wraps everything in GameProvider, routes screens
    ├── app.json           # Expo config (package name, icons, orientation)
    ├── eas.json           # EAS build profiles (development/preview/production)
    ├── babel.config.js
    └── src/
        ├── chess/
        │   └── logic.js           # Client-side chess logic (ES modules)
        ├── context/
        │   └── GameContext.js     # WebSocket connection, global game state
        ├── screens/
        │   ├── LobbyScreen.js     # Server URL input, name, seat selection
        │   └── GameScreen.js      # Board tabs, status bar, reserve UI
        └── components/
            ├── ChessBoard.js      # 8×8 grid renderer
            ├── ReservePanel.js    # Captured pieces, drop selection
            └── PromotionModal.js  # Pawn promotion piece chooser
```

---

## Game State

The server maintains a single global state object broadcast to all clients after every action.

```javascript
{
  // Two 8×8 boards. Each cell is null or a piece string like "wP", "bK".
  // Notation: color (w/b) + piece type (K/Q/R/B/N/P)
  boards: [
    [[null, "bR", ...], ...],  // Board 0 (8x8)
    [[null, "wR", ...], ...]   // Board 1 (8x8)
  ],

  // Whose turn it is on each board: 'w' (white) or 'b' (black)
  currentTurn: ['w', 'b'],

  // Pieces available to drop, per board, per color
  reserves: [
    { w: { P: 0, R: 0, N: 0, B: 0, Q: 0 }, b: { P: 0, R: 0, N: 0, B: 0, Q: 0 } },
    { w: { P: 0, R: 0, N: 0, B: 0, Q: 0 }, b: { P: 0, R: 0, N: 0, B: 0, Q: 0 } }
  ],

  // En passant target square per board, or null
  enPassant: [null, null],

  // Castling rights per board
  castling: [
    { wK: true, wQ: true, bK: true, bQ: true },
    { wK: true, wQ: true, bK: true, bQ: true }
  ],

  // Player name for each slot (null if not joined)
  players: [null, null, null, null],

  // null until game over, then a message string (e.g., "Team A wins!")
  gameOver: null,

  // 'waiting' | 'playing' | 'over'
  status: 'waiting',

  // Which color is in check on each board, or null
  inCheck: [null, null]
}
```

### Slot → Board/Color/Team mapping

| Slot | Board | Color | Team |
|------|-------|-------|------|
| 0    | 0     | White | A    |
| 1    | 1     | Black | A    |
| 2    | 0     | Black | B    |
| 3    | 1     | White | B    |

Teammates share reserves across boards: captures by Slot 0 go to Slot 1's reserve, and vice versa.

---

## WebSocket Protocol

All messages are JSON-encoded strings. The server listens on port `8080` (overridden via `PORT` env var).

### Client → Server

#### `JOIN`
Join a seat. Must be sent before any other messages.
```json
{ "type": "JOIN", "slot": 0, "name": "Alice" }
```
- `slot`: 0–3
- `name`: display name string

Responds with `JOINED` on success, `ERROR` if slot is taken.

#### `MOVE`
Make a chess move on a board.
```json
{
  "type": "MOVE",
  "boardIdx": 0,
  "fromR": 6, "fromC": 4,
  "toR": 4, "toC": 4,
  "promotion": "Q"
}
```
- `boardIdx`: 0 or 1
- `fromR`, `fromC`: source row/col (0 = rank 8, 7 = rank 1)
- `toR`, `toC`: destination row/col
- `promotion`: optional, only when a pawn reaches the last rank; `'Q' | 'R' | 'B' | 'N'`

Responds with a `STATE` broadcast on success, or `ERROR` on invalid move.

#### `DROP`
Drop a piece from the player's reserve onto the board.
```json
{ "type": "DROP", "boardIdx": 1, "pieceType": "N", "row": 3, "col": 4 }
```
- `pieceType`: `'P' | 'R' | 'N' | 'B' | 'Q'`
- `row`, `col`: target square

Responds with a `STATE` broadcast on success, or `ERROR` on invalid drop.

#### `GET_VALID_DROPS`
Ask the server which squares are valid for dropping a piece type.
```json
{ "type": "GET_VALID_DROPS", "boardIdx": 0, "pieceType": "P" }
```

Responds with `DROP_SQUARES`.

#### `RESET`
Reset the game to the initial state, keeping player names/slots.
```json
{ "type": "RESET" }
```

Responds with a `STATE` broadcast.

---

### Server → Client

#### `JOINED`
Confirms successful seat assignment.
```json
{
  "type": "JOINED",
  "slot": 0,
  "config": { "boardIdx": 0, "color": "w", "team": "A" }
}
```

#### `STATE`
Full game state broadcast. Sent to all connected clients after every state change.
```json
{ "type": "STATE", ...gameState }
```
See [Game State](#game-state) above for the full shape.

#### `DROP_SQUARES`
Response to `GET_VALID_DROPS`. Lists squares the piece can be dropped on.
```json
{ "type": "DROP_SQUARES", "squares": [[3, 4], [3, 5], [5, 2]] }
```

#### `ERROR`
Sent to the requesting client only when an action fails.
```json
{ "type": "ERROR", "message": "Slot already taken" }
```

---

## Component Reference

### `GameContext` (`src/context/GameContext.js`)

Provides global state and WebSocket interaction to the entire app via React context.

**State exposed:**
| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | WebSocket connection active |
| `gameState` | object | Latest `STATE` from server |
| `mySlot` | 0–3 \| null | This client's seat |
| `myConfig` | object | `{ boardIdx, color, team }` |
| `dropSquares` | array | Valid drop squares from last `GET_VALID_DROPS` |

**Functions exposed:**
| Function | Description |
|----------|-------------|
| `connect(url)` | Open WebSocket to server URL |
| `joinGame(slot, name)` | Send `JOIN` message |
| `makeMove(boardIdx, fromR, fromC, toR, toC, promotion)` | Send `MOVE` |
| `dropPiece(boardIdx, pieceType, row, col)` | Send `DROP` |
| `getValidDrops(boardIdx, pieceType)` | Send `GET_VALID_DROPS` |
| `resetGame()` | Send `RESET` |

### `LobbyScreen` (`src/screens/LobbyScreen.js`)

Handles pre-game setup: server URL input, player name, and seat selection. Navigates to `GameScreen` once `JOINED` is confirmed.

### `GameScreen` (`src/screens/GameScreen.js`)

Main game view. Contains:
- Board tabs (Board 1 / Board 2), with the player's own board starred
- Status bar (turn indicator, game over message)
- `ChessBoard` for the active board tab
- `ReservePanel` for the active board tab
- `PromotionModal` (shown on pawn promotion)

### `ChessBoard` (`src/components/ChessBoard.js`)

Renders an 8×8 grid. Handles tap input for move selection and drop placement.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `board` | 8×8 array | Current board state |
| `myColor` | `'w'` \| `'b'` | Player's color (for orientation) |
| `isMyTurn` | boolean | Whether this player can act |
| `selectedPiece` | object \| null | Currently selected piece `{ row, col }` |
| `validMoves` | array | Valid destination squares for selected piece |
| `dropSquares` | array | Valid squares for a drop |
| `inCheck` | `'w'` \| `'b'` \| null | Color currently in check |
| `onSquarePress` | function | Called with `(row, col)` on tap |

### `ReservePanel` (`src/components/ReservePanel.js`)

Shows pieces available to drop. Tapping a piece selects it (triggers `GET_VALID_DROPS`) and highlights it; tapping again deselects.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `reserve` | object | `{ P, R, N, B, Q }` counts |
| `myColor` | `'w'` \| `'b'` | Whose reserve to display |
| `selectedPiece` | string \| null | Currently selected piece type |
| `isMyTurn` | boolean | Whether interaction is enabled |
| `onPieceSelect` | function | Called with piece type string |

### `PromotionModal` (`src/components/PromotionModal.js`)

Modal dialog shown when a pawn reaches the promotion rank. Presents Q, R, B, N choices. Calls back with the chosen piece type.

---

## Chess Logic

Both `server/chessLogic.js` and `app/src/chess/logic.js` expose the same core functions:

| Function | Description |
|----------|-------------|
| `getValidMoves(board, row, col, enPassant, castling)` | Returns array of `[r, c]` squares the piece at `(row, col)` can move to legally |
| `applyMove(board, fromR, fromC, toR, toC, promotion)` | Returns new board state after applying a move |
| `isInCheck(board, color)` | Returns true if `color`'s king is in check |
| `isCheckmate(board, color, enPassant, castling)` | Returns true if `color` has no legal moves and is in check |

The server module additionally handles reserve transfers (cross-board piece sharing) and castling rights updates.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | WebSocket server port |

No `.env` file is needed. Set `PORT` in your hosting platform's environment settings.

---

## Build Profiles (EAS)

Defined in `app/eas.json`:

| Profile | Purpose | Output |
|---------|---------|--------|
| `development` | Local dev with Expo Go | Development build |
| `preview` | Internal testing | `.apk` (sideloadable) |
| `production` | Play Store submission | `.aab` (App Bundle) |

Build with: `eas build --platform android --profile <profile>`

---

## Adding Features

### Adding a new WebSocket message type

1. Add a handler in the `switch` block in `server/server.js`
2. Add a sender function in `GameContext.js`
3. Add a response handler in the `ws.onmessage` handler in `GameContext.js`

### Modifying chess rules

Edit `server/chessLogic.js` (authoritative). Mirror the change in `app/src/chess/logic.js` so move highlighting stays accurate.

### Adding a new screen

1. Create the component in `app/src/screens/`
2. Add navigation logic in `App.js` (the app uses manual state-based navigation, not React Navigation)
