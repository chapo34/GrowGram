// src/features/auth/theme/authTheme.ts

export const authColors = {
  // Screen-Background
  bgGradient: ["#020807", "#02140C", "#020807"] as const,

  // Hintergrund-Blobs
  blobTopRight: "rgba(0, 180, 90, 0.25)",
  blobCenter: "rgba(0, 80, 40, 0.35)",
  blobBottom: "rgba(0, 130, 60, 0.22)",

  // Liquid Glass
  glassBorderFrom: "rgba(235,255,245,0.85)",
  glassBorderMid: "rgba(90,230,170,0.95)",
  glassBorderTo: "rgba(0,60,30,0.7)",
  glassFill: "rgba(0, 20, 10, 0.72)",

  // Brand / Buttons
  primary: "#21E26A",
  primaryTextOn: "#04130c",

  // Text
  textPrimary: "#FFFFFF",
  textSubtle: "rgba(230,255,240,0.75)",
  textMuted: "rgba(230,255,240,0.82)",
  link: "#93FFB2",
  linkAccent: "#FFD26A",
};

export type AuthColors = typeof authColors;