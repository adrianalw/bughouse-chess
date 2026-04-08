import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert
} from 'react-native';
import ChessBoard from '../components/ChessBoard';
import ReservePanel from '../components/ReservePanel';
import PromotionModal from '../components/PromotionModal';
import { useGame, PLAYER_CONFIG } from '../context/GameContext';
import { getValidMoves, getDropSquares, isInCheck } from '../chess/logic';

export default function GameScreen() {
  const { state, mySlot, myConfig, sendMove, sendDrop, sendReset, disconnect } = useGame();
  const [activeTab, setActiveTab] = useState(myConfig?.boardIdx ?? 0);
  const [selected, setSelected] = useState(null);     // { r, c }
  const [validMoves, setValidMoves] = useState([]);
  const [selectedDrop, setSelectedDrop] = useState(null); // piece type string
  const [dropSquares, setDropSquares] = useState([]);
  const [promotion, setPromotion] = useState(null);   // { boardIdx, fromR, fromC, toR, toC }

  if (!state) return null;

  const myBoard = myConfig?.boardIdx ?? 0;
  const myColor = myConfig?.color ?? 'w';
  const isMyBoard = (tabIdx) => tabIdx === myBoard;
  const isMyTurn = (boardIdx) =>
    boardIdx === myBoard && state.currentTurn[boardIdx] === myColor;

  const handleSquarePress = useCallback((r, c, boardIdx) => {
    if (!isMyBoard(boardIdx) || !isMyTurn(boardIdx)) return;
    if (state.gameOver) return;

    const board = state.boards[boardIdx];
    const piece = board[r][c];

    // Drop mode
    if (selectedDrop) {
      if (!piece) {
        if (selectedDrop === 'P' && (r === 0 || r === 7)) {
          Alert.alert('Invalid', 'Pawns cannot be placed on the first or last rank.');
          return;
        }
        sendDrop(boardIdx, selectedDrop, r, c);
        setSelectedDrop(null);
        setDropSquares([]);
      } else if (piece.color === myColor) {
        // Tap own piece: cancel drop, select piece instead
        setSelectedDrop(null);
        setDropSquares([]);
        const moves = getValidMoves(board, r, c, state.enPassant[boardIdx], state.castling[boardIdx]);
        setSelected({ r, c });
        setValidMoves(moves);
      }
      return;
    }

    // Moving mode: piece already selected
    if (selected) {
      const isValidTarget = validMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isValidTarget) {
        const movingPiece = board[selected.r][selected.c];
        // Pawn promotion
        if (movingPiece?.type === 'P' && ((myColor === 'w' && r === 0) || (myColor === 'b' && r === 7))) {
          setPromotion({ boardIdx, fromR: selected.r, fromC: selected.c, toR: r, toC: c });
        } else {
          sendMove(boardIdx, selected.r, selected.c, r, c, 'Q');
        }
        setSelected(null);
        setValidMoves([]);
        return;
      }
      // Re-select own piece
      if (piece && piece.color === myColor) {
        const moves = getValidMoves(board, r, c, state.enPassant[boardIdx], state.castling[boardIdx]);
        setSelected({ r, c });
        setValidMoves(moves);
        return;
      }
      // Click elsewhere: deselect
      setSelected(null);
      setValidMoves([]);
      return;
    }

    // Nothing selected yet
    if (piece && piece.color === myColor) {
      const moves = getValidMoves(board, r, c, state.enPassant[boardIdx], state.castling[boardIdx]);
      setSelected({ r, c });
      setValidMoves(moves);
    }
  }, [selected, validMoves, selectedDrop, myBoard, myColor, state, sendMove, sendDrop]);

  const handleDropSelect = useCallback((type) => {
    setSelected(null);
    setValidMoves([]);
    if (!type) {
      setSelectedDrop(null);
      setDropSquares([]);
      return;
    }
    setSelectedDrop(type);
    setDropSquares(getDropSquares(state.boards[myBoard], type));
  }, [state, myBoard]);

  const handlePromotion = (promotionType) => {
    if (!promotion) return;
    sendMove(promotion.boardIdx, promotion.fromR, promotion.fromC, promotion.toR, promotion.toC, promotionType);
    setPromotion(null);
  };

  const renderBoard = (boardIdx) => {
    const board = state.boards[boardIdx];
    const isMine = isMyBoard(boardIdx);
    const myTurn = isMyTurn(boardIdx);
    const flipped = isMine ? myColor === 'b' : false;

    // Find the 4 players on this board
    const whiteSlot = boardIdx === 0 ? 0 : 3;
    const blackSlot = boardIdx === 0 ? 2 : 1;
    const whiteName = state.players[whiteSlot] || `Player ${whiteSlot+1}`;
    const blackName = state.players[blackSlot] || `Player ${blackSlot+1}`;
    const whiteReserve = state.reserves[boardIdx]['w'];
    const blackReserve = state.reserves[boardIdx]['b'];
    const turn = state.currentTurn[boardIdx];
    const inCheckColor = state.inCheck[boardIdx];

    // Which reserve to show for interaction (only my board, my color)
    const myReserve = isMine ? state.reserves[boardIdx][myColor] : null;

    const topReserve   = flipped ? { reserve: whiteReserve, color: 'w', label: whiteName, slot: whiteSlot } : { reserve: blackReserve, color: 'b', label: blackName, slot: blackSlot };
    const bottomReserve = flipped ? { reserve: blackReserve, color: 'b', label: blackName, slot: blackSlot } : { reserve: whiteReserve, color: 'w', label: whiteName, slot: whiteSlot };

    return (
      <ScrollView style={styles.boardTab} contentContainerStyle={styles.boardTabContent}>
        {/* Status bar */}
        <View style={[styles.statusBar, myTurn && isMine ? styles.myTurnBar : {}]}>
          <Text style={styles.statusText}>
            {state.gameOver
              ? `🏆 ${state.gameOver}`
              : state.status === 'waiting'
              ? '⏳ Waiting for players...'
              : myTurn && isMine
              ? '⚡ YOUR TURN'
              : `${turn === 'w' ? '⬜' : '⬛'} ${turn === 'w' ? whiteName : blackName}'s turn`
            }
          </Text>
          {inCheckColor && !state.gameOver && (
            <Text style={styles.checkText}>♚ CHECK!</Text>
          )}
        </View>

        {/* Top player info */}
        <View style={styles.playerRow}>
          <Text style={[styles.playerName, turn !== (flipped ? 'w' : 'b') && styles.dimmed]}>
            {flipped ? `⬜ ${whiteName}` : `⬛ ${blackName}`}
            {turn === (flipped ? 'w' : 'b') ? ' 🔵' : ''}
          </Text>
        </View>

        {/* Top reserve (opponent or partner) */}
        <ReservePanel
          reserve={topReserve.reserve}
          color={topReserve.color}
          label={`${topReserve.label}`}
          interactive={false}
        />

        {/* Board */}
        <View style={styles.boardWrapper}>
          <ChessBoard
            board={board}
            flipped={flipped}
            validMoves={isMine && myTurn ? validMoves : []}
            dropSquares={isMine && myTurn && selectedDrop ? dropSquares : []}
            selectedSquare={isMine && myTurn && selected ? [selected.r, selected.c] : null}
            inCheck={inCheckColor}
            interactive={isMine && myTurn && !state.gameOver}
            onSquarePress={(r, c) => handleSquarePress(r, c, boardIdx)}
          />
        </View>

        {/* Bottom reserve (my reserve if my board) */}
        <ReservePanel
          reserve={bottomReserve.reserve}
          color={bottomReserve.color}
          label={`${bottomReserve.label}`}
          selectedDrop={isMine && myTurn && myColor === bottomReserve.color ? selectedDrop : null}
          onSelectDrop={isMine && myTurn && myColor === bottomReserve.color ? handleDropSelect : null}
          interactive={isMine && myTurn && myColor === bottomReserve.color && !state.gameOver}
        />

        {/* Bottom player */}
        <View style={styles.playerRow}>
          <Text style={[styles.playerName, turn !== (flipped ? 'b' : 'w') && styles.dimmed]}>
            {flipped ? `⬛ ${blackName}` : `⬜ ${whiteName}`}
            {turn === (flipped ? 'b' : 'w') ? ' 🔵' : ''}
          </Text>
        </View>

        {/* Board legend */}
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Team A</Text>
          <View style={[styles.dot, { backgroundColor: '#2196F3', marginLeft: 12 }]} />
          <Text style={styles.legendText}>Team B</Text>
          <View style={[styles.dot, { backgroundColor: '#e74c3c', marginLeft: 12 }]} />
          <Text style={styles.legendText}>Check</Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {[0, 1].map(idx => (
          <TouchableOpacity
            key={idx}
            style={[styles.tab, activeTab === idx && styles.activeTab]}
            onPress={() => {
              setActiveTab(idx);
              setSelected(null); setValidMoves([]);
              setSelectedDrop(null); setDropSquares([]);
            }}
          >
            <Text style={[styles.tabText, activeTab === idx && styles.activeTabText]}>
              {idx === myBoard ? '⭐ ' : ''}Board {idx + 1}
              {state.inCheck[idx] ? ' ♚' : ''}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.menuBtn} onPress={() => Alert.alert(
          'Menu',
          '',
          [
            { text: 'Reset Game', onPress: sendReset, style: 'destructive' },
            { text: 'Back to Lobby', onPress: disconnect },
            { text: 'Cancel', style: 'cancel' },
          ]
        )}>
          <Text style={styles.menuText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Board view */}
      {renderBoard(activeTab)}

      {/* Game over overlay */}
      {state.gameOver && (
        <View style={styles.gameOver}>
          <Text style={styles.gameOverText}>🏆 {state.gameOver}</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={sendReset}>
            <Text style={styles.resetText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resetBtn, { backgroundColor: '#555', marginTop: 8 }]} onPress={disconnect}>
            <Text style={styles.resetText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Promotion modal */}
      <PromotionModal
        visible={!!promotion}
        color={myColor}
        onSelect={handlePromotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1520',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111a28',
    borderBottomWidth: 1,
    borderBottomColor: '#2a3a50',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  activeTab: {
    borderBottomColor: '#2ecc71',
  },
  tabText: {
    color: '#667',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#2ecc71',
  },
  menuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  menuText: {
    color: '#aab',
    fontSize: 22,
    fontWeight: 'bold',
  },
  boardTab: {
    flex: 1,
  },
  boardTabContent: {
    paddingBottom: 32,
  },
  statusBar: {
    backgroundColor: '#1a2535',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  myTurnBar: {
    backgroundColor: '#1a3a25',
    borderLeftWidth: 4,
    borderLeftColor: '#2ecc71',
  },
  statusText: {
    color: '#dde',
    fontSize: 13,
    fontWeight: '600',
  },
  checkText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: 'bold',
  },
  playerRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  playerName: {
    color: '#ccd',
    fontSize: 14,
    fontWeight: '600',
  },
  dimmed: {
    opacity: 0.5,
  },
  boardWrapper: {
    alignItems: 'center',
    marginVertical: 12,
    paddingBottom: 16, // for file labels
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    color: '#667',
    fontSize: 11,
  },
  gameOver: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    backgroundColor: '#111a28',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  gameOverText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  resetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
