import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Video, ResizeMode, Audio, type AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  useNavigation,
  StackActions,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';

/** === Assets (statisch, Metro-sicher) === */
const APP_INTRO = require('../../assets/intro/video/appIntro.mp4'); // <- dein Video
const INTRO_STING = require('../../assets/intro/sting.wav');        // <- dein Sound (wav)

/** === Konfiguration === */
const INTRO_DURATION_MS = 4000; // 4s
const STING_AT_MS = 2600;       // Zeitpunkt für den Audio-Hit
const ENABLE_STING = true;      // Brand-Sound aktivieren

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PREFERRED_TARGETS = ['HomeScreen', 'Home', 'MainTabs', 'RootTabs', 'Tabs', 'Root', 'Main'];

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

  /** === Zielroute ermitteln === */
  const resolveNextRoute = useCallback((): string | null => {
    const state: any = navigation.getState?.();
    const names: string[] = state?.routeNames ?? [];
    for (const n of PREFERRED_TARGETS) if (names.includes(n)) return n;
    return names[0] ?? null;
  }, [navigation]);

  /** === Ersetzen / Reset Fallbacks === */
  const replaceTo = useCallback(
    (name: string) => {
      try {
        navigation.dispatch(StackActions.replace(name as never));
        return;
      } catch {}
      const anyNav = navigation as any;
      try {
        anyNav.replace?.(name);
        return;
      } catch {}
      try {
        navigation.reset({ index: 0, routes: [{ name: name as never }] });
        return;
      } catch {}
      navigation.navigate(name as never);
    },
    [navigation]
  );

  /** === sanftes Audio-Fade-out === */
  const fadeAudioOut = useCallback(async () => {
    try {
      for (let i = 0; i < 12; i++) {
        const v = Math.max(0, 1 - (i + 1) / 12);
        await videoRef.current?.setStatusAsync({ volume: v, isMuted: v === 0 });
        if (stingRef.current) await stingRef.current.setStatusAsync({ volume: v });
        await new Promise((r) => setTimeout(r, 28));
      }
    } catch {}
  }, []);

  /** === Finish (Fade + Navigate) === */
  const finish = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setIsFinishing(true);
    if (tFinish.current) clearTimeout(tFinish.current);
    if (tSting.current) clearTimeout(tSting.current);

    await fadeAudioOut();

    const next = resolveNextRoute();
    Animated.timing(fadeRef.current, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      if (next) replaceTo(next);
    });
  }, [fadeAudioOut, replaceTo, resolveNextRoute]);

  /** === 4s Timer nach Start === */
  const scheduleFinish = useCallback(() => {
    if (tFinish.current) clearTimeout(tFinish.current);
    tFinish.current = setTimeout(finish, INTRO_DURATION_MS);
  }, [finish]);

  /** === optionaler Brand-Sting === */
  const playSting = useCallback(async () => {
    if (!ENABLE_STING) return;
    try {
      const { sound } = await Audio.Sound.createAsync(INTRO_STING, {
        volume: 1.1,
        shouldPlay: true,
      });
      stingRef.current = sound;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } catch {}
  }, []);

  /** === Video-Status === */
  const onPlaybackUpdate = useCallback(
    (st: AVPlaybackStatus) => {
      if (!st.isLoaded) return;
      if (!hasStarted && st.positionMillis > 50) {
        setHasStarted(true);
        scheduleFinish();
        if (tSting.current) clearTimeout(tSting.current);
        tSting.current = setTimeout(
          playSting,
          Math.max(0, STING_AT_MS - (st.positionMillis ?? 0))
        );
      }
    },
    [hasStarted, scheduleFinish, playSting]
  );

  /** === Video bereit === */
  const onReady = useCallback(async () => {
    setIsReady(true);
    try {
      await videoRef.current?.setStatusAsync({ isMuted: false, volume: 1, shouldPlay: true });
      await videoRef.current?.playAsync();
    } catch {}
  }, []);

  /** === Fehler === */
  const onErr = useCallback(() => {
    setErr('Intro konnte nicht geladen werden.');
    setTimeout(finish, 600);
  }, [finish]);

  /** === Tap-Fallback: Play mit Sound erzwingen === */
  const ensurePlayWithSound = useCallback(async () => {
    try {
      await videoRef.current?.setStatusAsync({ shouldPlay: true, isMuted: false, volume: 1 });
      await videoRef.current?.playAsync();
    } catch {}
  }, []);

  /** === Audio-Policy: iOS Stummschalter ignorieren === */
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
    }).catch(() => {});
    return () => {
      if (tFinish.current) clearTimeout(tFinish.current);
      if (tSting.current) clearTimeout(tSting.current);
      stingRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeRef.current }]}>
      <StatusBar style="light" hidden />

      <Pressable style={styles.videoWrap} onPress={ensurePlayWithSound}>
        <Video
          ref={(r) => { videoRef.current = r; }}
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

      <Pressable onPress={finish} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}>
        <LinearGradient colors={['#4CAF50', '#3a9440']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.skipBtnBg}>
          <Text style={styles.skipTxt}>{isFinishing ? '…' : 'Skip'}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  videoWrap: { width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  video: { width: SCREEN_W, height: SCREEN_H },
  overlayBottom: { position: 'absolute', bottom: 0, width: SCREEN_W, height: SCREEN_H * 0.42 },
  brandWrap: { position: 'absolute', bottom: SCREEN_H * 0.12, width: SCREEN_W, alignItems: 'center', justifyContent: 'center' },
  brandTitle: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(76,175,80,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  brandSubtitle: { marginTop: 6, color: '#dfe7e1', fontSize: 16, opacity: 0.9 },
  loader: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: 10, color: '#dfe7e1' },
  errorText: { color: '#ffb4a9' },
  skipBtn: { position: 'absolute', top: Platform.select({ ios: 54, android: 28 }), right: 18, borderRadius: 18, overflow: 'hidden' },
  skipBtnBg: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  skipTxt: { color: '#fff', fontWeight: '700' },
});