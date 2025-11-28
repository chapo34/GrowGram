// App.tsx – zentraler Einstiegspunkt für Expo

import React from 'react';
import { LogBox } from 'react-native';

// 🔇 1) Speziellen RN/Hermes-Bug hart abfangen, bevor irgendwas anderes importiert wird
const originalConsoleError = console.error;

console.error = (...args: any[]) => {
  const first = args[0];

  // Alles, was mit diesem Bridgeless-Feature-Flag zu tun hat, einfach schlucken
  if (
    typeof first === 'string' &&
    first.includes("disableEventLoopOnBridgeless")
  ) {
    return;
  }

  // Alles andere normal loggen
  // @ts-ignore
  originalConsoleError(...args);
};

// 🔇 2) LogBox ruhigstellen (falls der Text noch wo anders auftaucht)
LogBox.ignoreLogs([
  'disableEventLoopOnBridgeless',
  'Could not access feature flag',
]);

// ⬇️ WICHTIG: AppShell **erst jetzt** importieren,
// damit der Patch oben schon aktiv ist, wenn RN anfängt zu meckern
import { AppShell } from './src/app/AppShell';

export default function App() {
  return <AppShell />;
}