// -----------------------------------------------------------------------------
// GrowGram – Chat (List + Thread) – GREEN UI (ephemeral media + robust swipes)
// Erweiterungen in dieser Version:
//  • Tab "Archiv" (sichtbar) + Unarchive-Action
//  • Foto wie Instagram: kleines Badge (Einmal/Zweimal/Immer/Geöffnet), kein großes "Abgelaufen"
//  • Audio mit kleiner Waveform + Fortschrittsanzeige
//  • Deutlichere Swipe-Buttons, keine seltsamen Overlays links
//  • Alle bestehenden Fixes: Header-Swipe nur oben, Row-Swipe stabil, Pending-Medien bleiben sichtbar
// -----------------------------------------------------------------------------

import React, {
  memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList,
  Keyboard, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform,
  Pressable, RefreshControl, StyleSheet, Text, TextInput, View,
  type FlatListProps, type PanResponderInstance, LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

import {
  api, me, chatList, chatOpen, chatSearchUsers, chatGetMessages,
  chatSendMessage, chatMarkRead, type Chat, type ChatMessage as ApiChatMessage,
} from '../../utils/api';

/* ============================ Theme & Layout ============================ */

const BG = '#081911';
const CARD = '#0f2219';
const CARD_SOFT = 'rgba(255,255,255,0.06)';
const BORDER = '#163927';
const ACCENT = '#4CAF50';
const TEXT = '#E8F0EC';
const MUTED = '#9fb7a5';

const ROW_HEIGHT = 78;
const HEADER_HEIGHT = 28;
const MSG_ROW = 66;
const GROW_DOCK_SAFE = 110;

/* ================================ Helpers ================================ */

type GetItemLayout<T> = NonNullable<FlatListProps<T>['getItemLayout']>;

const safeMediaUrl = (u?: string | null, w = 900) => {
  if (!u) return '';
  try {
    const url = new URL(u);
    if (!url.searchParams.get('w')) url.searchParams.set('w', String(w));
    if (!url.searchParams.get('q')) url.searchParams.set('q', '85');
    if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
    return url.toString();
  } catch {
    return u; // lokale file:// URI
  }
};

function toDate(ts: any): Date {
  if (!ts) return new Date(NaN);
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
  if (typeof ts === 'number') return new Date(ts);
  const d = new Date(String(ts));
  return Number.isNaN(d.getTime()) ? new Date(NaN) : d;
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}
function timeShort(d: Date) {
  if (!Number.isFinite(d.getTime())) return '';
  const now = new Date();
  if (dateKey(d) === dateKey(now)) {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return d.toLocaleDateString();
}
function linkifyChunks(text?: string): Array<{ k: string; t: string; href?: string }> {
  if (typeof text !== 'string' || !text) return [{ k: 't0', t: '' }];
  const rx = /\b((https?:\/\/|www\.)[^\s<>()]+)\b/gi;
  const out: Array<{ k: string; t: string; href?: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = rx.exec(text))) {
    const start = m.index;
    const match = m[0];
    if (start > last) out.push({ k: `txt${i++}`, t: text.slice(last, start) });
    const href = match.startsWith('http') ? match : `https://${match}`;
    out.push({ k: `lnk${i++}`, t: match, href });
    last = start + match.length;
  }
  if (last < text.length) out.push({ k: `txt${i++}`, t: text.slice(last) });
  return out;
}

/* ============================ Local storage keys ============================ */

const storageKeyPinned = (uid?: string) => `GG_PINNED_CHATS_${uid || 'anon'}`;
const storageKeyCache = (uid?: string) => `GG_CHAT_CACHE_${uid || 'anon'}`;
const storageKeyArchived = (uid?: string) => `GG_ARCHIVED_CHATS_${uid || 'anon'}`;
const storageKeyMuted = (uid?: string) => `GG_MUTED_CHATS_${uid || 'anon'}`;
const storageKeyDeleted = (uid?: string) => `GG_DELETED_CHATS_${uid || 'anon'}`;
const storageKeyPendingFor = (chatId: string) => `GG_CHAT_PENDING_${chatId}`;
const storageKeyEphemeralFor = (chatId: string) => `GG_EPHEMERAL_${chatId}`;

/* ============================== UI Primitives ============================== */

const TinyBtn = memo(function TinyBtn({
  children, onPress, bg = ACCENT, fg = '#0c1a10', style,
}: { children: ReactNode; onPress?: () => void; bg?: string; fg?: string; style?: any; }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 999,
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '900' }}>{children}</Text>
    </Pressable>
  );
});

const Avatar = memo(function Avatar({ name, size = 48 }: { name?: string; size?: number; }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const r = Math.round(size * 0.22);
  return (
    <View
      style={{
        width: size, height: size, borderRadius: r, backgroundColor: '#133625',
        borderWidth: 2, borderColor: 'rgba(76,175,80,0.35)', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#b6ffc3', fontWeight: '900', fontSize: Math.round(size * 0.44) }}>
        {letter}
      </Text>
    </View>
  );
});

/* =========================== Section Header =========================== */

const SectionHeader = memo(({ label }: { label: string }) => (
  <View style={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 }}>
    <Text style={styles.sectionTitle}>{label}</Text>
  </View>
));

/* ============================= List Swipe Row ============================== */

type SwipeActionKey = 'pin' | 'archive' | 'mute' | 'delete';

const SwipeAction = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.swipeActionBtn}>
    <Text style={styles.swipeActionTxt}>{label}</Text>
  </Pressable>
);

/* =============================== ChatList Row ================================ */

const ChatRowCard = memo(function ChatRowCard({
  item, selfId, pinned, muted, onPress,
}: {
  item: Chat;
  selfId: string;
  pinned: boolean;
  muted: boolean;
  onPress: (c: Chat) => void;
}) {
  const last = (item.lastMessage || '').trim() || 'Neue Unterhaltung';
  const when = timeShort(toDate(item.updatedAt));
  const unread = (item.unread && selfId && Number(item.unread[selfId])) || 0;
  const isGroup = (item.members?.length ?? 0) > 2;
  const displayName =
    item.peer?.username ||
    [item.peer?.firstName, item.peer?.lastName].filter(Boolean).join(' ') ||
    (isGroup ? 'Gruppe' : 'Unbekannt');

  const typing = (item as any)?.peerTyping ? 'Schreibt…' : '';

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.cardRow,
        pressed && { opacity: 0.92, transform: [{ scale: 0.998 }] },
        unread > 0 && styles.cardRowUnread,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatarInner}>
            <Avatar name={displayName} size={46} />
            {pinned && (
              <View style={styles.pinDot}>
                <Text style={{ fontSize: 10 }}>📌</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.chatTitle} numberOfLines={1}>{displayName}</Text>
            {isGroup && <Text style={styles.groupPill}>Gruppe</Text>}
            {muted && <Text style={styles.mutePill}>🔕</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.chatSubtitle} numberOfLines={1}>{typing || last}</Text>
            <Text style={styles.chatWhen}>{when || ' '}</Text>
          </View>
        </View>

        {unread > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeTxt}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : (
          <Text style={styles.arrow}>›</Text>
        )}
      </View>
    </Pressable>
  );
});

/** Stabile Swipe-Reveal (Row) */
const SwipeChatRow = memo(function SwipeChatRow({
  item, selfId, pinned, muted, archived, onPress, onAction,
}: {
  item: Chat;
  selfId: string;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  onPress: (c: Chat) => void;
  onAction: (key: SwipeActionKey, c: Chat) => void;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const maxReveal = 320;

  const animateTo = (x: number) =>
    Animated.timing(tx, {
      toValue: x, duration: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 6 && Math.abs(g.dy) < 10,
        onPanResponderMove: (_e, g) => {
          const next = Math.max(-maxReveal, Math.min(0, g.dx));
          tx.setValue(next);
        },
        onPanResponderRelease: (_e, g) => {
          const next = Math.max(-maxReveal, Math.min(0, g.dx));
          if (next < -60) animateTo(-maxReveal);
          else animateTo(0);
        },
        onPanResponderTerminate: () => animateTo(0),
      }),
    [],
  );

  return (
    <View style={{ height: ROW_HEIGHT }}>
      <View style={styles.swipeActionsRow}>
        <SwipeAction label={pinned ? 'Fixierung lösen' : 'Fixieren'} onPress={() => onAction('pin', item)} />
        <SwipeAction label={archived ? 'Zurückholen' : 'Archivieren'} onPress={() => onAction('archive', item)} />
        <SwipeAction label={muted ? 'Laut' : 'Stumm'} onPress={() => onAction('mute', item)} />
        <SwipeAction label="Löschen" onPress={() => onAction('delete', item)} />
      </View>

      <Animated.View
        style={{ transform: [{ translateX: tx }], position: 'absolute', left: 0, right: 0 }}
      >
        <View {...pan.panHandlers}>
          <ChatRowCard
            item={item} selfId={selfId} pinned={pinned} muted={muted} onPress={onPress}
          />
        </View>
      </Animated.View>
    </View>
  );
});

/* ============================ Tiny Helper Chips ============================= */

const Chip = memo(function Chip({
  label, onPress, active, style,
}: { label: string; onPress?: () => void; active?: boolean; style?: any; }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive, style]}>
      <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
    </Pressable>
  );
});

/* ============================= Story Avatars Row ============================ */

const StoryAvatar = memo(function StoryAvatar({
  name, onPress, selected = false,
}: { name?: string; onPress?: () => void; selected?: boolean; }) {
  return (
    <Pressable onPress={onPress} style={styles.storyWrap}>
      <View style={[styles.storyGlow, selected && styles.storyGlowActive]} />
      <View style={styles.storyAvatar}>
        <Avatar name={name} size={52} />
      </View>
    </Pressable>
  );
});

/* ============================== ChatListScreen ============================== */

type Row = { kind: 'header'; id: string; label: string } | ({ kind: 'chat' } & Chat);

export function ChatListScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [selfId, setSelfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Chat[]>([]);
  const [degraded, setDegraded] = useState(false);

  // Suche
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tabs
  type Tab = 'all' | 'unread' | 'groups' | 'archived';
  const [tab, setTab] = useState<Tab>('all');

  // Clientseitige States
  const pinnedRef = useRef<Set<string>>(new Set());
  const archivedRef = useRef<Set<string>>(new Set());
  const mutedRef = useRef<Set<string>>(new Set());
  const deletedRef = useRef<Set<string>>(new Set());

  const headerHRef = useRef<number>(0); // ← gemessene Header-Höhe (für Tab-Swipe nur oben)

  const bootSets = useCallback(async (uid: string) => {
    const read = async (key: string) => {
      try { return new Set<string>(JSON.parse((await AsyncStorage.getItem(key)) || '[]')); }
      catch { return new Set<string>(); }
    };
    pinnedRef.current = await read(storageKeyPinned(uid));
    archivedRef.current = await read(storageKeyArchived(uid));
    mutedRef.current = await read(storageKeyMuted(uid));
    deletedRef.current = await read(storageKeyDeleted(uid));
  }, []);

  const saveSet = useCallback(async (key: string, set: Set<string>) => {
    try { await AsyncStorage.setItem(key, JSON.stringify([...set])); } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setDegraded(false);
    try {
      const u = await me();
      const uid = u?.id || '';
      setSelfId(uid);
      await bootSets(uid);

      // Cache zeigen (soft start)
      const cacheRaw = await AsyncStorage.getItem(storageKeyCache(uid));
      if (cacheRaw) {
        try {
          const cached = JSON.parse(cacheRaw) as Chat[];
          if (cached?.length) setData(cached);
        } catch {}
      }

      const list = await chatList();
      const sorted = (list || [])
        .filter((c) => !deletedRef.current.has(c.id))
        .sort((a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime());
      setData(sorted);
      await AsyncStorage.setItem(storageKeyCache(uid), JSON.stringify(sorted));
    } catch (e: any) {
      const msg = String(e?.response?.data?.details || e?.message || '');
      if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')) {
        try {
          const { data: r } = await api.get('/chat/list');
          const list = (r?.chats || []) as Chat[];
          const sorted = list
            .filter((c) => !deletedRef.current.has(c.id))
            .sort((a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime());
          setData(sorted);
          setDegraded(true);
        } catch {
          Alert.alert('Fehler', 'Chats konnten nicht geladen werden.');
        }
      } else {
        Alert.alert('Fehler', 'Chats konnten nicht geladen werden.');
      }
    } finally {
      setLoading(false);
    }
  }, [bootSets]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); return () => {}; }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  /* Top Faces */
  const topFaces = useMemo(() => {
    const src = [...data];
    const pinned = src.filter((c) => pinnedRef.current.has(c.id));
    const rest = src.filter((c) => !pinnedRef.current.has(c.id));
    const order = [...pinned, ...rest].slice(0, 8);
    return order.map((c) => ({
      id: c.id, name: c.peer?.username || c.peer?.firstName || 'U',
    }));
  }, [data]);

  /* Rows (inkl. Archiv-Tab) */
  const rows: Row[] = useMemo(() => {
    if (!data?.length) return [];
    const base = (tab === 'archived')
      ? data.filter((c) => archivedRef.current.has(c.id))
      : data.filter((c) => !archivedRef.current.has(c.id));

    const sorted = [...base].sort(
      (a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime(),
    );

    // Tab-Filter
    const tabbed = sorted.filter((c) => {
      if (tab === 'unread') {
        const unread = (c.unread && selfId && Number(c.unread[selfId])) || 0;
        return unread > 0;
      }
      if (tab === 'groups') return (c.members?.length ?? 0) > 2;
      return true;
    });

    const pinned = tab !== 'archived' ? tabbed.filter((c) => pinnedRef.current.has(c.id)) : [];
    const normal = tab !== 'archived' ? tabbed.filter((c) => !pinnedRef.current.has(c.id)) : tabbed;

    const out: Row[] = [];
    if (pinned.length) {
      out.push({ kind: 'header', id: 'h_pinned', label: 'Fixiert' });
      for (const c of pinned) out.push({ kind: 'chat', ...c });
    }

    const todayKey = dateKey(new Date());
    let addedEarlier = false;
    for (const c of normal) {
      const dk = dateKey(toDate(c.updatedAt));
      if (dk !== todayKey && !addedEarlier) {
        out.push({ kind: 'header', id: 'h_earlier', label: tab === 'archived' ? 'Archiviert' : 'Früher' });
        addedEarlier = true;
      }
      out.push({ kind: 'chat', ...c });
    }
    return out;
  }, [data, tab, selfId]);

  /* Swipe für Tabwechsel – nur im Headerbereich aktiv */
  const tabsPan: PanResponderInstance = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (e, g) => {
          const y = e.nativeEvent.pageY;
          return y < (headerHRef.current || 9999) && Math.abs(g.dx) > 18 && Math.abs(g.dy) < 14;
        },
        onPanResponderRelease: (_e, g) => {
          const dx = g.dx ?? 0;
          const dy = g.dy ?? 0;
          if (Math.abs(dx) > 40 && Math.abs(dy) < 24) {
            const order: Tab[] = ['all', 'unread', 'groups', 'archived'];
            const i = order.indexOf(tab);
            const next = order[(i + (dx < 0 ? 1 : order.length - 1)) % order.length];
            setTab(next);
            Haptics.selectionAsync();
          }
        },
      }),
    [tab],
  );

  const measureHeader = useCallback((h: number) => { headerHRef.current = h; }, []);

  /* Render */
  const getItemLayout: GetItemLayout<Row> = useCallback((data, index) => {
    const arr = data ?? [];
    const length = arr[index]?.kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT;
    let offset = 0;
    for (let i = 0; i < index; i++) offset += arr[i]?.kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT;
    return { length, offset, index };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: BG }} {...tabsPan.panHandlers}>
      <ListHeader
        onMeasured={measureHeader}
        insetsTop={insets.top}
        degraded={degraded}
        tab={tab}
        onTab={setTab}
        onOpenSearch={() => setSearchOpen(true)}
        topFaces={topFaces}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList<Row>
          data={rows}
          keyExtractor={(r) => (r as any).id}
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <SectionHeader label={item.label} />
            ) : (
              <SwipeChatRow
                item={item}
                selfId={selfId}
                pinned={pinnedRef.current.has(item.id)}
                muted={mutedRef.current.has(item.id)}
                archived={archivedRef.current.has(item.id)}
                onPress={(c) => {
                  if (c.peer?.id) chatOpen(String(c.peer.id)).catch(() => {});
                  const title =
                    c.peer?.username ||
                    [c.peer?.firstName, c.peer?.lastName].filter(Boolean).join(' ') ||
                    'Chat';
                  (nav as any).navigate('ChatThread', { chatId: c.id, title, peerAvatarUrl: '' });
                }}
                onAction={async (key, c) => {
                  const uid = selfId;
                  const save = async (k: string, s: Set<string>) => {
                    try { await AsyncStorage.setItem(k, JSON.stringify([...s])); } catch {}
                  };
                  switch (key) {
                    case 'pin':
                      if (pinnedRef.current.has(c.id)) pinnedRef.current.delete(c.id);
                      else pinnedRef.current.add(c.id);
                      await save(storageKeyPinned(uid), pinnedRef.current);
                      setData((prev) => [...prev]);
                      break;
                    case 'archive':
                      if (archivedRef.current.has(c.id)) archivedRef.current.delete(c.id);
                      else archivedRef.current.add(c.id);
                      await save(storageKeyArchived(uid), archivedRef.current);
                      setData((prev) => [...prev]); // re-render
                      break;
                    case 'mute':
                      if (mutedRef.current.has(c.id)) mutedRef.current.delete(c.id);
                      else mutedRef.current.add(c.id);
                      await save(storageKeyMuted(uid), mutedRef.current);
                      setData((prev) => [...prev]);
                      break;
                    case 'delete':
                      Alert.alert('Löschen?', 'Chat lokal ausblenden? (Server-Löschung folgt im Backend)', [
                        { text: 'Abbrechen', style: 'cancel' },
                        {
                          text: 'Ausblenden',
                          style: 'destructive',
                          onPress: async () => {
                            deletedRef.current.add(c.id);
                            await save(storageKeyDeleted(uid), deletedRef.current);
                            setData((prev) => prev.filter((x) => x.id !== c.id));
                          },
                        },
                      ]);
                      break;
                  }
                }}
              />
            )
          }
          getItemLayout={getItemLayout}
          contentContainerStyle={{
            paddingBottom: insets.bottom + GROW_DOCK_SAFE + 20,
            paddingHorizontal: 12,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          stickyHeaderIndices={rows.map((r, i) => (r.kind === 'header' ? i : -1)).filter((i) => i >= 0)}
          refreshControl={<RefreshControl tintColor={ACCENT} refreshing={refreshing} onRefresh={onRefresh} />}
          removeClippedSubviews
          initialNumToRender={14}
          windowSize={9}
        />
      )}

      {/* Neon-FAB */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setSearchOpen(true);
        }}
        style={[styles.fabNeon, { bottom: insets.bottom + GROW_DOCK_SAFE + 18 }]}
      >
        <Text style={{ color: '#0c1a10', fontSize: 18, fontWeight: '900' }}>＋</Text>
      </Pressable>

      {/* Search Top Sheet */}
      <SearchTopSheet
        open={searchOpen}
        onClose={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
        query={query}
        onChangeQuery={(q) => {
          setQuery(q);
          if (searchTimer.current) clearTimeout(searchTimer.current);
          if (!q.trim()) { setResults([]); setSearchLoading(false); return; }
          setSearchLoading(true);
          searchTimer.current = setTimeout(async () => {
            try {
              const users = await chatSearchUsers(q.trim());
              const cleaned = (users || []).filter((u: any) => String(u.id) !== selfId);
              setResults(cleaned);
            } catch { setResults([]); } finally { setSearchLoading(false); }
          }, 220);
        }}
        loading={searchLoading}
        results={results}
        onPickUser={async (u) => {
          try {
            Haptics.selectionAsync();
            const peerId = String(u.id);
            let threadId = '';
            try { const thr = await chatOpen(peerId); threadId = thr?.id || ''; }
            catch {
              const { data: r } = await api.post('/chat/start', { peerId });
              threadId = (r?.thread || r?.chat || {})?.id || '';
            }
            setSearchOpen(false); setQuery(''); setResults([]);
            if (threadId) {
              (nav as any).navigate('ChatThread', {
                chatId: threadId,
                title: u.username || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Chat',
                peerAvatarUrl: '',
              });
            }
          } catch (e: any) {
            Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Chat nicht öffnen.');
          }
        }}
      />
    </View>
  );
}

/* ===== Header ===== */

const ListHeader = memo(function ListHeader({
  onMeasured, insetsTop, degraded, tab, onTab, onOpenSearch, topFaces,
}: {
  onMeasured: (h: number) => void;
  insetsTop: number; degraded: boolean; tab: 'all' | 'unread' | 'groups' | 'archived';
  onTab: (t: 'all' | 'unread' | 'groups' | 'archived') => void; onOpenSearch: () => void;
  topFaces: Array<{ id: string; name: string }>;
}) {
  const onLayout = (e: LayoutChangeEvent) => {
    onMeasured(e.nativeEvent.layout.height);
  };
  return (
    <View style={[styles.headerWrap, { paddingTop: insetsTop + 6 }]} onLayout={onLayout}>
      <Text style={styles.h1}>Chats</Text>
      {degraded && (
        <View style={styles.banner}>
          <Text style={styles.bannerTxt}>Index baut gerade… Liste kann unvollständig sein.</Text>
        </View>
      )}
      <View style={styles.searchRow}>
        <Pressable onPress={onOpenSearch} style={styles.searchField}>
          <Text style={styles.searchPlaceholder}>Suchen oder neuen Chat starten…</Text>
        </Pressable>
        <Pressable onPress={onOpenSearch} style={styles.newBtn}>
          <Text style={styles.newBtnTxt}>Neu</Text>
        </Pressable>
      </View>

      <View style={styles.storiesRow}>
        <StoryAvatar name="Du" selected onPress={onOpenSearch} />
        {topFaces.map((f) => (<StoryAvatar key={f.id} name={f.name} />))}
        <Pressable onPress={onOpenSearch} style={styles.storyAdd}>
          <Text style={{ fontSize: 20 }}>✓</Text>
        </Pressable>
      </View>

      <View style={styles.segmentRow}>
        <Chip label="Alle" active={tab === 'all'} onPress={() => onTab('all')} />
        <Chip label="Ungelesen" active={tab === 'unread'} onPress={() => onTab('unread')} />
        <Chip label="Gruppen" active={tab === 'groups'} onPress={() => onTab('groups')} />
        <Chip label="Archiv" active={tab === 'archived'} onPress={() => onTab('archived')} />
      </View>
    </View>
  );
});

/* ===== Search Top-Sheet ===== */

const SearchTopSheet = memo(function SearchTopSheet({
  open, onClose, query, onChangeQuery, loading, results, onPickUser,
}: {
  open: boolean; onClose: () => void; query: string;
  onChangeQuery: (q: string) => void; loading: boolean; results: any[];
  onPickUser: (u: any) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open} animationType="slide" onRequestClose={onClose} transparent
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
      statusBarTranslucent
    >
      <View style={styles.modalBg}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-start' }}
        >
          <View
            style={[
              styles.modalCardTop,
              { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Text style={styles.modalTitle}>Neuer Chat</Text>
            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder="Name, @username oder E-Mail"
              placeholderTextColor="#86a496"
              style={styles.modalInput}
              autoFocus
              returnKeyType="search"
              selectionColor={ACCENT}
              onSubmitEditing={() => { if (results[0]) onPickUser(results[0]); }}
            />
            {loading ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator color={ACCENT} />
              </View>
            ) : (
              <FlatList
                style={{ maxHeight: Math.round(Dimensions.get('window').height * 0.62) }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                data={results}
                keyExtractor={(u) => String(u.id)}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { Keyboard.dismiss(); onPickUser(item); }}
                    style={styles.userRow}
                  >
                    <Avatar name={item.username || item.firstName} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.username || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unbekannt'}
                      </Text>
                      {!!item.email && <Text style={styles.userSub} numberOfLines={1}>{item.email}</Text>}
                    </View>
                    <TinyBtn>Starten</TinyBtn>
                  </Pressable>
                )}
                ListEmptyComponent={
                  query.trim() ? (
                    <Text style={{ color: MUTED, textAlign: 'center', paddingVertical: 12 }}>
                      Keine Ergebnisse
                    </Text>
                  ) : null
                }
              />
            )}
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Schließen</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

/* ============================ ChatThreadScreen ============================= */

type ThreadRoute = RouteProp<
  Record<'ChatThread', { chatId: string; title?: string; peerAvatarUrl?: string }>,
  'ChatThread'
>;

type BaseApiMsg = Omit<ApiChatMessage, 'type' | 'mediaUrl' | 'durationMs'>;

type EphemeralMode = 'once' | 'twice' | 'forever';

type ChatMessage = BaseApiMsg & {
  type: 'text' | 'image' | 'audio';
  mediaUrl?: string | null;
  durationMs?: number | null;
  _status?: 'sending' | 'sent';
  _replyToId?: string | null;
  _local?: boolean; // Pending (noch nicht am Server)
  _ephemeral?: { mode: EphemeralMode; viewsLeft: number }; // Bild-Modus
};

export function ChatThreadScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<ThreadRoute>();
  const { chatId, title } = route.params || ({} as any);

  const [selfId, setSelfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [input, setInput] = useState('');

  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [showReactBarFor, setShowReactBarFor] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingSinceRef = useRef<number>(0);
  const typingPingRef = useRef<number | NodeJS.Timeout | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const fetchingMoreRef = useRef(false);

  // Audio Recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Bild-Modus Picker + Viewer
  const [photoToSendUri, setPhotoToSendUri] = useState<string | null>(null);
  const [photoModeOpen, setPhotoModeOpen] = useState(false);
  const [viewer, setViewer] = useState<{ open: boolean; uri: string; messageId?: string }>(
    { open: false, uri: '', messageId: undefined }
  );

  // ---------- Persistenzen ----------
  const loadPending = useCallback(async (): Promise<ChatMessage[]> => {
    try {
      const raw = await AsyncStorage.getItem(storageKeyPendingFor(chatId));
      const arr = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
      return arr.map((m) => ({ ...m, _local: true, _status: 'sent' as const }));
    } catch { return []; }
  }, [chatId]);

  const savePending = useCallback(async (pending: ChatMessage[]) => {
    try { await AsyncStorage.setItem(storageKeyPendingFor(chatId), JSON.stringify(pending)); } catch {}
  }, [chatId]);

  const addPending = useCallback(async (m: ChatMessage) => {
    const cur = await loadPending();
    const next = [m, ...cur].slice(0, 40);
    await savePending(next);
  }, [loadPending, savePending]);

  const removePendingByTempId = useCallback(async (tempId: string) => {
    const cur = await loadPending();
    const next = cur.filter((x) => x.id !== tempId);
    await savePending(next);
  }, [loadPending, savePending]);

  // Ephemeral views persist (id → viewsLeft)
  const readEphemeralMap = useCallback(async (): Promise<Record<string, number>> => {
    try {
      const raw = await AsyncStorage.getItem(storageKeyEphemeralFor(chatId));
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, [chatId]);

  const writeEphemeralMap = useCallback(async (map: Record<string, number>) => {
    try { await AsyncStorage.setItem(storageKeyEphemeralFor(chatId), JSON.stringify(map)); } catch {}
  }, [chatId]);

  const mergeEphemeralToMessages = useCallback(
    async (msgs: ChatMessage[]) => {
      const map = await readEphemeralMap();
      return msgs.map((m) => {
        if (m.type !== 'image') return m;
        if (m._ephemeral?.mode && m._ephemeral.mode !== 'forever') {
          const v = map[m.id];
          if (typeof v === 'number') return { ...m, _ephemeral: { ...m._ephemeral, viewsLeft: v } };
        }
        return m;
      });
    },
    [readEphemeralMap],
  );

  useEffect(() => {
    nav.setOptions({
      headerShown: true,
      title: title || 'Unterhaltung',
      headerTintColor: TEXT,
      headerStyle: { backgroundColor: BG },
    });
  }, [nav, title]);

  const mergeWithPending = useCallback(async (serverMsgs: ChatMessage[]) => {
    const pend = await loadPending();
    const all = [...pend, ...serverMsgs];
    const seen = new Set<string>();
    const uniq = all.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
    return mergeEphemeralToMessages(uniq);
  }, [loadPending, mergeEphemeralToMessages]);

  // Boot
  const boot = useCallback(async () => {
    setLoading(true);
    try {
      const u = await me();
      setSelfId(u?.id || '');
      const { messages, nextCursor } = await chatGetMessages(chatId, 30);
      const normalized: ChatMessage[] = (messages || []).map((m: any) => ({
        ...m,
        type: (m.type as any) || 'text',
        mediaUrl: (m.mediaUrl as any) ?? null,
        durationMs: (m.durationMs as any) ?? null,
        _status: 'sent',
        _ephemeral: m?.ephemeralMode
          ? { mode: (m.ephemeralMode as EphemeralMode) || 'forever', viewsLeft: Number(m.viewsLeft ?? (m.ephemeralMode === 'twice' ? 2 : m.ephemeralMode === 'once' ? 1 : 999)) }
          : undefined,
      }));
      const merged = await mergeWithPending(normalized);
      setMessages(merged);
      setNextCursor(nextCursor ?? null);
      chatMarkRead(chatId).catch(() => {});
    } catch (e: any) {
      const fallback = await mergeWithPending([]);
      setMessages(fallback);
      Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Chat nicht laden.');
    } finally {
      setLoading(false);
    }
  }, [chatId, mergeWithPending]);

  useEffect(() => { boot(); }, [boot]);
  useFocusEffect(useCallback(() => { chatMarkRead(chatId).catch(() => {}); }, [chatId]));

  // Typing Ping
  const pingTyping = useCallback(
    (typing: boolean) => {
      if (typingPingRef.current) clearTimeout(typingPingRef.current);
      typingSinceRef.current = Date.now();
      typingPingRef.current = setTimeout(() => {
        api.post(`/chat/${chatId}/typing`, { typing }).catch(() => {});
      }, 120);
    },
    [chatId],
  );
  useEffect(() => {
    const id = setInterval(() => {
      if (isPeerTyping && Date.now() - typingSinceRef.current > 3000) setIsPeerTyping(false);
    }, 1000);
    return () => clearInterval(id);
  }, [isPeerTyping]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || fetchingMoreRef.current) return;
    fetchingMoreRef.current = true;
    try {
      const { messages: more, nextCursor: nxt } = await chatGetMessages(chatId, 30, nextCursor);
      const normalized: ChatMessage[] = (more || []).map((m: any) => ({
        ...m, type: (m.type as any) || 'text', mediaUrl: (m.mediaUrl as any) ?? null,
        durationMs: (m.durationMs as any) ?? null, _status: 'sent',
        _ephemeral: m?.ephemeralMode
          ? { mode: (m.ephemeralMode as EphemeralMode) || 'forever', viewsLeft: Number(m.viewsLeft ?? (m.ephemeralMode === 'twice' ? 2 : m.ephemeralMode === 'once' ? 1 : 999)) }
          : undefined,
      }));
      const merged = await mergeWithPending([...messages, ...normalized]);
      setMessages(merged);
      setNextCursor(nxt ?? null);
    } catch {}
    fetchingMoreRef.current = false;
  }, [chatId, nextCursor, messages, mergeWithPending]);

  /* ---------------------- Upload Helper (robust) ---------------------- */

  type UploadExtraFields = Record<string, string | number | boolean | null | undefined>;

  async function uploadFormData(
    url: string,
    file: { uri: string; name: string; type: string },
    fields: UploadExtraFields = {}
  ) {
    const fd = new FormData();
    fd.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      fd.append(k, String(v));
    }
    const { data } = await api.post(url, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (x) => x,
    });
    return data;
  }

  async function getAccurateAudioDurationMs(uri: string, fallbackMs: number) {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      const st = await sound.getStatusAsync();
      const dur = (st as any)?.durationMillis ?? fallbackMs;
      await sound.unloadAsync();
      return Math.max(1, Number.isFinite(dur) ? dur : fallbackMs);
    } catch {
      return Math.max(1, fallbackMs);
    }
  }

  /* ---------------------- Senden: Text / Foto / Audio ---------------------- */

  const sendText = useCallback(async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    setInput('');

    const temp: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderId: selfId || 'me',
      type: 'text',
      text: txt,
      createdAt: new Date().toISOString(),
      _status: 'sending',
      _replyToId: replyTo?.id || null,
    };
    setMessages((prev) => [temp, ...prev]);

    try {
      const saved = (await chatSendMessage(chatId, txt, replyTo?.id || undefined)) as any;
      const next: ChatMessage = { ...(saved as any), type: (saved?.type as any) || 'text', _status: 'sent' };
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? next : m)));
      listRef.current?.scrollToOffset({ animated: true, offset: 0 });
      setReplyTo(null);
      setShowReactBarFor(null);
      pingTyping(false);
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      Alert.alert('Senden fehlgeschlagen', e?.response?.data?.details || e?.message || 'Bitte später erneut versuchen.');
    } finally {
      setSending(false);
    }
  }, [chatId, input, sending, selfId, replyTo, pingTyping]);

  // --- Foto: zuerst aufnehmen, dann Modus wählen, dann senden ---
  const pickPhotoAndMode = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') return Alert.alert('Kamera', 'Zugriff verweigert.');
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.9, base64: false, allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (res.canceled || !res.assets?.length) return;
      setPhotoToSendUri(res.assets[0].uri);
      setPhotoModeOpen(true);
    } catch (e: any) {
      Alert.alert('Foto', e?.message || 'Konnte Kamera nicht öffnen.');
    }
  }, []);

  const sendPhotoWithMode = useCallback(async (mode: EphemeralMode) => {
    if (!photoToSendUri) return;
    const views = mode === 'once' ? 1 : mode === 'twice' ? 2 : 999;

    const temp: ChatMessage = {
      id: `temp_img_${Date.now()}`,
      senderId: selfId || 'me',
      type: 'image',
      mediaUrl: photoToSendUri, text: '',
      createdAt: new Date().toISOString(),
      _status: 'sending', _replyToId: replyTo?.id || null,
      _ephemeral: { mode, viewsLeft: views },
    };
    setMessages((prev) => [temp, ...prev]);
    await addPending({ ...temp, _status: 'sent', _local: true });

    setPhotoModeOpen(false);
    setPhotoToSendUri(null);

    try {
      const data = await uploadFormData(
        `/chat/${chatId}/attachments`,
        { uri: temp.mediaUrl!, name: 'photo.jpg', type: 'image/jpeg' },
        { type: 'image', ephemeralMode: mode, viewsAllowed: views }
      );
      const saved = (data?.message || {}) as any;
      const next: ChatMessage = {
        ...(saved as any),
        type: 'image',
        _status: 'sent',
        _ephemeral: { mode, viewsLeft: views },
      };
      await removePendingByTempId(temp.id);

      // Ephemeral-Map initial (Server-ID)
      const map = await readEphemeralMap();
      map[next.id] = views;
      await writeEphemeralMap(map);

      setMessages((prev) => prev.map((m) => (m.id === temp.id ? next : m)));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, _status: 'sent' } : m)));
    }

    setReplyTo(null);
    setShowReactBarFor(null);
  }, [
    chatId, photoToSendUri, replyTo, selfId,
    addPending, removePendingByTempId, readEphemeralMap, writeEphemeralMap,
  ]);

  // --- Audio mit Waveform ---
  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Mikrofon', 'Zugriff verweigert.');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, playsInSilentModeIOS: true,
        staysActiveInBackground: false, shouldDuckAndroid: true, playThroughEarpieceAndroid: false,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      Alert.alert('Aufnahme', e?.message || 'Konnte Aufnahme nicht starten.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI() || '';
      const st = await recording.getStatusAsync();
      const roughMs = (st as any)?.durationMillis ?? 0;
      const durationMs = await getAccurateAudioDurationMs(uri, roughMs);
      setIsRecording(false);
      setRecording(null);

      const temp: ChatMessage = {
        id: `temp_aud_${Date.now()}`,
        senderId: selfId || 'me',
        type: 'audio',
        mediaUrl: uri,
        durationMs,
        text: '',
        createdAt: new Date().toISOString(),
        _status: 'sending',
        _replyToId: replyTo?.id || null,
      };
      setMessages((prev) => [temp, ...prev]);
      await addPending({ ...temp, _status: 'sent', _local: true });

      try {
        const data = await uploadFormData(
          `/chat/${chatId}/attachments`,
          { uri, name: 'voice.m4a', type: 'audio/m4a' },
          { type: 'audio', durationMs },
        );
        const saved = (data?.message || {}) as any;
        const next: ChatMessage = { ...(saved as any), type: 'audio', _status: 'sent' };
        await removePendingByTempId(temp.id);
        setMessages((prev) => prev.map((m) => (m.id === temp.id ? next : m)));
      } catch {
        setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, _status: 'sent' } : m)));
      }

      setReplyTo(null);
      setShowReactBarFor(null);
    } catch (e: any) {
      setIsRecording(false);
      setRecording(null);
      Alert.alert('Aufnahme', e?.message || 'Konnte Aufnahme nicht beenden.');
    }
  }, [chatId, recording, replyTo, selfId, addPending, removePendingByTempId]);

  /* --------------------------- Fullscreen Viewer --------------------------- */

  const openViewer = useCallback(async (m: ChatMessage) => {
    if (m.type !== 'image' || !m.mediaUrl) return;

    // Ephemeral count check:
    if (m._ephemeral && m._ephemeral.mode !== 'forever') {
      const map = await readEphemeralMap();
      const current = typeof map[m.id] === 'number' ? map[m.id] : m._ephemeral.viewsLeft;
      if (current <= 0) return; // "Geöffnet" – wie Instagram: kein Alert, nur nicht mehr öffnbar
      setViewer({ open: true, uri: m.mediaUrl, messageId: m.id });
    } else {
      setViewer({ open: true, uri: m.mediaUrl, messageId: undefined });
    }
  }, [readEphemeralMap]);

  const closeViewerAndCountDown = useCallback(async () => {
    const id = viewer.messageId;
    setViewer({ open: false, uri: '', messageId: undefined });
    if (!id) return;

    const map = await readEphemeralMap();
    const left = (typeof map[id] === 'number' ? map[id] : undefined);
    const next = typeof left === 'number' ? Math.max(0, left - 1) : undefined;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id || !m._ephemeral) return m;
        const v = (typeof left === 'number' ? next! : Math.max(0, (m._ephemeral.viewsLeft || 0) - 1));
        return { ...m, _ephemeral: { ...m._ephemeral, viewsLeft: v } };
      })
    );

    const newMap = { ...(await readEphemeralMap()) };
    newMap[id] = next ?? Math.max(0, (newMap[id] || 0) - 1);
    await writeEphemeralMap(newMap);
  }, [viewer, readEphemeralMap, writeEphemeralMap]);

  /* --------------------------- Render Message ----------------------------- */

  const keyMsg = useCallback((m: ChatMessage) => String(m.id), []);
  const getMsgLayout: GetItemLayout<ChatMessage> = useCallback(
    (_data, index) => ({ length: MSG_ROW, offset: MSG_ROW * index, index }),
    [],
  );

  const onClearUI = useCallback(() => { setSelectedMsg(null); setShowReactBarFor(null); }, []);

  /* Waveform (Pseudo, mit Fortschritt) */
  const Wave = memo(({ id, durationMs, progress }: { id: string; durationMs?: number | null; progress: number }) => {
    const secs = Math.max(1, Math.round((durationMs || 1000) / 1000));
    const bars = Math.min(28, Math.max(12, secs + 6));
    const rnd = (i: number) => {
      let h = 0; for (const c of (id + i)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return (h % 1000) / 1000;
    };
    const pIdx = Math.round(progress * bars);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 28, gap: 2 }}>
        {Array.from({ length: bars }).map((_, i) => {
          const h = 6 + Math.round(rnd(i) * 22);
          const active = i <= pIdx;
          return <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: active ? ACCENT : 'rgba(255,255,255,0.25)' }} />;
        })}
      </View>
    );
  });

  const AudioBubble = memo(function AudioBubble({
    uri, durationMs, mine, id,
  }: { uri: string; durationMs?: number | null; mine: boolean; id: string }) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const toggle = useCallback(async () => {
      try {
        if (!sound) {
          const { sound: s } = await Audio.Sound.createAsync({ uri });
          setSound(s);
          s.setOnPlaybackStatusUpdate((st: any) => {
            if (!st?.isLoaded) return;
            setPlaying(st.isPlaying);
            const p = st?.positionMillis && st?.durationMillis ? st.positionMillis / st.durationMillis : 0;
            setProgress(p);
            if (st.didJustFinish) { setPlaying(false); s.unloadAsync().catch(() => {}); setSound(null); setProgress(0); }
          });
          await s.playAsync();
        } else {
          const st = await sound.getStatusAsync();
          if ((st as any)?.isLoaded && (st as any)?.isPlaying) await sound.pauseAsync();
          else await sound.playAsync();
        }
      } catch {}
    }, [sound, uri]);

    useEffect(() => () => { sound?.unloadAsync().catch(() => {}); }, [sound]);

    const secs = Math.max(1, Math.round((durationMs || 0) / 1000));
    return (
      <Pressable
        onPress={toggle}
        style={[
          styles.audioBubble,
          mine ? { backgroundColor: '#0c1a10' } : { backgroundColor: 'rgba(255,255,255,0.08)' },
        ]}
      >
        <Text style={[styles.audioText, mine ? { color: ACCENT } : { color: TEXT }]}>
          {playing ? '⏸︎' : '▶︎'}  {secs}s
        </Text>
        <View style={{ height: 6 }} />
        <Wave id={id} durationMs={durationMs} progress={progress} />
      </Pressable>
    );
  });

  const QuickReactBar = ({ id, onPick }: { id: string; onPick: (e: string) => void }) => {
    if (showReactBarFor !== id) return null;
    return (
      <View style={styles.reactBar}>
        {['👍', '🔥', '🌿'].map((emo) => (
          <Pressable key={emo} onPress={() => onPick(emo)} style={styles.reactBtn}>
            <Text style={{ fontSize: 16 }}>{emo}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const PhotoBadge = ({ ep }: { ep?: { mode: EphemeralMode; viewsLeft: number } }) => {
    if (!ep) return null;
    if (ep.mode === 'forever') return null;
    const left = Math.max(0, ep.viewsLeft || 0);
    const label = left === 0 ? 'Geöffnet' : (ep.mode === 'once' ? 'Einmal' : `Noch ${left}×`);
    return (
      <View style={styles.ephemeralBadge}>
        <Text style={styles.ephemeralBadgeTxt}>{label}</Text>
      </View>
    );
  };

  const MsgBubble = memo(function MsgBubble({
    item, onSwipeRightReply, onOpenImage,
  }: { item: ChatMessage; onSwipeRightReply: (m: ChatMessage) => void; onOpenImage: (m: ChatMessage) => void; }) {
    const mine = item.senderId === selfId;
    const t = timeShort(toDate(item.createdAt));
    const isSelected = selectedMsg?.id === item.id;

    const start = useRef({ x: 0, y: 0 });
    const pan: PanResponderInstance = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onPanResponderGrant: (_e, g) => { start.current = { x: g.moveX ?? 0, y: g.moveY ?? 0 }; },
          onPanResponderRelease: (_e, g) => {
            const dx = (g.moveX || 0) - (start.current.x || 0);
            const dy = (g.moveY || 0) - (start.current.y || 0);
            if (Math.abs(dy) < 18 && Math.abs(dx) > 28) {
              if (!mine && dx > 0) onSwipeRightReply(item); // Reply
              if (dx < 0) setShowReactBarFor((prev) => (prev === String(item.id) ? null : String(item.id)));
            } else {
              setSelectedMsg((prev) => (prev?.id === item.id ? null : item));
            }
          },
        }),
      [item, mine, onSwipeRightReply],
    );

    const bubbleColor = mine ? ACCENT : CARD;
    const borderFrame = mine ? undefined : {
      borderWidth: 1, borderColor: isSelected ? 'rgba(76,175,80,0.7)' : BORDER,
    };

    const isExpired = item.type === 'image' && item._ephemeral && item._ephemeral.mode !== 'forever' && (item._ephemeral.viewsLeft <= 0);

    const renderBody = () => {
      if (item.type === 'image' && item.mediaUrl) {
        const uri = safeMediaUrl(item.mediaUrl, 900) || item.mediaUrl;
        return (
          <Pressable
            disabled={isExpired}
            onPress={() => onOpenImage(item)}
            style={{ position: 'relative' }}
          >
            <Image
              source={{ uri }}
              style={{ width: 220, height: 220, borderRadius: 14, opacity: isExpired ? 0.55 : 1 }}
              contentFit="cover"
              blurRadius={isExpired ? 1 : 0}
            />
            <PhotoBadge ep={item._ephemeral} />
          </Pressable>
        );
      }
      if (item.type === 'audio' && item.mediaUrl) {
        return <AudioBubble uri={item.mediaUrl} durationMs={item.durationMs} mine={mine} id={String(item.id)} />;
      }
      const chunks = linkifyChunks(item.text);
      return (
        <Text style={[styles.bubbleText, mine ? { color: '#0c1a10' } : { color: TEXT }]}>
          {chunks.map((c) =>
            c.href ? (
              <Text
                key={c.k}
                style={[styles.bubbleText, { textDecorationLine: 'underline' }, mine ? { color: '#0c1a10' } : { color: TEXT }]}
                onPress={() => Linking.openURL(c.href!)}
              >
                {c.t}
              </Text>
            ) : (
              <Text key={c.k} style={[styles.bubbleText, mine ? { color: '#0c1a10' } : { color: TEXT }]}>{c.t}</Text>
            ),
          )}
        </Text>
      );
    };

    return (
      <View
        {...pan.panHandlers}
        style={[styles.bubbleRow, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}
      >
        {!mine && <View style={{ width: 26 }} />}
        <View>
          <QuickReactBar
            id={String(item.id)}
            onPick={(emo) => {
              Haptics.selectionAsync();
              Alert.alert('Reaction', `${emo} auf: "${item.text ?? ''}"`);
              setShowReactBarFor(null);
            }}
          />

          <Pressable
            onPress={onClearUI}
            style={[
              styles.bubble,
              { backgroundColor: bubbleColor },
              mine ? { borderTopRightRadius: 6 } : { borderTopLeftRadius: 6 },
              borderFrame,
            ]}
          >
            {renderBody()}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {!!t && <Text style={[styles.bubbleMeta, mine ? { color: '#0c1a10' } : { color: MUTED }]}>{t}</Text>}
              {mine && <Text style={[styles.bubbleMeta, { fontWeight: '900' }]}>{item._status === 'sending' ? '…' : '✓✓'}</Text>}
              {item._local && <Text style={[styles.bubbleMeta, { color: '#ffd27a' }]}>• lokal</Text>}
            </View>
          </Pressable>
        </View>
      </View>
    );
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const composerBottomPad = Math.max(insets.bottom, 8) + GROW_DOCK_SAFE;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {(selectedMsg || showReactBarFor) && <Pressable style={StyleSheet.absoluteFill} onPress={onClearUI} />}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyMsg}
          renderItem={({ item }) => (
            <MsgBubble
              item={item}
              onSwipeRightReply={(m) => setReplyTo(m)}
              onOpenImage={openViewer}
            />
          )}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: isPeerTyping ? 28 : 8 }}
          style={{ flex: 1 }}
          inverted
          onEndReachedThreshold={0.1}
          onEndReached={loadMore}
          getItemLayout={getMsgLayout}
          initialNumToRender={18}
          windowSize={9}
        />

        {isPeerTyping && (
          <View style={{ position: 'absolute', bottom: composerBottomPad + 6, left: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ color: MUTED }}>schreibt …</Text>
          </View>
        )}

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: composerBottomPad }]}>
          {replyTo && (
            <View style={styles.replyBar}>
              <View style={styles.replyStripe} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyLabel}>Antwort auf</Text>
                <Text style={styles.replyText} numberOfLines={1}>{replyTo.text}</Text>
              </View>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={10} style={styles.replyClose}>
                <Text style={{ color: MUTED, fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <TextInput
              style={[styles.composerInput, { flex: 1 }]}
              value={input}
              onChangeText={(t) => { setInput(t); pingTyping(!!t.trim()); }}
              placeholder="Nachricht schreiben…"
              placeholderTextColor="#86a496"
              multiline
              maxLength={2000}
              onSubmitEditing={sendText}
              blurOnSubmit={false}
            />

            {/* Kamera (mit Modus-Wahl) */}
            <Pressable onPress={pickPhotoAndMode} style={styles.circleBtn} hitSlop={6}>
              <Text style={styles.circleBtnTxt}>📷</Text>
            </Pressable>

            {/* Mikro: LongPress starten, Tippen stoppt */}
            {!isRecording ? (
              <Pressable onLongPress={startRecording} delayLongPress={120} style={[styles.circleBtn, { backgroundColor: 'rgba(255,255,255,0.09)' }]} hitSlop={6}>
                <Text style={styles.circleBtnTxt}>🎤</Text>
              </Pressable>
            ) : (
              <Pressable onPress={stopRecording} style={[styles.circleBtn, { backgroundColor: '#e26868' }]} hitSlop={6}>
                <Text style={[styles.circleBtnTxt, { color: '#0c1a10' }]}>■</Text>
              </Pressable>
            )}

            <Pressable onPress={sendText} disabled={sending || !input.trim()} style={[styles.composerSend, (sending || !input.trim()) && { opacity: 0.6 }]}>
              <Text style={{ color: '#0c1a10', fontWeight: '900' }}>Senden</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Fullscreen-Viewer */}
      <Modal visible={viewer.open} onRequestClose={closeViewerAndCountDown} animationType="fade" transparent>
        <Pressable style={styles.viewerWrap} onPress={closeViewerAndCountDown}>
          <Image source={{ uri: viewer.uri }} style={styles.viewerImage} contentFit="contain" />
          <View style={styles.viewerHint}>
            <Text style={styles.viewerHintTxt}>Tippen zum Schließen</Text>
          </View>
        </Pressable>
      </Modal>

      {/* Foto-Modus Picker */}
      <Modal visible={photoModeOpen} onRequestClose={() => setPhotoModeOpen(false)} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modeCard, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.modalTitle}>Sichtbarkeit wählen</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TinyBtn onPress={() => sendPhotoWithMode('once')}>Einmal sichtbar</TinyBtn>
              <TinyBtn onPress={() => sendPhotoWithMode('twice')}>Zweimal</TinyBtn>
              <TinyBtn onPress={() => sendPhotoWithMode('forever')}>Immer</TinyBtn>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: MUTED }}>• Bei „Einmal/Zweimal“ wird das Bild nach dem Betrachten automatisch unzugänglich.</Text>
              <Text style={{ color: MUTED, marginTop: 4 }}>• Tippe auf ein Bild, um es groß anzusehen.</Text>
            </View>
            <Pressable onPress={() => setPhotoModeOpen(false)} style={[styles.modalClose, { alignSelf: 'flex-start' }]}>
              <Text style={styles.modalCloseTxt}>Abbrechen</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================================= Styles ================================== */

const styles = StyleSheet.create({
  /* Header & Suche */
  headerWrap: { paddingHorizontal: 12, paddingBottom: 8, backgroundColor: BG },
  h1: { color: TEXT, fontWeight: '900', fontSize: 28, letterSpacing: 0.2 },

  banner: {
    backgroundColor: 'rgba(255, 197, 66, 0.16)',
    borderColor: 'rgba(255, 197, 66, 0.35)',
    borderWidth: 1, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, marginTop: 8,
  },
  bannerTxt: { color: '#ffd27a', fontSize: 12, fontWeight: '700' },

  searchRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
  searchField: {
    flex: 1, backgroundColor: CARD_SOFT, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
  },
  searchPlaceholder: { color: '#86a496' },

  newBtn: { backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  newBtnTxt: { color: '#0c1a10', fontWeight: '900' },

  storiesRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  storyWrap: { width: 62, height: 62 },
  storyGlow: { position: 'absolute', width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(76, 175, 80, 0.18)' },
  storyGlowActive: { backgroundColor: 'rgba(76, 175, 80, 0.28)' },
  storyAvatar: {
    position: 'absolute', left: 5, top: 5, width: 52, height: 52, borderRadius: 14, borderWidth: 2,
    borderColor: 'rgba(76,175,80,0.6)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  storyAdd: {
    width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD_SOFT, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { backgroundColor: CARD_SOFT, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipActive: { backgroundColor: ACCENT },
  chipTxt: { color: MUTED, fontWeight: '700' },
  chipTxtActive: { color: '#0c1a10' },

  sectionTitle: { color: MUTED, fontWeight: '800' },

  /* List Rows */
  cardRow: {
    height: ROW_HEIGHT, borderRadius: 18, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, justifyContent: 'center', overflow: 'hidden',
  },
  cardRowUnread: {
    borderColor: 'rgba(76,175,80,0.55)', shadowColor: '#4CAF50', shadowOpacity: 0.25,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  avatarOuter: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { position: 'relative' },
  pinDot: {
    position: 'absolute', right: -4, bottom: -4, backgroundColor: ACCENT, borderRadius: 10,
    paddingHorizontal: 4, paddingVertical: 2, borderWidth: 2, borderColor: CARD,
  },
  chatTitle: { color: TEXT, fontWeight: '900', fontSize: 16, maxWidth: '78%' },
  groupPill: {
    marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    backgroundColor: CARD_SOFT, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: MUTED,
    fontSize: 11, overflow: 'hidden',
  },
  mutePill: { marginLeft: 6, color: MUTED, fontSize: 13 },
  chatSubtitle: { color: MUTED, marginTop: 2, flexShrink: 1 },
  chatWhen: { color: MUTED, marginTop: 2, marginLeft: 6, fontSize: 12 },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8,
  },
  unreadBadgeTxt: { color: '#0c1a10', fontWeight: '900', fontSize: 12 },
  arrow: { color: MUTED, fontSize: 20, marginLeft: 8 },

  /* Swipe Row background – deutlicher */
  swipeActionsRow: {
    position: 'absolute', right: 12, left: 12, top: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingRight: 10,
  },
  swipeActionBtn: {
    backgroundColor: 'rgba(76,175,80,0.26)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.55)',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
  },
  swipeActionTxt: { color: '#c7ffd1', fontWeight: '900' },

  /* FAB */
  fabNeon: {
    position: 'absolute', right: 18, backgroundColor: ACCENT, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', shadowColor: '#4CAF50', shadowOpacity: 0.55,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },

  /* Modal (Search Top-Sheet & Mode-Picker & Viewer) */
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCardTop: {
    backgroundColor: BG, borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
    borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingHorizontal: 14, paddingTop: 8, maxHeight: '85%',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  modeCard: {
    backgroundColor: BG, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 14, paddingTop: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  modalTitle: { color: TEXT, fontWeight: '900', fontSize: 18, marginBottom: 8, paddingLeft: 2 },
  modalInput: {
    backgroundColor: CARD_SOFT, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: TEXT, marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: CARD_SOFT,
  },
  userName: { color: TEXT, fontWeight: '800' },
  userSub: { color: MUTED, marginTop: 2, fontSize: 12 },
  modalClose: { marginTop: 8, marginBottom: 4, padding: 8 },
  modalCloseTxt: { color: MUTED, fontWeight: '700' },

  viewerWrap: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '100%' },
  viewerHint: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  viewerHintTxt: { color: '#e0e0e0', fontSize: 12 },

  /* Thread bubbles */
  bubbleRow: { width: '100%', flexDirection: 'row', paddingHorizontal: 12, marginVertical: 3 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  bubbleMeta: { fontSize: 11, opacity: 0.7 },

  /* Audio */
  audioBubble: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 120, alignItems: 'center' },
  audioText: { fontWeight: '800' },

  /* Quick React Bar */
  reactBar: {
    alignSelf: 'flex-end', flexDirection: 'row', gap: 6, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6,
  },
  reactBtn: { paddingHorizontal: 6, paddingVertical: 2 },

  /* Composer */
  composer: { backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 8, paddingTop: 8, gap: 8 },
  replyBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_SOFT, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 8,
    marginBottom: 6, gap: 8,
  },
  replyStripe: { width: 3, alignSelf: 'stretch', borderRadius: 3, backgroundColor: ACCENT },
  replyLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  replyText: { color: TEXT, fontSize: 13 },
  replyClose: { padding: 6 },

  composerInput: {
    minHeight: 44, maxHeight: 140, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, backgroundColor: CARD_SOFT, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: TEXT,
  },
  composerSend: { backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  circleBtn: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  circleBtnTxt: { fontSize: 16, color: TEXT },

  /* Ephemeral UI */
  ephemeralBadge: {
    position: 'absolute', right: 8, top: 8, backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  ephemeralBadgeTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.2 },
});

export default { ChatListScreen, ChatThreadScreen };