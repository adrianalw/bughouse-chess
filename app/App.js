import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameProvider, useGame } from './src/context/GameContext';
import DashboardScreen from './src/screens/DashboardScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import GameScreen from './src/screens/GameScreen';

function AppContent() {
  const { gameId, mySlot, state } = useGame();

  // No game selected → dashboard (connect + game list)
  if (gameId === null) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe}>
          <DashboardScreen />
        </SafeAreaView>
      </View>
    );
  }

  // Game selected but not yet playing → lobby (seat selection / waiting)
  const inGame = mySlot !== null && state !== null && state.status !== 'waiting';
  if (!inGame) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe}>
          <LobbyScreen />
        </SafeAreaView>
      </View>
    );
  }

  // All 4 joined and game is live
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <GameScreen />
      </SafeAreaView>
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
