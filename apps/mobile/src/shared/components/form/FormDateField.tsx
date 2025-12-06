// src/shared/components/form/FormDateField.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useTheme } from '@shared/theme/ThemeProvider';

type FormDateFieldProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  errorText?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

function formatDisplayDate(d: Date | null) {
  if (!d) return 'Auswählen';
  return d.toLocaleDateString();
}

const FormDateField: React.FC<FormDateFieldProps> = ({
  label,
  value,
  onChange,
  errorText,
  minimumDate,
  maximumDate,
}) => {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const maxDate = maximumDate ?? new Date();

  const handleChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        if (event.type === 'dismissed') {
          setShowPicker(false);
          return;
        }
        setShowPicker(false);
      }
      if (date) {
        onChange(date);
      }
    },
    [onChange]
  );

  const titleLabel = label.replace(' *', '');

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>

      {/* "Fake-Input" */}
      <Pressable
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.input,
          {
            backgroundColor: colors.glass,
            borderColor: colors.glassBorder,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: value ? colors.text : 'rgba(255,255,255,0.35)',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          {formatDisplayDate(value)}
        </Text>
      </Pressable>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : null}

      {/* iOS: Modal-Sheet */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.panel,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.glassBorder },
                ]}
              >
                <Text
                  style={[styles.modalLink, { color: '#A8FFB0' }]}
                  onPress={() => setShowPicker(false)}
                >
                  Abbrechen
                </Text>

                {/* ✅ Label statt hart "Geburtsdatum" */}
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: '800',
                    fontSize: 16,
                  }}
                >
                  {titleLabel}
                </Text>

                <Text
                  style={[styles.modalLink, { color: '#A8FFB0' }]}
                  onPress={() => setShowPicker(false)}
                >
                  Fertig
                </Text>
              </View>

              <DateTimePicker
                value={value || new Date(2000, 0, 1)}
                mode="date"
                display="inline"
                maximumDate={maxDate}
                minimumDate={minimumDate}
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showPicker && (
          <DateTimePicker
            value={value || new Date(2000, 0, 1)}
            mode="date"
            display="default"
            maximumDate={maxDate}
            minimumDate={minimumDate}
            onChange={handleChange}
          />
        )
      )}
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
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#ff9a9a',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  modalLink: {
    fontWeight: '700',
  },
});

export default FormDateField;