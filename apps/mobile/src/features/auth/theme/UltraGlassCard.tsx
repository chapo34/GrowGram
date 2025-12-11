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

type UltraGlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  intensity?: number;
}>;

/**
 * UltraGlassCard
 * - "Hard Crystal" Look (visionOS-like)
 * - Dünne, extrem helle Kante oben/links
 * - Kaum sichtbare Kante unten/rechts
 * - Floating Shadow via Wrapper
 */
const UltraGlassCard: React.FC<UltraGlassCardProps> = ({
  children,
  style,
  borderRadius = 28,
  intensity = 65,
}) => {
  return (
    <View
      style={[
        styles.shadowWrapper,
        { borderRadius },
        style,
      ]}
    >
      {/* Glas-Layer */}
      <BlurView
        intensity={intensity}
        tint="dark"
        style={[styles.glassCard, { borderRadius }]}
      >
        {/* Oberflächen-Glanz (sehr subtil, damit es nicht milchig wird) */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.10)', // leichte Kante oben links
            'rgba(255,255,255,0.00)', // auslaufend nach unten rechts
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.surfaceSheen, { borderRadius }]}
        >
          {/* Inhalt */}
          <View style={[styles.content, { borderRadius }]}>
            {children}
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

export default UltraGlassCard;

const styles = StyleSheet.create({
  /**
   * Shadow-Wrapper – Card "schwebt" über dem Hintergrund.
   * Wichtig: kein Hintergrund, nur Schatten.
   */
  shadowWrapper: {
    backgroundColor: 'transparent',
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.32,
    shadowRadius: 26,
    // Android Shadow
    elevation: 14,
  },

  /**
   * Glas-Layer – hier passiert der "Diamond Edge" Trick.
   */
  glassCard: {
    overflow: 'hidden',
    // kleine Grundtönung, damit der Blur nicht zu milchig wird
    backgroundColor: 'rgba(4,16,10,0.65)',

    // Dünne, harte Kante
    borderWidth: 1, // <= dünner = edler

    // Lichtquelle oben links → fast komplett weiß
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderLeftColor: 'rgba(255,255,255,0.9)',

    // Schattenseite fast unsichtbar
    borderRightColor: 'rgba(255,255,255,0.00)',
    borderBottomColor: 'rgba(255,255,255,0.00)',
  },

  /**
   * Oberflächen-Glanz – sehr dezenter Verlauf, damit der Hintergrund noch sichtbar bleibt.
   */
  surfaceSheen: {
    flex: 1,
  },

  /**
   * Innen-Layout der Card
   */
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(0,0,0,0.10)', // minimal dunkler, gibt "Dicke"
  },
});