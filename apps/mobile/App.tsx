// App.tsx – zentraler Einstiegspunkt für Expo

import React from 'react';
import { LogBox } from 'react-native';

// 🔇 RN/Hermes-Bug ignorieren
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('disableEventLoopOnBridgeless')) {
    return;
  }
  originalConsoleError(...args);
};

LogBox.ignoreLogs([
  'disableEventLoopOnBridgeless',
  'Could not access feature flag',
]);

// ⬇️ WICHTIG: default import
import AppShell from './src/app/AppShell';

export default function App() {
  return <AppShell />;
}