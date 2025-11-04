import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, RefreshControl, ActivityIndicator, ListRenderItemInfo,
  TextInput, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Pressable, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import PostCard from '../components/PostCard';
import { getGrowDockSpace } from '../components/GrowDock';
import CommentsSheet from '../components/CommentsSheet';
import {
  fetchTrendingPage, fetchTrendingTags, type FeedPost,
  likePost, unlikePost, searchPostsPage
} from '../utils/api';
import { normalizeImageUrl } from '../utils/img';
import type { MainStackParamList } from '../navigation/AppNavigator';

const BG = '#0b1f14';
const TEXT = '#E6EAEF';
const ACCENT = '#4CAF50';
const MUTED = '#9fb7a5';

function ErrorBanner({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
      <View style={{ backgroundColor: 'rgba(255,99,99,0.12)', borderColor: 'rgba(255,99,99,0.4)',
        borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 }}>
        <Text style={{ color: '#ff9a9a', textAlign: 'center' }}>{text}</Text>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  // Feed
  const [items, setItems] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  // Suche (Server)
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sItems, setSItems] = useState<FeedPost[]>([]);
  const [sCursor, setSCursor] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Meta
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likingIds, setLikingIds] = useState<Record<string, boolean>>({});

  const mounted = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay-Header (IG-Style)
  const HEADER_H = insets.top + 72;
  const headerAnim = useRef(new Animated.Value(0)).current; // 0 sichtbar, 1 versteckt
  const lastY = useRef(0);
  const headerShownRef = useRef(true);
  const onListScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastY.current; lastY.current = y;
    if (dy > 8 && y > 80 && headerShownRef.current) {
      headerShownRef.current = false;
      Animated.timing(headerAnim, { toValue: 1, duration: 160, useNativeDriver: false }).start();
    } else if (dy < -8 && !headerShownRef.current) {
      headerShownRef.current = true;
      Animated.timing(headerAnim, { toValue: 0, duration: 160, useNativeDriver: false }).start();
    }
  }, [headerAnim]);
  const headerTranslateY = headerAnim.interpolate({ inputRange: [0,1], outputRange: [0,-HEADER_H], extrapolate: 'clamp' });

  // ---------- Erstes Laden (Feed + Tags, fehlertolerant) ----------
  const loadFirst = useCallback(async (tag?: string | null) => {
    setError(null);
    setInitialLoading(true);
    try {
      const wantsTag = tag ?? activeTag ?? undefined;

      const [pageRes, tagsRes] = await Promise.allSettled([
        fetchTrendingPage(20, undefined, wantsTag),
        tags.length ? Promise.resolve(tags) : fetchTrendingTags(),
      ]);

      if (pageRes.status === 'rejected') throw new Error('trending_failed');

      const { posts, nextCursor } = pageRes.value;
      if (!mounted.current) return;

      setItems((posts ?? []).map((p) => ({ ...p, _liked: false })));
      setCursor(nextCursor ?? null);

      if (tagsRes.status === 'fulfilled') {
        setTags((tagsRes.value as any) ?? []);
      }
    } catch {
      if (mounted.current) setError('Konnte Trend-Feed nicht laden.');
    } finally {
      if (mounted.current) { setInitialLoading(false); setRefreshing(false); }
    }
  }, [activeTag, tags]);

  useEffect(() => { mounted.current = true; loadFirst(); return () => { mounted.current = false; }; }, [loadFirst]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (q.trim().length >= 2) {
      doServerSearch(q.trim(), activeTag ?? undefined);
    } else {
      loadFirst();
    }
  }, [q, activeTag, loadFirst]);

  // --------- Serversuche (debounced) ----------
  const doServerSearch = useCallback(async (query: string, tag?: string) => {
    const needle = query.trim();
    if (needle.length < 2) {
      setSearching(false);
      setSItems([]); setSCursor(null);
      return;
    }
    setSearching(true);
    try {
      const { posts, nextCursor } = await searchPostsPage(needle, 20, undefined, tag);
      if (!mounted.current) return;
      setSItems(posts ?? []);
      setSCursor(nextCursor ?? null);
    } finally {
      if (mounted.current) setSearching(false);
    }
  }, []);

  const onQueryChange = useCallback((txt: string) => {
    setQ(txt);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doServerSearch(txt, activeTag ?? undefined);
    }, 280);
  }, [doServerSearch, activeTag]);

  const loadMore = useCallback(async () => {
    if (loadingMore || initialLoading) return;

    // Suche aktiv?
    if (q.trim().length >= 2) {
      if (!sCursor) return;
      try {
        setLoadingMore(true);
        const { posts, nextCursor } = await searchPostsPage(q.trim(), 20, sCursor, activeTag ?? undefined);
        if (!mounted.current) return;
        setSItems((prev) => [...prev, ...(posts ?? [])]);
        setSCursor(nextCursor ?? null);
      } finally {
        if (mounted.current) setLoadingMore(false);
      }
      return;
    }

    // normaler Feed
    if (!cursor) return;
    try {
      setLoadingMore(true);
      const { posts, nextCursor } = await fetchTrendingPage(20, cursor ?? undefined, activeTag ?? undefined);
      if (!mounted.current) return;
      if (posts?.length) setItems((prev) => [...prev, ...posts.map((p) => ({ ...p, _liked: false }))]);
      setCursor(nextCursor ?? null);
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }, [q, sCursor, cursor, initialLoading, loadingMore, activeTag]);

  const selectTag = useCallback((t: string | null) => {
    setActiveTag(t);
    if (q.trim().length >= 2) doServerSearch(q.trim(), t ?? undefined);
    else loadFirst(t);
  }, [q, doServerSearch, loadFirst]);

  // Likes
  const toggleLike = useCallback(async (postId: string) => {
    if (likingIds[postId]) return;
    const all = q.trim().length >= 2 ? sItems : items;
    const current = all.find((p) => p.id === postId);
    if (!current) return;

    const intendedLike = !current._liked;
    setLikingIds((s) => ({ ...s, [postId]: true }));

    const patch = (arr: FeedPost[]) =>
      arr.map((p) => p.id !== postId
        ? p
        : { ...p, _liked: intendedLike, likesCount: Math.max(0, (p.likesCount ?? 0) + (intendedLike ? 1 : -1)) });

    if (q.trim().length >= 2) setSItems((prev) => patch(prev));
    else setItems((prev) => patch(prev));

    try {
      const res = intendedLike ? await likePost(postId) : await unlikePost(postId);
      if (typeof res?.likesCount === 'number') {
        const apply = (arr: FeedPost[]) => arr.map((p) => (p.id === postId ? { ...p, likesCount: res.likesCount } : p));
        if (q.trim().length >= 2) setSItems((prev) => apply(prev));
        else setItems((prev) => apply(prev));
      }
    } finally {
      setLikingIds((s) => { const n = { ...s }; delete n[postId]; return n; });
    }
  }, [likingIds, items, sItems, q]);

  // Comments Sheet
  const [cVisible, setCVisible] = useState(false);
  const [cPostId, setCPostId] = useState<string | null>(null);
  const [cInitialCount, setCInitialCount] = useState(0);
  const openComments = useCallback((post: FeedPost) => {
    setCPostId(post.id);
    setCInitialCount(post.commentsCount ?? 0);
    setCVisible(true);
  }, []);
  const updateCommentCount = useCallback((count: number) => {
    if (!cPostId) return;
    const apply = (arr: FeedPost[]) => arr.map((p) => (p.id === cPostId ? { ...p, commentsCount: count } : p));
    if (q.trim().length >= 2) setSItems((prev) => apply(prev));
    else setItems((prev) => apply(prev));
  }, [cPostId, q]);

  // Header (Suche/Chips)
  const listHeader = useMemo(() => (
    <View style={styles.stickyHeader}>
      <ErrorBanner text={error} />
      {!searchOpen && q.length === 0 ? (
        <View style={styles.collapsedWrap}>
          <Pressable onPress={() => setSearchOpen(true)} style={styles.fab} hitSlop={8}>
            <Icon name="magnify" size={22} color="#d8eee4" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.top}>
          <View style={styles.searchWrap}>
            <Icon name="magnify" size={20} color="#8fb0a1" />
            <TextInput
              autoFocus
              placeholder="Suchen (Titel, Tags)…"
              placeholderTextColor="#8fb0a1"
              value={q}
              onChangeText={onQueryChange}
              style={styles.search}
              returnKeyType="search"
              onBlur={() => { if (!q.trim()) setSearchOpen(false); }}
            />
            {q.length > 0 ? (
              <Pressable onPress={() => { setQ(''); setSItems([]); setSCursor(null); setSearchOpen(false); }} hitSlop={8}>
                <Icon name="close-circle" size={18} color="#8fb0a1" />
              </Pressable>
            ) : (
              <Pressable onPress={() => setSearchOpen(false)} hitSlop={8}>
                <Icon name="chevron-up" size={20} color="#8fb0a1" />
              </Pressable>
            )}
          </View>

          {tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <Pressable onPress={() => selectTag(null)} style={[styles.chip, !activeTag && styles.chipActive]}>
                <Text style={[styles.chipTxt, !activeTag && styles.chipTxtActive]}>Alle</Text>
              </Pressable>
              {tags.map(({ tag }) => {
                const active = activeTag === tag;
                return (
                  <Pressable key={tag} onPress={() => selectTag(active ? null : tag)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>#{tag}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
      {q.trim().length >= 2 && !searching && sItems.length === 0 && (
        <View style={{ paddingVertical: 28 }}>
          <Text style={{ color: MUTED, textAlign: 'center' }}>Keine Treffer für „{q.trim()}“</Text>
        </View>
      )}
    </View>
  ), [error, searchOpen, q, tags, activeTag, onQueryChange, selectTag, searching, sItems.length]);

  // Overlay-Header UI
  const OverlayHeader = (
    <Animated.View style={[styles.header, { paddingTop: insets.top, transform: [{ translateY: headerTranslateY }] }]}>
      <View style={styles.headerInner}>
        <Text style={styles.hTitle}>Entdecken</Text>
        <Text style={styles.hSub}>Trends, Tags & frische Beiträge</Text>
      </View>
    </Animated.View>
  );

  // Render
  const renderItem = useCallback(({ item }: ListRenderItemInfo<FeedPost>) => {
    const img = normalizeImageUrl(item.mediaUrls?.[0]);
    return (
      <PostCard
        image={img}
        title={item.text}
        likes={item.likesCount ?? 0}
        comments={item.commentsCount ?? 0}
        liked={!!item._liked}
        likeLoading={!!likingIds[item.id]}
        onLike={() => toggleLike(item.id)}
        onComment={() => openComments(item)}
        onPress={() => nav.navigate('Post', { post: item })}  // WICHTIG: in den PostScreen
      />
    );
  }, [likingIds, toggleLike, openComments, nav]);

  const listFooter = useMemo(() => {
    if (searching) return <View style={{ paddingVertical: 24 }}><ActivityIndicator color={ACCENT} /></View>;
    if (loadingMore) return <View style={{ paddingVertical: 24 }}><ActivityIndicator color={ACCENT} /></View>;
    if (q.trim().length < 2 && !cursor) return <View style={{ paddingVertical: 28 }}><Text style={{ color: MUTED, textAlign: 'center' }}>— Ende erreicht —</Text></View>;
    if (q.trim().length >= 2 && !sCursor) return <View style={{ paddingVertical: 28 }}><Text style={{ color: MUTED, textAlign: 'center' }}>— Ende erreicht —</Text></View>;
    return null;
  }, [loadingMore, searching, cursor, sCursor, q]);

  if (initialLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  }

  const data = q.trim().length >= 2 ? sItems : items;

  return (
    <View style={styles.screen}>
      {OverlayHeader}

      <Animated.FlatList
        data={data}
        keyExtractor={(it, i) => it.id ?? String(i)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        contentContainerStyle={{ paddingTop: HEADER_H + 8, paddingBottom: 120, paddingHorizontal: 14 }}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={listFooter}
        showsVerticalScrollIndicator={false}
        onScroll={onListScroll}
        scrollEventThrottle={16}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />

      <CommentsSheet
        visible={cVisible}
        postId={cPostId}
        onClose={() => setCVisible(false)}
        initialCount={cInitialCount}
        onCountChange={updateCommentCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#0f2a1f',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#224434',
    zIndex: 20,
  },
  headerInner: { paddingHorizontal: 16, paddingBottom: 10 },
  hTitle: { color: TEXT, fontSize: 22, fontWeight: '800' },
  hSub: { color: '#9fb7a5', marginTop: 4 },

  stickyHeader: { backgroundColor: BG, paddingBottom: 6 },
  collapsedWrap: { paddingHorizontal: 2, paddingVertical: 8, alignItems: 'flex-start' },
  fab: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)',
  },
  top: { gap: 8, marginBottom: 0 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  search: { flex: 1, color: TEXT, padding: 0 },
  chipsRow: { gap: 8, paddingVertical: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)', marginRight: 8,
  },
  chipActive: { backgroundColor: 'rgba(76,175,80,0.18)', borderColor: 'rgba(168,255,176,0.35)' },
  chipTxt: { color: '#cfe4d6', fontWeight: '700' },
  chipTxtActive: { color: '#A8FFB0' },
});