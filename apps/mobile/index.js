// index.js – custom Expo entrypoint mit Filter für das nervige Feature-Flag-Log

// 1) Noisy "[runtime not ready] ... disableEventLoopOnBridgeless" Logs wegfiltern
const originalConsoleError = console.error;
console.error = (...args) => {
  const first = args[0];

  if (
    typeof first === 'string' &&
    first.includes("Could not access feature flag 'disableEventLoopOnBridgeless'")
  ) {
    // Dieses eine Log komplett ignorieren
    return;
  }

  originalConsoleError(...args);
};

// 2) Normaler Expo-Entrypoint
const { registerRootComponent } = require('expo');
const App = require('./App').default;

registerRootComponent(App);