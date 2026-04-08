// Bughouse Chess Logic — client side (ES modules)

export const createInitialBoard = () => {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  const back = ['R','N','B','Q','K','B','N','R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: 'b' };
    board[1][c] = { type: 'P', color: 'b' };
    board[6][c] = { type: 'P', color: 'w' };
    board[7][c] = { type: back[c], color: 'w' };
  }
  return board;
};

export const cloneBoard = (board) => board.map(row => row.map(cell => cell ? { ...cell } : null));

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export const findKing = (board, color) => {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].type === 'K' && board[r][c].color === color)
        return [r, c];
  return null;
};

const isSquareAttacked = (board, r, c, byColor) => {
  const pawnSrcRow = byColor === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const pc = c + dc;
    if (inBounds(pawnSrcRow, pc) && board[pawnSrcRow][pc] &&
        board[pawnSrcRow][pc].type === 'P' && board[pawnSrcRow][pc].color === byColor) return true;
  }
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r+dr, nc = c+dc;
    if (inBounds(nr,nc) && board[nr][nc] && board[nr][nc].type==='N' && board[nr][nc].color===byColor) return true;
  }
  for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    let nr=r+dr, nc=c+dc;
    while (inBounds(nr,nc)) {
      if (board[nr][nc]) { if (board[nr][nc].color===byColor && ['R','Q'].includes(board[nr][nc].type)) return true; break; }
      nr+=dr; nc+=dc;
    }
  }
  for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    let nr=r+dr, nc=c+dc;
    while (inBounds(nr,nc)) {
      if (board[nr][nc]) { if (board[nr][nc].color===byColor && ['B','Q'].includes(board[nr][nc].type)) return true; break; }
      nr+=dr; nc+=dc;
    }
  }
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr=r+dr, nc=c+dc;
    if (inBounds(nr,nc) && board[nr][nc] && board[nr][nc].type==='K' && board[nr][nc].color===byColor) return true;
  }
  return false;
};

export const isInCheck = (board, color) => {
  const king = findKing(board, color);
  if (!king) return true;
  return isSquareAttacked(board, king[0], king[1], color === 'w' ? 'b' : 'w');
};

const getPseudo = (board, r, c, enPassant, castling) => {
  const piece = board[r][c];
  if (!piece) return [];
  const { type, color } = piece;
  const opp = color === 'w' ? 'b' : 'w';
  const moves = [];

  const tryAdd = (nr, nc) => {
    if (inBounds(nr,nc) && (!board[nr][nc] || board[nr][nc].color===opp)) moves.push([nr,nc]);
  };
  const slide = (dirs) => {
    for (const [dr,dc] of dirs) {
      let nr=r+dr, nc=c+dc;
      while (inBounds(nr,nc)) {
        if (!board[nr][nc]) moves.push([nr,nc]);
        else { if (board[nr][nc].color===opp) moves.push([nr,nc]); break; }
        nr+=dr; nc+=dc;
      }
    }
  };

  switch(type) {
    case 'P': {
      const dir = color==='w'?-1:1;
      const startRow = color==='w'?6:1;
      if (inBounds(r+dir,c) && !board[r+dir][c]) {
        moves.push([r+dir,c]);
        if (r===startRow && !board[r+2*dir][c]) moves.push([r+2*dir,c]);
      }
      for (const dc of [-1,1]) {
        const nr=r+dir, nc=c+dc;
        if (inBounds(nr,nc)) {
          if (board[nr][nc] && board[nr][nc].color===opp) moves.push([nr,nc]);
          if (enPassant && enPassant[0]===nr && enPassant[1]===nc) moves.push([nr,nc]);
        }
      }
      break;
    }
    case 'N': for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) tryAdd(r+dr,c+dc); break;
    case 'B': slide([[1,1],[1,-1],[-1,1],[-1,-1]]); break;
    case 'R': slide([[0,1],[0,-1],[1,0],[-1,0]]); break;
    case 'Q': slide([[1,1],[1,-1],[-1,1],[-1,-1],[0,1],[0,-1],[1,0],[-1,0]]); break;
    case 'K':
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) tryAdd(r+dr,c+dc);
      if (castling && r===(color==='w'?7:0) && c===4) {
        const br = color==='w'?7:0;
        if (color==='w') {
          if (castling.wK && !board[br][5] && !board[br][6] && board[br][7]?.type==='R' && board[br][7]?.color==='w' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,5,opp)) moves.push([br,6]);
          if (castling.wQ && !board[br][3] && !board[br][2] && !board[br][1] && board[br][0]?.type==='R' && board[br][0]?.color==='w' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,3,opp)) moves.push([br,2]);
        } else {
          if (castling.bK && !board[br][5] && !board[br][6] && board[br][7]?.type==='R' && board[br][7]?.color==='b' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,5,opp)) moves.push([br,6]);
          if (castling.bQ && !board[br][3] && !board[br][2] && !board[br][1] && board[br][0]?.type==='R' && board[br][0]?.color==='b' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,3,opp)) moves.push([br,2]);
        }
      }
      break;
  }
  return moves;
};

export const getValidMoves = (board, r, c, enPassant, castling) => {
  const piece = board[r][c];
  if (!piece) return [];
  return getPseudo(board, r, c, enPassant, castling).filter(([nr,nc]) => {
    const nb = cloneBoard(board);
    if (piece.type==='P' && c!==nc && !board[nr][nc]) nb[r][nc]=null;
    if (piece.type==='K' && Math.abs(nc-c)===2) {
      if (nc>c) { nb[r][5]=nb[r][7]; nb[r][7]=null; }
      else { nb[r][3]=nb[r][0]; nb[r][0]=null; }
    }
    nb[nr][nc]=nb[r][c]; nb[r][c]=null;
    return !isInCheck(nb, piece.color);
  });
};

// Returns all squares a piece can be dropped on
export const getDropSquares = (board, pieceType) => {
  const squares = [];
  for (let r=0;r<8;r++) {
    for (let c=0;c<8;c++) {
      if (!board[r][c]) {
        if (pieceType==='P' && (r===0||r===7)) continue;
        squares.push([r,c]);
      }
    }
  }
  return squares;
};

export const PIECE_SYMBOLS = {
  w: { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙' },
  b: { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟' },
};

export const PIECE_NAMES = { K:'King', Q:'Queen', R:'Rook', B:'Bishop', N:'Knight', P:'Pawn' };
