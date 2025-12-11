import React, { ReactNode, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@shared/theme/ThemeProvider";

export type FieldProps = {
  label: string;
  focused: boolean;
  hasError?: boolean;
  onPress: () => void;
  children: ReactNode;
};

const Field: React.FC<FieldProps> = ({
  label,
  focused,
  hasError,
  onPress,
  children,
}) => {
  const { colors } = useTheme();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // wichtig für Color-Interpolation
    }).start();
  }, [focused, glow]);

  const shadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  // Border-Farbe animieren → iOS UND Android sichtbar
  const animatedBorderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.20)", colors.accent],
  });

  const borderColorStyle = hasError
    ? "#FF8A65" // Error-Look hat Priorität
    : (animatedBorderColor as unknown as string);

  return (
    <View style={styles.fieldWrap} pointerEvents="auto">
      <Text style={styles.label}>{label}</Text>

      <Animated.View
        style={[
          styles.animatedContainer,
          {
            borderColor: borderColorStyle,
            shadowColor: colors.accent,
            shadowRadius,
            shadowOpacity,
          },
          focused && { elevation: 6 },
        ]}
      >
        <Pressable
          onPress={onPress}
          style={styles.fieldPressable}
          android_disableSound
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldWrap: { marginTop: 12 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 6,
    opacity: 0.92,
    color: "rgba(255,255,255,0.82)",
  },
  animatedContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(0,0,0,0.24)",
    shadowOffset: { width: 0, height: 3 },
  },
  fieldPressable: {
    borderRadius: 16,
  },
});

export default Field;