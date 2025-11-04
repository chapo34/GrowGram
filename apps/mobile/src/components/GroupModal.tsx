// src/components/GroupModal.tsx
import React, { useMemo, useState } from 'react';
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

export type UserLite = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  email?: string;
};

type Props = {
  visible: boolean;
  loading?: boolean;
  results: UserLite[];
  onClose: () => void;
  onSearch: (q: string) => void;
  onCreate: (name: string, memberIds: string[]) => void;
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

export default function GroupModal({ visible, loading, results, onClose, onSearch, onCreate }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setMembers((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const canCreate = name.trim().length >= 2 && members.size >= 2;
  const memberIds = useMemo(() => Array.from(members), [members]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'} statusBarTranslucent>
      <View style={styles.modalBg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-start' }}>
          <View style={[styles.card, { backgroundColor: colors.bg, borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[styles.title, { color: colors.text }]}>Gruppe erstellen</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Gruppenname"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.06)' }]}
              maxLength={60}
            />

            <TextInput
              onChangeText={onSearch}
              placeholder="Mitglieder suchen…"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.06)' }]}
            />

            {loading ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(u) => u.id}
                style={{ maxHeight: 320 }}
                renderItem={({ item }) => {
                  const checked = members.has(item.id);
                  return (
                    <Pressable onPress={() => toggle(item.id)} style={[styles.row, { borderColor: 'rgba(255,255,255,0.06)' }]}>
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
                      <View style={[styles.selectPill, { borderColor: checked ? colors.accent : 'rgba(255,255,255,0.15)' }]}>
                        <Text style={{ color: checked ? colors.accent : colors.muted, fontWeight: '800' }}>
                          {checked ? 'Ausgewählt' : 'Wählen'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Pressable onPress={onClose} style={[styles.btn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={{ color: colors.muted, fontWeight: '800' }}>Schließen</Text>
              </Pressable>
              <Pressable
                disabled={!canCreate}
                onPress={() => onCreate(name.trim(), memberIds)}
                style={[styles.btn, { backgroundColor: colors.accent, opacity: canCreate ? 1 : 0.5 }]}
              >
                <Text style={{ color: colors.accentFg, fontWeight: '900' }}>Erstellen</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  card: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
    maxHeight: '88%',
    borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 8, paddingLeft: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ava: { width: 42, height: 42, borderRadius: 10 },
  selectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  btn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
  },
});