import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { PIECE_SYMBOLS, findKing } from '../chess/logic';

const { width: SCREEN_W } = Dimensions.get('window');
const BOARD_SIZE = Math.min(SCREEN_W - 16, 380);
const SQ = Math.floor(BOARD_SIZE / 8);

const LIGHT  = '#F0D9B5';
const DARK   = '#B58863';
const SEL    = '#6EC16E';
const MOVE_L = '#AADD88';
const MOVE_D = '#558844';
const CHECK  = '#E74C3C';
const DROP_L = '#88CCFF';
const DROP_D = '#4499CC';

export default function ChessBoard({
  board,
  flipped = false,
  validMoves = [],
  dropSquares = [],
  selectedSquare = null,
  inCheck = null,       // 'w' | 'b' | null
  interactive = true,
  onSquarePress,
}) {
  const rows = useMemo(() => flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7], [flipped]);
  const cols = useMemo(() => flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7], [flipped]);

  const moveSet = useMemo(() => new Set(validMoves.map(([r,c])=>`${r},${c}`)), [validMoves]);
  const dropSet = useMemo(() => new Set(dropSquares.map(([r,c])=>`${r},${c}`)), [dropSquares]);

  // Find king position if in check
  const checkKing = useMemo(() => inCheck ? findKing(board, inCheck) : null, [board, inCheck]);

  const getSquareBg = (r, c, isLight) => {
    const key = `${r},${c}`;
    const isSel = selectedSquare && selectedSquare[0]===r && selectedSquare[1]===c;
    const isKingCheck = checkKing && checkKing[0]===r && checkKing[1]===c;
    const isMove = moveSet.has(key);
    const isDrop = dropSet.has(key);

    if (isKingCheck) return CHECK;
    if (isSel) return SEL;
    if (isMove || isDrop) return isLight ? (isDrop ? DROP_L : MOVE_L) : (isDrop ? DROP_D : MOVE_D);
    return isLight ? LIGHT : DARK;
  };

  return (
    <View style={[styles.board, { width: SQ*8, height: SQ*8 }]}>
      {rows.map(r => (
        <View key={r} style={styles.row}>
          {cols.map(c => {
            const isLight = (r + c) % 2 === 0;
            const bg = getSquareBg(r, c, isLight);
            const piece = board[r][c];
            const key = `${r},${c}`;
            const isMove = moveSet.has(key);
            const isDrop = dropSet.has(key);
            const showDot = (isMove || isDrop) && !piece;
            const showRing = (isMove || isDrop) && piece;

            return (
              <TouchableOpacity
                key={c}
                style={[styles.square, { width: SQ, height: SQ, backgroundColor: bg }]}
                onPress={() => interactive && onSquarePress && onSquarePress(r, c)}
                activeOpacity={interactive ? 0.7 : 1}
              >
                {piece && (
                  <Text style={[
                    styles.piece,
                    { fontSize: SQ * 0.72 },
                    piece.color === 'w' ? styles.whitePiece : styles.blackPiece,
                  ]}>
                    {PIECE_SYMBOLS[piece.color][piece.type]}
                  </Text>
                )}
                {showDot && (
                  <View style={[styles.dot, { width: SQ*0.3, height: SQ*0.3, borderRadius: SQ*0.15 }]} />
                )}
                {showRing && (
                  <View style={[styles.ring, { width: SQ-4, height: SQ-4, borderRadius: (SQ-4)/2 }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {/* Rank & file labels */}
      <View style={styles.fileRow}>
        {cols.map(c => (
          <Text key={c} style={[styles.label, { width: SQ }]}>
            {String.fromCharCode(97 + c)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderWidth: 2,
    borderColor: '#2c1810',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  piece: {
    textAlign: 'center',
    lineHeight: undefined,
  },
  whitePiece: {
    color: '#FFF8F0',
    textShadowColor: '#1a1a1a',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  blackPiece: {
    color: '#1C1C1C',
    textShadowColor: '#E0E0E0',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  dot: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  fileRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -14,
    left: 0,
  },
  label: {
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
  },
});
