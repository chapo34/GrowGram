// src/navigation/AppNavigator.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeProvider';

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

export const STORAGE_KEYS = {
  TOKEN: 'GG_TOKEN',
  USER: 'GG_USER',
} as const;

/* ---------------- Typen ---------------- */
export type RootStackParamList = { Auth: undefined; Main: undefined };
export type AuthStackParamList = { Login: undefined; Register: undefined; ForgotPassword: undefined };

type FeedPost = import('../utils/api').FeedPost;

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

/* --------------- Auth Stack ---------------- */
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen as any} />
      <AuthStack.Screen name="Register" component={RegisterScreen as any} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen as any} />
    </AuthStack.Navigator>
  );
}

/* --------------- Main Stack ---------------- */
function MainStackScreen() {
  const { colors } = useTheme();

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
                      <Text style={{ color: '#b6ffc3', fontWeight: '900' }}>{(title?.[0] || 'C').toUpperCase()}</Text>
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
                <LinearGradient colors={[colors.card, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
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
              <LinearGradient colors={[colors.card, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
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
              <LinearGradient colors={[colors.card, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
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
              <LinearGradient colors={[colors.card, colors.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            ),
          }}
        />

        <MainStack.Screen name="Profile" component={ProfileScreen as any} />
      </MainStack.Navigator>

      {/* FIX TS(2322): pointerEvents nur auf View, nicht auf GrowDock */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <GrowDock />
      </View>
    </>
  );
}

/* --------------- Root ------------------ */
export default function AppNavigator() {
  const [initial, setInitial] = useState<'Auth' | 'Main'>('Auth');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        setInitial(token ? 'Main' : 'Auth');
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) return null;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initial}>
      <RootStack.Screen name="Auth" component={AuthStackScreen} />
      <RootStack.Screen name="Main" component={MainStackScreen} />
    </RootStack.Navigator>
  );
}