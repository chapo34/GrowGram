// src/components/EyeGlassButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  visible: boolean;           // true = Passwort sichtbar
  onToggle: () => void;
  style?: ViewStyle;
  size?: number;              // Button-Kante (px)
  radius?: number;            // Eckenradius (px)
  disabled?: boolean;
};

export default function EyeGlassButton({
  visible,
  onToggle,
  style,
  size = 38,
  radius = 12,
  disabled,
}: Props) {
  const { colors, mode } = useTheme();

  const iconName = visible ? 'eye-off' : 'eye';
  const iconColor = mode === 'dark' ? '#EAF9EE' : '#0F1512';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
      style={[{ width: size, height: size, borderRadius: radius }, style]}
    >
      {/* Outer shadow for 3D depth */}
      <View style={[styles.shadow, { borderRadius: radius }]} />

      {/* Glass pill with subtle gradient */}
      <LinearGradient
        colors={[
          // leicht heller oben, minimal dunkler unten
          mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.5)',
          mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.18)',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.fill,
          {
            borderRadius: radius,
            borderColor: colors.glassBorder,
            backgroundColor: colors.glass,
          },
        ]}
      >
        {/* top specular highlight */}
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.spec, { borderTopLeftRadius: radius - 3, borderTopRightRadius: radius - 3 }]}
        />

        {/* bottom inner shadow */}
        <View style={[styles.inner, { borderBottomLeftRadius: radius - 2, borderBottomRightRadius: radius - 2 }]} />

        <Ionicons name={iconName} size={18} color={iconColor} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: -2,
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    overflow: 'hidden',
  },
  spec: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 2,
    height: 8,
  },
  inner: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 1,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});