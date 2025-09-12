// src/components/Tabs.tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export type TabItem = { key: string; label: string; badge?: number };

type Props = {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
};

export default function Tabs({ items, value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: 'transparent' }]}>
      {items.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[
              styles.pill,
              { borderColor: active ? colors.accent : 'rgba(255,255,255,0.12)' },
            ]}
          >
            <Text style={{ color: active ? colors.accent : colors.muted, fontWeight: '800' }}>
              {t.label}
            </Text>
            {t.badge ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={{ color: colors.accentFg, fontSize: 11, fontWeight: '900' }}>
                  {t.badge > 99 ? '99+' : t.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  badge: { marginLeft: 4, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
});