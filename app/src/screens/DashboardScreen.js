import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useGame } from '../context/GameContext';

const STATUS_LABEL = { waiting: 'Waiting', playing: 'In Progress', over: 'Finished' };
const STATUS_COLOR = { waiting: '#4CAF50', playing: '#FFA726', over: '#888' };

export default function DashboardScreen() {
  const { connected, games, error, connectToServer, createGame, selectGame, disconnect } = useGame();
  const [serverUrl, setServerUrl] = useState('ws://localhost:8080');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    connectToServer(serverUrl);
    setTimeout(() => setConnecting(false), 3000);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.chess}>♟</Text>
          <Text style={styles.title}>Bughouse Chess</Text>
          <Text style={styles.subtitle}>4-Player Co-op Chess</Text>
        </View>

        {/* Server connection */}
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
            editable={!connected}
          />
          <View style={styles.row}>
            <Text style={styles.hint}>
              {connected ? '🟢 Connected' : '⚪ Not connected'}
            </Text>
            {!connected ? (
              <TouchableOpacity style={styles.connectBtn} onPress={handleConnect} disabled={connecting}>
                {connecting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.connectBtnText}>Connect</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.connectBtn, styles.disconnectBtn]} onPress={disconnect}>
                <Text style={styles.connectBtnText}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Game lobby — only shown when connected */}
        {connected && (
          <>
            {/* Create game */}
            <TouchableOpacity style={styles.createBtn} onPress={createGame}>
              <Text style={styles.createBtnText}>+ Create New Game</Text>
            </TouchableOpacity>

            {/* Game list */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active Games</Text>
              {games.length === 0 ? (
                <Text style={styles.emptyText}>No games yet. Create one to get started.</Text>
              ) : (
                games.map((g) => (
                  <View key={g.id} style={styles.gameRow}>
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameId}>#{g.id}</Text>
                      <View style={styles.gameDetails}>
                        <Text style={[styles.gameStatus, { color: STATUS_COLOR[g.status] }]}>
                          {STATUS_LABEL[g.status]}
                        </Text>
                        <Text style={styles.gamePlayers}>
                          {g.playerCount}/4 players
                        </Text>
                      </View>
                      {/* Show player names */}
                      <View style={styles.playerSlots}>
                        {g.players.map((name, i) => (
                          <Text key={i} style={[styles.slotChip, name ? styles.slotFilled : styles.slotEmpty]}>
                            {name ?? '—'}
                          </Text>
                        ))}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.joinBtn, g.status !== 'waiting' && styles.joinBtnDisabled]}
                      onPress={() => g.status === 'waiting' && selectGame(g.id)}
                      disabled={g.status !== 'waiting'}
                    >
                      <Text style={styles.joinBtnText}>
                        {g.status === 'waiting' ? 'Join' : g.status === 'playing' ? 'Live' : 'Done'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Rules */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How to Play</Text>
              <Text style={styles.rule}>♟ 2 boards, 4 players, 2 teams</Text>
              <Text style={styles.rule}>♟ Capture a piece → your teammate can drop it</Text>
              <Text style={styles.rule}>♟ Drop captured pieces anywhere (not pawns on rank 1/8)</Text>
              <Text style={styles.rule}>♟ Checkmate either king on either board to win</Text>
            </View>
          </>
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
  input: {
    backgroundColor: '#0d1520',
    color: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a3a50',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: {
    color: '#667',
    fontSize: 11,
  },
  connectBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    minWidth: 80,
    alignItems: 'center',
  },
  disconnectBtn: {
    backgroundColor: '#555',
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  createBtn: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#556',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3a50',
  },
  gameInfo: {
    flex: 1,
  },
  gameId: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  gameDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gameStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  gamePlayers: {
    color: '#889',
    fontSize: 12,
  },
  playerSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  slotChip: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotFilled: {
    backgroundColor: '#1e3a4a',
    color: '#7bc8e8',
  },
  slotEmpty: {
    backgroundColor: '#1a2530',
    color: '#445',
  },
  joinBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 10,
    alignItems: 'center',
    minWidth: 52,
  },
  joinBtnDisabled: {
    backgroundColor: '#333',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  rule: {
    color: '#ccd',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 20,
  },
});
