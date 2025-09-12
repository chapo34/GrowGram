// Central color palettes + types

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  // Surfaces
  bg: string;
  bg2: string;
  card: string;
  card2: string;
  border: string;

  // Text
  text: string;
  muted: string;

  // Brand
  accent: string;
  accentFg: string;

  // Status (optional helpers)
  success: string;
  danger: string;
};

export const DARK_COLORS: ThemeColors = {
  bg: '#0b1f14',
  bg2: '#0e2419',
  card: '#0f2219',
  card2: '#122a1f',
  border: '#1e3a2d',

  text: '#E6EAEF',
  muted: '#9fb7a5',

  accent: '#4CAF50',
  accentFg: '#0c1a10',

  success: '#50C878',
  danger: '#ff5c5c',
};

export const LIGHT_COLORS: ThemeColors = {
  bg: '#f7faf7',
  bg2: '#eef5ef',
  card: '#ffffff',
  card2: '#f3f7f4',
  border: '#d8e6dc',

  text: '#0f1a14',
  muted: '#5e6e64',

  accent: '#2E7D32',
  accentFg: '#ffffff',

  success: '#2e7d32',
  danger: '#d32f2f',
};