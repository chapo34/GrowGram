// src/shared/components/dock/GrowDock.tsx
import React from 'react';
import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@shared/theme/ThemeProvider';
import type { MainStackParamList } from '@app/navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type MainNav = NativeStackNavigationProp<MainStackParamList>;

export function getGrowDockSpace(insetsBottom: number): number {
  const BASE = 64;
  const SAFE = Math.max(insetsBottom, Platform.OS === 'ios' ? 10 : 0);
  return BASE + SAFE;
}

const GrowDock: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<MainNav>();
  const { colors } = useTheme();

  const height = getGrowDockSpace(insets.bottom);

  return (
    <View style={[styles.container, { height, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <LinearGradient
        colors={[colors.bg, colors.panel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      <View style={styles.row}>
        <DockButton label="Home" onPress={() => nav.navigate('Home')} />
        <DockButton label="Explore" onPress={() => nav.navigate('Explore')} />
        <DockButton label="Chat" onPress={() => nav.navigate('Chat')} />
        <DockButton label="Profil" onPress={() => nav.navigate('Profile')} />
      </View>
    </View>
  );
};

const DockButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}>
      <Text style={styles.btnLabel}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.98,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(5, 18, 11, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(168, 255, 176, 0.32)',
    alignItems: 'center',
  },
  btnLabel: {
    color: '#b6ffc3',
    fontWeight: '800',
    fontSize: 12,
  },
});

export default GrowDock;