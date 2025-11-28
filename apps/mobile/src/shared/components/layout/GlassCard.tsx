import React from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shared/theme/ThemeProvider';

let BlurView: React.ComponentType<any> | null = null;
try {
  // optional – wenn expo-blur installiert ist
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlurView = require('expo-blur').BlurView;
} catch {
  BlurView = null;
}

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  glassOpacity?: number;
  edgeLight?: boolean;
  specularTop?: boolean;
  borderGlow?: number;
};

const GlassCard: React.FC<Props> = ({
  children,
  style,
  blurIntensity = 32,
  glassOpacity = 1,
  edgeLight,
  specularTop,
  borderGlow = 0,
}) => {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.inner,
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          opacity: glassOpacity,
        },
      ]}
    >
      {edgeLight && (
        <LinearGradient
          colors={['rgba(168,255,176,0.25)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {specularTop && (
        <LinearGradient
          colors={['rgba(255,255,255,0.12)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );

  return (
    <View
      style={[
        styles.outer,
        borderGlow
          ? {
              shadowColor: '#A8FFB0',
              shadowOpacity: borderGlow,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 8,
            }
          : null,
        style,
      ]}
    >
      {BlurView ? (
        <BlurView intensity={blurIntensity} tint="dark" style={styles.blur}>
          {content}
        </BlurView>
      ) : (
        content
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  blur: {
    borderRadius: 20,
  },
  inner: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
});

export default GlassCard;