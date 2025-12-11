// apps/mobile/src/features/auth/screens/LoginScreen.tsx

import React, {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Linking,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputSubmitEditingEventData,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';

import { useTheme } from '@shared/theme/ThemeProvider';
import AuthLiquidGlassCard from '@features/auth/theme/AuthLiquidGlassCard';
import PrimaryButton from '@shared/components/ui/PrimaryButton';
import EyeGlassButton from '@shared/components/ui/EyeGlassButton';

import {
  api,
  getComplianceAck,
  setAuthToken,
  STORAGE_KEYS,
} from '@shared/lib/apiClient';

type Nav = NativeStackNavigationProp<any>;
type Variant = 'lottie' | 'logo';

const GROW_ANIM = require('../../../assets/animations/grow.json');
const LOGO_IMG = require('../../../assets/images/growgram-logo.png');
const LOGIN_VIDEO = require('../../../../assets/auth/video/growgram-login-loop.mp4');

/* -------------------------------------------------------------------------- */
/* Field-Wrapper mit Glow                                                     */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  onPress,
  children,
  focused,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(glow, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false, // wir animieren Shadow → kein Native Driver
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

  return (
    <View style={styles.fieldWrap} pointerEvents="auto">
      <Text
        style={[
          styles.label,
          {
            color: 'rgba(255,255,255,0.82)',
          },
        ]}
      >
        {label}
      </Text>

      <Animated.View
        style={{
          borderRadius: 16,
          shadowColor: colors.accent,
          shadowRadius,
          shadowOpacity,
          shadowOffset: { width: 0, height: 3 },
          elevation: focused ? 6 : 0,
        }}
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
}

/* -------------------------------------------------------------------------- */
/* LoginScreen                                                                */
/* -------------------------------------------------------------------------- */

export default function LoginScreen({
  variant = 'lottie',
}: {
  variant?: Variant;
}) {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [focusId, setFocusId] = useState(false);
  const [focusPw, setFocusPw] = useState(false);

  const [firstName, setFirstName] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const videoRef = useRef<Video | null>(null);

  /* ----------------------------- User-Name laden --------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        if (!raw) return;
        const u = JSON.parse(raw);
        const n = (u?.firstName || u?.name || u?.username || '') as string;
        if (n) setFirstName(n.split(' ')[0]);
      } catch {
        // ignore
      }
    })();
  }, []);

  const canSubmit = useMemo(
    () => identifier.trim().length > 2 && password.length >= 6 && !loading,
    [identifier, password, loading]
  );

  const onSubmitEditingEmail = (
    _e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => {
    pwRef.current?.focus();
  };

  /* ----------------------------- Hero Micro-Anim --------------------------- */

  const heroScale = useRef(new Animated.Value(0.98)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroScale, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true, // nur transform → Native Driver möglich
        }),
        Animated.timing(heroScale, {
          toValue: 0.985,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [heroScale]);

  /* ------------------------------- Login-Logic ----------------------------- */

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      const token: string | undefined = res?.data?.token;
      const user = res?.data?.user;
      if (!token) throw new Error('Kein Token erhalten');

      await setAuthToken(token);
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }

      const userId = user?.id ?? null;
      const ack = userId ? await getComplianceAck(userId) : false;

      if (!ack) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'WelcomeCompliance' as never,
              params: { userId } as never,
            },
          ],
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' as never }],
      });
    } catch (e: any) {
      const status = e?.response?.status as number | undefined;
      const msgFromApi = e?.response?.data?.message as string | undefined;
      let msg = 'Login fehlgeschlagen. Bitte Daten prüfen.';

      if (status === 403)
        msg = 'E-Mail nicht verifiziert. Bitte zuerst bestätigen.';
      else if (status === 404) msg = 'Benutzer nicht gefunden.';
      else if (status === 401) msg = 'Ungültige Zugangsdaten.';
      else if (status === 400 && msgFromApi) msg = msgFromApi;
      else if (e?.message?.includes('Network'))
        msg = 'Netzwerkfehler. Bitte Verbindung prüfen.';

      setError(msg);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------- Render -------------------------------- */

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* VIDEO-BACKGROUND */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Video
          ref={videoRef}
          source={LOGIN_VIDEO}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          style={StyleSheet.absoluteFill}
        />

        {/* Top/Bottom-Gradient für Lesbarkeit */}
        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.9)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroller,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* BRAND BAR */}
          <View style={styles.brandRow}>
            <Image source={LOGO_IMG} style={styles.brandLogo} />
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>GrowGram</Text>
              <View style={styles.betaPill}>
                <Text style={styles.betaText}>BETA</Text>
              </View>
            </View>
          </View>
          <Text style={styles.brandTagline}>
            Cannabis Community • 18+ • Sicher &amp; EU-Hosting
          </Text>

          {/* HERO */}
          <Animated.View
            style={[styles.hero, { transform: [{ scale: heroScale }] }]}
            pointerEvents="none"
          >
            {variant === 'lottie' && (
              <LottieView
                source={GROW_ANIM}
                autoPlay
                loop
                style={styles.lottie}
              />
            )}
            <Text style={styles.kicker}>Lass wachsen, was du liebst 🌿</Text>
            <Text style={styles.title}>
              {firstName
                ? `Willkommen zurück, ${firstName}`
                : 'Willkommen zurück'}
            </Text>
            <Text style={styles.subtitle}>
              Logge dich ein und bleib mit deiner Grow-Community verbunden.
            </Text>
          </Animated.View>

          {/* GLASS-CARD */}
          <AuthLiquidGlassCard
            style={{ marginTop: 16, marginHorizontal: 2, borderRadius: 26 }}
          >
            {/* Identifier */}
            <Field
              label="E-Mail oder Benutzername"
              focused={focusId}
              onPress={() => emailRef.current?.focus()}
            >
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
                  style={[
                    styles.input,
                    {
                      // Inputs etwas dunkler → wirken wie „Einschnitte“ im Glas
                      backgroundColor: 'rgba(0,0,0,0.24)',
                      borderColor: focusId
                        ? colors.accent
                        : 'rgba(255,255,255,0.20)',
                      color: colors.text,
                    },
                  ]}
                />
              </View>
            </Field>

            {/* Passwort */}
            <Field
              label="Passwort"
              focused={focusPw}
              onPress={() => pwRef.current?.focus()}
            >
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
                  style={[
                    styles.input,
                    {
                      backgroundColor: 'rgba(0,0,0,0.24)',
                      borderColor: focusPw
                        ? colors.accent
                        : 'rgba(255,255,255,0.20)',
                      color: colors.text,
                      paddingRight: 54,
                    },
                  ]}
                />

                <EyeGlassButton
                  visible={showPw}
                  onToggle={() => {
                    setShowPw((v) => !v);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 6,
                    zIndex: 10,
                  }}
                />
              </View>
            </Field>

            {/* Fehler */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Links & CTA */}
            <Text
              onPress={() =>
                navigation.navigate('ForgotPassword' as never)
              }
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
              <Text
                style={styles.linkAccent}
                onPress={() =>
                  Linking.openURL('https://growgram-app.com/terms')
                }
              >
                Nutzungsbedingungen
              </Text>{' '}
              und{' '}
              <Text
                style={styles.linkAccent}
                onPress={() =>
                  Linking.openURL('https://growgram-app.com/privacy')
                }
              >
                Datenschutz
              </Text>
              .
            </Text>

            <Text style={styles.microTrust}>
              Kein öffentliches Profil, ohne dass du es freigibst.
            </Text>
          </AuthLiquidGlassCard>

          {/* SIGNUP-FOOTER */}
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

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020805',
  },
  kav: { flex: 1 },
  scroller: { paddingHorizontal: 18 },

  /* Brand */
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  brandLogo: {
    width: 30,
    height: 30,
    marginRight: 8,
    borderRadius: 8,
  },
  brandTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    color: '#F7FFF9',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.9,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginRight: 8,
  },
  betaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(168,255,176,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(168,255,176,0.55)',
  },
  betaText: {
    color: '#A8FFB0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  brandTagline: {
    color: '#C3D7CB',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.9,
  },

  /* Hero */
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

  /* Fields */
  fieldWrap: { marginTop: 12 },
  fieldPressable: { borderRadius: 16 },

  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 6,
    opacity: 0.92,
  },

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

  legal: {
    marginTop: 10,
    color: '#C8D6CF',
    fontSize: 12,
    textAlign: 'center',
  },
  linkAccent: {
    color: '#FFA726',
    fontWeight: '800',
    textShadowColor: 'rgba(255,167,38,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  microTrust: {
    marginTop: 6,
    fontSize: 11,
    textAlign: 'center',
    color: '#8FB39A',
  },

  /* Footer */
  footer: { alignItems: 'center', marginTop: 20 },
  footerText: { color: '#C8D6CF', marginBottom: 6 },
});