// App.tsx
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider as PaperProvider, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { bootstrapAuthToken } from './src/utils/api';

// Theme-Context
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

/* ---------- Statusbar Gradient (oberes Padding) ---------- */
function StatusBarGradient() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.card, colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, zIndex: 1 }}
    />
  );
}

/* ---------- Innerer App-Shell: Theme -> Navigation & Paper ---------- */
function AppShell() {
  const { colors, mode } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card: colors.bg,
      border: 'transparent',
      text: colors.text,
      primary: colors.accent,
    },
  };

  const paperTheme: MD3Theme = {
    ...MD3DarkTheme,
    dark: mode !== 'light',
    colors: {
      ...MD3DarkTheme.colors,
      primary: colors.accent,
      onPrimary: '#0c1a10',
      background: colors.bg,
      surface: colors.card,
      onSurface: colors.text,
      outline: 'rgba(255,255,255,0.12)',
    },
  };

  // Dunkles Design -> helle Symbole
  const barStyle: 'light' | 'dark' = 'light';

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style={barStyle} translucent backgroundColor="transparent" />
          <StatusBarGradient />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}

/* ---------- Root ---------- */
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await bootstrapAuthToken();
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Ganze App unter ThemeProvider legen */}
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}