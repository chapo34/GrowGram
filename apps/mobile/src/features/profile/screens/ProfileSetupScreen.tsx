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
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '@core/theme/ThemeProvider';
import { useProfile } from '../hooks/useProfile';
import type { MainNav } from '@app/navigation/RootNavigator';

const ProfileSetupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<MainNav>();

  const { profile, loading, saving, error, saveProfile } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Prefill, sobald Profil da ist
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setHandle(profile.handle ?? '');
    setCity(profile.city ?? '');
    setBio(
      profile.bio ??
        'Willkommen bei GrowGram. Baue dein grünes Netzwerk Schritt für Schritt auf.',
    );
  }, [profile]);

  const onSave = async () => {
    setLocalError(null);

    if (!displayName.trim()) {
      setLocalError('Bitte gib einen Anzeigenamen ein.');
      return;
    }

    if (!handle.trim()) {
      setLocalError('Bitte wähle einen @Handle.');
      return;
    }

    const normalizedHandle =
      handle.startsWith('@') ? handle : `@${handle}`;

    const result = await saveProfile({
      displayName: displayName.trim(),
      handle: normalizedHandle.trim(),
      city: city.trim() || undefined,
      bio: bio.trim() || undefined,
    });

    if (!result.ok) {
      // durch das if ist result hier der Typ { ok: false; error: string }
      setLocalError(result.error ?? 'Profil konnte nicht gespeichert werden.');
      return;
    }

    navigation.goBack();
  };

  const onCancel = () => {
    navigation.goBack();
  };

  const isBusy = loading || saving;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            Profil bearbeiten
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.muted },
            ]}
          >
            Mach dein GrowGram Profil persönlich. Diese Infos werden
            auf deiner Profilseite angezeigt.
          </Text>

          {/* Glass Form Card */}
          <BlurView
            intensity={32}
            tint="dark"
            style={[
              styles.card,
              {
                borderColor: 'rgba(190,255,210,0.18)',
                backgroundColor: 'rgba(4,18,10,0.78)',
              },
            ]}
          >
            {/* Name */}
            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  { color: colors.muted },
                ]}
              >
                Anzeigename
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="z.B. DEV, Grower, GreenQueen"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: 'rgba(190,255,210,0.2)',
                    backgroundColor: 'rgba(3,12,7,0.85)',
                  },
                ]}
              />
            </View>

            {/* Handle */}
            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  { color: colors.muted },
                ]}
              >
                Handle
              </Text>
              <TextInput
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="@growgram-user"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: 'rgba(190,255,210,0.2)',
                    backgroundColor: 'rgba(3,12,7,0.85)',
                  },
                ]}
              />
              <Text
                style={[
                  styles.helpText,
                  { color: colors.muted },
                ]}
              >
                Dein öffentlicher Nutzername. Er erscheint in deinem
                Profil-Link.
              </Text>
            </View>

            {/* City */}
            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  { color: colors.muted },
                ]}
              >
                Stadt
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="z.B. Berlin"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: 'rgba(190,255,210,0.2)',
                    backgroundColor: 'rgba(3,12,7,0.85)',
                  },
                ]}
              />
            </View>

            {/* Bio */}
            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  { color: colors.muted },
                ]}
              >
                Bio
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Erzähl der Community etwas über dich, deine Grows oder deine Vision."
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colors.text,
                    borderColor: 'rgba(190,255,210,0.2)',
                    backgroundColor: 'rgba(3,12,7,0.9)',
                  },
                ]}
              />
            </View>

            {/* Error */}
            {(error || localError) && (
              <Text style={[styles.errorText, { color: '#f97373' }]}>
                {localError ?? error}
              </Text>
            )}
          </BlurView>

          {/* Bottom Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={onCancel}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed
                    ? 'rgba(5,14,9,0.96)'
                    : 'rgba(3,10,7,0.96)',
                  opacity: isBusy ? 0.6 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryText,
                  { color: colors.muted },
                ]}
              >
                Abbrechen
              </Text>
            </Pressable>

            <Pressable
              onPress={onSave}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed
                    ? 'rgba(34,197,94,0.9)'
                    : colors.accent,
                  opacity: isBusy ? 0.7 : 1,
                },
              ]}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#022c16" />
              ) : (
                <Text
                  style={[
                    styles.primaryText,
                    { color: colors.accentFg },
                  ]}
                >
                  Profil speichern
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  card: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 96,
  },
  helpText: {
    fontSize: 11,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProfileSetupScreen;