// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, type ThemeColors, type ThemeMode } from './colors';

type ThemeCtx = {
  colors: ThemeColors;
  /** tatsächlich verwendeter Modus (system aufgelöst) */
  mode: 'light' | 'dark';
  /** User-Präferenz: 'light' | 'dark' | 'system' */
  pref: ThemeMode;
  setPref: (m: ThemeMode) => void;
  /** aktuelle Akzentfarbe (hex) */
  accent: string;
  setAccent: (hex: string) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  colors: DARK_COLORS,
  mode: 'dark',
  pref: 'dark',
  setPref: () => {},
  accent: DARK_COLORS.accent,
  setAccent: () => {},
});

const STORAGE_KEY = 'GG_THEME_PREF_V1';

function pickAccentFg(hex: string): string {
  // sehr einfache Kontrast-Schätzung (YIQ)
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0c1a10' : '#ffffff';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme(); // 'light' | 'dark' | null

  const [pref, setPrefState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<string>(DARK_COLORS.accent);

  const mode: 'light' | 'dark' = (pref === 'system' ? (sys ?? 'dark') : pref) as 'light' | 'dark';
  const base = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const colors = useMemo<ThemeColors>(
    () => ({
      ...base,
      accent,
      accentFg: pickAccentFg(accent),
    }),
    [base, accent]
  );

  const setPref = (m: ThemeMode) => {
    setPrefState(m);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ pref: m, accent })).catch(() => {});
  };

  const setAccent = (hex: string) => {
    setAccentState(hex);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ pref, accent: hex })).catch(() => {});
  };

  // Boot: gespeicherte Werte laden (fire & forget)
  React.useEffect(() => {
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

  const value: ThemeCtx = { colors, mode, pref, setPref, accent, setAccent };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}