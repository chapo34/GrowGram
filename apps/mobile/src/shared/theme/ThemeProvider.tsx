import React, { createContext, useContext } from 'react';
import { ColorValue } from 'react-native';

export type ThemeColors = {
  gold: ColorValue | undefined;
  bg: string;
  card: string;
  panel: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  borderSubtle: string;
  glass: string;
  glassBorder: string;
  text: string;
  muted: string;
  accent: string;
  accentFg: string;
};

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
};

const defaultColors: ThemeColors = {
  bg: '#020806',
  card: '#08140F',
  panel: '#091A12',
  surface: '#0f2219',
  surfaceVariant: '#10261c',
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: '#1a3627',
  glass: 'rgba(5,18,11,0.9)',
  glassBorder: 'rgba(168,255,176,0.22)',
  text: '#E6EAEF',
  muted: '#9fb7a5',
  accent: '#4CAF50',
  accentFg: '#041007',
  gold: undefined
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultColors,
  isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ThemeContext.Provider value={{ colors: defaultColors, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);