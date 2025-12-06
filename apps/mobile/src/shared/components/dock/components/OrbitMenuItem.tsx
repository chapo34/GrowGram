// shared/components/dock/components/OrbitMenuItem.tsx

import React from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  ORBIT_CONFIG,
  ORBIT_RADIUS,
  DockTarget,
} from '../config/dockConfig';

interface OrbitMenuItemProps {
  item: (typeof ORBIT_CONFIG)[number];
  openAnim: Animated.Value;
  isActive: boolean;
  colors: any;
  onPress: (target: DockTarget) => void;
}

// exakt der Look, den du mochtest – nur mit Motion verfeinert
const ORBIT_SIZE = 52;
const ORBIT_GLOW_SIZE = 72;

const OrbitMenuItem: React.FC<OrbitMenuItemProps> = ({
  item,
  openAnim,
  isActive,
  colors,
  onPress,
}) => {
  const rad = (item.angleDeg * Math.PI) / 180;
  const r = ORBIT_RADIUS * (item.radiusFactor ?? 1);

  const targetX = Math.cos(rad) * r;
  const targetY = Math.sin(rad) * r;

  // Position
  const translateX = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetX],
  });

  const translateY = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, targetY],
  });

  // Sanfter „Pop-in“: erst klein, dann leicht overshoot
  const scale = openAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.3, 1.06, 1],
  });

  // Orbit soll nicht sofort sichtbar sein
  const opacity = openAnim.interpolate({
    inputRange: [0, 0.15],
    outputRange: [0, 1],
  });

  const handlePress = () => {
    onPress(item.target);
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      {/* sehr dezenter Outer Glow */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: isActive
              ? 'rgba(190, 255, 220, 0.20)'   // helleres, weiches Grün
              : 'rgba(120, 190, 150, 0.12)', // kaum sichtbar
            shadowColor: colors.accent,
            shadowOpacity: isActive ? 0.6 : 0.4,
          },
        ]}
      />

      {/* dünner, cleaner Ring (kein Platin-Kitsch) */}
      <View
        style={[
          styles.halo,
          {
            borderColor: isActive
              ? '#F5FFF8'                    // fast weiß
              : 'rgba(220, 240, 230, 0.75)', // dezentes Off-White
          },
        ]}
      />

      {/* eigentlicher Orbit-Button */}
      <Pressable
        onPress={handlePress}
        hitSlop={10}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: 'rgba(5, 20, 12, 0.98)',
            borderColor: isActive
              ? colors.accent
              : 'rgba(190, 255, 210, 0.7)',
            shadowColor: isActive ? colors.accent : '#000',
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={23}
          color={
            isActive
              ? '#FFFFFF'
              : 'rgba(240, 250, 244, 0.92)'
          }
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: ORBIT_GLOW_SIZE,
    height: ORBIT_GLOW_SIZE,
    borderRadius: ORBIT_GLOW_SIZE / 2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  halo: {
    position: 'absolute',
    width: ORBIT_SIZE + 4,
    height: ORBIT_SIZE + 4,
    borderRadius: (ORBIT_SIZE + 4) / 2,
    borderWidth: 1,
    opacity: 0.95,
  },
  button: {
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    borderRadius: ORBIT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    shadowOpacity: 0.5,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
});

export default OrbitMenuItem;