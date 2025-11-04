import React, { useMemo, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  View,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  text: string;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
};

const RADIUS = 18;
const HEIGHT = 56;

export default function PrimaryButton({
  text,
  onPress,
  disabled,
  loading,
  style,
  testID,
}: Props) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const gradient = useMemo(() => {
    const g = colors.buttonGradient;
    if (disabled) return [shade(g[0], -20), shade(g[1], -20), shade(g[2], -20)] as const;
    return g;
  }, [colors.buttonGradient, disabled]);

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      // WICHTIG: JS-Driven, KEIN Native Driver → verhindert Crash
      useNativeDriver: false,
      speed: 40,
      bounciness: 0,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: false,
      speed: 30,
      bounciness: 7,
    }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        testID={testID}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={0.9}
        style={styles.wrap}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        accessibilityLabel={text}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <View style={styles.outerShadow} />
        <LinearGradient
          colors={gradient}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.95 }}
          style={styles.fill}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.9 }}
            style={styles.shine}
          />
          <View style={styles.innerBevel} />
          <View style={styles.contentRow}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.accentFg} />
            ) : (
              <Text style={[styles.label, { color: colors.accentFg }]} numberOfLines={1}>
                {text}
              </Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function clamp(n: number) { return Math.max(0, Math.min(255, n)); }
function shade(hex: string, delta: number) {
  const h = hex.replace('#', '');
  const r = clamp(parseInt(h.slice(0, 2), 16) + delta);
  const g = clamp(parseInt(h.slice(2, 4), 16) + delta);
  const b = clamp(parseInt(h.slice(4, 6), 16) + delta);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

const styles = StyleSheet.create({
  wrap: { borderRadius: RADIUS, overflow: 'visible' },
  outerShadow: {
    position: 'absolute',
    left: 0, right: 0, top: 6, bottom: -2,
    borderRadius: RADIUS + 2,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  fill: {
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS,
  },
  contentRow: {
    minWidth: 120,
    paddingHorizontal: 18,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  shine: {
    position: 'absolute', top: 2, left: 3, right: 3, height: 16,
    borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS,
  },
  innerBevel: {
    position: 'absolute', left: 1, right: 1, bottom: 1, height: 18,
    borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
});