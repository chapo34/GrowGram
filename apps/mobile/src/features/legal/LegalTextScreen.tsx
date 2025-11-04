import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, API_BASE } from '../../utils/api';

type Kind = 'terms' | 'guidelines' | 'privacy';

type RouteParams = {
  kind?: Kind;        // 'terms' | 'guidelines' | 'privacy'
  title?: string;     // Überschrift überschreiben
  body?: string;      // Inhalt direkt übergeben (dann kein Fetch)
  endpoint?: string;  // eigener Pfad, z.B. '/legal/terms'
};

const BG = '#0b1f14';
const CARD = '#11271b';
const BORDER = '#2f5a41';
const TEXT = '#ffffff';
const SUB  = '#cfe8d6';
const ACCENT = '#4CAF50';

const ENDPOINTS: Record<Kind, string> = {
  terms: '/legal/terms',
  guidelines: '/legal/guidelines',
  privacy: '/legal/privacy',
};

// Kurzer, klarer Fallback-Text – wirkt “professionell”, nicht nur technisch
const FALLBACK_TEXT: Record<Kind, string> = {
  terms: [
    'Nutzungsbedingungen',
    '',
    'Diese Plattform stellt Inhalte, Austausch und Community-Funktionen bereit. Sie dient ausschließlich der Information und Unterhaltung.',
    'Jegliche Form von Handel, Vermittlung oder Anbahnung außerhalb des zulässigen Rahmens ist untersagt.',
    'Durch die Nutzung erkennst du die geltenden Regeln, Richtlinien und Datenschutzhinweise an.',
  ].join('\n'),
  guidelines: [
    'Community-Richtlinien',
    '',
    'Wir fördern respektvolle, hilfreiche und verantwortungsbewusste Beiträge.',
    'Untersagt sind u. a.: Handel/Anbahnung, das Teilen persönlicher Kontakt-/Treffpunktdaten, illegale Inhalte sowie Belästigungen.',
    'Bei Verstößen behalten wir uns Moderation, Entfernung von Inhalten und Einschränkung von Accounts vor.',
  ].join('\n'),
  privacy: [
    'Datenschutz',
    '',
    'Wir verarbeiten personenbezogene Daten im erforderlichen Mindestmaß. Die Details zu Kategorien, Zwecken, Rechtsgrundlagen und Aufbewahrung findest du in der vollständigen Datenschutzerklärung.',
    'Du hast u. a. Rechte auf Auskunft, Berichtigung und Löschung nach Maßgabe der geltenden Bestimmungen.',
  ].join('\n'),
};

export default function LegalTextScreen() {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const { kind, title, body, endpoint }: RouteParams = route?.params ?? {};

  const [text, setText] = useState<string>(body ?? '');
  const [loading, setLoading] = useState<boolean>(!body);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const resolvedKind: Kind | null = useMemo(() => {
    if (kind === 'terms' || kind === 'guidelines' || kind === 'privacy') return kind;
    return null;
  }, [kind]);

  const screenTitle = useMemo(() => {
    if (title) return title;
    if (resolvedKind === 'terms') return 'Nutzungsbedingungen';
    if (resolvedKind === 'guidelines') return 'Community-Richtlinien';
    if (resolvedKind === 'privacy') return 'Datenschutz';
    return 'Rechtliche Informationen';
  }, [title, resolvedKind]);

  // ⬇️ WICHTIG: setOptions NICHT in der Render-Phase, sondern hier:
  useLayoutEffect(() => {
    (navigation as any)?.setOptions?.({
      title: screenTitle,
      headerShown: true,
    });
  }, [navigation, screenTitle]);

  const fetchText = useCallback(async () => {
    if (body) return; // expliziter Inhalt wurde übergeben
    setLoading(true);
    setError(null);
    try {
      const path = endpoint || (resolvedKind ? ENDPOINTS[resolvedKind] : ENDPOINTS.terms);

      // Server liefert Plain-Text? Dann so:
      const res = await api.get(`${path}`, {
        transformResponse: [(data) => data],
        headers: { Accept: 'text/plain' },
      });

      const t = String(res?.data ?? '').trim();
      if (!t) throw new Error('Leer');
      setText(t);
    } catch (e: any) {
      // Seriöser Fallback-Text, damit die Seite auch offline “professionell” wirkt
      setText(FALLBACK_TEXT[resolvedKind ?? 'terms']);
      setError('Konnte Text nicht laden. Es wird ein Offline-Hinweis angezeigt.');
    } finally {
      setLoading(false);
    }
  }, [body, endpoint, resolvedKind]);

  useEffect(() => {
    void fetchText();
  }, [fetchText]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchText();
    setRefreshing(false);
  };

  const sourceUrl =
    endpoint ||
    (resolvedKind ? `${API_BASE}${ENDPOINTS[resolvedKind]}` : `${API_BASE}${ENDPOINTS.terms}`);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            tintColor="#fff"
            colors={[ACCENT]}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.title}>{screenTitle}</Text>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.loadingText}>Lade Text…</Text>
            </View>
          ) : (
            <>
              {error ? <Text style={styles.hint}>{error}</Text> : null}
              <Text style={styles.body}>{text}</Text>
              <View style={styles.footer}>
                <Text style={styles.meta}>
                  Quelle: <Text style={styles.metaAccent}>{sourceUrl}</Text>
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { padding: 16 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  title: { color: '#A8FFB0', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  loadingText: { color: SUB },
  hint: { color: '#ffb4a9', marginBottom: 8 },
  body: { color: TEXT, lineHeight: 20, letterSpacing: 0.2 },
  footer: { marginTop: 14, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  meta: { color: SUB, fontSize: 12 },
  metaAccent: { color: '#dfe7e1' },
});