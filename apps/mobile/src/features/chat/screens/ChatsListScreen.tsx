// src/screens/ChatsListScreen.tsx
// -----------------------------------------------------------------------------
// Chatliste mit Insta-Style-Quick-Actions:
//  • Links wischen: Pin/Unpin, Als gelesen, Löschen (animiert)
//  • Tabs (Chats / Archiv), Suche (Top-Sheet), Gruppen-Erstellung
//  • Cache + Pinned in AsyncStorage, Pull-To-Refresh
//  • Expo-kompatible Gradients (Tuples → keine ts(2322)-Fehler)
// -----------------------------------------------------------------------------

import React, {
  memo, useCallback, useMemo, useRef, useState, type ReactNode,
} from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList,
  Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl,
  StyleSheet, Text, TextInput, View, type AlertButton, type FlatListProps, PanResponder,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import {
  api,
  chatList,
  chatOpen,
  chatSearchUsers,
  me,
  type Chat,
} from '@shared/lib/apiClient';
/* ============================== Theme ==================================== */

const GREEN   = '#4CAF50' as const;
const GREEN_2 = '#66E08E' as const;
const ORANGE  = '#FFA726' as const;
const ORANGE_2= '#FFC46B' as const;
const RED     = '#FF6B6B' as const;
const TEXT    = '#E6EAEF' as const;
const MUTED   = '#9fb7a5' as const;
const BORDER  = '#1e3a2d' as const;

// Gradient-Typen: feste Länge → passt zu expo-linear-gradient
type Grad2 = readonly [string, string];
type Grad3 = readonly [string, string, string];

const GRAD_BG: Grad3          = ['#071C14', '#0B2117', '#0A1914'];
const CARD_GRAD: Grad2        = ['#10281E', '#0E231B'];
const CARD_GRAD_ACTIVE: Grad2 = ['#123022', '#0F261D'];
const RING_GRAD: Grad3        = ['#5BE084', '#4CAF50', '#2E7D32'];
const GREEN_GRAD: Grad2       = [GREEN, GREEN_2];
const ORANGE_GRAD: Grad2      = [ORANGE, ORANGE_2];
const RED_GRAD: Grad2         = ['#FF6B6B', '#FF8A8A'];

const WIN = Dimensions.get('window');
const ROW_H = 80;
const MODAL_MAX = Math.round(WIN.height * 0.75);
const LIST_MAX  = Math.round(WIN.height * 0.48);

/* ============================== Storage ================================== */

const storageKeyPinned = (uid?: string) => `GG_PINNED_CHATS_${uid || 'anon'}`;
const storageKeyCache  = (uid?: string) => `GG_CHAT_CACHE_${uid || 'anon'}`;

/* ============================== Helpers ================================== */

type UserLite = { id: string; username?: string; firstName?: string; lastName?: string; email?: string; avatarUrl?: string };

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
  if (typeof ts === 'number') return new Date(ts);
  const d = new Date(String(ts));
  return Number.isNaN(+d) ? new Date(0) : d;
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function timeShort(dLike: any) {
  const d = toDate(dLike);
  if (!+d) return '';
  const now = new Date();
  if (dateKey(d) === dateKey(now)) {
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  return d.toLocaleDateString();
}
function safeUrl(u?: string | null, w = 128) {
  if (!u) return '';
  try {
    const url = new URL(u);
    if (!url.searchParams.get('w')) url.searchParams.set('w', String(w));
    if (!url.searchParams.get('q')) url.searchParams.set('q', '85');
    if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
    return url.toString();
  } catch { return u; }
}
function previewText(txt?: string) {
  const t = (txt || '').trim();
  if (!t) return 'Neue Unterhaltung';
  if (/https?:\/\/\S+/.test(t)) return '🔗 Link';
  if (/^\[?(image|photo|img)\]?/i.test(t)) return '🖼️ Foto';
  if (/^\[?(video|vid)\]?/i.test(t)) return '🎞️ Video';
  if (/^\[?(audio|voice)\]?/i.test(t)) return '🎤 Audio';
  if (/^\[?(file|doc)\]?/i.test(t))   return '📄 Datei';
  return t;
}
function nameOfUser(u: UserLite) {
  return u.username || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unbekannt';
}

/* ============================== UI Bits ================================== */

const SectionHeader = memo(({ label }: { label: string }) => (
  <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
    <Text style={{ color: MUTED, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.4 }}>{label}</Text>
  </View>
));

const Avatar = memo(function Avatar({ uri, letter }: { uri?: string; letter?: string }) {
  return uri ? (
    <Image source={{ uri: safeUrl(uri) }} style={styles.avatar} contentFit="cover" transition={100} />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarFallbackTxt}>{(letter || '?').toUpperCase()}</Text>
    </View>
  );
});

/* ============================== ChatRow ================================== */

const ChatRow = memo(function ChatRow({
  item, selfId, pinned, onPress,
}: {
  item: Chat;
  selfId: string;
  pinned: boolean;
  onPress: (c: Chat) => void;
}) {
  const last   = previewText(item.lastMessage);
  const when   = timeShort(item.updatedAt);
  const unread = (item.unread && selfId && Number(item.unread[selfId])) || 0;
  const isGroup = (item as any).isGroup || !!(item as any)?.groupName;
  const title = (item as any).title || (item as any).groupName || item.peer?.username
    || [item.peer?.firstName, item.peer?.lastName].filter(Boolean).join(' ') || 'Unbekannt';

  return (
    <Pressable onPress={() => onPress(item)}>
      {({ pressed }) => (
        <LinearGradient colors={pressed ? CARD_GRAD_ACTIVE : CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.row}>
          <LinearGradient colors={RING_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.avatarRing}>
            <Avatar
              uri={(item as any).photoUrl || (item as any).groupPhotoUrl || item.peer?.avatarUrl}
              letter={(isGroup ? 'G' : (item.peer?.firstName?.[0] || item.peer?.username?.[0] || '?'))}
            />
          </LinearGradient>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.title}>{title}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>{last}</Text>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <Text style={styles.time}>{when || '-'}</Text>
            {unread > 0 && (
              <LinearGradient colors={GREEN_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.unread, unread > 9 && { paddingHorizontal: 7 }]}>
                <Text style={styles.unreadTxt}>{unread > 99 ? '99+' : unread}</Text>
              </LinearGradient>
            )}
          </View>

          {pinned && <View style={styles.pinPill}><Text style={styles.pinPillTxt}>📌</Text></View>}
        </LinearGradient>
      )}
    </Pressable>
  );
});

/* ======================== Swipe / Quick-Actions =========================== */

const ACTION_W = 64; // Breite je Action-Button

const ActionBtn = memo(function ActionBtn({
  label, colors, onPress, delay = 0, progress,
}: {
  label: string;
  colors: Grad2 | Grad3;
  onPress: () => void;
  delay?: number;
  progress: Animated.AnimatedInterpolation<number>;
}) {
  const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [20 + delay, 0] });
  const opac  = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  return (
    <Animated.View style={{ transform: [{ translateX: trans }], opacity: opac }}>
      <Pressable onPress={onPress} style={{ marginHorizontal: 6 }}>
        <LinearGradient colors={colors} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.quickBtn}>
          <Text style={styles.quickBtnTxt}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const SwipeableItem = memo(function SwipeableItem({
  chat, selfId, pinned, onOpen, onPinToggle, onMarkRead, onDelete,
}: {
  chat: Chat;
  selfId: string;
  pinned: boolean;
  onOpen: (c: Chat) => void;
  onPinToggle: (id: string) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const reveal = useRef(new Animated.Value(0)).current; // 0..1
  const offset = reveal.interpolate({ inputRange: [0, 1], outputRange: [0, ACTION_W * 3 + 12] });

  const close = useCallback(() => {
    Animated.timing(reveal, { toValue: 0, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [reveal]);
  const open = useCallback(() => {
    Animated.timing(reveal, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [reveal]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 10,
      onPanResponderMove: (_e, g) => {
        const nx = Math.min(Math.max(-g.dx, 0), ACTION_W * 3 + 12);
        reveal.setValue(nx / (ACTION_W * 3 + 12));
      },
      onPanResponderRelease: (_e, g) => {
        if (-g.dx > ACTION_W) open(); else close();
      },
      onPanResponderTerminate: close,
    })
  ).current;

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Actions-Ebene */}
      <View style={styles.quickRow}>
        <ActionBtn label={pinned ? 'Lösen' : 'Pin'} colors={ORANGE_GRAD} onPress={() => { onPinToggle(chat.id); close(); }} progress={reveal} />
        <ActionBtn label="Gelesen" colors={GREEN_GRAD} onPress={() => { onMarkRead(chat.id); close(); }} progress={reveal} delay={30} />
        <ActionBtn label="Löschen" colors={RED_GRAD} onPress={() => { onDelete(chat.id); close(); }} progress={reveal} delay={60} />
      </View>

      {/* Vordergrund (verschiebbar) */}
      <Animated.View style={{ transform: [{ translateX: Animated.multiply(offset, -1) }] }} {...pan.panHandlers}>
        <ChatRow item={chat} selfId={selfId} pinned={pinned} onPress={onOpen} />
      </Animated.View>
    </View>
  );
});

/* ============================== Screen =================================== */

type Row = { kind: 'header'; id: string; label: string } | ({ kind: 'chat' } & Chat);

export default function ChatsListScreen() {
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [selfId, setSelfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Chat[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<UserLite[]>([]);

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<UserLite[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupResults, setGroupResults] = useState<UserLite[]>([]);

  const pinnedRef = useRef<Set<string>>(new Set());

  // Top-Sheet Anim
  const slideY = useRef(new Animated.Value(200)).current;
  const fade   = useRef(new Animated.Value(0)).current;

  /* Pins */
  const bootPinned = useCallback(async (uid: string) => {
    try {
      const raw = await AsyncStorage.getItem(storageKeyPinned(uid));
      pinnedRef.current = new Set((raw ? JSON.parse(raw) : []) as string[]);
    } catch {}
  }, []);
  const persistPinned = useCallback(async (uid: string) => {
    try { await AsyncStorage.setItem(storageKeyPinned(uid), JSON.stringify(Array.from(pinnedRef.current))); }
    catch {}
  }, []);

  /* Laden */
  const load = useCallback(async () => {
    setLoading(true);
    setDegraded(false);
    try {
      const u = await me();
      const uid = u?.id || '';
      setSelfId(uid);
      await bootPinned(uid);

      // Cache-first
      const cacheRaw = await AsyncStorage.getItem(storageKeyCache(uid));
      if (cacheRaw) {
        try { const cached = JSON.parse(cacheRaw) as Chat[]; if (cached?.length) setData(cached); } catch {}
      }

      // Live
      let list: Chat[] = [];
      try {
        if (showArchived) {
          const { data: r } = await api.get('/chat/list', { params: { archived: 1 } });
          list = (r?.chats || []) as Chat[];
        } else {
          list = await chatList();
        }
      } catch {
        const { data: r } = await api.get('/chat/list');
        list = (r?.chats || []) as Chat[];
      }
      const sorted = (list || []).sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime());
      setData(sorted);
      await AsyncStorage.setItem(storageKeyCache(uid), JSON.stringify(sorted));
    } catch (e: any) {
      const msg = String(e?.response?.data?.details || e?.message || '');
      if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')) {
        try {
          const { data: r } = await api.get('/chat/list');
          const list = (r?.chats || []) as Chat[];
          const sorted = list.sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime());
          setData(sorted);
          setDegraded(true);
        } catch {
          Alert.alert('Fehler', 'Chats konnten nicht geladen werden.');
        }
      } else {
        Alert.alert('Fehler', 'Chats konnten nicht geladen werden.');
      }
    } finally { setLoading(false); }
  }, [bootPinned, showArchived]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }, [load]);

  /* Rows */
  const rows: Row[] = useMemo(() => {
    if (!data?.length) return [];
    const base = showArchived ? data.filter((c: any) => c.archived) : data.filter((c: any) => !c.archived);
    const sorted = [...base].sort((a,b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime());
    const pinned = sorted.filter(c => pinnedRef.current.has(c.id));
    const normal = sorted.filter(c => !pinnedRef.current.has(c.id));

    const out: Row[] = [];
    if (pinned.length) {
      out.push({ kind: 'header', id: 'h_pin', label: 'Fixiert' });
      pinned.forEach(c => out.push({ kind: 'chat', ...c }));
    }
    const todayKey = dateKey(new Date());
    let addToday = false, addEarly = false;
    for (const c of normal) {
      const dk = dateKey(toDate(c.updatedAt));
      if (dk === todayKey && !addToday) { out.push({ kind: 'header', id: 'h_today', label: 'Heute' }); addToday = true; }
      if (dk !== todayKey && !addEarly) { out.push({ kind: 'header', id: 'h_earlier', label: 'Früher' }); addEarly = true; }
      out.push({ kind: 'chat', ...c });
    }
    return out;
  }, [data, showArchived]);

  const stickyIdx = useMemo(() => rows.map((r, i) => r.kind === 'header' ? i : -1).filter(i => i >= 0), [rows]);
  const keyExtractor = useCallback((r: Row) => (r as any).id, []);
  const getItemLayout: NonNullable<FlatListProps<Row>['getItemLayout']> =
    useCallback((_data, index) => ({ length: ROW_H, offset: index * ROW_H, index }), []);

  /* Suche (User) */
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const onChangeQuery = useCallback((q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchAbort.current) searchAbort.current.abort();
    if (!q.trim()) { setResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const baton = new AbortController();
        searchAbort.current = baton;
        const users = await chatSearchUsers(q.trim());
        if ((baton as any).signal?.aborted) return;
        setResults((users || []).filter((u: any) => String(u.id) !== selfId));
      } catch { setResults([]); } finally { setSearchLoading(false); }
    }, 220);
  }, [selfId]);
  useFocusEffect(useCallback(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchAbort.current) searchAbort.current.abort();
  }, []));

  /* Gruppen-Suche */
  const groupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeGroupQuery = useCallback((q: string) => {
    setGroupSearch(q);
    if (groupTimer.current) clearTimeout(groupTimer.current);
    if (!q.trim()) { setGroupResults([]); return; }
    groupTimer.current = setTimeout(async () => {
      try {
        setGroupLoading(true);
        const users = await chatSearchUsers(q.trim());
        const filtered = (users || []).filter((u: any) => String(u.id) !== selfId);
        setGroupResults(filtered);
      } catch { setGroupResults([]); } finally { setGroupLoading(false); }
    }, 220);
  }, [selfId]);

  /* Navigation + Aktionen */
  const openChat = useCallback((c: Chat) => {
    const title = (c as any).title || (c as any).groupName || c.peer?.username
      || [c.peer?.firstName, c.peer?.lastName].filter(Boolean).join(' ') || 'Chat';
    nav.navigate('ChatThread', { chatId: c.id, title, peerAvatarUrl: (c as any)?.photoUrl || c.peer?.avatarUrl });
  }, [nav]);

  const startChatWith = useCallback(async (user: UserLite) => {
    try {
      Haptics.selectionAsync();
      const peerId = String(user.id);
      try {
        const chat = await chatOpen(peerId);
        setSearchOpen(false); setQuery(''); setResults([]);
        nav.navigate('ChatThread', {
          chatId: chat.id,
          title: (chat as any)?.title || chat?.peer?.username || nameOfUser(user),
          peerAvatarUrl: (chat as any)?.photoUrl || chat?.peer?.avatarUrl || user.avatarUrl,
        });
      } catch {
        const { data: r } = await api.post('/chat/start', { peerId });
        const thr = r?.thread || r?.chat || {};
        setSearchOpen(false); setQuery(''); setResults([]);
        nav.navigate('ChatThread', { chatId: thr.id, title: nameOfUser(user), peerAvatarUrl: user.avatarUrl });
      }
    } catch (e: any) {
      Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Chat nicht öffnen.');
    }
  }, [nav]);

  const doArchive = useCallback(async (chatId: string, to = true) => {
    try {
      if (to) await api.post('/chat/archive', { chatId }); else await api.post('/chat/unarchive', { chatId });
      setData(prev => prev.map(c => c.id === chatId ? ({ ...c, archived: to } as any) : c));
    } catch { Alert.alert('Fehler', to ? 'Konnte nicht archivieren.' : 'Konnte nicht wiederherstellen.'); }
  }, []);
  const doDelete = useCallback(async (chatId: string) => {
    try { await api.post('/chat/delete', { chatId }); setData(prev => prev.filter(c => c.id !== chatId)); }
    catch { Alert.alert('Fehler', 'Konnte Chat nicht löschen.'); }
  }, []);
  const markRead = useCallback((chatId: string) => {
    Haptics.selectionAsync();
    setData(prev => prev.map(x => x.id === chatId ? ({ ...x, unread: { ...(x.unread || {}), [selfId]: 0 } }) : x));
  }, [selfId]);
  const togglePin = useCallback(async (id: string) => {
    if (pinnedRef.current.has(id)) pinnedRef.current.delete(id); else pinnedRef.current.add(id);
    setData(prev => [...prev]); // resort by useMemo
    if (selfId) await persistPinned(selfId);
  }, [persistPinned, selfId]);

  /* Renderers */
  const renderRow = useCallback(({ item }: { item: Row }) => {
    if (item.kind === 'header') return <SectionHeader label={item.label} />;
    return (
      <SwipeableItem
        chat={item}
        selfId={selfId}
        pinned={pinnedRef.current.has(item.id)}
        onOpen={openChat}
        onPinToggle={togglePin}
        onMarkRead={markRead}
        onDelete={(id) => {
          const buttons: AlertButton[] = [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Löschen', style: 'destructive', onPress: () => { void doDelete(id); } },
          ];
          Alert.alert('Endgültig löschen?', 'Dieser Chat wird für dich entfernt.', buttons);
        }}
      />
    );
  }, [selfId, openChat, togglePin, markRead, doDelete]);

  /* Empty */
  const Empty = () => (
    <View style={{ alignItems: 'center', marginTop: 64 }}>
      <Text style={{ color: TEXT, fontWeight: '900', fontSize: 20 }}>
        {showArchived ? 'Kein Archiv' : 'Keine Chats'}
      </Text>
      <Text style={{ color: MUTED, marginTop: 6 }}>
        {showArchived ? 'Leere Archivansicht.' : 'Starte einen neuen Chat über die Suche.'}
      </Text>
      {!showArchived && (
        <Pressable onPress={() => openSearch()} style={styles.bigBtn}>
          <Text style={styles.bigBtnTxt}>Neuer Chat</Text>
        </Pressable>
      )}
    </View>
  );

  /* Modal control (Top-Sheet) */
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    slideY.setValue(200);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(slideY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(fade,   { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [fade, slideY]);
  const closeSearch = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 200, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
      Animated.timing(fade,   { toValue: 0,   duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
    ]).start(({ finished }) => {
      if (finished) { setSearchOpen(false); setQuery(''); setResults([]); }
    });
  }, [fade, slideY]);

  /* UI */
  return (
    <LinearGradient colors={GRAD_BG} start={{x:0,y:0}} end={{x:0,y:1}} style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.titleXL}>Chats</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => setGroupOpen(true)} style={styles.headerGhostBtn}>
              <Text style={styles.headerGhostTxt}>Gruppe</Text>
            </Pressable>
            <Pressable onPress={() => setShowArchived(v => !v)} style={styles.headerGhostBtn}>
              <Text style={styles.headerGhostTxt}>{showArchived ? 'Zu Chats' : 'Archiv'}</Text>
            </Pressable>
          </View>
        </View>

        {degraded && (
          <View style={styles.banner}>
            <Text style={styles.bannerTxt}>Index baut gerade… Liste kann unvollständig sein.</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <Pressable onPress={openSearch} style={styles.searchInput}>
            <Text style={{ color: '#89A99A' }}>Suchen oder neuen Chat starten…</Text>
          </Pressable>
          <Pressable onPress={openSearch} style={styles.newBtn}>
            <Text style={styles.newTxt}>Neu</Text>
          </Pressable>
        </View>
      </View>

      {/* Liste */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : (
        <FlatList<Row>
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          getItemLayout={getItemLayout}
          contentContainerStyle={{ paddingBottom: 28 + insets.bottom, paddingHorizontal: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          stickyHeaderIndices={stickyIdx}
          refreshControl={<RefreshControl tintColor={GREEN} refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Empty />}
          removeClippedSubviews
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={9}
          updateCellsBatchingPeriod={60}
        />
      )}

      {/* FAB */}
      <Pressable onPress={openSearch} style={[styles.fab, { bottom: insets.bottom + 20 }]}>
        <LinearGradient colors={GREEN_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.fabGrad}>
          <Text style={{ color: '#0c1a10', fontSize: 18, fontWeight: '900' }}>＋</Text>
        </LinearGradient>
      </Pressable>

      {/* Search Modal */}
      <Modal visible={searchOpen} animationType="none" transparent onRequestClose={closeSearch}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'} statusBarTranslucent>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY: slideY }], opacity: fade, maxHeight: MODAL_MAX }]}>
              <Text style={styles.modalTitle}>Neuer Chat</Text>
              <TextInput
                value={query}
                onChangeText={onChangeQuery}
                placeholder="Name, @username oder E-Mail"
                placeholderTextColor="#86a496"
                style={styles.modalInput}
                autoFocus
                returnKeyType="search"
                selectionColor={GREEN}
                onSubmitEditing={() => { if (results[0]) { Keyboard.dismiss(); void startChatWith(results[0]); } }}
              />
              {searchLoading ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <ActivityIndicator color={GREEN} />
                </View>
              ) : (
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  style={{ maxHeight: LIST_MAX }}
                  data={results}
                  keyExtractor={(u) => String(u.id)}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => { Keyboard.dismiss(); void startChatWith(item); }} style={styles.userRow}>
                      <LinearGradient colors={RING_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.userRing}>
                        {item.avatarUrl ? (
                          <Image source={{ uri: safeUrl(item.avatarUrl) }} style={styles.userAva} contentFit="cover" transition={100} />
                        ) : (
                          <View style={[styles.userAva, { backgroundColor: '#133625', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: '#b6ffc3', fontWeight: '900' }}>
                              {(item.firstName?.[0] || item.username?.[0] || '?').toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.userName} numberOfLines={1}>{nameOfUser(item)}</Text>
                        {!!item.email && <Text style={styles.userSub} numberOfLines={1}>{item.email}</Text>}
                      </View>
                      <LinearGradient colors={ORANGE_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.userStart}>
                        <Text style={styles.userStartTxt}>Starten</Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                  ListEmptyComponent={query.trim() ? <Text style={{ color: MUTED, textAlign: 'center', paddingVertical: 14 }}>Keine Ergebnisse</Text> : null}
                />
              )}
              <Pressable onPress={closeSearch} style={styles.modalClose}>
                <Text style={styles.modalCloseTxt}>Schließen</Text>
              </Pressable>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Group Create Modal */}
      <Modal visible={groupOpen} animationType="slide" transparent onRequestClose={() => setGroupOpen(false)}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'} statusBarTranslucent>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 12), maxHeight: MODAL_MAX }]}>
              <Text style={styles.modalTitle}>Gruppe erstellen</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Gruppenname"
                placeholderTextColor="#86a496"
                style={styles.modalInput}
                selectionColor={GREEN}
              />
              {groupMembers.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {groupMembers.map(m => (
                    <LinearGradient key={m.id} colors={GREEN_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.chip}>
                      <Text style={styles.chipTxt}>{nameOfUser(m)}</Text>
                      <Pressable onPress={() => setGroupMembers(prev => prev.filter(x => x.id !== m.id))} style={styles.chipX}>
                        <Text style={styles.chipXTxt}>✕</Text>
                      </Pressable>
                    </LinearGradient>
                  ))}
                </View>
              )}
              <TextInput
                value={groupSearch}
                onChangeText={onChangeGroupQuery}
                placeholder="Mitglieder suchen…"
                placeholderTextColor="#86a496"
                style={styles.modalInput}
                selectionColor={GREEN}
              />
              {groupLoading ? (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}><ActivityIndicator color={GREEN} /></View>
              ) : (
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  style={{ maxHeight: LIST_MAX }}
                  data={groupResults}
                  keyExtractor={(u) => String(u.id)}
                  renderItem={({ item }) => {
                    const chosen = groupMembers.some(m => m.id === item.id);
                    return (
                      <Pressable
                        onPress={() => setGroupMembers(prev => chosen ? prev.filter(x => x.id !== item.id) : [...prev, item])}
                        style={[styles.userRow, chosen && { opacity: 0.7 }]}
                      >
                        <LinearGradient colors={RING_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.userRing}>
                          {item.avatarUrl ? (
                            <Image source={{ uri: safeUrl(item.avatarUrl) }} style={styles.userAva} contentFit="cover" transition={100} />
                          ) : (
                            <View style={[styles.userAva, { backgroundColor: '#133625', alignItems: 'center', justifyContent: 'center' }]}>
                              <Text style={{ color: '#b6ffc3', fontWeight: '900' }}>
                                {(item.firstName?.[0] || item.username?.[0] || '?').toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </LinearGradient>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.userName} numberOfLines={1}>{nameOfUser(item)}</Text>
                          {!!item.email && <Text style={styles.userSub} numberOfLines={1}>{item.email}</Text>}
                        </View>
                        <View style={[styles.selectPill, chosen && { backgroundColor: '#324E3F', borderColor: 'transparent' }]}>
                          <Text style={styles.selectPillTxt}>{chosen ? 'Entfernen' : 'Hinzufügen'}</Text>
                        </View>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={groupSearch.trim() ? <Text style={{ color: MUTED, textAlign: 'center', paddingVertical: 14 }}>Keine Ergebnisse</Text> : null}
                />
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Pressable onPress={() => setGroupOpen(false)} style={[styles.modalClose, { flex: 1 }]}>
                  <Text style={styles.modalCloseTxt}>Abbrechen</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      if (!groupName.trim()) { Alert.alert('Name fehlt', 'Bitte gib der Gruppe einen Namen.'); return; }
                      const memberIds = groupMembers.map(m => m.id);
                      if (memberIds.length < 1) { Alert.alert('Mitglieder', 'Wähle mindestens 1 Mitglied.'); return; }
                      const { data: r } = await api.post('/group/create', { name: groupName.trim(), memberIds });
                      const thr = r?.thread || r?.chat || {};
                      setGroupOpen(false); setGroupName(''); setGroupMembers([]); setGroupSearch(''); setGroupResults([]);
                      nav.navigate('ChatThread', { chatId: thr.id, title: groupName.trim() });
                    } catch (e: any) {
                      Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Gruppe nicht erstellen.');
                    }
                  }}
                  style={[styles.modalClose, { flex: 1, backgroundColor: 'transparent', borderColor: 'transparent' }]}
                >
                  <LinearGradient colors={GREEN_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.modalClose, { flex: 1 }]}>
                    <Text style={[styles.modalCloseTxt, { color: '#0c1a10', fontWeight: '900' }]}>Erstellen</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ============================== Styles =================================== */

const styles = StyleSheet.create({
  header: { paddingHorizontal: 14, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleXL: { color: TEXT, fontWeight: '900', fontSize: 26, letterSpacing: 0.2 },

  headerGhostBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  headerGhostTxt: { color: MUTED, fontWeight: '800' },

  banner: {
    backgroundColor: 'rgba(255, 197, 66, 0.12)',
    borderColor: 'rgba(255, 197, 66, 0.35)',
    borderWidth: 1, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, marginTop: 8,
  },
  bannerTxt: { color: '#ffd27a', fontSize: 12, fontWeight: '700' },

  headerRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
  },
  newBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  newTxt: { color: '#0c1a10', fontWeight: '900', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: ORANGE, borderRadius: 14 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  row: {
    minHeight: ROW_H, flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },

  avatarRing: { width: 56, height: 56, borderRadius: 28, padding: 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { backgroundColor: '#133625', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackTxt: { color: '#b6ffc3', fontWeight: '900', fontSize: 16 },

  title: { color: TEXT, fontWeight: '900', fontSize: 16, letterSpacing: 0.15 },
  subtitle: { color: MUTED, marginTop: 2, fontSize: 13.5 },
  time: { color: MUTED, fontSize: 12 },

  unread: { minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: GREEN, shadowOpacity: 0.35, shadowRadius: 6 },
  unreadTxt: { color: '#0c1a10', fontWeight: '900', fontSize: 12 },

  pinPill: { position: 'absolute', right: -4, bottom: -4, backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 2, borderColor: '#0E231B' },
  pinPillTxt: { color: '#0c1a10', fontSize: 10 },

  // Quick-Actions Layer
  quickRow: {
    position: 'absolute', right: 12, left: 12, height: ROW_H,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
  },
  quickBtn: {
    width: ACTION_W, height: ROW_H - 8, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  quickBtnTxt: { color: '#0c1a10', fontWeight: '900', fontSize: 12 },

  // FAB
  fab: {
    position: 'absolute', right: 18, width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  fabGrad: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },

  // Modal shared
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#10281E', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderColor: BORDER, elevation: 12 },
  modalTitle: { color: TEXT, fontWeight: '900', fontSize: 18, marginBottom: 10, letterSpacing: 0.2 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: TEXT, marginBottom: 10, fontSize: 16 },
  modalClose: { alignSelf: 'center', marginTop: 10, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  modalCloseTxt: { color: MUTED, fontWeight: '800', letterSpacing: 0.3 },

  // Search/Group list
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  userRing: { width: 46, height: 46, borderRadius: 23, padding: 2, alignItems: 'center', justifyContent: 'center' },
  userAva: { width: 42, height: 42, borderRadius: 21 },
  userName: { color: TEXT, fontWeight: '800', fontSize: 15.5 },
  userSub:  { color: MUTED, marginTop: 2, fontSize: 12.5 },
  userStart: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 6 },
  userStartTxt: { color: '#0c1a10', fontWeight: '900' },

  // Chips/Select
  chip: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, gap: 8 },
  chipTxt: { color: '#0c1a10', fontWeight: '900' },
  chipX: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  chipXTxt: { color: '#0c1a10', fontWeight: '900' },
  selectPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  selectPillTxt: { color: TEXT, fontWeight: '800' },

  // Empty CTA
  bigBtn: { marginTop: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: GREEN, paddingVertical: 12, paddingHorizontal: 20 },
  bigBtnTxt: { color: '#0c1a10', fontWeight: '900' },
});