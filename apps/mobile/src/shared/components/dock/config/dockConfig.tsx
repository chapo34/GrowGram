// shared/components/dock/config/dockConfig.ts

import { Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Basis-Layout
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Höhe, die der Screen für das Dock reservieren soll
export const DOCK_HEIGHT = 120;

// Radius, auf dem die Orbit-Buttons um Gowi kreisen
export const ORBIT_RADIUS = 145;

// Wie tief das Dock am unteren Rand sitzt (relativ zu safeArea bottom)
export const DOCK_LAYOUT = {
  // Orbit-Halbkreis (die 5 Bubbles)
  ORBIT_BOTTOM_OFFSET: -114,
  // Center-Gowi (leicht anders, damit es „eingesetzt“ wirkt)
  CENTER_BOTTOM_OFFSET: -5,
} as const;

// für den Gradient/Fan im Hintergrund, falls du es brauchst
export const DOCK_GEOMETRY = {
  SCREEN_WIDTH,
};

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type DockTarget = 'Home' | 'Explore' | 'PostCreate' | 'Chat' | 'Profile';

export type OrbitConfigItem = {
  key: DockTarget;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  target: DockTarget;
  angleDeg: number;
  radiusFactor: number;
};

// ---------------------------------------------------------------------------
// Orbit-Konfiguration (Winkel + „Nähe“)
// ---------------------------------------------------------------------------

export const ORBIT_CONFIG: readonly OrbitConfigItem[] = [
  {
    key: 'Home',
    icon: 'home-variant',
    target: 'Home',
    angleDeg: -156,
    radiusFactor: 0.7,
  },
  {
    key: 'Explore',
    icon: 'compass-outline',
    target: 'Explore',
    angleDeg: -121,
    radiusFactor: 0.92,
  },
  {
    key: 'PostCreate',
    icon: 'plus-box-outline',
    target: 'PostCreate',
    angleDeg: -90,
    radiusFactor: 1.0,
  },
  {
    key: 'Chat',
    icon: 'message-text-outline',
    target: 'Chat',
    angleDeg: -59,
    radiusFactor: 0.92,
  },
  {
    key: 'Profile',
    icon: 'account-circle-outline',
    target: 'Profile',
    angleDeg: -24,
    radiusFactor: 0.7,
  },
] as const;

// ---------------------------------------------------------------------------
// Helper für Screens (Padding unter dem ScrollView etc.)
// ---------------------------------------------------------------------------

export function getGrowDockSpace(safeBottom: number) {
  return safeBottom + DOCK_HEIGHT;
}