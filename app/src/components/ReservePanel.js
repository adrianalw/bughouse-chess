import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PIECE_SYMBOLS, PIECE_NAMES } from '../chess/logic';

const ORDER = ['Q', 'R', 'B', 'N', 'P'];

export default function ReservePanel({ reserve, color, selectedDrop, onSelectDrop, label, interactive }) {
  if (!reserve) return null;
  const total = ORDER.reduce((s, t) => s + (reserve[t] || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} Reserve {total > 0 ? `(${total})` : '(empty)'}
      </Text>
      <View style={styles.row}>
        {ORDER.map(type => {
          const count = reserve[type] || 0;
          const isSelected = selectedDrop === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.pieceBtn,
                count === 0 && styles.empty,
                isSelected && styles.selected,
              ]}
              onPress={() => interactive && count > 0 && onSelectDrop && onSelectDrop(isSelected ? null : type)}
              disabled={!interactive || count === 0}
              activeOpacity={0.7}
            >
              <Text style={[styles.pieceText, color === 'w' ? styles.white : styles.black]}>
                {PIECE_SYMBOLS[color][type]}
              </Text>
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedDrop && (
        <Text style={styles.hint}>Tap a square on the board to drop {PIECE_NAMES[selectedDrop]}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e2d40',
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  label: {
    color: '#aab',
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  pieceBtn: {
    width: 52,
    height: 52,
    backgroundColor: '#2a3f5a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3a5070',
    position: 'relative',
  },
  empty: {
    opacity: 0.35,
  },
  selected: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a4a2a',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  pieceText: {
    fontSize: 28,
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
  badge: {
    position: 'absolute',
    top: 2,
    right: 4,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hint: {
    color: '#4CAF50',
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
