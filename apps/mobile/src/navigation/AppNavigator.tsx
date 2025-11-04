// src/navigation/AppNavigator.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeProvider';

// Intro / Compliance / Legal
import IntroScreen from '../screens/IntroScreen';
import WelcomeComplianceScreen from '../screens/WelcomeComplianceScreen';
import LegalTextScreen from '../features/legal/LegalTextScreen';

// Auth
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Core
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import PostScreen from '../screens/PostScreen';
import PostCreateScreen from '../screens/PostCreateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

// Chat
import { ChatListScreen, ChatThreadScreen } from '../features/chat/ChatModule';

// Dock
import GrowDock from '../components/GrowDock';

// Waitlist (achte auf exakte Dateinamen)
import WaitlistSignupScreen from '../screens/waitlistSignupScreen';
import WaitlistStatusScreen from '../screens/waitlistSignupScreen';

// API & Compliance
import { STORAGE_KEYS, getComplianceAck } from '../utils/api';
import type { FeedPost } from '../utils/api';

const INTRO_FLAG = 'growgram:intro:seen';
const DEV_FORCE_INTRO = false;

/* ----- Typen ----- */
export type RootStackParamList = {
  Intro: undefined;
  Auth: undefined;
  Main: undefined;
  WelcomeCompliance?: { userId?: string };
  Terms?: { kind?: 'terms'; title?: string };
  Guidelines?: { kind?: 'guidelines'; title?: string };
  // Waitlist
  WaitlistSignup: undefined;
  WaitlistStatus: { publicId?: string; viewerToken?: string } | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Explore: undefined | { q?: string };
  Chat: undefined;
  ChatThread: { chatId: string; title?: string; peerAvatarUrl?: string };
  Post: { id?: string; post?: FeedPost };
  PostCreate: undefined;
  Profile: undefined;
  ProfileSetup: undefined;
};

export type MainNav = NativeStackNavigationProp<MainStackParamList>;

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

/* ----- Auth-Stack ----- */
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen as any} />
      <AuthStack.Screen name="Register" component={RegisterScreen as any} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen as any} />
    </AuthStack.Navigator>
  );
}

/* ----- Main-Stack ----- */
function MainStackScreen() {
  const { colors } = useTheme();
  const surface = colors.panel;

  return (
    <>
      <MainStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <MainStack.Screen name="Home" component={HomeScreen as any} />
        <MainStack.Screen name="Explore" component={ExploreScreen as any} />

        {/* Chat */}
        <MainStack.Screen name="Chat" component={ChatListScreen as any} options={{ headerShown: false }} />
        <MainStack.Screen
          name="ChatThread"
          component={ChatThreadScreen as any}
          options={({ route, navigation }) => {
            const title = route.params?.title || 'Unterhaltung';
            const avatar = route.params?.peerAvatarUrl;
            return {
              headerShown: true,
              headerTintColor: colors.text,
              headerTitleAlign: 'left',
              headerTitle: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={{ width: 28, height: 28, borderRadius: 8, marginRight: 10 }} />
                  ) : (
                    <View
                      style={{
                        width: 28, height: 28, borderRadius: 8, marginRight: 10,
                        backgroundColor: '#133625', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#b6ffc3', fontWeight: '900' }}>
                        {(title?.[0] || 'C').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: '800', maxWidth: 220 }}>
                    {title}
                  </Text>
                </View>
              ),
              headerLeft: () => (
                <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 }} hitSlop={10}>
                  <Text style={{ color: colors.text, fontSize: 18 }}>‹</Text>
                </Pressable>
              ),
              headerBackground: () => (
                <LinearGradient colors={[surface, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
              ),
            };
          }}
        />

        {/* Post */}
        <MainStack.Screen
          name="Post"
          component={PostScreen as any}
          options={{
            headerShown: true,
            title: 'Beitrag',
            headerTintColor: colors.text,
            headerBackground: () => (
              <LinearGradient colors={[surface, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            ),
          }}
        />

        {/* Modale */}
        <MainStack.Screen
          name="PostCreate"
          component={PostCreateScreen}
          options={{
            headerShown: true,
            title: 'Neuer Post',
            presentation: 'modal',
            headerTintColor: colors.text,
            headerBackground: () => (
              <LinearGradient colors={[surface, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            ),
          }}
        />
        <MainStack.Screen
          name="ProfileSetup"
          component={ProfileSetupScreen as any}
          options={{
            headerShown: true,
            title: 'Profil bearbeiten',
            presentation: 'modal',
            headerTintColor: colors.text,
            headerBackground: () => (
              <LinearGradient colors={[surface, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            ),
          }}
        />

        <MainStack.Screen name="Profile" component={ProfileScreen as any} />
      </MainStack.Navigator>

      {/* Dock on top */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <GrowDock />
      </View>
    </>
  );
}

/* ----- Root (Intro → Auth/Main/Compliance/Legal/Waitlist) ----- */
export default function AppNavigator() {
  type RootRouteName = keyof RootStackParamList;
  const [initial, setInitial] = useState<RootRouteName | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (DEV_FORCE_INTRO) { setInitial('Intro'); return; }

        const introSeen = await AsyncStorage.getItem(INTRO_FLAG);
        if (!introSeen) { setInitial('Intro'); return; }

        const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) { setInitial('Auth'); return; }

        const rawUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        const userId = rawUser ? (JSON.parse(rawUser)?.id as string | undefined) : undefined;
        const ack = await getComplianceAck(userId ?? null);

        setInitial(ack ? 'Main' : 'WelcomeCompliance');
      } catch (e: any) {
        console.warn('boot route failed:', e?.message || e);
        setInitial('Auth');
      }
    })();
  }, []);

  if (!initial) return null;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initial}>
      <RootStack.Screen name="Intro" component={IntroScreen as any} />
      <RootStack.Screen name="Auth" component={AuthStackScreen} />
      <RootStack.Screen name="WelcomeCompliance" component={WelcomeComplianceScreen as any} />
      <RootStack.Screen name="Main" component={MainStackScreen} />

      {/* Waitlist */}
      <RootStack.Screen
        name="WaitlistSignup"
        component={WaitlistSignupScreen as any}
        options={{ headerShown: true, title: 'GrowGram Waitlist' }}
      />
      <RootStack.Screen
        name="WaitlistStatus"
        component={WaitlistStatusScreen as any}
        options={{ headerShown: true, title: 'Waitlist Status' }}
      />

      {/* Rechtliches */}
      <RootStack.Screen
        name="Terms"
        component={LegalTextScreen as any}
        options={{ headerShown: true, title: 'Nutzungsbedingungen' }}
        initialParams={{ kind: 'terms', title: 'Nutzungsbedingungen' }}
      />
      <RootStack.Screen
        name="Guidelines"
        component={LegalTextScreen as any}
        options={{ headerShown: true, title: 'Community-Richtlinien' }}
        initialParams={{ kind: 'guidelines', title: 'Community-Richtlinien' }}
      />
    </RootStack.Navigator>
  );
}