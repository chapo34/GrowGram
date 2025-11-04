// src/components/ThemeSwitcherRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const PRESETS = ['#4CAF50', '#45D19E', '#FFB74D', '#E9C86C'] as const;

export default function ThemeSwitcherRow() {
  const { mode, pref, setPref, accent, setAccent, colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.panel, borderColor: colors.glassBorder }]}>
      <Text style={[styles.title, { color: colors.text }]}>Theme</Text>

      <View style={styles.row}>
        {(['system', 'light', 'dark'] as const).map((m) => {
          const active = pref === m || (pref === 'system' && m === mode);
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setPref(m)}
              style={[
                styles.modeBtn,
                {
                  borderColor: active ? colors.accent : colors.glassBorder,
                  backgroundColor: active ? fade(colors.accent, 0.12) : 'transparent',
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Theme ${m}`}
            >
              <Text
                style={[
                  styles.modeText,
                  { color: active ? colors.accent : colors.muted },
                ]}
              >
                {m.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.title, { color: colors.text, marginTop: 12 }]}>Accent</Text>
      <View style={styles.row}>
        {PRESETS.map((hex) => {
          const active = accent.toLowerCase() === hex.toLowerCase();
          return (
            <TouchableOpacity
              key={hex}
              onPress={() => setAccent(hex)}
              style={[
                styles.colorDot,
                {
                  backgroundColor: hex,
                  borderColor: active ? colors.accentFg : colors.panelShadow,
                  transform: [{ scale: active ? 1.05 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Accent ${hex}`}
            />
          );
        })}
      </View>
    </View>
  );
}

function fade(rgbaOrHex: string, factor = 0.12) {
  if (rgbaOrHex.startsWith('rgba')) return rgbaOrHex.replace(/\d?\.?\d+\)$/,'') + `${factor})`;
  const h = rgbaOrHex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${factor})`;
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    opacity: 0.95,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 16,
    borderWidth: 2,
  },
});