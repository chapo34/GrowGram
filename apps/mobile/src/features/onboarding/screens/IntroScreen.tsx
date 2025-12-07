// apps/mobile/src/features/onboarding/screens/IntroScreen.tsx

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Video,
  ResizeMode,
  Audio,
  type AVPlaybackStatus,
} from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

import { STORAGE_KEYS } from '@shared/lib/apiClient';

// -----------------------------------------------------------------------------
// Assets & Konstanten
// -----------------------------------------------------------------------------

const APP_INTRO = require('../../../../assets/intro/video/appIntro.mp4');
const INTRO_STING = require('../../../../assets/intro/sting.wav');

// Wie lange der Intro-Clip ungefähr läuft (für Fallback-Timeout)
const INTRO_DURATION_MS = 4000;
const STING_AT_MS = 2600;
const ENABLE_STING = true;

// Flags / Storage Keys
const INTRO_FLAG = 'growgram:intro:seen';
const COMPLIANCE_PREFIX = 'growgram:compliance:'; // ⬅️ lokal, damit kein Fehler bei STORAGE_KEYS

// Falls Routen anders heißen, wird hier versucht, sinnvolle Ziele zu finden
const PREFERRED_TARGETS = ['Main', 'Home', 'Root', 'Tabs', 'MainTabs', 'RootTabs'];

const { width: W, height: H } = Dimensions.get('window');

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function IntroScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const videoRef = useRef<Video | null>(null);
  const stingRef = useRef<Audio.Sound | null>(null);

  const fadeRef = useRef(new Animated.Value(1));
  const doneRef = useRef(false);

  const tFinish = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tSting = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Helper: Routing-Ziele prüfen
  // ---------------------------------------------------------------------------

  const getRouteIfExists = useCallback(
    (name: string): string | null => {
      try {
        const s: any = (navigation as any)?.getState?.();
        const names: string[] = s?.routeNames ?? [];
        return names.includes(name) ? name : null;
      } catch {
        return null;
      }
    },
    [navigation],
  );

  const resolveDefaultTarget = useCallback(
    (): string | null => {
      for (const n of PREFERRED_TARGETS) {
        const hit = getRouteIfExists(n);
        if (hit) return hit;
      }
      try {
        const s: any = (navigation as any)?.getState?.();
        const names: string[] = s?.routeNames ?? [];
        return names[0] ?? null;
      } catch {
        return null;
      }
    },
    [getRouteIfExists, navigation],
  );

  const replaceTo = useCallback(
    (name: string) => {
      try {
        (navigation as any).reset?.({
          index: 0,
          routes: [{ name }],
        });
        return;
      } catch {
        // fallback
      }
      (navigation as any).navigate?.(name);
    },
    [navigation],
  );

  // ---------------------------------------------------------------------------
  // Lokales Compliance-Ack lesen
  // ---------------------------------------------------------------------------

  const readLocalComplianceAck = useCallback(async () => {
    try {
      const rawUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const userId: string | null = rawUser
        ? (JSON.parse(rawUser)?.id ?? null)
        : null;

      if (!userId) {
        return { hasAck: false, userId: null as string | null };
      }

      const key = `${COMPLIANCE_PREFIX}${userId}`;
      const v = await AsyncStorage.getItem(key);

      let hasAck = v === '1';

      if (!hasAck && v) {
        try {
          const j = JSON.parse(v);
          hasAck = j?.agreed === true || j?.accepted === true;
        } catch {
          // ignore parse error
        }
      }

      return { hasAck, userId };
    } catch {
      return { hasAck: false, userId: null as string | null };
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Audio-Fade-Out
  // ---------------------------------------------------------------------------

  const fadeAudioOut = useCallback(async () => {
    try {
      for (let i = 0; i < 12; i++) {
        const v = Math.max(0, 1 - (i + 1) / 12);
        await videoRef.current?.setStatusAsync({
          volume: v,
          isMuted: v === 0,
        });
        if (stingRef.current) {
          await stingRef.current.setStatusAsync({ volume: v });
        }
        // leichtes Delay für smooth Fade
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 28));
      }
    } catch {
      // leise ignorieren
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Navigation nach dem Intro
  // ---------------------------------------------------------------------------

  const goNext = useCallback(async () => {
    await AsyncStorage.setItem(INTRO_FLAG, '1');

    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      // Kein Login → Auth-Flow
      replaceTo(getRouteIfExists('Auth') || 'Auth');
      return;
    }

    const { hasAck } = await readLocalComplianceAck();
    if (!hasAck) {
      // Noch kein Compliance-Ack → Compliance-Screen
      replaceTo(
        getRouteIfExists('WelcomeCompliance') || 'WelcomeCompliance',
      );
      return;
    }

    // Alles ok → Haupt-App
    replaceTo(
      getRouteIfExists('Main') || resolveDefaultTarget() || 'Main',
    );
  }, [getRouteIfExists, readLocalComplianceAck, replaceTo, resolveDefaultTarget]);

  const finish = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setIsFinishing(true);

    if (tFinish.current) clearTimeout(tFinish.current);
    if (tSting.current) clearTimeout(tSting.current);

    await fadeAudioOut();

    Animated.timing(fadeRef.current, {
      toValue: 0,
      duration: 260,
      useNativeDriver: false,
    }).start(() => {
      void goNext();
    });
  }, [fadeAudioOut, goNext]);

  const scheduleFinish = useCallback(() => {
    if (tFinish.current) clearTimeout(tFinish.current);
    tFinish.current = setTimeout(finish, INTRO_DURATION_MS);
  }, [finish]);

  const playSting = useCallback(async () => {
    if (!ENABLE_STING) return;
    try {
      const { sound } = await Audio.Sound.createAsync(INTRO_STING, {
        volume: 1,
        shouldPlay: true,
      });
      stingRef.current = sound;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
        () => {},
      );
    } catch {
      // ignore
    }
  }, []);

  const onPlaybackUpdate = useCallback(
    (st: AVPlaybackStatus) => {
      if (!st.isLoaded) return;

      const pos = st.positionMillis ?? 0;

      if (!hasStarted && pos > 50) {
        setHasStarted(true);
        scheduleFinish();

        if (tSting.current) clearTimeout(tSting.current);
        tSting.current = setTimeout(
          playSting,
          Math.max(0, STING_AT_MS - pos),
        );
      }

      // Falls das Video vorher zu Ende ist → direkt finishen
      if ((st as any).didJustFinish && !(st as any).isLooping) {
        void finish();
      }
    },
    [hasStarted, scheduleFinish, playSting, finish],
  );

  const onReady = useCallback(async () => {
    setIsReady(true);
    try {
      await videoRef.current?.setStatusAsync({
        isMuted: false,
        volume: 1,
        shouldPlay: true,
      });
      await videoRef.current?.playAsync();
    } catch {
      // ignore
    }
  }, []);

  const onErr = useCallback(() => {
    setErr('Intro konnte nicht geladen werden.');
    setTimeout(() => {
      void finish();
    }, 500);
  }, [finish]);

  const ensurePlayWithSound = useCallback(async () => {
    try {
      await videoRef.current?.setStatusAsync({
        shouldPlay: true,
        isMuted: false,
        volume: 1,
      });
      await videoRef.current?.playAsync();
    } catch {
      // ignore
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Audio-Mode & Cleanup
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      if (tFinish.current) clearTimeout(tFinish.current);
      if (tSting.current) clearTimeout(tSting.current);
      stingRef.current?.unloadAsync().catch(() => {});
      (videoRef.current as any)?.unloadAsync?.().catch?.(() => {});
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeRef.current }]}
    >
      <StatusBar style="light" hidden />

      <Pressable
        style={styles.videoWrap}
        onPress={ensurePlayWithSound}
        accessibilityRole="button"
        accessibilityLabel="Intro abspielen"
      >
        <Video
          ref={(r) => {
            videoRef.current = r;
          }}
          style={styles.video}
          source={APP_INTRO}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
          isMuted={false}
          volume={1}
          onReadyForDisplay={onReady}
          onError={onErr}
          onPlaybackStatusUpdate={onPlaybackUpdate}
          progressUpdateIntervalMillis={100}
          useNativeControls={false}
        />

        {!isReady && !err && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
            <Text style={styles.loaderText}>Lade Intro…</Text>
          </View>
        )}

        {err && (
          <View style={styles.loader}>
            <Text style={styles.errorText}>{err}</Text>
          </View>
        )}
      </Pressable>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.6)']}
        style={styles.overlayBottom}
        pointerEvents="none"
      />

      <View style={styles.brandWrap} pointerEvents="none">
        <Text style={styles.brandTitle}>GrowGram</Text>
        <Text style={styles.brandSubtitle}>Let it grow.</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Intro überspringen"
        onPress={() => void finish()}
        style={({ pressed }) => [
          styles.skipBtn,
          pressed && { opacity: 0.6 },
        ]}
      >
        <LinearGradient
          colors={['#4CAF50', '#3a9440']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.skipBtnBg}
        >
          <Text style={styles.skipTxt}>
            {isFinishing ? '…' : 'Skip'}
          </Text>
        </LinearGradient>
      </Pressable>

      {__DEV__ && Platform.select({ ios: true, android: true }) && (
        <View style={styles.devHint}>
          <Text style={styles.devHintTxt}>
            Intro • Tippen = Ton erzwingen • Skip = sofort weiter
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    width: W,
    height: H,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrap: {
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: W,
    height: H,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    width: W,
    height: H * 0.42,
  },
  brandWrap: {
    position: 'absolute',
    bottom: H * 0.12,
    width: W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(76,175,80,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  brandSubtitle: {
    marginTop: 6,
    color: '#dfe7e1',
    fontSize: 16,
    opacity: 0.9,
  },
  loader: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#dfe7e1',
  },
  errorText: {
    color: '#ffb4a9',
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.select({ ios: 54, android: 28 }) as number,
    right: 18,
    borderRadius: 18,
    overflow: 'hidden',
  },
  skipBtnBg: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  skipTxt: {
    color: '#fff',
    fontWeight: '700',
  },
  devHint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  devHintTxt: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});