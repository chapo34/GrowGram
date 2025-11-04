// GrowGramMobile/src/components/TertiaryLink.tsx
import React, { memo, useMemo, useRef } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  Pressable,
  type GestureResponderEvent,
  type ViewStyle,
  type FlexAlignType,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';

type Size = 'sm' | 'md' | 'lg';
type Align = 'left' | 'center' | 'right';
type Variant = 'accent' | 'muted' | 'danger';

type Props = {
  text: string;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: ViewStyle;
  align?: Align;
  testID?: string;

  size?: Size;
  variant?: Variant;
  underline?: boolean;     // default true
  glow?: boolean;          // default true
  uppercase?: boolean;     // default false
  haptics?: 'light' | 'medium' | false;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

const SIZE_MAP: Record<Size, { font: number; padY: number }> = {
  sm: { font: 13, padY: 6 },
  md: { font: 16, padY: 8 },
  lg: { font: 18, padY: 10 },
};

function pickColor(variant: Variant, colors: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'muted':
      return colors.muted;
    case 'danger':
      return '#FF6B6B';
    default:
      return colors.accent;
  }
}

function fadeRgbaOrHex(c: string, a = 0.5) {
  if (c.startsWith('rgba')) return c.replace(/\d*\.?\d+\)\s*$/, `${a})`);
  const h = c.replace('#', '');
  const rr = parseInt(h.slice(0, 2), 16);
  const gg = parseInt(h.slice(2, 4), 16);
  const bb = parseInt(h.slice(4, 6), 16);
  return `rgba(${rr}, ${gg}, ${bb}, ${a})`;
}

function alignToAlignSelf(align: Align): FlexAlignType {
  return align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
}

function doHaptics(kind: 'light' | 'medium' | false) {
  if (!kind) return;
  const style =
    kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium;
  Haptics.impactAsync(style).catch(() => {});
}

const TertiaryLink = memo(function TertiaryLink({
  text,
  onPress,
  onLongPress,
  disabled,
  style,
  align = 'center',
  testID,
  size = 'md',
  variant = 'accent',
  underline = true,
  glow = true,
  uppercase = false,
  haptics = 'light',
  iconLeft,
  iconRight,
}: Props) {
  const { colors } = useTheme();

  const { font, padY } = SIZE_MAP[size];
  const color = pickColor(variant, colors);
  const dimmed = disabled ? fadeRgbaOrHex(color, 0.45) : color;

  // Press animation
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const underlineWidth = useRef(new Animated.Value(0)).current;
  const underlineOpacity = useRef(new Animated.Value(underline ? 1 : 0)).current;

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.985, useNativeDriver: false, speed: 30, bounciness: 0 }),
      Animated.timing(opacity, { toValue: 0.85, duration: 120, useNativeDriver: false }),
    ]).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: false, speed: 30, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: false }),
    ]).start();
  };

  // Animate underline on mount
  React.useEffect(() => {
    if (!underline) return;
    Animated.sequence([
      Animated.timing(underlineOpacity, { toValue: glow ? 0.9 : 1, duration: 200, useNativeDriver: false }),
      Animated.spring(underlineWidth, { toValue: 1, useNativeDriver: false, speed: 18, bounciness: 8 }),
    ]).start();
  }, [underline, glow]);

  const alignSelf = useMemo(() => alignToAlignSelf(align), [align]);

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity, alignSelf }, style]}>
      <Pressable
        testID={testID}
        disabled={!!disabled}
        onPress={(e) => {
          if (disabled) return;
          doHaptics(haptics);
          onPress?.(e);
        }}
        onLongPress={onLongPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityState={{ disabled: !!disabled }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={styles.wrap}
      >
        {/* Inhalt */}
        <Animated.View style={styles.row}>
          {iconLeft ? <Animated.View style={{ marginRight: 6 }}>{iconLeft}</Animated.View> : null}
          <Text
            numberOfLines={1}
            style={[
              styles.text,
              {
                color: dimmed,
                fontSize: font,
                textTransform: uppercase ? 'uppercase' : 'none',
                textShadowColor: glow ? fadeRgbaOrHex(color, 0.35) : 'transparent',
                textShadowOffset: glow ? { width: 0, height: 0 } : undefined,
                textShadowRadius: glow ? 6 : 0,
              },
            ]}
          >
            {text}
          </Text>
          {iconRight ? <Animated.View style={{ marginLeft: 6 }}>{iconRight}</Animated.View> : null}
        </Animated.View>

        {/* Underline (Glow) */}
        {underline && (
          <Animated.View
            style={[
              styles.underline,
              {
                backgroundColor: dimmed,
                opacity: underlineOpacity,
                // Breite wächst von 0 → 100%
                transform: [
                  {
                    scaleX: underlineWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </Pressable>
    </Animated.View>
  );
});

export default TertiaryLink;

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  underline: {
    height: 2,
    marginTop: 2,
    borderRadius: 2,
    alignSelf: 'stretch',
  },
});