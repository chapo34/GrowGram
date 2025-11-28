// src/setup/ignoreBridgelessWarning.ts
import { LogBox } from 'react-native';

if (__DEV__) {
  // Ursprüngliche console.error merken
  const originalConsoleError = console.error;

  console.error = (...args: any[]) => {
    const first = args[0];
    const msg = typeof first === 'string' ? first : '';

    // Alles, was diese Bridgeless-Message enthält, einfach schlucken
    if (msg.includes('disableEventLoopOnBridgeless')) {
      return;
    }

    // Rest normal loggen
    originalConsoleError(...args);
  };

  LogBox.ignoreLogs([
    "disableEventLoopOnBridgeless",
    "[runtime not ready]: console.error: Could not access feature flag 'disableEventLoopOnBridgeless'",
  ]);
}