// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { api, setAuthToken, STORAGE_KEYS } from '../utils/api';

type Me = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string;
  city?: string;
  birthDate?: string;
};

const BG = '#0b1f14';
const CARD = '#0f2219';
const BORDER = '#224434';
const ACCENT = '#4CAF50';
const TEXT = '#E6EAEF';
const MUTED = '#9fb7a5';

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadMe = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/auth/me');
      setMe(res.data as Me);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e?.message?.includes('Network')
          ? 'Netzwerkfehler. Bitte Verbindung prüfen.'
          : 'Session abgelaufen. Bitte neu einloggen.');
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMe();
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
    await setAuthToken(null);
    nav.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  if (loading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const name =
    me?.firstName?.trim()
      ? me.firstName.trim()
      : me?.username?.trim()
      ? me.username.trim()
      : '';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={['#123425', BG]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.hTitle}>{name ? `Hey ${name} 👋` : 'Willkommen 👋'}</Text>
        <Text style={styles.hSub}>Schön, dass du da bist. Lass uns was wachsen lassen.</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl tintColor={ACCENT} refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={[styles.cta, { backgroundColor: '#ff5252' }]} onPress={logout} activeOpacity={0.9}>
              <Text style={[styles.ctaText, { color: '#0c1a10' }]}>Neu einloggen</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.row}>
          <Chip label="Mein Profil" onPress={() => {}} />
          <Chip label="Aktualisieren" onPress={onRefresh} />
          <Chip label="Logout" onPress={logout} danger />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Willkommen bei GrowGram 🌱</Text>
          <Text style={styles.cardText}>
            Dies ist dein Startpunkt. Hier kommen später dein Feed, Stories und Empfehlungen hin.
          </Text>
        </View>

        {me ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dein Account</Text>
            <Text style={styles.meta}>
              E-Mail: <Text style={styles.bold}>{me.email}</Text>
            </Text>
            {me.username ? (
              <Text style={styles.meta}>
                Benutzername: <Text style={styles.bold}>{me.username}</Text>
              </Text>
            ) : null}
            {me.city ? (
              <Text style={styles.meta}>
                Stadt: <Text style={styles.bold}>{me.city}</Text>
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Platz nach unten, damit der FAB nichts überlappt */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Dezent, mittig, über der Tabbar */}
    </View>
  );
}

function Chip({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        danger && { backgroundColor: 'rgba(255,82,82,0.12)', borderColor: '#ff5252' },
      ]}
    >
      <Text style={[styles.chipText, danger && { color: '#ff9a9a' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  fullCenter: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  hTitle: { color: TEXT, fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  hSub: { color: MUTED, marginTop: 4 },

  content: { padding: 16, paddingBottom: 28 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 14,
  },
  errorCard: { borderColor: '#ff5252', backgroundColor: 'rgba(255,82,82,0.08)' },
  errorText: { color: '#ff9a9a', marginBottom: 10 },

  cardTitle: { color: TEXT, fontWeight: '800', fontSize: 16, marginBottom: 6 },
  cardText: { color: MUTED, lineHeight: 20 },
  meta: { color: MUTED, marginTop: 4 },
  bold: { color: TEXT, fontWeight: '700' },

  cta: {
    marginTop: 8,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaText: { color: '#0c1a10', fontWeight: '800' },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#0f2a1f',
  },
  chipText: { color: TEXT, fontWeight: '700' },
});