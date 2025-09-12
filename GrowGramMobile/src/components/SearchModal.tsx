// src/components/SearchModal.tsx
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeProvider';

export type SearchUser = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  email?: string;
};

type Props = {
  visible: boolean;
  query: string;
  results: SearchUser[];
  loading?: boolean;
  onChangeQuery: (q: string) => void;
  onSelect: (u: SearchUser) => void;
  onClose: () => void;
};

function safeUrl(u?: string | null, w = 96) {
  if (!u) return '';
  try {
    const url = new URL(u);
    if (!url.searchParams.get('w')) url.searchParams.set('w', String(w));
    if (!url.searchParams.get('q')) url.searchParams.set('q', '85');
    if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
    return url.toString();
  } catch { return u || ''; }
}

export default function SearchModal({
  visible, query, results, loading, onChangeQuery, onSelect, onClose,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'} statusBarTranslucent>
      <View style={styles.modalBg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-start' }}>
          <View style={[styles.card, { backgroundColor: colors.bg }]}>
            <Text style={[styles.title, { color: colors.text }]}>Neuer Chat</Text>

            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Name, @username oder E-Mail"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.06)' }]}
              returnKeyType="search"
              selectionColor={colors.accent}
              autoFocus
            />

            {loading ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(u) => u.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                renderItem={({ item }) => (
                  <Pressable onPress={() => onSelect(item)} style={[styles.row, { borderColor: 'rgba(255,255,255,0.06)' }]}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: safeUrl(item.avatarUrl, 80) }} style={styles.ava} contentFit="cover" />
                    ) : (
                      <View style={[styles.ava, { backgroundColor: '#133625', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: '#b6ffc3', fontWeight: '900' }}>
                          {(item.firstName?.[0] || item.username?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>
                        {item.username || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unbekannt'}
                      </Text>
                      {!!item.email && <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }} numberOfLines={1}>{item.email}</Text>}
                    </View>
                    <View style={[styles.start, { backgroundColor: colors.accent }]}>
                      <Text style={{ color: colors.accentFg, fontWeight: '900' }}>Starten</Text>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={query.trim() ? <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 12 }}>Keine Ergebnisse</Text> : null}
              />
            )}

            <Pressable onPress={onClose} style={styles.close}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Schließen</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  card: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    maxHeight: '85%',
  },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 8, paddingLeft: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ava: { width: 42, height: 42, borderRadius: 10 },
  start: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  close: { alignSelf: 'center', marginTop: 8, padding: 8 },
});