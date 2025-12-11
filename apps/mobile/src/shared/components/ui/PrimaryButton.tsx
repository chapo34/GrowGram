// apps/mobile/src/shared/components/ui/PrimaryButton.tsx

import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  text?: string; // neue API
  label?: string; // alte API (Backward-compat)
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const PrimaryButton: React.FC<Props> = ({
  text,
  label,
  onPress,
  disabled,
  loading,
  style,
  iconLeft,
  iconRight,
}) => {
  const isDisabled = disabled || loading;
  const title = (label ?? text ?? "").toString();

  const enabledColors = ["#32E572", "#0FB755"] as const;
  const disabledColors = ["#255637", "#193C28"] as const;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.buttonBase,
        !isDisabled && pressed && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#F7FFF9" />
      ) : (
        <LinearGradient
          colors={isDisabled ? disabledColors : enabledColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.contentRow}>
            {iconLeft ? <View style={styles.iconLeft}>{iconLeft}</View> : null}
            <Text
              style={[
                styles.label,
                isDisabled && styles.labelDisabled,
              ]}
            >
              {title}
            </Text>
            {iconRight ? (
              <View style={styles.iconRight}>{iconRight}</View>
            ) : null}
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    height: 52,
    borderRadius: 999,
    overflow: "hidden",
    marginVertical: 8,
    shadowColor: "#00C76A",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  buttonDisabled: {
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  label: {
    color: "#F7FFF9",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  labelDisabled: {
    opacity: 0.8, // nicht komplett grau, nur leicht abgeschwächt
  },
});

export default PrimaryButton;