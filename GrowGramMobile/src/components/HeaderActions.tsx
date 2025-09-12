// src/components/HeaderActions.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  onSearch?: () => void;
  onSettings?: () => void;
};

export default function HeaderActions({ onSearch, onSettings }: Props) {
  const { colors } = useTheme();
  const Btn = ({ label, onPress }: { label: string; onPress?: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
      <Text style={{ color: colors.text, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      <Btn label="Suchen" onPress={onSearch} />
      <Btn label="⚙︎" onPress={onSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
});