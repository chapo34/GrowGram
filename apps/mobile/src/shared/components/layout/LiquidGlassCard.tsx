// src/shared/components/layout/LiquidGlassCard.tsx
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from './GlassCard';

export interface LiquidGlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * LiquidGlassCard:
 * - nutzt deine zentrale GlassCard als Basis
 * - fügt oben ein Lichtband + seitliche Highlights hinzu
 * - erzeugt den "liquid / 3D" Glass-Effekt
 */
const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  style,
}) => {
  return (
    <GlassCard style={[styles.baseCard, style]}>
      {/* oberes Lichtband */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.08)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.7 }}
        style={styles.topSheen}
      />

      {/* leichtes linkes Highlight */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(160,255,170,0.45)', 'transparent']}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.leftEdgeLight}
      />

      {/* leichtes rechtes Highlight */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(120,255,160,0.3)', 'transparent']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0, y: 0.9 }}
        style={styles.rightEdgeLight}
      />

      {children}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  baseCard: {
    overflow: 'hidden',
  },
  topSheen: {
    position: 'absolute',
    top: -20,
    left: -40,
    right: -40,
    height: 80,
  },
  leftEdgeLight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -60,
    width: 160,
  },
  rightEdgeLight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: -60,
    width: 160,
  },
});

export default LiquidGlassCard;