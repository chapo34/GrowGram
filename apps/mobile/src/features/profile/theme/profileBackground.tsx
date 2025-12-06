// src/features/profile/theme/profileBackground.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// unscharfer, realistischer Hintergrund aus assets
const profileBg = require('../../../assets/profile/profile-bg.png');

type Props = ViewProps & {
  children: React.ReactNode;
};

/**
 * Vollflächiger Profil-Background
 * - zeigt das unscharfe Bokeh-Bild
 * - dunkelt leicht ab (Vignette)
 * - kein weiterer Glow-Kram, damit der Screen clean wirkt
 */
const ProfileBackground: React.FC<Props> = ({
  children,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.root, style]} {...rest}>
      <ImageBackground
        source={profileBg}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      >
        {/* leichte Abdunklung + Vignette, damit Cards „leuchten“ */}
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.97)',
            'rgba(0,0,0,0.55)',
            'rgba(0,0,0,0.98)',
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020304', // Fallback falls Bild nicht lädt
  },
});

export default ProfileBackground;