import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useGame, PLAYER_CONFIG } from '../context/GameContext';

const TEAM_A_COLOR = '#4CAF50';
const TEAM_B_COLOR = '#2196F3';

export default function LobbyScreen() {
  const { joinSlot, leaveGame, games, gameId, state, mySlot, error } = useGame();
  const [name, setName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [joining, setJoining] = useState(false);

  // Use live game state if available (after joining), otherwise fall back to game list entry
  const gamePlayers = state?.players ?? games.find(g => g.id === gameId)?.players ?? [null, null, null, null];
  const playerCount = gamePlayers.filter(p => p !== null).length;

  const handleJoin = () => {
    if (selectedSlot === null || !name.trim()) return;
    setJoining(true);
    joinSlot(selectedSlot, name.trim());
    setTimeout(() => setJoining(false), 3000);
  };

  const renderSlot = (slot, teamColor) => {
    const cfg = PLAYER_CONFIG[slot];
    const takenBy = gamePlayers[slot];
    const isTaken = takenBy && mySlot !== slot;
    const isMine = mySlot === slot;
    return (
      <TouchableOpacity
        key={slot}
        style={[
          styles.slotBtn,
          selectedSlot === slot && styles.slotSelected,
          isMine && styles.slotMine,
          isTaken && styles.slotTaken,
          { borderColor: teamColor + '88' },
        ]}
        onPress={() => !isTaken && setSelectedSlot(slot)}
        disabled={isTaken}
      >
        <Text style={styles.slotName}>{cfg.label}</Text>
        {takenBy ? (
          <Text style={styles.slotPlayer}>{isMine ? '👑 You' : `🙋 ${takenBy}`}</Text>
        ) : (
          <Text style={styles.slotEmpty}>Open</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={leaveGame}>
            <Text style={styles.backBtnText}>← Games</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Game Lobby</Text>
            <Text style={styles.gameIdText}>#{gameId}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.playerBadge}>{playerCount}/4</Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#556"
            maxLength={20}
          />
        </View>

        {/* Seat selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose Your Seat</Text>
          <View style={styles.teamsRow}>
            <View style={styles.team}>
              <Text style={[styles.teamLabel, { color: TEAM_A_COLOR }]}>Team A</Text>
              {[0, 1].map(slot => renderSlot(slot, TEAM_A_COLOR))}
            </View>
            <View style={styles.team}>
              <Text style={[styles.teamLabel, { color: TEAM_B_COLOR }]}>Team B</Text>
              {[2, 3].map(slot => renderSlot(slot, TEAM_B_COLOR))}
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Join button */}
        <TouchableOpacity
          style={[styles.joinBtn, (!name.trim() || selectedSlot === null) && styles.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={!name.trim() || selectedSlot === null || joining}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinBtnText}>
              {mySlot !== null ? '🔄 Change Seat' : '🎮 Join Game'}
            </Text>
          )}
        </TouchableOpacity>

        {state?.status === 'waiting' && playerCount < 4 && (
          <Text style={styles.waiting}>
            Waiting for {4 - playerCount} more player{4 - playerCount !== 1 ? 's' : ''}...
          </Text>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gameIdText: {
    color: '#8899bb',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  headerRight: {
    paddingLeft: 12,
  },
  playerBadge: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1a2535',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3a50',
  },
  cardTitle: {
    color: '#aabbd0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0d1520',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a3a50',
  },
  teamsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  team: {
    flex: 1,
  },
  teamLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  slotBtn: {
    backgroundColor: '#0d1a2a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 2,
  },
  slotSelected: {
    backgroundColor: '#1a3a20',
    borderColor: '#4CAF50',
  },
  slotMine: {
    borderColor: '#FFD700',
  },
  slotTaken: {
    opacity: 0.5,
  },
  slotName: {
    color: '#ccd',
    fontSize: 12,
    fontWeight: '600',
  },
  slotPlayer: {
    color: '#FFD700',
    fontSize: 11,
    marginTop: 2,
  },
  slotEmpty: {
    color: '#556',
    fontSize: 11,
    marginTop: 2,
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  joinBtn: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  joinBtnDisabled: {
    backgroundColor: '#1a4a2a',
    opacity: 0.6,
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  waiting: {
    color: '#aab',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
