// src/screens/ChatThreadScreen.tsx
// Chat-Thread im Insta-Style: Gradients, smarte Bubbles, Swipe-to-Reply,
// Long-Press-Reactions & Aktionen, Linkify, Reply-Preview, optimistisches Senden.

import React, {
  memo, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  StyleSheet, Text, TextInput, View, ActionSheetIOS, Dimensions, Keyboard, PanResponder,
  Linking, type GestureResponderEvent, type PanResponderGestureState, type FlatListProps,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import {
  api,
  me,
  chatGetMessages,
  chatMarkRead,
  chatSendMessage,
  normalizeImageUrl,
  type ChatMessage,
} from '../utils/api';

/* ======= Theme (wie in ChatsListScreen) ======= */
const GREEN   = '#4CAF50' as const;
const GREEN_2 = '#66E08E' as const;
const TEXT    = '#E6EAEF' as const;
const MUTED   = '#9fb7a5' as const;

const GRAD_BG          = ['#071C14', '#0B2117', '#0A1914'] as const;
const CARD_GRAD        = ['#10281E', '#0E231B'] as const;
const OUT_GRAD         = [GREEN, GREEN_2] as const;

const BORDER = 'rgba(255,255,255,0.08)';

const WIN = Dimensions.get('window');
const MSG_ROW_APPROX = 64;

/* ======= Helpers ======= */
function toDate(ts: any): Date {
  try {
    if (!ts) return new Date(0);
    if (typeof ts?.toDate === 'function') return ts.toDate();
    if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
    if (typeof ts === 'number') return new Date(ts);
    const d = new Date(String(ts));
    return Number.isNaN(+d) ? new Date(0) : d;
  } catch { return new Date(0); }
}
function timeShort(dLike: any) {
  const d = toDate(dLike);
  if (!+d) return '';
  const now = new Date();
  const dk = (x: Date) => `${x.getFullYear()}-${x.getMonth()+1}-${x.getDate()}`;
  if (dk(d) === dk(now)) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return d.toLocaleDateString();
}
function linkifySegments(t: string): { kind: 'text'|'link'|'mail'; text: string; url?: string }[] {
  const out: any[] = [];
  const URL_RE  = /\b((https?:\/\/|www\.)[^\s<]+[^<.,:;"')\]\s])/gi;
  const MAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
  const matches: Array<{ s: number; e: number; url: string; kind: 'link'|'mail' }> = [];
  for (const m of t.matchAll(URL_RE)) {
    const s = m.index ?? 0, raw = m[0] ?? '', e = s + raw.length;
    matches.push({ s, e, url: raw.startsWith('http') ? raw : `https://${raw}`, kind: 'link' });
  }
  for (const m of t.matchAll(MAIL_RE)) {
    const s = m.index ?? 0, raw = m[0] ?? '', e = s + raw.length;
    matches.push({ s, e, url: `mailto:${raw}`, kind: 'mail' });
  }
  matches.sort((a,b)=>a.s-b.s);
  let cur = 0;
  for (const m of matches) {
    if (m.s > cur) out.push({ kind: 'text', text: t.slice(cur, m.s) });
    out.push({ kind: m.kind, text: t.slice(m.s, m.e), url: m.url });
    cur = m.e;
  }
  if (cur < t.length) out.push({ kind: 'text', text: t.slice(cur) });
  if (!out.length) out.push({ kind: 'text', text: t });
  return out;
}

/* ======= Route/Types ======= */
type ThreadRoute = RouteProp<
  Record<'ChatThread', { chatId: string; title?: string; peerAvatarUrl?: string }>,
  'ChatThread'
>;

type MsgUI = ChatMessage & {
  _mine?: boolean;
  _reactions?: Partial<Record<'❤️'|'👍'|'😂'|'😮'|'😢'|'👎', number>>;
  _replyToText?: string;
};

/* ======= Header Avatar ======= */
const TinyAvatar = memo(function TinyAvatar({ uri }: { uri?: string }) {
  if (!uri) return null;
  return (
    <Image
      source={{ uri: normalizeImageUrl(uri, 0, { w: 64 }) }}
      style={{ width: 26, height: 26, borderRadius: 6, marginLeft: 8 }}
      contentFit="cover"
      cachePolicy="disk"
    />
  );
});

/* ======= Screen ======= */
export default function ChatThreadScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<ThreadRoute>();
  const { chatId, title, peerAvatarUrl } = route.params || ({} as any);

  const [selfId, setSelfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<MsgUI[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<MsgUI | null>(null);
  const [composerH, setComposerH] = useState(56);

  const listRef = useRef<FlatList<MsgUI>>(null);
  const fetchingMoreRef = useRef(false);
  const lastTapRef = useRef<number>(0);

  const GROW_DOCK_PAD = Platform.OS === 'ios' ? 92 : 0;

  useEffect(() => {
    nav.setOptions({
      headerShown: true,
      title: title || 'Unterhaltung',
      headerTintColor: TEXT,
      headerStyle: { backgroundColor: '#0B2117' },
      headerTitleStyle: { color: TEXT, fontWeight: '900' },
      headerRight: () => <TinyAvatar uri={peerAvatarUrl} />,
    });
  }, [nav, title, peerAvatarUrl]);

  const boot = useCallback(async () => {
    setLoading(true);
    try {
      const u = await me();
      const myId = u?.id || '';
      setSelfId(myId);

      const { messages, nextCursor } = await chatGetMessages(chatId, 30);
      const ui = (messages || []).map((m) => ({ ...m, _mine: m.senderId === myId })) as MsgUI[];
      setMessages(ui);
      setNextCursor(nextCursor ?? null);

      chatMarkRead(chatId).catch(() => {});
    } catch (e: any) {
      Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Chat nicht laden.');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => { boot(); }, [boot]);
  useFocusEffect(useCallback(() => { chatMarkRead(chatId).catch(() => {}); }, [chatId]));

  const loadMore = useCallback(async () => {
    if (!nextCursor || fetchingMoreRef.current) return;
    fetchingMoreRef.current = true;
    try {
      const { messages: more, nextCursor: nxt } = await chatGetMessages(chatId, 30, nextCursor);
      const ui = (more || []).map((m) => ({ ...m, _mine: m.senderId === selfId })) as MsgUI[];
      setMessages((prev) => [...prev, ...ui]);
      setNextCursor(nxt ?? null);
    } catch {}
    fetchingMoreRef.current = false;
  }, [chatId, nextCursor, selfId]);

  /* ----- Senden (optimistisch) ----- */
  const send = useCallback(async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    setInput('');

    const temp: MsgUI = {
      id: `temp_${Date.now()}`,
      senderId: selfId || 'me',
      type: 'text',
      text: txt,
      createdAt: new Date().toISOString(),
      _mine: true,
      _replyToText: replyTo?.text,
    };
    setMessages((prev) => [temp, ...prev]);
    setReplyTo(null);

    try {
      const saved = await chatSendMessage(chatId, txt, replyTo?.id);
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...(saved as any), _mine: true } : m)));
      listRef.current?.scrollToOffset({ animated: true, offset: 0 });
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      Alert.alert('Senden fehlgeschlagen', e?.response?.data?.details || e?.message || 'Bitte erneut versuchen.');
    } finally {
      setSending(false);
    }
  }, [input, sending, selfId, replyTo, chatId]);

  /* ----- Reaktionen (lokal + optional Server) ----- */
  const REACTIONS = ['❤️','👍','😂','😮','😢','👎'] as const;
  const toggleReaction = useCallback(async (m: MsgUI, emoji: typeof REACTIONS[number]) => {
    Haptics.selectionAsync();
    setMessages((prev) =>
      prev.map((x) => {
        if (x.id !== m.id) return x;
        const cur = { ...(x._reactions || {}) };
        cur[emoji] = Math.max(1, (cur[emoji] || 0) + 1);
        return { ...x, _reactions: cur };
      }),
    );
    // optional Endpunkt – falls nicht vorhanden, ignoriert:
    try { await api.post(`/chat/${chatId}/messages/${m.id}/react`, { emoji }); } catch {}
  }, [chatId]);

  /* ----- Swipe-to-Reply (PanResponder) ----- */
  const buildPan = (m: MsgUI) =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_: GestureResponderEvent, g: PanResponderGestureState) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dy) < 10,
      onPanResponderRelease: (_e, g) => {
        if (g.dx > 42) { Haptics.selectionAsync(); setReplyTo(m); }
      },
    });

  /* ----- Doppeltipp = Herz ----- */
  const onDoubleTap = (m: MsgUI) => {
    const now = Date.now();
    if (now - lastTapRef.current < 220) toggleReaction(m, '❤️');
    lastTapRef.current = now;
  };

  /* ----- Bubble-Gruppe erkennen ----- */
  const nearSameSender = (a?: MsgUI, b?: MsgUI) => {
    if (!a || !b) return false;
    if (a.senderId !== b.senderId) return false;
    return Math.abs(toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime()) < 5 * 60 * 1000;
  };

  /* ----- Render Nachricht ----- */
  const MAX_BUBBLE = Math.min(Math.round(WIN.width * 0.78), 460);

  const renderMsg = useCallback(({ item, index }: { item: MsgUI; index: number }) => {
    const mine = !!item._mine;
    const when = timeShort(item.createdAt);
    const prev = messages[index + 1];
    const next = messages[index - 1];

    const joinTop = nearSameSender(item, prev);
    const joinBottom = nearSameSender(item, next);

    const pan = buildPan(item);
    const segs = linkifySegments(item.text || '');

    const metaLine = (
      <View style={styles.metaRow}>
        {!!when && <Text style={[styles.metaTxt, mine ? { color: '#0c1a10' } : { color: MUTED }]}>{when}</Text>}
        {/* Fake-Read-Checks – wenn du echte Stati hast, hier ersetzen */}
        {mine && <Text style={[styles.metaTxt, { marginLeft: 6 }, { color: '#0c1a10' }]}>✓✓</Text>}
        {!!item._reactions && (
          <View style={styles.reactRow}>
            {Object.entries(item._reactions).map(([k, v]) =>
              v ? (
                <View key={k} style={styles.reactPill}>
                  <Text style={{ fontSize: 12 }}>{k}</Text>
                  {v > 1 && <Text style={{ fontSize: 11, marginLeft: 4 }}>{v}</Text>}
                </View>
              ) : null,
            )}
          </View>
        )}
      </View>
    );

    return (
      <View style={[styles.messageRow, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!mine && <View style={{ width: 28 }} />}
        <Pressable
          {...pan.panHandlers}
          onLongPress={() => {
            Haptics.selectionAsync();
            const opts = [...REACTIONS, 'Kopieren', ...(mine ? ['Löschen'] : []), 'Abbrechen'];
            if (Platform.OS === 'ios') {
              ActionSheetIOS.showActionSheetWithOptions(
                { options: opts, cancelButtonIndex: opts.length - 1, destructiveButtonIndex: mine ? opts.length - 2 : undefined },
                (i) => {
                  if (i >= 0 && i < REACTIONS.length) toggleReaction(item, REACTIONS[i]);
                  if (opts[i] === 'Kopieren') { Keyboard.dismiss(); try { /* @ts-ignore */
                    require('react-native').Clipboard?.setString?.(item.text || ''); } catch {} }
                  if (opts[i] === 'Löschen' && mine) {
                    api.post(`/chat/${chatId}/messages/${item.id}/unsend`, {}).then(() => {
                      setMessages((prev) => prev.filter((m) => m.id !== item.id));
                    }).catch(()=>{});
                  }
                }
              );
            } else {
              toggleReaction(item, '❤️');
            }
          }}
          onTouchEnd={() => onDoubleTap(item)}
          style={({ pressed }) => [{ opacity: pressed ? 0.96 : 1 }]}
        >
          {mine ? (
            <LinearGradient
              colors={OUT_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
              style={[
                styles.bubble, { maxWidth: MAX_BUBBLE },
                {
                  borderTopRightRadius: joinTop ? 8 : 16,
                  borderBottomRightRadius: joinBottom ? 8 : 16,
                  borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
                },
              ]}
            >
              {!!item._replyToText && (
                <Text style={[styles.replyPreview, { color: '#0e3c22' }]} numberOfLines={1}>
                  ↩︎ {item._replyToText}
                </Text>
              )}
              <Text style={[styles.bubbleTxt, { color: '#0c1a10' }]}>
                {segs.map((s, i) =>
                  s.kind === 'text'
                    ? <Text key={i}>{s.text}</Text>
                    : <Text key={i} style={[{ color: '#06371d', textDecorationLine: 'underline' }]}
                        onPress={() => s.url && Linking.openURL(s.url).catch(()=>{})}>{s.text}</Text>
                )}
              </Text>
              {metaLine}
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
              style={[
                styles.bubble, { maxWidth: MAX_BUBBLE, borderWidth: 1, borderColor: BORDER },
                {
                  borderTopLeftRadius: joinTop ? 8 : 16,
                  borderBottomLeftRadius: joinBottom ? 8 : 16,
                  borderTopRightRadius: 16, borderBottomRightRadius: 16,
                },
              ]}
            >
              {!!item._replyToText && (
                <Text style={[styles.replyPreview, { color: MUTED }]} numberOfLines={1}>
                  ↩︎ {item._replyToText}
                </Text>
              )}
              <Text style={[styles.bubbleTxt, { color: TEXT }]}>
                {segs.map((s, i) =>
                  s.kind === 'text'
                    ? <Text key={i}>{s.text}</Text>
                    : <Text key={i} style={[{ color: '#80ffd1', textDecorationLine: 'underline' }]}
                        onPress={() => s.url && Linking.openURL(s.url).catch(()=>{})}>{s.text}</Text>
                )}
              </Text>
              {metaLine}
            </LinearGradient>
          )}
        </Pressable>
        {mine && <View style={{ width: 28 }} />}
      </View>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, toggleReaction]);

  const keyMsg = useCallback((m: MsgUI) => String(m.id), []);
  const getMsgLayout: NonNullable<FlatListProps<MsgUI>['getItemLayout']> =
    useCallback((_d, index) => ({ length: MSG_ROW_APPROX, offset: MSG_ROW_APPROX * index, index }), []);

  if (loading) {
    return (
      <LinearGradient colors={GRAD_BG} start={{x:0,y:0}} end={{x:0,y:1}} style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </LinearGradient>
    );
  }

  const invertedTopPad = composerH + Math.max(insets.bottom, 8) + GROW_DOCK_PAD;

  return (
    <LinearGradient colors={GRAD_BG} start={{x:0,y:0}} end={{x:0,y:1}} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
      >
        <FlatList
          ref={listRef}
          inverted
          data={messages}
          keyExtractor={keyMsg}
          renderItem={renderMsg}
          contentContainerStyle={{ paddingTop: invertedTopPad, paddingBottom: 8 }}
          onEndReachedThreshold={0.1}
          onEndReached={loadMore}
          getItemLayout={getMsgLayout}
          initialNumToRender={18}
          windowSize={9}
          removeClippedSubviews
        />

        {/* Composer */}
        <View
          style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 8) + GROW_DOCK_PAD }]}
          onLayout={(e) => setComposerH(e.nativeEvent.layout.height)}
        >
          {!!replyTo && (
            <View style={styles.replyBar}>
              <Text style={{ color: TEXT, fontWeight: '800' }}>Antwort an</Text>
              <Text style={{ color: MUTED }} numberOfLines={1}> {replyTo.text}</Text>
              <Pressable hitSlop={10} onPress={() => setReplyTo(null)} style={{ marginLeft: 'auto' }}>
                <Text style={{ color: MUTED }}>✕</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.composerRow}>
            <Pressable
              onPress={() => Alert.alert('Anhänge', 'Bilder/Anhänge kommen später 🙂')}
              style={styles.composerBtn}
              accessibilityLabel="Anhängen"
            >
              <Text style={{ color: '#86a496' }}>＋</Text>
            </Pressable>

            <TextInput
              style={styles.composerInput}
              value={input}
              onChangeText={setInput}
              placeholder="Nachricht schreiben…"
              placeholderTextColor="#86a496"
              multiline
              maxLength={2000}
              onSubmitEditing={send}
              blurOnSubmit={false}
              accessibilityLabel="Nachrichteneingabe"
            />

            <Pressable
              onPress={send}
              disabled={sending || !input.trim()}
              style={[styles.composerSend, (sending || !input.trim()) && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Senden"
            >
              <Text style={{ color: '#0c1a10', fontWeight: '900' }}>Senden</Text>
            </Pressable>
          </View>

          {/* Präsenz-Placeholder */}
          {/* <Text style={{ color: MUTED, marginTop: 6, marginLeft: 8 }}>beta tippt…</Text> */}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/* ======= Styles ======= */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  messageRow: { width: '100%', flexDirection: 'row', paddingHorizontal: 12, marginVertical: 2 },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubbleTxt: { fontSize: 16, lineHeight: 22 },
  replyPreview: { fontSize: 12, marginBottom: 4, opacity: 0.9 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6, flexWrap: 'wrap' },
  metaTxt: { fontSize: 11, opacity: 0.7 },
  reactRow: { flexDirection: 'row', gap: 6, marginLeft: 6 },
  reactPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },

  composerWrap: { backgroundColor: '#0B2117', borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 8, paddingTop: 6 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  composerInput: { flex: 1, minHeight: 40, maxHeight: 140, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: TEXT },
  composerSend: { backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
});