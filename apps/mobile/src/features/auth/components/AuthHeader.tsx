import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ⬅️ genau so wie im RootNavigator
import { useTheme } from '@core/theme/ThemeProvider';

const FULL_SUBTITLE =
  'Meld dich an und wachse mit der Cannabis Community.';

const AuthHeader: React.FC = () => {
  const { colors } = useTheme();
  const [typed, setTyped] = useState('');

  // --- Pulse für "Willkommen zurück" ---
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, {
          duration: 900,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1, {
          duration: 900,
          easing: Easing.in(Easing.quad),
        }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // --- Schreibmaschinen-Effekt ---
  useEffect(() => {
    let i = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (i <= FULL_SUBTITLE.length) {
        setTyped(FULL_SUBTITLE.slice(0, i));
        i += 1;
        setTimeout(tick, 28); // Geschwindigkeit
      }
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.titleRow, titleStyle]}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              textShadowColor: colors.panelShadow,
            },
          ]}
        >
          Willkommen zurück
        </Text>

        <View
          style={[
            styles.pill,
            {
              borderColor: colors.accent,
              backgroundColor: 'rgba(33,221,92,0.14)',
            },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              {
                color: colors.accent,
              },
            ]}
          >
            BETA
          </Text>
        </View>
      </Animated.View>

      <Text
        style={[
          styles.subtitle,
          {
            color: colors.muted,
          },
        ]}
        numberOfLines={3}
      >
        {typed}
        {/* Cursor nur während des Tippens */}
        {typed.length < FULL_SUBTITLE.length && (
          <Text style={styles.cursor}>|</Text>
        )}
      </Text>
    </View>
  );
};

export default AuthHeader;

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 8 },
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  cursor: {
    fontSize: 13,
    opacity: 0.9,
  },
});