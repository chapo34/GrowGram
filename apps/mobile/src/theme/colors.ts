// src/theme/colors.ts

/** At least 2 stops for gradients (fixes expo-linear-gradient TS types) */
export type Gradient = readonly [string, string, ...string[]];

export type ThemeColors = {
  // Base
  bg: string;
  text: string;
  muted: string;

  // Panels / Glass / borders / shadows
  glass: string;        // semi-transparent input bg
  glassBorder: string;  // input/panel stroke
  panel: string;        // form panel background
  card: string;         // alias for panel (legacy-safe)
  panelShadow: string;  // big outer shadow

  // Accents / Brand
  accent: string;       // PRIMARY brand (#4CAF50 default for dark)
  accentFg: string;     // text on accent
  gold: string;         // CTA / links highlight

  // Gradients
  gradientBg: Gradient;     // page background
  rimLight: Gradient;       // subtle right glow
  buttonGradient: Gradient; // button fill (derived from accent in ThemeProvider)
};

export const DARK_COLORS: Omit<ThemeColors, 'accent' | 'accentFg' | 'buttonGradient' | 'card'> & {
  card?: string;
} = {
  // Forest–obsidian base
  bg: '#0A1511',
  text: '#F3F6F4',
  muted: '#C8D6CF',

  // Glass / panel
  glass: 'rgba(18,40,32,0.72)',
  glassBorder: 'rgba(170,255,210,0.14)',
  panel: 'rgba(10,25,19,0.85)',
  card: 'rgba(10,25,19,0.85)',
  panelShadow: 'rgba(10,20,16,0.9)',

  // Accents (placeholders – echte Werte werden in ThemeProvider gesetzt)
  gold: '#E9C86C',

  // Gradients
  gradientBg: ['#0B1612', '#0E1E19', '#0A1511'] as const,
  rimLight: ['rgba(0,0,0,0)', 'rgba(233,200,108,0.12)'] as const,
  // buttonGradient wird in ThemeProvider berechnet
} as const;

export const LIGHT_COLORS: Omit<ThemeColors, 'accent' | 'accentFg' | 'buttonGradient' | 'card'> & {
  card?: string;
} = {
  bg: '#F7FAF8',
  text: '#0F1512',
  muted: '#3B5147',

  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(0,0,0,0.08)',
  panel: 'rgba(255,255,255,0.85)',
  card: 'rgba(255,255,255,0.85)',
  panelShadow: 'rgba(0,0,0,0.08)',

  gold: '#B0872C',

  gradientBg: ['#F4FAF7', '#EAF3EE'] as const,
  rimLight: ['rgba(0,0,0,0)', 'rgba(176,135,44,0.15)'] as const,
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';