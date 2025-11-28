// src/shared/components/ui/SecondaryButton.tsx
import React, { ReactNode } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native';

type Props = {
  text?: string;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  iconLeft?: ReactNode;
};

const SecondaryButton: React.FC<Props> = ({
  text,
  label,
  onPress,
  disabled,
  style,
  iconLeft,
}) => {
  const title = (label ?? text ?? '').toString();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
        <Text style={styles.label}>{title}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
    marginVertical: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconLeft: {
    marginRight: 8,
  },
  label: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default SecondaryButton;