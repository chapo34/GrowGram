// src/features/profile/theme/profileTheme.ts

// Zentrale Tokens NUR für den Profile-Bereich.
// Von hier aus stylen wir Header-Card, BioCard, Tags etc.

export const profileColors = {
  // Screen-Hintergrund
  screenBackgroundSoft: '#020304',
  screenBackgroundDeep: '#02070F',

  glowTop: 'rgba(34,197,94,0.28)',
  glowMid: 'rgba(22,163,74,0.5)',
  glowBottom: 'rgba(15,118,110,0.55)',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Akzente
  accent: '#22C55E',
  accentSoft: 'rgba(34,197,94,0.35)',
  accentStrong: '#4ADE80',

  // Rahmen / Divider
  divider: 'rgba(148,163,184,0.35)',

  // Cards
  cardBackground: 'rgba(6,12,10,0.82)',
  cardBorder: 'rgba(255,255,255,0.16)',
};

export const profileRadius = {
  screen: 32,
  card: 28,
  pill: 999,
};

export const profileSpacing = {
  screenPaddingHorizontal: 16,
  screenPaddingTopExtra: 10,
  sectionGap: 24,

  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
};

export type ProfileColors = typeof profileColors;
export type ProfileRadius = typeof profileRadius;
export type ProfileSpacing = typeof profileSpacing;