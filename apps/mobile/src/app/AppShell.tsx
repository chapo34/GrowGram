// src/app/AppShell.tsx

import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  DefaultTheme,
  Theme as NavTheme,
} from '@react-navigation/native';
import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3Theme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import RootNavigator from '@app/navigation/RootNavigator';
import { navigationRef } from '@app/navigation/navigationRef';

import { AuthProvider } from '@features/auth/context/AuthContext';
import { ThemeProvider, useTheme } from '@core/theme/ThemeProvider';

// ---------------------------------------------------------------------------
// StatusBar Gradient
// ---------------------------------------------------------------------------

function StatusBarGradient() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.panel, colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        zIndex: 1,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Innerer Shell-Content (braucht Theme-Context)
// ---------------------------------------------------------------------------

const ShellContent: React.FC = () => {
  const { colors, mode } = useTheme();

  const navTheme: NavTheme = {
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
      onPrimary: colors.accentFg,
      background: colors.bg,
      surface: colors.panel,
      onSurface: colors.text,
      outline: colors.border,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <View style={{ flex: 1 }}>
            <StatusBar style="light" translucent backgroundColor="transparent" />
            <StatusBarGradient />
            <RootNavigator />
          </View>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
};

// ---------------------------------------------------------------------------
// Äußerer AppShell-Wrapper (Theme + SafeArea)
// ---------------------------------------------------------------------------

const AppShell: React.FC = () => {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ShellContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

export default AppShell;