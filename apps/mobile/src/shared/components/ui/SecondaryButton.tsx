import React, { ReactNode } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  text?: string;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
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
        styles.buttonBase,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {/* Gradient-Border → wirkt hochwertiger als plain border */}
      <LinearGradient
        colors={['#36D96A', '#1B8F45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.borderGradient}
      >
        <View style={styles.inner}>
          <View style={styles.contentRow}>
            {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
            <Text style={styles.label}>{title}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    height: 48,
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 6,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  borderGradient: {
    flex: 1,
    borderRadius: 999,
    padding: 1.2, // „Hairline“ Gradient-Border
  },
  inner: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', // leicht dunkler als Background → wirkt „eingelassen“
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  iconLeft: {
    marginRight: 8,
  },
  label: {
    color: '#A8FFB0',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

export default SecondaryButton;