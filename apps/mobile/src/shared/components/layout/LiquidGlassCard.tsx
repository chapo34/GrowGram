// apps/mobile/src/shared/components/layout/LiquidGlassCard.tsx

import React, { PropsWithChildren } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export type LiquidGlassCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  radius?: number;
  borderColors?: [string, string, ...string[]];
  backgroundColor?: string;
  showHighlight?: boolean;
}>;

/**
 * Reusable "Liquid Glass" Card – Basis für alle Glasscards.
 */
const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  style,
  contentStyle,
  blurIntensity = 90,
  radius = 24,
  borderColors = [
    'rgba(240,255,250,0.55)',
    'rgba(140,255,205,0.30)',
    'rgba(0,35,22,0.90)',
  ],
  // etwas dunkler, damit Inputs nicht im „Milchbalken“ schwimmen
  backgroundColor = 'rgba(4,16,11,0.78)',
  showHighlight = true,
}) => {
  return (
    <View
      style={[
        styles.outer,
        { borderRadius: radius },
        style,
      ]}
    >
      {/* zarter Rand mit leichtem 3D-Licht */}
      <LinearGradient
        colors={borderColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.border, { borderRadius: radius }]}
      >
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={[
            styles.blur,
            {
              borderRadius: radius,
              backgroundColor,
            },
          ]}
        >
          {/* sehr subtiler Top-Edge-Glanz (NICHT mehr über die Felder) */}
          {showHighlight && (
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.26)',
                'rgba(255,255,255,0.06)',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.9 }}
              style={[
                styles.shine,
                {
                  borderTopLeftRadius: radius,
                  borderTopRightRadius: radius,
                },
              ]}
            />
          )}

          <View style={[styles.content, contentStyle]}>
            {children}
          </View>
        </BlurView>
      </LinearGradient>
    </View>
  );
};

export default LiquidGlassCard;

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    shadowColor: '#16FF7A',
    shadowOpacity: 0.20,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  border: {
    padding: 1.4,
  },
  blur: {
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    left: -16,
    right: -16,
    top: -42,     // weiter nach oben, damit der Glanz NICHT mehr hinter dem Label sitzt
    height: 72,   // geringer, nur Kante + etwas Verlauf
    pointerEvents: 'none',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});