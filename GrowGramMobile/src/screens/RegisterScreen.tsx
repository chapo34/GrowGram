// src/screens/RegisterScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  View,
  ScrollView,
  Linking,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import Constants from 'expo-constants';

// ---- Konfiguration ----
const API_BASE =
  ((Constants.expoConfig?.extra as any)?.API_BASE_URL as string) ??
  'https://europe-west3-growgram-backend.cloudfunctions.net/api';

const TERMS_URL = 'https://growgram.web.app/terms';
const PRIVACY_URL = 'https://growgram.web.app/privacy';

// ---- Helper ----
function formatDateYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function yearsBetween(birth: Date, ref: Date) {
  let years = ref.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

// optionaler Username: 3–20 Zeichen, Buchstaben/Zahlen/._ erlaubt
const USERNAME_RE = /^[a-zA-Z0-9._]{3,20}$/;

export default function RegisterScreen() {
  const navigation = useNavigation<any>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // optional
  const [username, setUsername] = useState('');

  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  // ---- Validierung ----
  const normalizedEmail = email.trim().toLowerCase();
  const emailInvalid =
    normalizedEmail.length > 0 &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  const usernameInvalid =
    username.trim().length > 0 && !USERNAME_RE.test(username.trim());

  const underAge = birthDate ? yearsBetween(birthDate, new Date()) < 18 : false;

  const canSubmit = useMemo(() => {
    return (
      !loading &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      !!birthDate &&
      !underAge &&
      city.trim().length > 0 &&
      normalizedEmail.length > 0 &&
      !emailInvalid &&
      password.length >= 6 &&
      !usernameInvalid
    );
  }, [
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
  ]);

  // ---- Actions ----
  const openLink = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
    } catch {}
  };

  const onChangeDate = (event: DateTimePickerEvent, date?: Date) => {
    // Android: Wenn Dialog abgebrochen → schließen und NICHTS setzen
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setShowDatePicker(false);
        return;
      }
      setShowDatePicker(false);
    }
    if (date) setBirthDate(date);
  };

  const handleRegister = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);

      const payload: Record<string, any> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: formatDateYYYYMMDD(birthDate as Date),
        city: city.trim(),
        email: normalizedEmail, // ✅ immer lowercase + getrimmt
        password,
      };
      if (username.trim()) payload.username = username.trim();

      const res = await axios.post(`${API_BASE}/auth/register`, payload);
      Alert.alert(
        'Erfolgreich',
        res.data?.message || 'Konto erstellt! Bitte bestätige deine E‑Mail.'
      );
      navigation.navigate('Login');
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      Alert.alert('Fehler', msg);
    } finally {
      setLoading(false);
    }
  };

  // ---- UI ----
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
            source={require('../assets/animations/registerPlant.json')}
            autoPlay
            loop
            style={styles.lottie}
          />

          <Text style={styles.title}>GrowGram Registrierung</Text>

          <View style={styles.card}>
            <TextInput
              placeholder="Vorname *"
              placeholderTextColor="#c7e2cf"
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              returnKeyType="next"
            />

            <TextInput
              placeholder="Nachname *"
              placeholderTextColor="#c7e2cf"
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              returnKeyType="next"
            />

            <TextInput
              placeholder="Benutzername *"
              placeholderTextColor="#c7e2cf"
              style={[styles.input, usernameInvalid && styles.inputError]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {usernameInvalid && (
              <Text style={styles.helperError}>
                3–20 Zeichen, nur Buchstaben/Zahlen, Punkt oder Unterstrich.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.input}
              activeOpacity={0.8}
            >
              <Text style={{ color: birthDate ? '#fff' : '#c7e2cf' }}>
                {birthDate
                  ? birthDate.toLocaleDateString()
                  : 'Geburtsdatum auswählen *'}
              </Text>
            </TouchableOpacity>
            {underAge && (
              <Text style={styles.helperError}>
                Du musst mindestens 18 Jahre alt sein.
              </Text>
            )}

            {/* iOS: hübsches Modal; Android: nativer Dialog (Cancel handled) */}
            {Platform.OS === 'ios' ? (
              <Modal
                visible={showDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.modalBtnText}>Abbrechen</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>Geburtsdatum</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.modalBtnText}>Fertig</Text>
                      </TouchableOpacity>
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

            <TextInput
              placeholder="Stadt *"
              placeholderTextColor="#c7e2cf"
              style={styles.input}
              value={city}
              onChangeText={setCity}
              returnKeyType="next"
            />

            <TextInput
              placeholder="E‑Mail *"
              placeholderTextColor="#c7e2cf"
              style={[styles.input, emailInvalid && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {emailInvalid && (
              <Text style={styles.helperError}>Bitte gültige E‑Mail eingeben.</Text>
            )}

            <TextInput
              placeholder="Passwort (min. 6 Zeichen) *"
              placeholderTextColor="#c7e2cf"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.button, !canSubmit && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Lädt…' : 'Registrieren'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              Mit der Registrierung stimmst du unseren{' '}
              <Text style={styles.link} onPress={() => openLink(TERMS_URL)}>
                AGB
              </Text>{' '}
              und der{' '}
              <Text style={styles.link} onPress={() => openLink(PRIVACY_URL)}>
                Datenschutzerklärung
              </Text>{' '}
              zu.
            </Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backLink}>Zurück zum Login</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---- Styles ----
const BG = '#0b1f14';
const CARD = '#11271b';
const INPUT = '#143021';
const BORDER = '#2f5a41';
const ACCENT = '#4CAF50';
const TEXT = '#ffffff';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  lottie: { width: 180, height: 180, alignSelf: 'center', marginBottom: 8 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#A8FFB0',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(76,175,80,0.35)',
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
  inputError: {
    borderColor: '#ff7676',
  },
  helperError: {
    color: '#ff9a9a',
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
  },
  button: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: { color: '#0c1a10', fontWeight: '800', fontSize: 15 },
  backLink: { marginTop: 16, textAlign: 'center', color: '#FFA726', fontWeight: '600' },
  legal: {
    marginTop: 12,
    color: '#c7e2cf',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  link: { color: '#A8FFB0', textDecorationLine: 'underline' },
  // iOS Date‑Picker Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: BORDER,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
  },
  modalTitle: { color: TEXT, fontWeight: '700' },
  modalBtnText: { color: '#A8FFB0', fontWeight: '600' },
});