// src/components/EmptyState.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export default function EmptyState({ title, subtitle, ctaLabel, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.sub, { color: colors.muted }]}>{subtitle}</Text>}
      {!!ctaLabel && (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, { backgroundColor: colors.accent }, pressed && { opacity: 0.9 }]}>
          <Text style={{ color: colors.accentFg, fontWeight: '900' }}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '900' },
  sub: { marginTop: 6 },
  btn: { marginTop: 12, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
});