// src/components/GlassCard.tsx
import React, { memo, forwardRef } from 'react';
import {
  View, StyleSheet, Image, Platform,
  type ViewStyle, type StyleProp, type ViewProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';

export type GlassCardProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  glassOpacity?: number;
  border?: boolean;
  grain?: boolean;
  grainOpacity?: number;
  radius?: number;
  padding?: number;
  edgeLight?: boolean;
  specularTop?: boolean;
  depthShadow?: 'none' | 'soft' | 'deep';
  borderGlow?: number;
  compact?: boolean;
} & Pick<ViewProps,'testID'|'accessibilityLabel'|'accessible'>;

const NOISE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEEAQAAARAAAAABm0nTAAAAACXBIWXMAAAsSAAALEgHS3X78AAAAXUlEQVR4nO3QMQEAAAgDINc/9E0Q4Gkq4GQy0wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgaTdsAAf2rqLsAAAAASUVORK5CYII=';

const GlassCard = forwardRef<View, GlassCardProps>(function GlassCard(
  {
    children, style, blurIntensity, glassOpacity = 1, border = true,
    grain = true, grainOpacity = 0.06, radius = 16, padding = 14,
    edgeLight = true, specularTop = true, depthShadow = 'deep',
    borderGlow = 0, compact = false, testID, accessibilityLabel, accessible,
  },
  ref
) {
  const { colors, mode } = useTheme();
  const computedBlur = blurIntensity ?? (mode === 'dark' ? 36 : 28);
  const shadowCfg =
    depthShadow === 'none'
      ? { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 }
      : depthShadow === 'soft' || compact
      ? { shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 }
      : { shadowOpacity: 0.26, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 7 };

  return (
    <View
      ref={ref}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      pointerEvents="box-none" // <<< Root fängt KEINE Touches ab
      style={[{
        borderRadius: radius,
        overflow: 'hidden',
        shadowColor: colors.panelShadow, ...shadowCfg,
        ...(Platform.OS === 'ios' ? { shouldRasterizeIOS: true } : null),
        ...(Platform.OS === 'android' ? { renderToHardwareTextureAndroid: true } : null),
      }, style]}
    >
      {/* ALLE Overlays: pointerEvents="none" */}
      <BlurView
        pointerEvents="none"
        intensity={computedBlur}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />

      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {
          backgroundColor: withOpacity(colors.glass, glassOpacity),
          borderWidth: border ? StyleSheet.hairlineWidth * 1.5 : 0,
          borderColor: border ? colors.glassBorder : 'transparent',
          borderRadius: radius,
        }]}
      />

      {edgeLight && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { left:1,right:1,top:1,bottom:1, borderRadius: radius - 0.5 }]}
        />
      )}

      {specularTop && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={{ position:'absolute', left:6, right:6, top:6, height:10,
            borderTopLeftRadius: Math.max(0, radius - 6),
            borderTopRightRadius: Math.max(0, radius - 6) }}
        />
      )}

      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.18)']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={{ position:'absolute', left:4, right:4, bottom:2, height:18,
          borderBottomLeftRadius: Math.max(0, radius - 4),
          borderBottomRightRadius: Math.max(0, radius - 4) }}
      />

      {borderGlow > 0 && (
        <LinearGradient
          pointerEvents="none"
          colors={[`rgba(255,255,255,${clamp01(0.14 * borderGlow)})`, 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={{ position:'absolute', left:2, right:2, top:2, height:8,
            borderTopLeftRadius: Math.max(0, radius - 4),
            borderTopRightRadius: Math.max(0, radius - 4) }}
        />
      )}

      {grain && !compact && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={{ uri: NOISE_BASE64 }} resizeMode="repeat" style={[styles.grain, { opacity: grainOpacity }]} />
        </View>
      )}

      {/* EINZIGE Ebene mit Touch-Events */}
      <View pointerEvents="auto" style={[styles.content, { padding }]}>
        {children}
      </View>
    </View>
  );
});

export default memo(GlassCard);

const styles = StyleSheet.create({
  grain: { position:'absolute', left:0, right:0, top:0, bottom:0 },
  content: { backgroundColor:'transparent' },
});

function withOpacity(color: string, factor: number) {
  if (factor >= 0.999) return color;
  if (color.startsWith('rgba')) {
    const m = color.match(/rgba\((\d+),\s?(\d+),\s?(\d+),\s?([0-9.]+)\)/i);
    if (!m) return color;
    const [_, r,g,b,a] = m;
    return `rgba(${r}, ${g}, ${b}, ${clamp01(parseFloat(a) * clamp01(factor))})`;
  }
  if (color.startsWith('rgb(')) {
    const m = color.match(/rgb\((\d+),\s?(\d+),\s?(\d+)\)/i);
    if (!m) return color;
    const [_, r,g,b] = m;
    return `rgba(${r}, ${g}, ${b}, ${clamp01(factor)})`;
  }
  if (color.startsWith('#')) {
    const h = color.replace('#','');
    const rr = h.length===3 ? h[0]+h[0] : h.slice(0,2);
    const gg = h.length===3 ? h[1]+h[1] : h.slice(2,4);
    const bb = h.length===3 ? h[2]+h[2] : h.slice(4,6);
    return `rgba(${parseInt(rr,16)}, ${parseInt(gg,16)}, ${parseInt(bb,16)}, ${clamp01(factor)})`;
  }
  return color;
}
function clamp01(n:number){ return Math.max(0, Math.min(1, n)); }