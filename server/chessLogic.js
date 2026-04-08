'use strict';

const createInitialBoard = () => {
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

const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

const cloneBoard = (board) => board.map(row => row.map(cell => cell ? { ...cell } : null));

const findKing = (board, color) => {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && board[r][c].type === 'K' && board[r][c].color === color)
        return [r, c];
  return null;
};

const isSquareAttacked = (board, r, c, byColor) => {
  // Pawns
  const pawnSrcRow = byColor === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const pc = c + dc;
    if (inBounds(pawnSrcRow, pc) && board[pawnSrcRow][pc] &&
        board[pawnSrcRow][pc].type === 'P' && board[pawnSrcRow][pc].color === byColor)
      return true;
  }
  // Knights
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r+dr, nc = c+dc;
    if (inBounds(nr,nc) && board[nr][nc] && board[nr][nc].type==='N' && board[nr][nc].color===byColor)
      return true;
  }
  // Rooks/Queens
  for (const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    let nr=r+dr, nc=c+dc;
    while (inBounds(nr,nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc].color===byColor && ['R','Q'].includes(board[nr][nc].type)) return true;
        break;
      }
      nr+=dr; nc+=dc;
    }
  }
  // Bishops/Queens
  for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    let nr=r+dr, nc=c+dc;
    while (inBounds(nr,nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc].color===byColor && ['B','Q'].includes(board[nr][nc].type)) return true;
        break;
      }
      nr+=dr; nc+=dc;
    }
  }
  // King
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr=r+dr, nc=c+dc;
    if (inBounds(nr,nc) && board[nr][nc] && board[nr][nc].type==='K' && board[nr][nc].color===byColor)
      return true;
  }
  return false;
};

const isInCheck = (board, color) => {
  const king = findKing(board, color);
  if (!king) return true;
  return isSquareAttacked(board, king[0], king[1], color === 'w' ? 'b' : 'w');
};

const getPseudoMoves = (board, r, c, enPassant, castling) => {
  const piece = board[r][c];
  if (!piece) return [];
  const { type, color } = piece;
  const opp = color === 'w' ? 'b' : 'w';
  const moves = [];

  const tryAdd = (nr, nc) => {
    if (inBounds(nr,nc) && (!board[nr][nc] || board[nr][nc].color===opp))
      moves.push([nr,nc]);
  };
  const slide = (dirs) => {
    for (const [dr,dc] of dirs) {
      let nr=r+dr, nc=c+dc;
      while (inBounds(nr,nc)) {
        if (!board[nr][nc]) { moves.push([nr,nc]); }
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
    case 'N':
      for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        tryAdd(r+dr,c+dc);
      break;
    case 'B': slide([[1,1],[1,-1],[-1,1],[-1,-1]]); break;
    case 'R': slide([[0,1],[0,-1],[1,0],[-1,0]]); break;
    case 'Q': slide([[1,1],[1,-1],[-1,1],[-1,-1],[0,1],[0,-1],[1,0],[-1,0]]); break;
    case 'K':
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        tryAdd(r+dr,c+dc);
      if (castling && r===(color==='w'?7:0) && c===4) {
        const br = color==='w'?7:0;
        if (color==='w') {
          if (castling.wK && !board[br][5] && !board[br][6] &&
              board[br][7] && board[br][7].type==='R' && board[br][7].color==='w' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,5,opp))
            moves.push([br,6]);
          if (castling.wQ && !board[br][3] && !board[br][2] && !board[br][1] &&
              board[br][0] && board[br][0].type==='R' && board[br][0].color==='w' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,3,opp))
            moves.push([br,2]);
        } else {
          if (castling.bK && !board[br][5] && !board[br][6] &&
              board[br][7] && board[br][7].type==='R' && board[br][7].color==='b' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,5,opp))
            moves.push([br,6]);
          if (castling.bQ && !board[br][3] && !board[br][2] && !board[br][1] &&
              board[br][0] && board[br][0].type==='R' && board[br][0].color==='b' &&
              !isSquareAttacked(board,br,4,opp) && !isSquareAttacked(board,br,3,opp))
            moves.push([br,2]);
        }
      }
      break;
  }
  return moves;
};

const getValidMoves = (board, r, c, enPassant, castling) => {
  const piece = board[r][c];
  if (!piece) return [];
  return getPseudoMoves(board, r, c, enPassant, castling).filter(([nr,nc]) => {
    const nb = cloneBoard(board);
    if (piece.type==='P' && c!==nc && !board[nr][nc]) nb[r][nc]=null; // en passant
    if (piece.type==='K' && Math.abs(nc-c)===2) {
      if (nc>c) { nb[r][5]=nb[r][7]; nb[r][7]=null; }
      else { nb[r][3]=nb[r][0]; nb[r][0]=null; }
    }
    nb[nr][nc]=nb[r][c]; nb[r][c]=null;
    return !isInCheck(nb, piece.color);
  });
};

const applyBoardMove = (board, r, c, nr, nc, castling, promotion='Q') => {
  const nb = cloneBoard(board);
  const piece = nb[r][c];
  let captured = nb[nr][nc];
  if (piece.type==='P' && c!==nc && !nb[nr][nc]) { captured=nb[r][nc]; nb[r][nc]=null; }
  if (piece.type==='K' && Math.abs(nc-c)===2) {
    if (nc>c) { nb[r][5]=nb[r][7]; nb[r][7]=null; }
    else { nb[r][3]=nb[r][0]; nb[r][0]=null; }
  }
  nb[nr][nc]=piece; nb[r][c]=null;
  if (piece.type==='P' && (nr===0||nr===7)) nb[nr][nc]={type:promotion,color:piece.color};
  let newEnPassant=null;
  if (piece.type==='P' && Math.abs(nr-r)===2) newEnPassant=[(r+nr)/2,c];
  const newCastling={...castling};
  if (piece.type==='K') {
    if (piece.color==='w'){newCastling.wK=false;newCastling.wQ=false;}
    else{newCastling.bK=false;newCastling.bQ=false;}
  }
  if (piece.type==='R') {
    if(r===7&&c===7)newCastling.wK=false;if(r===7&&c===0)newCastling.wQ=false;
    if(r===0&&c===7)newCastling.bK=false;if(r===0&&c===0)newCastling.bQ=false;
  }
  if(nr===7&&nc===7)newCastling.wK=false;if(nr===7&&nc===0)newCastling.wQ=false;
  if(nr===0&&nc===7)newCastling.bK=false;if(nr===0&&nc===0)newCastling.bQ=false;
  return { newBoard:nb, captured, newEnPassant, newCastling };
};

const hasAnyMoves = (board, color, enPassant, castling) => {
  for (let r=0;r<8;r++)
    for (let c=0;c<8;c++)
      if (board[r][c] && board[r][c].color===color)
        if (getValidMoves(board,r,c,enPassant,castling).length>0) return true;
  return false;
};

module.exports = { createInitialBoard, cloneBoard, findKing, isInCheck, getValidMoves, applyBoardMove, hasAnyMoves };
