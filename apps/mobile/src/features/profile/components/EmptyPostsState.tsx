// src/features/profile/components/EmptyPostsState.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  profileColors,
  profileSpacing,
  profileRadius,
} from '../theme/profileTheme';

export interface EmptyPostsStateProps {
  onPressCreatePost?: () => void;
}

export const EmptyPostsState: React.FC<EmptyPostsStateProps> = ({
  onPressCreatePost,
}) => {
  return (
    <View style={styles.card}>
      {/* kleine scribble-Line oben links wie im Mockup */}
      <View style={styles.scribbleLine} />

      <View style={styles.inner}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="image-outline"
            size={28}
            color={profileColors.accentStrong}
          />
        </View>
        <Text style={styles.title}>Noch keine Posts</Text>
        <Text style={styles.subtitle}>
          Teile deine ersten Grow-Momente mit der Community.
        </Text>
        <Pressable
          onPress={onPressCreatePost}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Ersten Post erstellen</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: profileColors.divider,
    backgroundColor: 'rgba(5, 9, 11, 0.95)',
    overflow: 'hidden',
    margin: profileSpacing.lg,
  },
  scribbleLine: {
    position: 'absolute',
    top: 10,
    left: 18,
    width: 60,
    height: 24,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 2,
    borderColor: profileColors.accentStrong,
    opacity: 0.6,
    transform: [{ rotate: '-8deg' }],
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: profileSpacing.lg,
    paddingVertical: profileSpacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: profileColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 11, 13, 0.9)',
  },
  title: {
    marginTop: profileSpacing.lg,
    color: profileColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: profileSpacing.sm,
    color: profileColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: profileSpacing.lg,
    paddingHorizontal: profileSpacing.xl,
    paddingVertical: profileSpacing.md,
    borderRadius: profileRadius.pill,
    backgroundColor: profileColors.accent,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: '#020304',
    fontWeight: '900',
    fontSize: 14,
  },
});

export default EmptyPostsState;