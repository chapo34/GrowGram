// src/shared/theme/themes.ts

export type ThemeName =
  | 'growgram-classic'
  | 'growgram-emerald'
  | 'growgram-halloween'
  | 'growgram-highcontrast';

export type GGColors = {
  // Backgrounds
  background: string;
  backgroundAlt: string;
  panel: string;
  surface: string;

  // Glass / Cards
  glass: string;
  glassBorder: string;

  // Brand / Buttons
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  accentFg: string;

  // Text
  text: string;
  textSoft: string;
  muted: string;

  // Inputs
  inputBg: string;
  inputBorder: string;

  // States
  danger: string;
  success: string;

  // Misc
  shadowStrong: string;
};

export type GGTheme = {
  name: ThemeName;
  colors: GGColors;
};

/* ------------------------------------------------------------------ */
/*  DEFAULT BRAND THEME – wie vor dem Umbau (knackiges GrowGram-Grün) */
/* ------------------------------------------------------------------ */

export const growgramClassic: GGTheme = {
  name: 'growgram-classic',
  colors: {
    // tiefer, satter Green-Dark-Background
    background: '#021007',
    backgroundAlt: '#061910',
    panel: '#071F12',
    surface: '#071F12',

    // Glas-Karte (Register/Login Card)
    glass: 'rgba(7, 31, 18, 0.96)',
    glassBorder: 'rgba(168, 255, 176, 0.45)',

    // Brand / Buttons – sehr kräftiges Neon-Grün
    primary: '#04FA70',
    primarySoft: 'rgba(4, 250, 112, 0.2)',
    accent: '#04FA70',          // gleiche Farbe wie primary
    accentSoft: 'rgba(4, 250, 112, 0.16)',
    accentFg: '#021207',        // dunkles Grün für Text auf Buttons

    // Textfarben – wie bisher
    text: '#F3F6F4',            // H1 / wichtige Texte
    textSoft: '#C8D6CF',        // Untertitel
    muted: '#9FB7A7',           // leichte Secondary-Labels

    // Inputs – dunkles Grün mit leuchtender Border
    inputBg: 'rgba(7, 31, 18, 0.96)',
    inputBorder: 'rgba(168, 255, 176, 0.45)',

    // Statusfarben
    danger: '#ff9a9a',
    success: '#7CFFB0',

    // Schattenfarbe z.B. für Cards/Buttons
    shadowStrong: 'rgba(0, 0, 0, 0.7)',
  },
};

/* ------------------------------------------------------------------ */
/*  OPTIONAL THEMES für später (Profil-Einstellungen)                 */
/* ------------------------------------------------------------------ */

// Etwas softer, „Premium-Emerald“
export const growgramEmerald: GGTheme = {
  name: 'growgram-emerald',
  colors: {
    ...growgramClassic.colors,
    background: '#020c09',
    backgroundAlt: '#04130e',
    glass: 'rgba(6, 35, 24, 0.96)',
    primary: '#00E676',
    accent: '#00E676',
    accentSoft: 'rgba(0, 230, 118, 0.16)',
  },
};

// Halloween / Orange-Collab Theme – NICHT Standard!
export const growgramHalloween: GGTheme = {
  name: 'growgram-halloween',
  colors: {
    ...growgramClassic.colors,
    background: '#050309',
    backgroundAlt: '#0B0612',
    panel: '#0E0A16',
    glass: 'rgba(15, 10, 24, 0.96)',
    glassBorder: 'rgba(255, 167, 38, 0.45)',
    primary: '#FFA726',
    primarySoft: 'rgba(255, 167, 38, 0.2)',
    accent: '#FFA726',
    accentSoft: 'rgba(255, 167, 38, 0.16)',
    accentFg: '#140800',
  },
};

// High-Contrast Theme – für Accessibility
export const growgramHighContrast: GGTheme = {
  name: 'growgram-highcontrast',
  colors: {
    ...growgramClassic.colors,
    background: '#000000',
    backgroundAlt: '#050505',
    panel: '#080808',
    glass: 'rgba(8, 8, 8, 0.96)',
    glassBorder: '#FFFFFF',
    primary: '#00FF7F',
    accent: '#00FF7F',
    accentSoft: 'rgba(0, 255, 127, 0.25)',
    text: '#FFFFFF',
    textSoft: '#E0E0E0',
    muted: '#B0B0B0',
  },
};

/* ------------------------------------------------------------------ */

export const themes: Record<ThemeName, GGTheme> = {
  'growgram-classic': growgramClassic,
  'growgram-emerald': growgramEmerald,
  'growgram-halloween': growgramHalloween,
  'growgram-highcontrast': growgramHighContrast,
};

// Standard-Theme: unser klassisches Neon-Green Brand-Theme
export const DEFAULT_THEME_NAME: ThemeName = 'growgram-classic';