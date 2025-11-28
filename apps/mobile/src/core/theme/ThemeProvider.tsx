// src/shared/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DARK_COLORS, LIGHT_COLORS, type ThemeColors, type ThemeMode } from './colors';

type ThemeCtx = {
  colors: ThemeColors;
  mode: 'light' | 'dark';
  pref: ThemeMode;
  setPref: (m: ThemeMode) => void;
  accent: string;
  setAccent: (hex: string) => void;
};

const STORAGE_KEY = 'GG_THEME_PREF_V1';

// Simple luminance-based contrast pick
function pickAccentFg(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0c1a10' : '#ffffff';
}

// derive a tasteful button gradient from a base accent
function deriveButtonGradient(accent: string, isDark: boolean) {
  const top = accent;
  const mid = shade(accent, isDark ? -28 : -18);
  const bottom = shade(accent, isDark ? -42 : -28);
  return [top, mid, bottom] as const;
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}

function shade(hex: string, delta: number) {
  const h = hex.replace('#', '');
  const r = clamp(parseInt(h.slice(0, 2), 16) + delta);
  const g = clamp(parseInt(h.slice(2, 4), 16) + delta);
  const b = clamp(parseInt(h.slice(4, 6), 16) + delta);
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const ThemeContext = createContext<ThemeCtx>({
  colors: {
    ...DARK_COLORS,
    accent: '#4CAF50',
    accentFg: '#0C1A12',
    buttonGradient: ['#4CAF50', '#358E45', '#2B7639'] as const,
    card: DARK_COLORS.panel,
  } as ThemeColors,
  mode: 'dark',
  pref: 'dark',
  setPref: () => {},
  accent: '#4CAF50',
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPrefState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<string>('#4CAF50'); // GrowGram brand

  const mode: 'light' | 'dark' = (pref === 'system' ? sys ?? 'dark' : pref) as
    | 'light'
    | 'dark';
  const base = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const colors: ThemeColors = useMemo(() => {
    const accentFg = pickAccentFg(accent);
    const buttonGradient = deriveButtonGradient(accent, mode === 'dark');

    return {
      ...base,
      card: base.panel,
      accent,
      accentFg,
      buttonGradient,
    };
  }, [base, accent, mode]);

  const setPref = (m: ThemeMode) => {
    setPrefState(m);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ pref: m, accent })).catch(() => {});
  };

  const setAccent = (hex: string) => {
    setAccentState(hex);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ pref, accent: hex })).catch(
      () => {}
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<{ pref: ThemeMode; accent: string }>;
        if (saved.pref) setPrefState(saved.pref);
        if (saved.accent) setAccentState(saved.accent);
      } catch {}
    })();
  }, []);

  return (
    <ThemeContext.Provider value={{ colors, mode, pref, setPref, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}