// apps/mobile/src/features/auth/theme/UltraGlassCard.tsx

import React, { PropsWithChildren } from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export type UltraGlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** Blur-Stärke – für „Hard Crystal“ ruhig hoch drehen */
  intensity?: number;
}>;

/**
 * UltraGlassCard
 * Hard Crystalline Glass · visionOS-Style
 *
 * Layer 1: Shadow Wrapper (floating shadow)
 * Layer 2: BlurView (Glass body + asymmetric border lighting)
 * Layer 3: Surface Sheen (very subtle TL → BR)
 * Layer 4: Content
 */
const UltraGlassCard: React.FC<UltraGlassCardProps> = ({
  children,
  style,
  borderRadius = 30,
  intensity = 68, // 60–70 für dicken, klaren Glass-Look
}) => {
  return (
    // Layer 1 – Floating Shadow
    <View
      style={[
        styles.shadowWrapper,
        { borderRadius },
        style,
      ]}
    >
      {/* Layer 2 – Glass Body */}
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[styles.glass, { borderRadius }]}
      >
        {/* Layer 3 – Surface Sheen (sehr subtil, damit der Hintergrund sichtbar bleibt) */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.10)', // Top-Left Specular
            'rgba(255,255,255,0.00)', // Bottom-Right klarer
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.surfaceSheen, { borderRadius }]}
        >
          {/* Layer 4 – Inhalt */}
          <View style={[styles.content, { borderRadius }]}>
            {children}
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

export default UltraGlassCard;

/**
 * Styles für „eingravierte“ Inputs innerhalb der GlassCard.
 * Nutze `...ultraGlassInputStyles.input` und bei Fokus zusätzlich
 * `...ultraGlassInputStyles.inputFocused`.
 */
export const ultraGlassInputStyles = StyleSheet.create({
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    // dunkler, transparenter Hintergrund → wirkt „recessed“ im Glas
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    color: '#F7FFF9',
  },
  inputFocused: {
    // etwas mehr Licht auf der Kante bei Fokus
    borderColor: 'rgba(168,255,176,0.70)',
    shadowColor: 'rgba(168,255,176,0.8)',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  // Layer 1 – Shadow Physics (floating)
  shadowWrapper: {
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Layer 2 – Hard Crystal Glass Body
  glass: {
    overflow: 'hidden',
    // leicht grünlich-dunkler Kern, aber nicht milchig
    backgroundColor: 'rgba(4, 20, 12, 0.55)',
    borderWidth: 1.2, // dünner, schärfer

    // Lichtquelle oben links → fast „cut glass“ Highlight
    borderTopColor: 'rgba(90, 89, 89, 0.88)',
    borderLeftColor: 'rgba(90, 89, 89, 0.88)',

    // Schattenseite: fast unsichtbar
    borderRightColor: 'rgba(90, 89, 89, 0.05)',
    borderBottomColor: 'rgba(90, 89, 89, 0.05)',
  },

  // Layer 3 – Surface Sheen
  surfaceSheen: {
    flex: 1,
  },

  // Layer 4 – Content
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'transparent',
  },
});