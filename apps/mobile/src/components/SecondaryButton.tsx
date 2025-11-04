// src/components/SecondaryButton.tsx
import React, { useMemo, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  GestureResponderEvent,
  View,
  ActivityIndicator,
  Animated,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  text: string;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Style darf auch ein Array sein -> StyleProp<ViewStyle> */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  iconLeft?: React.ReactNode;
};

const RADIUS = 16;
const HEIGHT = 52;

export default function SecondaryButton({
  text,
  onPress,
  disabled,
  loading,
  style,
  testID,
  iconLeft,
}: Props) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const borderColor = useMemo(
    () => (disabled ? fade(colors.glassBorder, 0.55) : colors.glassBorder),
    [colors.glassBorder, disabled]
  );
  const bg = useMemo(
    () => (disabled ? fade(colors.glass, 0.6) : colors.glass),
    [colors.glass, disabled]
  );

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.985, useNativeDriver: false, speed: 40, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: false, speed: 30, bounciness: 8 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        testID={testID}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={0.9}
        style={[
          styles.wrap,
          {
            backgroundColor: bg,
            borderColor,
            shadowColor: colors.panelShadow,
          },
          (disabled || loading) && { opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        accessibilityLabel={text}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <View style={styles.topHighlight} />
        <View style={styles.contentRow}>
          {iconLeft ? <View style={{ marginRight: 8 }}>{iconLeft}</View> : null}
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
              {text}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function fade(rgbaOrHex: string, factor = 0.5) {
  if (rgbaOrHex.startsWith('rgba')) {
    const parts = rgbaOrHex.replace('rgba(', '').replace(')', '').split(',').map(p => p.trim());
    const [r, g, b, aRaw] = parts;
    const a = Math.max(0, Math.min(1, parseFloat(aRaw ?? '1') * factor));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const h = rgbaOrHex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${factor})`;
}

const styles = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 2,
    height: 10,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  contentRow: {
    minWidth: 120,
    paddingHorizontal: 18,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: { fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
});