import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onToggle: () => void;
  style?: ViewStyle | ViewStyle[];
};

const EyeGlassButton: React.FC<Props> = ({ visible, onToggle, style }) => {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons
        name={visible ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color="#E5FBEA"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 10, 6, 0.9)',
  },
  pressed: {
    opacity: 0.8,
  },
});

export default EyeGlassButton;