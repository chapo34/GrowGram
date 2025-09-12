// src/screens/ProfileSetupScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  me,
  updateAccountSettings,
  uploadAvatar,
  type UserMe,
} from '../utils/api';

// ---- Theme
const BG = '#0b1f14';
const CARD = '#0f2219';
const ACCENT = '#4CAF50';
const TEXT = '#E6EAEF';
const MUTED = '#9fb7a5';
const BORDER = '#1e3a2d';

// sentinel um "Avatar löschen" zu erkennen
const AVATAR_DELETE = '__DELETE__';

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  const [user, setUser] = useState<UserMe | null>(null);

  // form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null); // file://…, AVATAR_DELETE oder null
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // ---- load me once
  useEffect(() => {
    (async () => {
      try {
        const u = await me();
        setUser(u);
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setUsername(u.username || (u.email ? u.email.split('@')[0] : ''));
        setCity(u.city || '');
        setBio(u.bio || '');
      } catch (e) {
        console.log('load me failed', e);
      }
    })();
  }, []);

  // unsaved changes guard (back)
  useEffect(() => {
    const beforeRemove = nav.addListener('beforeRemove', (e: any) => {
      if (!dirty || saving) return;
      e.preventDefault();
      Alert.alert('Änderungen verwerfen?', 'Nicht gespeicherte Änderungen gehen verloren.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Verwerfen', style: 'destructive', onPress: () => nav.dispatch(e.data.action) },
      ]);
    });
    const onBack = () => {
      if (!dirty || saving) return false;
      Alert.alert('Änderungen verwerfen?', 'Nicht gespeicherte Änderungen gehen verloren.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Verwerfen', style: 'destructive', onPress: () => nav.goBack() },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => {
      beforeRemove();
      sub.remove();
    };
  }, [dirty, saving, nav]);

  // mark form dirty
  const markDirty = useCallback(() => setDirty(true), []);

  // derived
  const initials = useMemo(() => {
    const a = (firstName || user?.username || user?.email || 'U')[0]?.toUpperCase() || 'U';
    const b = (lastName || '')[0]?.toUpperCase() || '';
    return `${a}${b}`;
  }, [firstName, lastName, user?.username, user?.email]);

  const currentAvatar = useMemo(() => {
    if (avatarLocal === AVATAR_DELETE) return '';
    return avatarLocal || user?.avatarUrl || '';
  }, [avatarLocal, user?.avatarUrl]);

  // helpers
  const usernameErr = useMemo(() => validateUsername(username.trim()), [username]);

  function validateUsername(s: string): string | null {
    if (!s) return 'Benutzername darf nicht leer sein.';
    if (s.length < 3) return 'Mindestens 3 Zeichen.';
    if (s.length > 20) return 'Maximal 20 Zeichen.';
    if (!/^[a-z0-9._]+$/i.test(s)) return 'Nur Buchstaben, Zahlen, Punkt und Unterstrich erlaubt.';
    return null;
  }

  function normalizeImg(u: string): string {
    try {
      const url = new URL(u);
      url.searchParams.delete('auto');
      if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
      if (!url.searchParams.get('q')) url.searchParams.set('q', '85');
      if (!url.searchParams.get('w')) url.searchParams.set('w', '640');
      return url.toString();
    } catch { return u; }
  }

  // ---- Avatar Auswahl/Crop (mit nativer Zoom-Geste)
  const pickFromLibrary = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Zugriff verweigert', 'Bitte erlaube Zugriff auf deine Fotos.');
        return;
      }

      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,           // <- NATIVE CROP UI
        aspect: [1, 1],                // <- Quadrat, Zoom/Move selbst bestimmen
        quality: 1,
      });
      if (r.canceled) return;

      // In JPEG 640px wandeln (klein + schnell)
      const out = await ImageManipulator.manipulateAsync(
        r.assets[0].uri,
        [{ resize: { width: 640 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setAvatarLocal(out.uri);
      setDirty(true);
      Haptics.selectionAsync();
    } catch (e) {
      Alert.alert('Fehler', 'Konnte Bild nicht laden.');
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      const cperm = await ImagePicker.requestCameraPermissionsAsync();
      if (!cperm.granted) {
        Alert.alert('Kamera verweigert', 'Bitte erlaube Zugriff auf die Kamera.');
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        allowsEditing: true, aspect: [1, 1], quality: 1,
      });
      if (r.canceled) return;

      const out = await ImageManipulator.manipulateAsync(
        r.assets[0].uri,
        [{ resize: { width: 640 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setAvatarLocal(out.uri);
      setDirty(true);
      Haptics.selectionAsync();
    } catch {
      Alert.alert('Fehler', 'Foto konnte nicht aufgenommen werden.');
    }
  }, []);

  const removeAvatarLocal = useCallback(() => {
    setAvatarLocal(AVATAR_DELETE);
    setDirty(true);
    Haptics.selectionAsync();
  }, []);

  const onAvatarPress = useCallback(() => {
    const opts = ['Aus Mediathek wählen', 'Foto aufnehmen', 'Avatar entfernen', 'Abbrechen'];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, cancelButtonIndex, destructiveButtonIndex },
        (i) => {
          if (i === 0) pickFromLibrary();
          if (i === 1) takePhoto();
          if (i === 2) removeAvatarLocal();
        }
      );
    } else {
      Alert.alert('Avatar', 'Wähle eine Option', [
        { text: 'Aus Mediathek wählen', onPress: pickFromLibrary },
        { text: 'Foto aufnehmen', onPress: takePhoto },
        { text: 'Avatar entfernen', style: 'destructive', onPress: removeAvatarLocal },
        { text: 'Abbrechen', style: 'cancel' },
      ]);
    }
  }, [pickFromLibrary, takePhoto, removeAvatarLocal]);

  // ---- Save
  const onSave = useCallback(async () => {
    const trimmed = username.trim();
    const err = validateUsername(trimmed);
    if (err) return Alert.alert('Benutzername ungültig', err);

    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarLocal && avatarLocal !== AVATAR_DELETE) {
        // POST /auth/avatar-binary (siehe api.uploadAvatar)
        const up = await uploadAvatar(avatarLocal);
        avatarUrl = up.url;
      }

      // Profil patchen
      const payload: Partial<UserMe> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: trimmed,
        city: city.trim(),
        bio: bio.trim(),
      };
      // Avatar löschen
      if (avatarLocal === AVATAR_DELETE) (payload as any).avatarUrl = '';

      // Avatar neu
      if (avatarUrl) (payload as any).avatarUrl = avatarUrl;

      const next = await updateAccountSettings(payload);
      setUser(next);
      setAvatarLocal(null);
      setDirty(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Gespeichert', 'Dein Profil wurde aktualisiert.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Fehler', e?.response?.data?.message || e?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }, [avatarLocal, firstName, lastName, username, city, bio, nav]);

  // ---- UI
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: BG }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        bounces
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.h1}>Profil bearbeiten</Text>

          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Pressable onPress={onAvatarPress} style={styles.avatarWrap}>
              {currentAvatar ? (
                <Image
                  source={{ uri: normalizeImg(currentAvatar) }}
                  style={{ width: 128, height: 128, borderRadius: 100 }}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Text style={{ color: '#0c1a10', fontWeight: '900', fontSize: 12 }}>
                  {currentAvatar ? 'Ändern' : 'Foto'}
                </Text>
              </View>
            </Pressable>
            <Text style={styles.displayName}>
              {[firstName, lastName].filter(Boolean).join(' ') || (user?.username || '—')}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profil</Text>

          {/* Name */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={firstName}
              onChangeText={(t) => { setFirstName(t); markDirty(); }}
              placeholder="Vorname"
              placeholderTextColor="#7fa18f"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={lastName}
              onChangeText={(t) => { setLastName(t); markDirty(); }}
              placeholder="Nachname"
              placeholderTextColor="#7fa18f"
              style={[styles.input, { flex: 1 }]}
            />
          </View>

          {/* Username */}
          <Text style={styles.label}>Benutzername</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={username}
              onChangeText={(t) => { setUsername(t); markDirty(); }}
              placeholder="@ username"
              placeholderTextColor="#7fa18f"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { paddingLeft: 36 }]}
            />
            <Text style={styles.atPrefix}>@</Text>
            <View
              style={[
                styles.dot,
                { backgroundColor: usernameErr ? '#ff6b6b' : '#46d27a' },
              ]}
            />
          </View>

          <Pressable
            onPress={() => {
              const base = (firstName || 'user').toLowerCase().replace(/[^a-z0-9]+/gi, '');
              const rnd = Math.floor(Math.random() * 900) + 100;
              const suggestion = `${base}${rnd}`;
              setUsername(suggestion);
              setDirty(true);
              Haptics.selectionAsync();
            }}
            style={styles.suggestBtn}
          >
            <Text style={styles.suggestTxt}>✨ Vorschlag generieren</Text>
          </Pressable>

          {/* Stadt */}
          <Text style={styles.label}>Stadt</Text>
          <TextInput
            value={city}
            onChangeText={(t) => { setCity(t); markDirty(); }}
            placeholder="z. B. Berlin"
            placeholderTextColor="#7fa18f"
            style={styles.input}
          />

          {/* Bio */}
          <Text style={styles.label}>Kurzbeschreibung ({bio.length}/200)</Text>
          <TextInput
            value={bio}
            onChangeText={(t) => { setBio(t.slice(0, 200)); markDirty(); }}
            placeholder="Sag kurz, worum es bei dir geht…"
            placeholderTextColor="#7fa18f"
            style={[styles.input, styles.textarea]}
            multiline
          />

          <Text style={styles.hint}>
            Hinweis: Der Benutzername ist öffentlich sichtbar. Nur Buchstaben, Zahlen,
            Punkt und Unterstrich sind erlaubt.
          </Text>

          <Pressable
            onPress={onSave}
            disabled={!!usernameErr || saving}
            style={[styles.saveBtn, (!!usernameErr || saving) && { opacity: 0.6 }]}
          >
            <Text style={styles.saveTxt}>{saving ? 'Speichere…' : 'Änderungen speichern'}</Text>
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Avatar</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={pickFromLibrary} style={[styles.secondaryBtn, { flex: 1 }]}>
              <Text style={styles.secondaryTxt}>Aus Mediathek wählen</Text>
            </Pressable>
            <Pressable onPress={takePhoto} style={[styles.secondaryBtn, { flex: 1 }]}>
              <Text style={styles.secondaryTxt}>Foto aufnehmen</Text>
            </Pressable>
          </View>
          <Pressable onPress={removeAvatarLocal} style={styles.dangerBtn}>
            <Text style={styles.dangerTxt}>Avatar entfernen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ============ Styles ============ */

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 4,
    marginBottom: 8,
  },
  h1: { color: TEXT, fontWeight: '900', fontSize: 20, textAlign: 'center', marginTop: 6 },

  avatarWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  avatarFallback: {
    width: 128, height: 128, borderRadius: 100,
    backgroundColor: '#103020', alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(168,255,176,0.25)',
  },
  initials: { color: '#b6ffc3', fontWeight: '900', fontSize: 40 },
  avatarBadge: {
    position: 'absolute', right: 2, bottom: 2,
    backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  displayName: { color: TEXT, fontWeight: '900', fontSize: 22, marginTop: 10 },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: { color: TEXT, fontWeight: '900', fontSize: 18, marginBottom: 10 },
  label: { color: MUTED, marginTop: 12, marginBottom: 6 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  atPrefix: {
    position: 'absolute', left: 12, top: 10,
    color: '#9ad9bb', fontWeight: '900', fontSize: 16,
  },
  dot: {
    position: 'absolute', right: 10, top: 14, width: 10, height: 10, borderRadius: 10,
  },
  suggestBtn: {
    alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(76,175,80,0.18)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  suggestTxt: { color: '#b6ffc3', fontWeight: '800' },
  hint: { color: MUTED, marginTop: 12, fontSize: 12 },

  saveBtn: {
    marginTop: 16,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveTxt: { color: '#0c1a10', fontWeight: '900' },

  secondaryBtn: {
    marginTop: 6,
    backgroundColor: 'rgba(76,175,80,0.18)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryTxt: { color: '#b6ffc3', fontWeight: '800' },

  dangerBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 99, 99, 0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerTxt: { color: '#ff8c8c', fontWeight: '800' },
});