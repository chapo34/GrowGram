// src/features/profile/screens/ProfileSetupScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@core/theme/ThemeProvider';
import { useProfile } from '../hooks/useProfile';
import type { UpdateProfilePayload } from '../api/api';

const ProfileSetupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile, loading, saving, error, saveProfile } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialwerte aus Profil füllen
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setHandle(profile.handle ?? '');
    setCity(profile.city ?? '');
    setBio(profile.bio ?? '');
  }, [profile]);

  const onSave = async () => {
    setLocalError(null);
    setSaved(false);

    const patch: UpdateProfilePayload = {
      displayName: displayName.trim() || undefined,
      handle: handle.trim() || undefined,
      city: city.trim() || undefined,
      bio: bio.trim() || undefined,
      // avatarUrl / bannerUrl können wir später ergänzen
    };

    const result = await saveProfile(patch);

    if (!result.ok) {
      setLocalError(result.error ?? 'Profil konnte nicht gespeichert werden.');
      return;
    }

    setSaved(true);
    // Option: hier später navigation.goBack() etc.
  };

  const isBusy = loading || saving;

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        { backgroundColor: colors.bg, paddingTop: insets.top },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* Header */}
        <Text style={[styles.title, { color: colors.text }]}>
          Profil bearbeiten
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Passe deinen öffentlichen Auftritt bei GrowGram an. Name, Handle und
          Bio werden in deinem Profil und im Feed angezeigt.
        </Text>

        {/* Globaler Status */}
        {(error || localError || isBusy || saved) && (
          <View style={styles.statusRow}>
            {isBusy && (
              <>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text
                  style={[
                    styles.statusText,
                    { color: colors.muted },
                  ]}
                >
                  Profil wird gespeichert…
                </Text>
              </>
            )}

            {!isBusy && (error || localError) && (
              <>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={18}
                  color="#f97373"
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: '#f97373' },
                  ]}
                >
                  {localError ?? error}
                </Text>
              </>
            )}

            {!isBusy && !error && !localError && saved && (
              <>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={colors.accent}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: colors.accent },
                  ]}
                >
                  Profil gespeichert.
                </Text>
              </>
            )}
          </View>
        )}

        {/* Felder */}
        <Field
          label="Anzeigename"
          placeholder="z. B. MasterGrower"
          value={displayName}
          onChangeText={setDisplayName}
          colors={colors}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Field
          label="Handle"
          placeholder="@growgram-user"
          value={handle}
          onChangeText={(val) =>
            setHandle(val.startsWith('@') ? val : `@${val.replace(/^@/, '')}`)
          }
          colors={colors}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <Field
          label="Stadt"
          placeholder="z. B. Berlin"
          value={city}
          onChangeText={setCity}
          colors={colors}
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Field
          label="Bio"
          placeholder="Erzähle kurz, wie du growst, was du suchst oder teilst."
          value={bio}
          onChangeText={setBio}
          colors={colors}
          multiline
          numberOfLines={4}
          style={styles.bioInput}
        />

        {/* Save Button */}
        <Pressable
          onPress={onSave}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: isBusy
                ? 'rgba(34,197,94,0.4)'
                : pressed
                ? 'rgba(34,197,94,0.85)'
                : colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={colors.accentFg} />
          ) : (
            <Text
              style={[
                styles.saveBtnText,
                { color: colors.accentFg },
              ]}
            >
              Speichern
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------
// Sub-Komponente: Eingabefeld im Glass-Style
// ---------------------------------------------------------------------------

type FieldProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  colors: any;
  multiline?: boolean;
  numberOfLines?: number;
  style?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
};

const Field: React.FC<FieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  colors,
  multiline,
  numberOfLines,
  style,
  autoCapitalize,
  autoCorrect,
  returnKeyType,
}) => {
  return (
    <View style={styles.fieldBlock}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.muted },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.fieldContainer,
          {
            borderColor: 'rgba(190,255,210,0.18)',
            backgroundColor: 'rgba(4,18,10,0.75)',
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(148, 163, 184, 0.7)"
          style={[
            styles.fieldInput,
            { color: colors.text },
            style,
          ]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
        />
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.85,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 6,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldInput: {
    fontSize: 14,
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: 10,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProfileSetupScreen;