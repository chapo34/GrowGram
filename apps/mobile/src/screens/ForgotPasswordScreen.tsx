// src/screens/ForgotPasswordScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Constants from 'expo-constants';
import axios from 'axios';

const BG = '#0b1f14';
const CARD = '#11271b';
const INPUT = '#143021';
const BORDER = '#2f5a41';
const ACCENT = '#4CAF50';
const TEXT = '#ffffff';

const API_BASE =
  (Constants.expoConfig?.extra as any)?.API_BASE_URL ??
  'https://europe-west3-growgram-backend.cloudfunctions.net/api';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isValidEmail = useMemo(() => emailRegex.test(email.trim()), [email]);
  const canSubmit = isValidEmail && !loading;

  const handleReset = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    if (!isValidEmail) {
      setErrorMsg('Bitte gib eine gültige E-Mail ein.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/auth/request-password-reset`, {
        email: email.trim(),
      });
      setSuccessMsg(
        res.data?.message ??
          'Falls ein Konto existiert, wurde ein Link gesendet.'
      );
    } catch (e) {
      setErrorMsg('Fehler beim Senden. Versuche es später erneut.');
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
            source={require('../assets/animations/forgotPassword.json')}
            autoPlay
            loop
            style={styles.lottie}
          />

          <Text style={styles.title}>Passwort zurücksetzen</Text>
          <Text style={styles.subtitle}>
            Gib deine E-Mail ein. Falls ein Konto existiert, erhältst du einen
            Link zum Zurücksetzen.
          </Text>

          <View style={styles.card}>
            <TextInput
              placeholder="E-Mail-Adresse"
              placeholderTextColor="#c7e2cf"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {successMsg ? (
              <Text style={[styles.feedback, { color: '#A8FFB0' }]}>
                {successMsg}
              </Text>
            ) : null}
            {errorMsg ? (
              <Text style={[styles.feedback, { color: '#ff9a9a' }]}>
                {errorMsg}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, (!canSubmit || loading) && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={!canSubmit || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#0c1a10" />
              ) : (
                <Text style={styles.buttonText}>Link senden</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginTop: 14, alignSelf: 'center' }}
            >
              <Text style={styles.backText}>Zurück zum Login</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 22,
    color: '#A8FFB0',
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#c7e2cf',
    textAlign: 'center',
    marginBottom: 18,
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
  },
  feedback: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 13,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonText: { color: '#0c1a10', fontSize: 16, fontWeight: '800' },
  backText: {
    color: '#FFA726',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});