import React, { useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, MainStackParamList } from '../navigation/AppNavigator';

const { width: W } = Dimensions.get('window');

// Layout
const BAR_H = 70;
const BTN_SIZE = 68;
const ITEM_SIZE = 58;
const RADIUS = 132;
const ARC_START = -150;
const ARC_END   = -30;
const DIM_OPACITY = 0.55;

// 👉 Export: Platz über dem Dock (für Screens)
export const getGrowDockSpace = (bottomInset: number) =>
  Math.max(bottomInset, 12) + BAR_H;

type RootNav = NativeStackNavigationProp<RootStackParamList>;
type Item = { key: string; route: keyof MainStackParamList; icon: any };

const ITEMS: Item[] = [
  { key: 'home',    route: 'Home',       icon: require('../assets/animations/home.json') },
  { key: 'explore', route: 'Explore',    icon: require('../assets/animations/explore.json') },
  { key: 'post',    route: 'PostCreate', icon: require('../assets/animations/post.json') },
  { key: 'chat',    route: 'Chat',       icon: require('../assets/animations/chat.json') },
  { key: 'profile', route: 'Profile',    icon: require('../assets/animations/profile.json') },
];

export default function GrowDock() {
  const rootNav = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const prog = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Haptics.selectionAsync();
    const next = !open;
    setOpen(next);
    Animated.spring(prog, { toValue: next ? 1 : 0, useNativeDriver: false, friction: 7, tension: 90 }).start();
  };

  const go = (route: keyof MainStackParamList) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(false);
    Animated.spring(prog, { toValue: 0, useNativeDriver: false, friction: 8, tension: 90 }).start();
    rootNav.navigate('Main', { screen: route } as never);
  };

  const angles = useMemo(() => {
    const step = (ARC_END - ARC_START) / (ITEMS.length - 1);
    return ITEMS.map((_, i) => ARC_START + step * i);
  }, []);

  const bottom = Math.max(insets.bottom, 12);

  return (
    <>
      {/* Dim-Overlay */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, {
          zIndex: 1000, backgroundColor: '#000',
          opacity: prog.interpolate({ inputRange: [0, 1], outputRange: [0, DIM_OPACITY] })
        }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />
      </Animated.View>

      {/* Dock-Bar */}
      <View pointerEvents="box-none" style={[styles.barWrap, { paddingBottom: bottom, height: BAR_H + bottom }]}>
        {Platform.OS === 'ios'
          ? <BlurView intensity={30} tint="dark" style={styles.bar} />
          : <View style={[styles.bar, { backgroundColor: 'rgba(10,25,18,0.92)' }]} />}

        {/* Halbkreis-Items */}
        {ITEMS.map((it, i) => {
          const rad = (angles[i] * Math.PI) / 180;
          const tx = Math.cos(rad) * RADIUS;
          const ty = Math.sin(rad) * RADIUS;

          const translateX = prog.interpolate({ inputRange: [0, 1], outputRange: [0, tx] });
          const translateY = prog.interpolate({ inputRange: [0, 1], outputRange: [0, ty] });
          const scale      = prog.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
          const opacity    = prog;

          return (
            <Animated.View
              key={it.key}
              pointerEvents={open ? 'auto' : 'none'}
              style={[
                styles.itemWrap,
                { transform: [{ translateX }, { translateY }, { scale }], opacity,
                  bottom: BAR_H / 2 + bottom + 2, left: W / 2 - ITEM_SIZE / 2 },
              ]}
            >
              <Pressable onPress={() => go(it.route)} style={styles.itemBtn} hitSlop={18}>
                <LottieView source={it.icon} autoPlay loop style={{ width: 36, height: 36 }} />
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Zentraler Button */}
        <Animated.View
          style={[
            styles.centerBtnShadow,
            {
              transform: [{ scale: prog.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
              bottom: bottom + (BAR_H - BTN_SIZE) / 2,
              left: W / 2 - BTN_SIZE / 2,
            },
          ]}
        >
          <Pressable onPress={toggle} style={styles.centerBtn} hitSlop={12}>
            <LottieView source={require('../assets/animations/grow.json')} autoPlay loop style={{ width: 64, height: 64 }} />
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 1001, elevation: 20 },
  bar: {
    position: 'absolute', left: 16, right: 16, bottom: 8, top: 8,
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.07)',
  },
  centerBtnShadow: {
    position: 'absolute', width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    shadowColor: '#4CAF50', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10,
    backgroundColor: 'transparent',
  },
  centerBtn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#3fa94a',
  },
  itemWrap: {
    position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(10,25,18,0.92)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(168,255,176,0.22)',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  itemBtn: { width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
});