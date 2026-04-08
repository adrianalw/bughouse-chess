import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameProvider, useGame } from './src/context/GameContext';
import LobbyScreen from './src/screens/LobbyScreen';
import GameScreen from './src/screens/GameScreen';

function AppContent() {
  const { mySlot, state } = useGame();
  const inGame = mySlot !== null && state !== null && state.status !== 'waiting';

  // Show lobby if not in a game yet OR waiting for players
  const showLobby = mySlot === null || (state && state.status === 'waiting');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {showLobby ? (
        <SafeAreaView style={styles.safe}>
          <LobbyScreen />
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.safe} edges={['top']}>
          <GameScreen />
        </SafeAreaView>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1520',
  },
  safe: {
    flex: 1,
    backgroundColor: '#0d1520',
  },
});
