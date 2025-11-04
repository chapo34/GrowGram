import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { Comment } from '../utils/api';
import { getComments, addComment, likeComment, unlikeComment } from '../utils/api';

type Props = {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onCountChange?: (nextCount: number) => void;
  initialCount?: number;
};

export default function CommentsSheet({
  visible,
  postId,
  onClose,
  onCountChange,
  initialCount = 0,
}: Props) {
  const [items, setItems] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState<Record<string, boolean>>({});
  const listRef = useRef<FlatList<Comment>>(null);

  // Laden beim Öffnen
  useEffect(() => {
    if (!visible || !postId) return;
    (async () => {
      const list = await getComments(postId);
      // neueste oben
      setItems([...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    })();
  }, [visible, postId]);

  // Counter IMMER aktuell halten (fix für "stale length")
  useEffect(() => {
    if (!visible) return;
    onCountChange?.(items.length || initialCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, visible]);

  const toggleLike = useCallback(
    async (c: Comment) => {
      if (!postId || liking[c.id]) return;
      setLiking((s) => ({ ...s, [c.id]: true }));

      // Optimistisch
      setItems((prev) =>
        prev.map((it) =>
          it.id === c.id
            ? {
                ...it,
                liked: !it.liked,
                likesCount: Math.max(0, (it.likesCount ?? 0) + (it.liked ? -1 : 1)),
              }
            : it
        )
      );

      try {
        const res = c.liked ? await unlikeComment(postId, c.id) : await likeComment(postId, c.id);
        if (typeof res?.likesCount === 'number') {
          setItems((prev) =>
            prev.map((it) => (it.id === c.id ? { ...it, likesCount: res.likesCount } : it))
          );
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } finally {
        setLiking((s) => {
          const n = { ...s };
          delete n[c.id];
          return n;
        });
      }
    },
    [postId, liking]
  );

  const submit = async () => {
    const text = input.trim();
    if (!text || !postId || sending) return;

    setSending(true);
    setInput('');

    // Optimistisches Einfügen (sofortiges Feedback)
    const optimistic: Comment = {
      id: `tmp_${Date.now()}`,
      postId,
      text,
      createdAt: new Date().toISOString(),
      liked: false,
      likesCount: 0,
      author: { id: 'me', name: 'You' },
    };

    setItems((prev) => [optimistic, ...prev]);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });

    try {
      const saved = await addComment(postId, text);
      // Optimistisches Element durch „echtes“ ersetzen
      setItems((prev) =>
        prev.map((it) => (it.id === optimistic.id ? saved : it))
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Rollback bei Fehler
      setItems((prev) => prev.filter((it) => it.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Comment }) => {
    const author = item.author?.name || 'User';
    const time = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const avatar = item.author?.avatarUrl;
    const initial = author.slice(0, 1).toUpperCase();

    return (
      <View style={styles.itemRow}>
        {/* Avatar */}
        {avatar ? (
          <Image source={avatar} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initial}</Text>
          </View>
        )}

        {/* Text */}
        <View style={styles.itemBody}>
          <View style={styles.itemHeader}>
            <Text style={styles.author} numberOfLines={1}>{author}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          <Text style={styles.msg}>{item.text}</Text>
        </View>

        {/* Like */}
        <Pressable
          hitSlop={8}
          onPress={() => toggleLike(item)}
          disabled={!!liking[item.id]}
          style={styles.cLike}
          accessibilityRole="button"
          accessibilityLabel={item.liked ? 'Like entfernen' : 'Kommentar liken'}
        >
          <Text style={[styles.cLikeEmoji, item.liked && styles.cLikeActive]}>
            {item.liked ? '❤️' : '🤍'}
          </Text>
          {!!item.likesCount && <Text style={styles.cLikeCount}>{item.likesCount}</Text>}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Kommentare</Text>
            <Text style={styles.counter}>{items.length || initialCount}</Text>
            <Pressable style={styles.close} hitSlop={12} onPress={onClose}>
              <Text style={{ color: '#8aa799', fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>

          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 90 }}
            ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ padding: 20 }}>
                <Text style={{ color: '#9fb7a5' }}>Sei der Erste, der kommentiert.</Text>
              </View>
            }
          />

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Kommentar hinzufügen…"
              placeholderTextColor="#8fa39a"
              style={styles.input}
              value={input}
              onChangeText={setInput}
              returnKeyType="send"
              onSubmitEditing={submit}
              autoCorrect
              autoCapitalize="sentences"
              maxLength={500}
              multiline
            />
            <Pressable
              onPress={submit}
              disabled={!input.trim() || sending}
              style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel="Kommentar senden"
            >
              <Text style={styles.sendTxt}>Senden</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const SHEET_BG = '#0f2219';

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '80%',
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
    marginBottom: 8,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  title: { color: '#E6EAEF', fontWeight: '800', fontSize: 16 },
  counter: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#E6EAEF',
    fontWeight: '700',
    fontSize: 12,
  },
  close: { marginLeft: 'auto', padding: 6 },

  // Kommentarzeile
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(168,255,176,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarImg: { width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  avatarTxt: { color: '#A8FFB0', fontWeight: '800' },

  itemBody: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  author: { color: '#E6EAEF', fontWeight: '800', fontSize: 13 },
  dot: { color: '#7e9489' },
  time: { color: '#7e9489', fontSize: 12 },

  msg: { color: '#E6EAEF', fontSize: 14 },

  cLike: { marginLeft: 8, alignItems: 'center' },
  cLikeEmoji: { fontSize: 18, opacity: 0.9 },
  cLikeActive: { opacity: 1 },
  cLikeCount: { color: '#9fb7a5', fontSize: 12, marginTop: 2 },

  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: SHEET_BG,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#E6EAEF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 110,
  },
  sendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendTxt: { color: '#0b1f14', fontWeight: '800' },
});