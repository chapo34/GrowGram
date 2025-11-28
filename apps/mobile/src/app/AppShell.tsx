// src/app/AppShell.tsx
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Provider as PaperProvider, MD3DarkTheme, MD3Theme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootNavigator } from '@app/navigation/RootNavigator';
import { AuthProvider } from '@features/auth/context/AuthContext';
import { useTheme } from '@core/theme/ThemeProvider'; // <-- HIER: von @shared auf @core

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

export function AppShell() {
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
        <NavigationContainer theme={navTheme}>
          <View style={{ flex: 1 }}>
            <StatusBar style="light" translucent backgroundColor="transparent" />
            <StatusBarGradient />
            <RootNavigator />
          </View>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}