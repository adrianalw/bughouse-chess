import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PIECE_SYMBOLS } from '../chess/logic';

const PROMOTE_TYPES = ['Q', 'R', 'B', 'N'];

export default function PromotionModal({ visible, color, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Promote Pawn</Text>
          <Text style={styles.sub}>Choose a piece</Text>
          <View style={styles.row}>
            {PROMOTE_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={styles.btn}
                onPress={() => onSelect(type)}
              >
                <Text style={[styles.piece, color === 'w' ? styles.white : styles.black]}>
                  {PIECE_SYMBOLS[color][type]}
                </Text>
                <Text style={styles.name}>{type === 'Q' ? 'Queen' : type === 'R' ? 'Rook' : type === 'B' ? 'Bishop' : 'Knight'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: '#1a2a40',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3a5070',
    width: 300,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sub: {
    color: '#aab',
    fontSize: 13,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    width: 60,
    height: 72,
    backgroundColor: '#2a3f5a',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4a6080',
  },
  piece: {
    fontSize: 32,
  },
  white: {
    color: '#FFF8F0',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  black: {
    color: '#1C1C1C',
    textShadowColor: '#CCC',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  name: {
    color: '#ccc',
    fontSize: 9,
    marginTop: 4,
  },
});
