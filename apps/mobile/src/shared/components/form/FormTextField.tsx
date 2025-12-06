// src/shared/components/form/FormTextField.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { useTheme } from '@shared/theme/ThemeProvider';

type FormTextFieldProps = TextInputProps & {
  label: string;
  errorText?: string;
  inputRef?: React.Ref<RNTextInput>;
  rightAccessory?: React.ReactNode;
};

const FormTextField: React.FC<FormTextFieldProps> = ({
  label,
  errorText,
  inputRef,
  style,
  onFocus,
  onBlur,
  placeholderTextColor,
  rightAccessory,
  ...inputProps
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const resolvedPlaceholder =
    placeholderTextColor ?? 'rgba(255,255,255,0.35)';

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.glass,
              borderColor: focused ? colors.accent : colors.glassBorder,
              color: colors.text,
            },
            rightAccessory ? { paddingRight: 50 } : undefined,
            style,
          ]}
          placeholderTextColor={resolvedPlaceholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />

        {rightAccessory ? (
          <View style={styles.rightAccessory} pointerEvents="box-none">
            {rightAccessory}
          </View>
        ) : null}
      </View>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldWrap: {
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 6,
    opacity: 0.92,
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    fontSize: 16,
    fontWeight: '600',
  },
  rightAccessory: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#ff9a9a',
  },
});

export default FormTextField;