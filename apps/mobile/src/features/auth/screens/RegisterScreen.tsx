import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LottieView from 'lottie-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ResponseType } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

import GradientBackground from '@shared/theme/GradientBackground';
import { useTheme } from '@shared/theme/ThemeProvider';

import GlassCard from '@shared/components/layout/GlassCard';
import PrimaryButton from '@shared/components/ui/PrimaryButton';
import SecondaryButton from '@shared/components/ui/SecondaryButton';
import EyeGlassButton from '@shared/components/ui/EyeGlassButton';

import {
  api,
  setAuthToken,
  STORAGE_KEYS,
  getComplianceAck,
} from '@shared/lib/apiClient';
WebBrowser.maybeCompleteAuthSession();

/* ---------------- Config ---------------- */
const EXTRA = (Constants.expoConfig?.extra ?? {}) as any;

const GOOGLE_EXPO_CLIENT_ID = EXTRA.GOOGLE_EXPO_CLIENT_ID as string;
const AUTH_REDIRECT: string =
  (EXTRA.EXPO_AUTH_REDIRECT as string) ||
  'https://auth.expo.dev/@martinchapo34/GrowGramMobile';

const API_BASE: string =
  (EXTRA.EXPO_PUBLIC_API_BASE as string) ||
  (EXTRA.API_BASE_URL as string) ||
  'https://europe-west3-growgram-backend.cloudfunctions.net/api';

const TERMS_URL = 'https://growgram.web.app/terms';
const PRIVACY_URL = 'https://growgram.web.app/privacy';

const REG_ANIM = require('../../../assets/animations/registerPlant.json');

/* ---------------- Helpers ---------------- */
function formatDateYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function yearsBetween(birth: Date, ref: Date) {
  let years = ref.getFullYear() - birth.getFullYear();
  const before =
    ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate());
  if (before) years -= 1;
  return years;
}
const USERNAME_RE = /^[a-zA-Z0-9._]{3,20}$/;

/* ---------------- Field (touch-safe, keine Blocks) ---------------- */
function Field({
  label,
  focused,
  children,
  onPress,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <View
        style={[
          styles.focusRing,
          focused && {
            shadowColor: colors.accent,
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          },
        ]}
        pointerEvents="box-none"
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={() => false}
        onTouchEnd={(e) => {
          // Tap auf leere Fläche setzt Fokus
const target = (e.nativeEvent as any).target;
const current = (e.currentTarget as any);
if (target === current) onPress?.();        }}
      >
        <View pointerEvents="auto">{children}</View>
      </View>
    </View>
  );
}

/* ---------------- Screen ---------------- */
type Nav = NativeStackNavigationProp<any>;
export default function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [username, setUsername]   = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [city, setCity]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);

  // Focus states
  const [fFirst, setFFirst] = useState(false);
  const [fLast,  setFLast]  = useState(false);
  const [fUser,  setFUser]  = useState(false);
  const [fCity,  setFCity]  = useState(false);
  const [fEmail, setFEmail] = useState(false);
  const [fPw,    setFPw]    = useState(false);

  // Refs
  const firstRef = useRef<TextInput>(null);
  const lastRef  = useRef<TextInput>(null);
  const userRef  = useRef<TextInput>(null);
  const cityRef  = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pwRef    = useRef<TextInput>(null);

  // Apple availability
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  /* ---------- Google Auth ---------- */
  const googleConfig: Google.GoogleAuthRequestConfig = {
    clientId: GOOGLE_EXPO_CLIENT_ID,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'email', 'profile'],
    redirectUri: AUTH_REDIRECT,
    extraParams: { prompt: 'select_account' },
  };
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest(googleConfig);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken =
        (googleResponse as any)?.params?.id_token ??
        (googleResponse as any)?.authentication?.idToken ??
        null;

      if (!idToken) {
        Alert.alert('Fehler', 'Google hat keinen ID-Token geliefert.');
        return;
      }
      (async () => {
        try {
          setLoading(true);
          const { data } = await axios.post(`${API_BASE}/auth/oauth/google`, { idToken });
          Alert.alert('Willkommen', data?.message || 'Erfolgreich angemeldet.');
          navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
        } catch (e: any) {
          const msg = e?.response?.data?.message || 'Anmeldung fehlgeschlagen.';
          Alert.alert('Fehler', msg);
        } finally {
          setLoading(false);
        }
      })();
    } else if (googleResponse?.type === 'error') {
      const desc = (googleResponse as any)?.error?.message ?? 'Unbekannter Fehler';
      Alert.alert('Fehler', `Google Login nicht möglich. ${desc}`);
    }
  }, [googleResponse, navigation]);

  /* ---- Validation ---- */
  const normalizedEmail = email.trim().toLowerCase();
  const emailInvalid =
    normalizedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const usernameInvalid = username.trim().length > 0 && !USERNAME_RE.test(username.trim());
  const underAge = birthDate ? yearsBetween(birthDate, new Date()) < 18 : false;

  const canSubmit = useMemo(
    () =>
      !loading &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      !!birthDate &&
      !underAge &&
      city.trim().length > 0 &&
      normalizedEmail.length > 0 &&
      !emailInvalid &&
      password.length >= 6 &&
      !usernameInvalid,
    [
      loading,
      firstName,
      lastName,
      birthDate,
      underAge,
      city,
      normalizedEmail,
      emailInvalid,
      password,
      usernameInvalid,
    ]
  );

  /* ---- Links ---- */
  const openLink = useCallback(async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
    } catch {}
  }, []);

  /* ---- Date picker ---- */
  const [showDatePicker, setShowDatePicker] = useState(false);
  const onChangeDate = useCallback((event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setShowDatePicker(false);
        return;
      }
      setShowDatePicker(false);
    }
    if (date) setBirthDate(date);
  }, []);

  /* ---- Register ---- */
  const handleRegister = useCallback(async () => {
    if (!canSubmit || loading) return;
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const payload: Record<string, any> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: formatDateYYYYMMDD(birthDate as Date),
        city: city.trim(),
        email: normalizedEmail,
        password,
      };
      if (username.trim()) payload.username = username.trim();

      const res = await axios.post(`${API_BASE}/auth/register`, payload);
      Alert.alert('Erfolgreich', res.data?.message || 'Konto erstellt! Bitte bestätige deine E-Mail.');
      await AsyncStorage.setItem('@gg_prefill_email', normalizedEmail);
      navigation.navigate('Login' as never);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      Alert.alert('Fehler', msg);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, loading, firstName, lastName, birthDate, city, normalizedEmail, password, username, navigation]);

  const googleEnabled = !!googleRequest && !!GOOGLE_EXPO_CLIENT_ID;

  /* ---------------- UI ---------------- */
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <GradientBackground />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.select({ ios: 'padding' })}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroller, { paddingBottom: insets.bottom + 24 }]}
        >
          {/* HERO */}
          <View style={styles.hero} pointerEvents="none">
            <LottieView source={REG_ANIM} autoPlay loop style={styles.lottie} />
            <Text style={styles.kicker}>Ein kleines Samenkorn… 🌱</Text>
            <Text style={styles.title}>GrowGram Registrierung</Text>
            <Text style={styles.subtitle}>Werde Teil der Community und lass es wachsen.</Text>
          </View>

          {/* Underlay-Schatten */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ height: 24, marginHorizontal: 24, borderRadius: 12, opacity: 0.5 }}
          />

          {/* FORM */}
          <GlassCard blurIntensity={44} glassOpacity={1} edgeLight specularTop borderGlow={0.25}>
            {/* Vorname */}
            <Field label="Vorname *" focused={fFirst} onPress={() => firstRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={firstRef}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastRef.current?.focus()}
                  onFocus={() => setFFirst(true)} onBlur={() => setFFirst(false)}
                  placeholder="Max"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[
                    styles.input,
                    { backgroundColor: colors.glass, borderColor: fFirst ? colors.accent : colors.glassBorder, color: colors.text },
                  ]}
                />
              </View>
            </Field>

            {/* Nachname */}
            <Field label="Nachname *" focused={fLast} onPress={() => lastRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={lastRef}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => userRef.current?.focus()}
                  onFocus={() => setFLast(true)} onBlur={() => setFLast(false)}
                  placeholder="Mustermann"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[
                    styles.input,
                    { backgroundColor: colors.glass, borderColor: fLast ? colors.accent : colors.glassBorder, color: colors.text },
                  ]}
                />
              </View>
            </Field>

            {/* Benutzername (optional) */}
            <Field label="Benutzername (optional)" focused={fUser} onPress={() => userRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={userRef}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => setShowDatePicker(true)}
                  onFocus={() => setFUser(true)} onBlur={() => setFUser(false)}
                  placeholder="grow.master"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[
                    styles.input,
                    { backgroundColor: colors.glass, borderColor: fUser ? colors.accent : colors.glassBorder, color: colors.text },
                  ]}
                />
              </View>
              {username.trim().length > 0 && !USERNAME_RE.test(username.trim()) ? (
                <Text style={styles.helperError}>3–20 Zeichen, Buchstaben/Zahlen, Punkt/Unterstrich.</Text>
              ) : null}
            </Field>

            {/* Geburtsdatum */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.muted }]}>Geburtsdatum *</Text>
              <View style={styles.inputRow} pointerEvents="box-none">
                <Text
                  onPress={() => setShowDatePicker(true)}
                  style={[
                    styles.input,
                    {
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      paddingVertical: Platform.select({ ios: 14, android: 10 }),
                      color: birthDate ? colors.text : 'rgba(255,255,255,0.35)',
                      backgroundColor: colors.glass,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  {birthDate ? birthDate.toLocaleDateString() : 'Auswählen'}
                </Text>
              </View>
              {birthDate && yearsBetween(birthDate, new Date()) < 18 ? (
                <Text style={styles.helperError}>Du musst mindestens 18 Jahre alt sein.</Text>
              ) : null}

              {/* iOS Modal inline */}
              {Platform.OS === 'ios' ? (
                <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                  <View style={styles.modalBackdrop}>
                    <View style={[styles.modalSheet, { backgroundColor: colors.panel, borderColor: colors.glassBorder }]}>
                      <View style={[styles.modalHeader, { borderBottomColor: colors.glassBorder }]}>
                        <Text style={styles.modalLink} onPress={() => setShowDatePicker(false)}>Abbrechen</Text>
                        <Text style={{ color: colors.text, fontWeight: '800' }}>Geburtsdatum</Text>
                        <Text style={styles.modalLink} onPress={() => setShowDatePicker(false)}>Fertig</Text>
                      </View>
                      <DateTimePicker
                        value={birthDate || new Date(2000, 0, 1)}
                        mode="date"
                        display="inline"
                        maximumDate={new Date()}
                        onChange={onChangeDate}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                showDatePicker && (
                  <DateTimePicker
                    value={birthDate || new Date(2000, 0, 1)}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={onChangeDate}
                  />
                )
              )}
            </View>

            {/* Stadt */}
            <Field label="Stadt *" focused={fCity} onPress={() => cityRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={cityRef}
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  onFocus={() => setFCity(true)} onBlur={() => setFCity(false)}
                  placeholder="Berlin"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[
                    styles.input,
                    { backgroundColor: colors.glass, borderColor: fCity ? colors.accent : colors.glassBorder, color: colors.text },
                  ]}
                />
              </View>
            </Field>

            {/* E-Mail */}
            <Field label="E-Mail *" focused={fEmail} onPress={() => emailRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => pwRef.current?.focus()}
                  onFocus={() => setFEmail(true)} onBlur={() => setFEmail(false)}
                  placeholder="you@growgram.app"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[
                    styles.input,
                    { backgroundColor: colors.glass, borderColor: fEmail ? colors.accent : colors.glassBorder, color: colors.text },
                  ]}
                />
              </View>
              {normalizedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ? (
                <Text style={styles.helperError}>Bitte gültige E-Mail eingeben.</Text>
              ) : null}
            </Field>

            {/* Passwort */}
            <Field label="Passwort (min. 6 Zeichen) *" focused={fPw} onPress={() => pwRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={pwRef}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  onFocus={() => setFPw(true)} onBlur={() => setFPw(false)}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={[
                    styles.input,
                    { backgroundColor: colors.glass, borderColor: fPw ? colors.accent : colors.glassBorder, color: colors.text, paddingRight: 54 },
                  ]}
                />
                {/* Eye-Button darf nicht blocken */}
                <View style={{ position: 'absolute', right: 8, top: 6 }} pointerEvents="box-none">
                  <EyeGlassButton
                    visible={showPw}
                    onToggle={() => setShowPw(v => !v)}
                    style={{ pointerEvents: 'auto' }}
                  />
                </View>
              </View>
            </Field>

            {/* CTA Register */}
            <PrimaryButton
              text="Registrieren"
              onPress={handleRegister}
              loading={loading}
              disabled={!canSubmit}
              style={{ marginTop: 12 }}
            />

            {/* Social Divider */}
            <View style={styles.dividerWrap}>
              <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>oder</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
            </View>

            {/* Social Buttons (einzelne Style-Objekte → kompatibel mit ViewStyle) */}
            <View style={styles.socialRow}>
              <SecondaryButton
                text="Mit Google"
                onPress={() => googlePromptAsync()}
                disabled={!googleEnabled || loading}
                style={{ flex: 1, marginRight: 6 }}
                iconLeft={<Text style={{ color: colors.text, fontWeight: '900' }}>G</Text>}
              />
              {appleAvailable && Platform.OS === 'ios' ? (
                <SecondaryButton
                  text="Mit Apple"
                  onPress={async () => {
                    try {
                      const cr = await AppleAuthentication.signInAsync({
                        requestedScopes: [
                          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                          AppleAuthentication.AppleAuthenticationScope.EMAIL,
                        ],
                      });
                      if (!cr.identityToken) {
                        Alert.alert('Fehler', 'Apple hat keinen identityToken geliefert.');
                        return;
                      }
                      setLoading(true);
                      const { data } = await axios.post(`${API_BASE}/auth/oauth/apple`, {
                        identityToken: cr.identityToken,
                        email: cr.email,
                        givenName: cr.fullName?.givenName,
                        familyName: cr.fullName?.familyName,
                      });
                      Alert.alert('Willkommen', data?.message || 'Erfolgreich angemeldet.');
                      navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
                    } catch (e: any) {
                      if (e?.code === 'ERR_REQUEST_CANCELED') return;
                      Alert.alert('Fehler', 'Apple-Anmeldung nicht möglich.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ flex: 1, marginLeft: 6 }}
                  iconLeft={<Text style={{ color: colors.text, fontWeight: '900' }}></Text>}
                />
              ) : null}
            </View>

            {/* Rechtliches */}
            <View style={styles.legalWrap}>
              <Text style={[styles.legalText, { color: colors.muted }]}>
                Mit der Registrierung stimmst du unseren{' '}
                <Text style={styles.legalLink} onPress={() => openLink(TERMS_URL)}>AGB</Text>{' '}
                und der{' '}
                <Text style={styles.legalLink} onPress={() => openLink(PRIVACY_URL)}>Datenschutzerklärung</Text>{' '}
                zu.
              </Text>
            </View>
          </GlassCard>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={{ color: colors.muted, marginBottom: 6 }}>Schon ein Konto?</Text>
            <PrimaryButton text="Zum Login" onPress={() => navigation.navigate('Login' as never)} style={{ width: 260 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  scroller: { paddingHorizontal: 18 },
  hero: { alignItems: 'center', paddingTop: 2, paddingBottom: 6 },
  lottie: { width: 180, height: 180 },
  kicker: {
    color: '#A8FFB0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: -6,
    textShadowColor: 'rgba(168,255,176,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  title: {
    color: '#F3F6F4',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginTop: 2,
  },
  subtitle: { color: '#C8D6CF', marginTop: 4, fontSize: 13, textAlign: 'center' },

  fieldWrap: { marginTop: 12 },
  focusRing: { borderRadius: 16 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginBottom: 6, opacity: 0.92 },

  inputRow: { position: 'relative' },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    fontSize: 16,
    fontWeight: '600',
  },

  helperError: { color: '#ff9a9a', fontSize: 12, marginTop: 4 },

  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, marginHorizontal: 10 },

  socialRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },

  legalWrap: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12, alignItems: 'center' },
  legalText: { fontSize: 12, lineHeight: 16, textAlign: 'center', includeFontPadding: false },
  legalLink: { color: '#A8FFB0', textDecorationLine: 'underline', fontWeight: '700' },

  footer: { alignItems: 'center', marginTop: 18 },

  // iOS DatePicker Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, overflow: 'hidden' },
  modalHeader: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  modalLink: { color: '#A8FFB0', fontWeight: '700' },
});