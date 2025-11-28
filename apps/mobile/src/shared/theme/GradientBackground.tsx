import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeProvider';

const GradientBackground: React.FC = () => {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={['#020806', '#07160f', colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
};

export default GradientBackground;