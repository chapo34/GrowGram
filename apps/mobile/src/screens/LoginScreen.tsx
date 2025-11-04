// GrowGramMobile/src/screens/LoginScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
  Linking,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import GradientBackground from '../theme/GradientBackground';
import { useTheme } from '../theme/ThemeProvider';
import GlassCard from '../components/GlassCard';
import PrimaryButton from '../components/PrimaryButton';
import EyeGlassButton from '../components/EyeGlassButton';

import { api, setAuthToken, STORAGE_KEYS, getComplianceAck } from '../utils/api';

type Nav = NativeStackNavigationProp<any>;
type Variant = 'lottie' | 'logo';

// Animation (Pfad wie in deinem Projekt)
const GROW_ANIM = require('../assets/animations/grow.json');

// ———————————————————————————————————————————————————————————————————————————
// Reusable Field-Wrapper: Tap irgendwo im Feld => fokussiert TextInput garantiert
function Field({
  label,
  onPress,
  children,
  focused,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const shadowRadius = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.fieldWrap} pointerEvents="auto">
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Animated.View
        style={{
          borderRadius: 16,
          shadowColor: colors.accent,
          shadowRadius,
          shadowOpacity,
          shadowOffset: { width: 0, height: 2 },
          elevation: focused ? 4 : 0,
        }}
      >
        <Pressable onPress={onPress} style={styles.fieldPressable} android_disableSound>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ———————————————————————————————————————————————————————————————————————————
// Screen
export default function LoginScreen({ variant = 'lottie' }: { variant?: Variant }) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // — State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [focusId, setFocusId] = useState(false);
  const [focusPw, setFocusPw] = useState(false);

  const [firstName, setFirstName] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const pwRef    = useRef<TextInput>(null);

  // Begrüßung personalisieren, wenn Nutzer lokal gespeichert
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (!raw) return;
        const u = JSON.parse(raw);
        const n = (u?.firstName || u?.name || u?.username || '') as string;
        if (n) setFirstName(n.split(' ')[0]);
      } catch {}
    })();
  }, []);

  const canSubmit = useMemo(
    () => identifier.trim().length > 2 && password.length >= 6 && !loading,
    [identifier, password, loading]
  );

  const onSubmitEditingEmail = (_e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    pwRef.current?.focus();
  };

  // — Micro-motion für Hero
  const heroScale = useRef(new Animated.Value(0.98)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroScale, { toValue: 1, duration: 1600, useNativeDriver: false }),
        Animated.timing(heroScale, { toValue: 0.985, duration: 1600, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // — Login Logic (dein Flow)
  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await api.post('/auth/login', { identifier: identifier.trim(), password });
      const token: string | undefined = res?.data?.token;
      const user = res?.data?.user;
      if (!token) throw new Error('Kein Token erhalten');

      await setAuthToken(token);
      if (user) await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      const userId = user?.id ?? null;
      const ack = userId ? await getComplianceAck(userId) : false;

      if (!ack) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'WelcomeCompliance' as never, params: { userId } as never }],
        });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'Main' as never }] });
    } catch (e: any) {
      const status = e?.response?.status as number | undefined;
      const msgFromApi = e?.response?.data?.message as string | undefined;
      let msg = 'Login fehlgeschlagen. Bitte Daten prüfen.';
      if (status === 403) msg = 'E-Mail nicht verifiziert. Bitte zuerst bestätigen.';
      else if (status === 404) msg = 'Benutzer nicht gefunden.';
      else if (status === 401) msg = 'Ungültige Zugangsdaten.';
      else if (status === 400 && msgFromApi) msg = msgFromApi;
      else if (e?.message?.includes('Network')) msg = 'Netzwerkfehler. Bitte Verbindung prüfen.';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]} pointerEvents="auto">
      <GradientBackground />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.select({ ios: 'padding' })}>
        <ScrollView
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroller, { paddingBottom: insets.bottom + 24 }]}
          pointerEvents="auto"
        >
          {/* HERO */}
          <Animated.View style={[styles.hero, { transform: [{ scale: heroScale }] }]} pointerEvents="none">
            {variant === 'lottie' && <LottieView source={GROW_ANIM} autoPlay loop style={styles.lottie} />}
            <Text style={styles.kicker}>Lass wachsen, was du liebst 🌿</Text>
            <Text style={styles.title}>
              {firstName ? `Willkommen zurück, ${firstName}` : 'Willkommen zurück'}
            </Text>
            <Text style={styles.subtitle}>Deine Community blüht – sei dabei.</Text>
          </Animated.View>

          {/* FORM */}
          <GlassCard
            blurIntensity={44}
            glassOpacity={1}
            edgeLight
            specularTop
            borderGlow={0.25}
            style={{ marginTop: 16, marginHorizontal: 2 }}
          >
            {/* EMAIL */}
            <Field label="E-Mail oder Benutzername" focused={focusId} onPress={() => emailRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={emailRef}
                  value={identifier}
                  onChangeText={setIdentifier}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={onSubmitEditingEmail}
                  onFocus={() => setFocusId(true)}
                  onBlur={() => setFocusId(false)}
                  placeholder="you@growgram.app"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  textContentType="username"
                  editable
                  pointerEvents="auto"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.glass,
                      borderColor: focusId ? colors.accent : colors.glassBorder,
                      color: colors.text,
                    },
                  ]}
                />
              </View>
            </Field>

            {/* PASSWORD */}
            <Field label="Passwort" focused={focusPw} onPress={() => pwRef.current?.focus()}>
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={pwRef}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setFocusPw(true)}
                  onBlur={() => setFocusPw(false)}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  textContentType="password"
                  editable
                  pointerEvents="auto"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.glass,
                      borderColor: focusPw ? colors.accent : colors.glassBorder,
                      color: colors.text,
                      paddingRight: 54,
                    },
                  ]}
                />

                {/* Eye im Glas-3D, kleine Hit-Area */}
                <EyeGlassButton
                  visible={showPw}
                  onToggle={() => {
                    setShowPw(v => !v);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={{ position: 'absolute', right: 8, top: 6, zIndex: 10 }}
                />
              </View>
            </Field>

            {/* Fehler */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Passwort vergessen & Terms */}
            <Text
              onPress={() => navigation.navigate('ForgotPassword' as never)}
              style={styles.linkRight}
            >
              Passwort vergessen?
            </Text>

            <PrimaryButton
              text="Einloggen"
              onPress={handleLogin}
              loading={loading}
              disabled={!canSubmit}
              style={{ marginTop: 12 }}
            />

            <Text style={styles.legal}>
              Mit dem Einloggen akzeptierst du unsere{' '}
              <Text style={styles.linkAccent} onPress={() => Linking.openURL('https://growgram.app/terms')}>Nutzungsbedingungen</Text>{' '}
              und{' '}
              <Text style={styles.linkAccent} onPress={() => Linking.openURL('https://growgram.app/privacy')}>Datenschutz</Text>.
            </Text>
          </GlassCard>

          {/* Footer CTA */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Neu bei GrowGram?</Text>
            <PrimaryButton
              text="Konto erstellen"
              onPress={() => navigation.navigate('Register' as never)}
              style={{ width: 260 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ——————————————————————— Styles ——————————————————————— */

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
  subtitle: {
    color: '#C8D6CF',
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
  },

  fieldWrap: { marginTop: 12 },
  fieldPressable: { borderRadius: 16 },

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

  error: {
    color: '#ff9a9a',
    textAlign: 'center',
    marginTop: 8,
  },

  linkRight: {
    alignSelf: 'flex-end',
    marginTop: 8,
    color: '#A8FFB0',
    fontWeight: '800',
    textShadowColor: 'rgba(168,255,176,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  legal: { marginTop: 10, color: '#C8D6CF', fontSize: 12, textAlign: 'center' },

  linkAccent: {
    color: '#FFA726',
    fontWeight: '800',
    textShadowColor: 'rgba(255,167,38,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { color: '#C8D6CF', marginBottom: 6 },
});