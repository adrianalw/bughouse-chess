import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useGame, PLAYER_CONFIG } from '../context/GameContext';

const TEAM_A_COLOR = '#4CAF50';
const TEAM_B_COLOR = '#2196F3';

export default function LobbyScreen() {
  const { connect, connected, error, state, mySlot } = useGame();
  const [serverUrl, setServerUrl] = useState('ws://localhost:8080');
  const [name, setName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [joining, setJoining] = useState(false);

  const handleJoin = () => {
    if (selectedSlot === null) return;
    if (!name.trim()) return;
    setJoining(true);
    connect(serverUrl.trim(), selectedSlot, name.trim());
    setTimeout(() => setJoining(false), 3000);
  };

  const playerCount = state ? state.players.filter(p => p !== null).length : 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.chess}>♟</Text>
          <Text style={styles.title}>Bughouse Chess</Text>
          <Text style={styles.subtitle}>4-Player Co-op Chess</Text>
        </View>

        {/* Rules card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to Play</Text>
          <Text style={styles.rule}>♟ 2 boards, 4 players, 2 teams</Text>
          <Text style={styles.rule}>♟ Capture a piece → your teammate can drop it</Text>
          <Text style={styles.rule}>♟ Drop captured pieces anywhere (not pawns on rank 1/8)</Text>
          <Text style={styles.rule}>♟ Checkmate either king on either board to win</Text>
        </View>

        {/* Connection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Server</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="ws://192.168.x.x:8080"
            placeholderTextColor="#556"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            {connected ? '🟢 Connected' : '⚪ Not connected'} {playerCount > 0 ? `· ${playerCount}/4 players` : ''}
          </Text>
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
            {/* Team A */}
            <View style={styles.team}>
              <Text style={[styles.teamLabel, { color: TEAM_A_COLOR }]}>Team A</Text>
              {[0, 1].map(slot => {
                const cfg = PLAYER_CONFIG[slot];
                const takenBy = state?.players[slot];
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
                      { borderColor: TEAM_A_COLOR + '88' },
                    ]}
                    onPress={() => !isTaken && setSelectedSlot(slot)}
                    disabled={isTaken}
                  >
                    <Text style={styles.slotName}>{cfg.label}</Text>
                    {takenBy ? (
                      <Text style={styles.slotPlayer}>
                        {isMine ? '👑 You' : `🙋 ${takenBy}`}
                      </Text>
                    ) : (
                      <Text style={styles.slotEmpty}>Open</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Team B */}
            <View style={styles.team}>
              <Text style={[styles.teamLabel, { color: TEAM_B_COLOR }]}>Team B</Text>
              {[2, 3].map(slot => {
                const cfg = PLAYER_CONFIG[slot];
                const takenBy = state?.players[slot];
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
                      { borderColor: TEAM_B_COLOR + '88' },
                    ]}
                    onPress={() => !isTaken && setSelectedSlot(slot)}
                    disabled={isTaken}
                  >
                    <Text style={styles.slotName}>{cfg.label}</Text>
                    {takenBy ? (
                      <Text style={styles.slotPlayer}>
                        {isMine ? '👑 You' : `🙋 ${takenBy}`}
                      </Text>
                    ) : (
                      <Text style={styles.slotEmpty}>Open</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
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
              {mySlot !== null ? '🔄 Rejoin' : '🎮 Join Game'}
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
    alignItems: 'center',
    paddingVertical: 24,
  },
  chess: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#8899bb',
    fontSize: 14,
    marginTop: 4,
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
  rule: {
    color: '#ccd',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 20,
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
  hint: {
    color: '#667',
    fontSize: 11,
    marginTop: 6,
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
