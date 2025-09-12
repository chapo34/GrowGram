// src/components/SkeletonCard.tsx
// Universelle Skeleton-/Shimmer-Karte auf Basis deines ThemeProviders.

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  /** Zeilen rechts neben dem Avatar (für Titel/Untertitel) */
  lines?: number;
  /** Avatar-Kreis links anzeigen */
  avatar?: boolean;
  /** Optionaler Medienblock (z. B. Bildplatzhalter unterhalb) */
  mediaHeight?: number | null;
  /** Zusätzliche Styles für die Karte */
  style?: StyleProp<ViewStyle>;
  /** Eckenradius der Karte */
  radius?: number;
};

/** Interner Shimmer-Overlay */
function ShimmerOverlay() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX }] }}>
        <LinearGradient
          // weicher „Wisch“-Glanz
          colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { width: 220 }]}
        />
      </Animated.View>
    </View>
  );
}

/** Hauptkomponente */
export default function SkeletonCard({
  lines = 2,
  avatar = true,
  mediaHeight = 160,
  style,
  radius = 16,
}: Props) {
  const { colors } = useTheme();

  // sanfte, theme-konsistente Töne
  const base = useMemo(() => colors.card, [colors.card]);
  const border = useMemo(() => colors.border ?? 'rgba(255,255,255,0.08)', [colors.border]);
  const fill  = useMemo(() => 'rgba(255,255,255,0.06)', []);
  const fill2 = useMemo(() => 'rgba(255,255,255,0.08)', []);

  return (
    <View style={[styles.card, { borderRadius: radius, backgroundColor: base, borderColor: border }, style]}>
      <View style={styles.row}>
        {avatar && <View style={[styles.avatar, { backgroundColor: fill2 }]} />}
        <View style={{ flex: 1, gap: 8 }}>
          {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.line,
                {
                  backgroundColor: fill,
                  width: i === 0 ? '72%' : i === 1 ? '52%' : `${60 - i * 6}%`,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {typeof mediaHeight === 'number' && mediaHeight > 0 && (
        <View style={[styles.media, { height: mediaHeight, backgroundColor: fill, borderRadius: radius - 4 }]} />
      )}

      <ShimmerOverlay />
    </View>
  );
}

/** Varianten für Listen (z. B. als Chat-Row-Placeholder) */
export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.rowOnly,
        {
          backgroundColor: colors.card,
          borderColor: colors.border ?? 'rgba(255,255,255,0.08)',
        },
        style,
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.10)' }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.line, { width: '65%', backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.line, { width: '45%', backgroundColor: 'rgba(255,255,255,0.06)' }]} />
      </View>
      <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.10)' }]} />
      <ShimmerOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  line: {
    height: 14,
    borderRadius: 8,
  },
  media: {
    width: '100%',
    marginTop: 8,
  },

  // Kompakte Row-Variante
  rowOnly: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});