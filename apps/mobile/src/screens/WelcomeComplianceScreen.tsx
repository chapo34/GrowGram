import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  Alert, SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable,
  ActivityIndicator, BackHandler, Platform, AccessibilityInfo
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  STORAGE_KEYS,
  setComplianceAck,
  sendComplianceAckToServer,
  getAppComplianceVersion,
} from '../utils/api';

const BG = '#0b1f14';
const CARD = '#11271b';
const BORDER = '#2f5a41';
const TEXT = '#ffffff';
const SUB = '#cfe8d6';
const ACCENT = '#4CAF50';
const ACCENT_DARK = '#3a9440';
const DANGER = '#ff8e8e';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WelcomeComplianceScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [over18, setOver18] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const canContinue = useMemo(() => over18 && agree && !loading, [over18, agree, loading]);

  const submittedRef = useRef(false);

  // Android: Hardware-Back abfangen
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        Alert.alert('Abbrechen?', 'Ohne Zustimmung kannst du GrowGram nicht nutzen.', [
          { text: 'Nein', style: 'cancel' },
          { text: 'Ja, zurück', style: 'destructive', onPress: () =>
              navigation.reset({ index: 0, routes: [{ name: 'Auth' as any, params: { screen: 'Login' } }] })
          },
        ]);
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation])
  );

  const gotoTerms = () => {
    navigation.navigate('Terms', { kind: 'terms', title: 'Nutzungsbedingungen' });
  };
  const gotoGuidelines = () => {
    navigation.navigate('Guidelines', { kind: 'guidelines', title: 'Community-Richtlinien' });
  };

  const onDecline = () => {
    Alert.alert(
      'Hinweis',
      'Ohne Zustimmung zu den Regeln kannst du GrowGram nicht nutzen.',
      [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Auth' as any, params: { screen: 'Login' } }] }) }]
    );
  };

  async function fireAndForgetServerAck(payload: { agree: boolean; over18: boolean; version: string }) {
    try {
      await sendComplianceAckToServer(payload);
    } catch {
      // leiser Retry in 2s
      setTimeout(() => { sendComplianceAckToServer(payload).catch(() => {}); }, 2000);
    }
  }

  const onAccept = async () => {
    if (!canContinue || submittedRef.current) return;
    submittedRef.current = true;
    setLoading(true);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const userId: string | undefined = raw ? JSON.parse(raw)?.id : undefined;
      const version = getAppComplianceVersion();

      if (userId) {
        await setComplianceAck(userId, { version });
      }

      fireAndForgetServerAck({ agree: true, over18: true, version });

      AccessibilityInfo.announceForAccessibility?.('Zustimmung gespeichert. Willkommen!');
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerPad} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 120 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card} accessible accessibilityRole="summary">
          <Text style={styles.h1}>Bevor es losgeht 🌿</Text>
          <Text style={styles.p}>
            Damit GrowGram für alle ein angenehmer und sicherer Ort bleibt, gelten ein paar klare,
            einfache Regeln:
          </Text>

          <View style={styles.box}>
            <Text style={styles.li}>
              • GrowGram ist eine <Text style={styles.strong}>Community- und Content-Plattform</Text>.
              <Text style={styles.strong}> Kein Handel, keine Vermittlung.</Text>
            </Text>
            <Text style={styles.li}>
              • <Text style={styles.strong}>Keine Angebote oder Gesuche</Text> zu Kauf, Verkauf,
              Tausch oder Lieferung.
            </Text>
            <Text style={styles.li}>
              • <Text style={styles.strong}>Privatsphäre schützen:</Text> keine persönlichen
              Kontakt- oder Treffpunkt-Infos teilen.
            </Text>
            <Text style={styles.li}>
              • Inhalte müssen <Text style={styles.strong}>legal</Text>, respektvoll und für
              Erwachsene geeignet sein.
            </Text>
            <Text style={styles.li}>
              • Bei Verstößen können Inhalte <Text style={styles.strong}>sofort entfernt</Text> und
              Accounts <Text style={styles.strong}>eingeschränkt</Text> oder auf eine{' '}
              <Text style={styles.strong}>Blacklist</Text> gesetzt werden.
            </Text>
          </View>

          <View style={styles.boxSoft}>
            <Text style={styles.p}>
              Ziel ist ein fairer, freundlicher und rechtssicherer Austausch rund um Inhalte –{' '}
              <Text style={styles.strong}>ohne Handel</Text>.
            </Text>
          </View>

          <Pressable
            onPress={() => setOver18(v => !v)}
            style={styles.checkRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: over18 }}
            accessibilityLabel="Ich bin mindestens 18 Jahre alt"
            hitSlop={8}
          >
            <View style={[styles.checkbox, over18 && styles.checkboxOn]} />
            <Text style={styles.checkLabel}>Ich bin mindestens 18 Jahre alt.</Text>
          </Pressable>

          <Pressable
            onPress={() => setAgree(v => !v)}
            style={[styles.checkRow, { marginTop: 10 }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agree }}
            accessibilityLabel="Ich akzeptiere die Regeln sowie die Nutzungsbedingungen und die Community-Richtlinien"
            hitSlop={8}
          >
            <View style={[styles.checkbox, agree && styles.checkboxOn]} />
            <Text style={styles.checkLabel}>
              Ich akzeptiere die Regeln sowie die{' '}
              <Text style={styles.link} onPress={gotoTerms}>Nutzungsbedingungen</Text> und die{' '}
              <Text style={styles.link} onPress={gotoGuidelines}>Community-Richtlinien</Text>.
            </Text>
          </Pressable>

          <Text style={styles.note}>
            Hinweis: Dieser Hinweis dient der Transparenz und stellt{' '}
            <Text style={styles.strong}>keine Rechtsberatung</Text> dar.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.sticky, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          disabled={!canContinue}
          onPress={onAccept}
          style={({ pressed }) => [
            styles.primary,
            (!canContinue || pressed) && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue, busy: loading }}
          accessibilityLabel="Zustimmen und starten"
        >
          {loading ? <ActivityIndicator color="#0c1a10" /> : <Text style={styles.primaryTxt}>Zustimmen und starten</Text>}
        </Pressable>

        <Pressable onPress={onDecline} style={styles.secondary} accessibilityRole="button">
          <Text style={styles.secondaryTxt}>Ablehnen</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  headerPad: { height: Platform.OS === 'android' ? 8 : 0 },
  container: { padding: 16 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  h1: { color: '#A8FFB0', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  p: { color: SUB, lineHeight: 20 },
  strong: { color: TEXT, fontWeight: '800' },
  box: { borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, marginTop: 12, backgroundColor: '#0f2318' },
  boxSoft: { borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12, marginTop: 10, backgroundColor: '#0e2016' },
  li: { color: TEXT, lineHeight: 20, marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ACCENT, marginRight: 10, backgroundColor: 'transparent' },
  checkboxOn: { backgroundColor: ACCENT },
  checkLabel: { color: TEXT, flex: 1, lineHeight: 20 },
  link: { color: '#A8FFB0', textDecorationLine: 'underline', fontWeight: '700' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(11,31,20,0.9)', borderTopWidth: 1, borderTopColor: BORDER },
  primary: { backgroundColor: ACCENT, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT_DARK, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  primaryTxt: { color: '#0c1a10', fontSize: 16, fontWeight: '800' },
  secondary: { marginTop: 10, alignSelf: 'center' },
  secondaryTxt: { color: DANGER, fontWeight: '700' },
  note: { marginTop: 12, color: SUB, fontSize: 12 },
});