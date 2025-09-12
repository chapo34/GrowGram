import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Comment, FeedPost } from '../utils/api';
import { addComment, getComments, likePost, unlikePost } from '../utils/api';
import type { MainNav, MainStackParamList } from '../navigation/AppNavigator';
import { getGrowDockSpace } from '../components/GrowDock';

function normalizeImageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  try {
    const url = new URL(String(u));
    url.searchParams.delete('auto');
    if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
    if (!url.searchParams.get('q')) url.searchParams.set('q', '85');
    if (!url.searchParams.get('w')) url.searchParams.set('w', '1600');
    return url.toString();
  } catch {
    let s = String(u);
    s = s.replace(/([?&])auto=[^&]+/g, '$1');
    const sep = s.includes('?') ? '&' : '?';
    if (!/[?&]fm=/.test(s)) s += `${sep}fm=jpg`;
    if (!/[?&]q=/.test(s)) s += `&q=85`;
    if (!/[?&]w=/.test(s)) s += `&w=1600`;
    return s.replace(/[?&]$/, '');
  }
}

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const bottomSpace = getGrowDockSpace(insets.bottom) + 8;

  const route = useRoute<RouteProp<MainStackParamList, 'Post'>>();
  const nav = useNavigation<MainNav>();

  const initialPost = route?.params?.post as FeedPost | undefined;
  const [post, setPost] = useState<FeedPost | null>(initialPost ?? null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  if (!post) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={{ color: '#cfe4d6', textAlign: 'center' }}>
          Kein Post übergeben. Bitte über „Explore“ öffnen.
        </Text>
        <Pressable style={[styles.btn, { marginTop: 14 }]} onPress={() => nav.goBack()}>
          <Text style={styles.btnTxt}>Zurück</Text>
        </Pressable>
      </View>
    );
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getComments(post.id);
        if (alive) setComments(list);
      } finally {
        if (alive) setLoadingComments(false);
      }
    })();
    return () => { alive = false; };
  }, [post.id]);

  const liked = !!post._liked;
  const likeCount = post.likesCount ?? 0;

  const onToggleLike = useCallback(async () => {
    setPost((p) =>
      p ? { ...p, _liked: !p._liked, likesCount: Math.max(0, (p.likesCount ?? 0) + (p._liked ? -1 : 1)) } : p
    );
    try {
      if (liked) {
        const r = await unlikePost(post.id);
        if (typeof r?.likesCount === 'number') setPost((p) => (p ? { ...p, likesCount: r.likesCount } : p));
      } else {
        const r = await likePost(post.id);
        if (typeof r?.likesCount === 'number') setPost((p) => (p ? { ...p, likesCount: r.likesCount } : p));
      }
    } catch {
      setPost((p) => (p ? { ...p, _liked: liked, likesCount: likeCount } : p));
    }
  }, [liked, likeCount, post.id]);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const c = await addComment(post.id, t);
      setComments((prev) => [c, ...prev]);
      setText('');
      setPost((p) => (p ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p));
    } finally {
      setSending(false);
    }
  }, [text, sending, post.id]);

  const img = normalizeImageUrl(post.mediaUrls?.[0]);
  const tags = useMemo(() => (post.tags ?? []).map((t) => String(t)), [post.tags]);

  const ListHeader = useMemo(
    () => (
      <View style={{ paddingBottom: 12 }}>
        {img ? (
          <Image
            source={{ uri: img }}
            style={{ width: '100%', height: 360, backgroundColor: '#0a1812' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={{ width: '100%', height: 220, backgroundColor: '#0a1812' }} />
        )}

        <View style={{ padding: 12 }}>
          <Text style={{ color: '#e6faec', fontSize: 16, marginBottom: 8 }}>{post.text || ''}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <Pressable onPress={onToggleLike} hitSlop={6}>
              <Text style={{ color: liked ? '#ff6b81' : '#d6e5db', fontWeight: '700' }}>
                ♥ {post.likesCount ?? 0}
              </Text>
            </Pressable>
            <Text style={{ color: '#d6e5db' }}>💬 {post.commentsCount ?? comments.length}</Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => nav.navigate('Explore', { q: tag })}
                style={{
                  backgroundColor: '#1e2b22',
                  borderRadius: 16,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: '#9fe3b1' }}>#{tag}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: '#8aa', marginTop: 6, fontSize: 12 }}>
            Sichtbarkeit: {post.visibility ?? 'public'}
          </Text>
        </View>

        <Text style={{ color: '#e6faec', fontWeight: '600', paddingHorizontal: 12, marginBottom: 8 }}>
          Kommentare
        </Text>
      </View>
    ),
    [img, post.text, post.likesCount, post.commentsCount, liked, tags, comments.length, onToggleLike, nav]
  );

  const renderItem = ({ item }: { item: Comment }) => {
    const ts = typeof item.createdAt === 'string' || typeof item.createdAt === 'number'
      ? new Date(item.createdAt)
      : new Date();
    return (
      <View style={styles.comment}>
        <Text style={{ color: '#9fe3b1', marginBottom: 2 }}>{item.author?.name ?? 'User'}</Text>
        <Text style={{ color: '#eee' }}>{item.text}</Text>
        <Text style={{ color: '#789', fontSize: 12, marginTop: 4 }}>{ts.toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#0f1a14' }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
    >
      {loadingComments && comments.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={ListHeader}
          renderItem={renderItem}
          refreshing={loadingComments}
          onRefresh={async () => {
            setLoadingComments(true);
            try { setComments(await getComments(post.id)); } finally { setLoadingComments(false); }
          }}
          contentContainerStyle={{ paddingBottom: bottomSpace + 72 }}
        />
      )}

      {/* Eingabeleiste – sitzt über dem Dock */}
      <View
        style={[
          styles.inputBar,
          { paddingBottom: Math.max(10, 8 + insets.bottom), bottom: bottomSpace },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Kommentar hinzufügen…"
          placeholderTextColor="#678"
          style={styles.input}
          multiline
        />
        <Pressable onPress={onSend} style={[styles.btn, sending && { opacity: 0.6 }]} disabled={sending}>
          <Text style={styles.btnTxt}>Senden</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1a14' },
  comment: { paddingHorizontal: 12, paddingVertical: 10, borderBottomColor: '#223', borderBottomWidth: 1 },
  inputBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#0f1a14',
    borderTopColor: '#223', borderTopWidth: 1,
  },
  input: {
    flex: 1, backgroundColor: '#142119', color: '#fff',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, maxHeight: 120,
  },
  btn: { backgroundColor: '#2ecc71', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 100 },
  btnTxt: { color: '#0b1', fontWeight: '700' },
});