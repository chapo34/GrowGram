// src/screens/LoginScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  View,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LottieView from 'lottie-react-native';
import { RootStackParamList } from '../navigation/AppNavigator';

// API-Helpers
import { api, setAuthToken, STORAGE_KEYS } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Farben konsistent zum Register-Screen
const BG = '#0b1f14';
const CARD = '#11271b';
const INPUT = '#143021';
const BORDER = '#2f5a41';
const ACCENT = '#4CAF50';
const TEXT = '#ffffff';

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();

  const [identifier, setIdentifier] = useState(''); // E-Mail ODER Benutzername
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => identifier.trim().length > 2 && password.length >= 6 && !loading,
    [identifier, password, loading]
  );

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      const token: string | undefined = res?.data?.token;
      const user = res?.data?.user;

      if (!token) throw new Error('Kein Token erhalten');

      // Token global speichern (inMemory + AsyncStorage)
      await setAuthToken(token);

      // User optional sichern (für schnelle Anzeige)
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }

      // Rein in die App (Stack sauber zurücksetzen)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' as never }],
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.message?.includes('Network')
          ? 'Netzwerkfehler. Bitte Verbindung prüfen.'
          : 'Login fehlgeschlagen. Bitte Daten prüfen.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LottieView
            source={require('../assets/animations/grow.json')}
            autoPlay
            loop
            style={styles.lottie}
          />

          <Text style={styles.title}>Welcome to GrowGram</Text>

          <View style={styles.card}>
            <TextInput
              placeholder="E-Mail oder Benutzername"
              placeholderTextColor="#c7e2cf"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={setIdentifier}
              returnKeyType="next"
            />

            <View style={{ position: 'relative' }}>
              <TextInput
                placeholder="Passwort"
                placeholderTextColor="#c7e2cf"
                style={[styles.input, { paddingRight: 48 }]}
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPw((s) => !s)}
                style={styles.pwToggle}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#A8FFB0', fontWeight: '600' }}>
                  {showPw ? 'Verbergen' : 'Anzeigen'}
                </Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, (!canSubmit || loading) && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#0c1a10" />
              ) : (
                <Text style={styles.buttonText}>Einloggen</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword' as never)}
              style={{ marginTop: 12, alignSelf: 'center' }}
            >
              <Text style={styles.linkAccent}>Passwort vergessen?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
            <Text style={styles.registerText}>
              Noch kein Konto? <Text style={styles.registerLink}>Registrieren</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  lottie: { width: 220, height: 220, alignSelf: 'center', marginBottom: 10 },
  title: {
    fontSize: 24,
    color: '#A8FFB0',
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(76, 175, 80, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  input: {
    backgroundColor: INPUT,
    color: TEXT,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
  },
  pwToggle: {
    position: 'absolute',
    right: 12,
    top: 12,
    height: 26,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: ACCENT,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: { color: '#0c1a10', fontSize: 16, fontWeight: '800' },
  linkAccent: { color: '#A8FFB0', fontWeight: '600' },
  registerText: {
    marginTop: 16,
    color: '#c7e2cf',
    fontSize: 14,
    textAlign: 'center',
  },
  registerLink: {
    color: '#FFA726',
    fontWeight: '700',
  },
  error: {
    color: '#ff9a9a',
    textAlign: 'center',
    marginBottom: 8,
  },
});