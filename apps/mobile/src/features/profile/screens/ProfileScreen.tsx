// src/features/profile/screens/ProfileScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  FlatList,
  Dimensions,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@shared/theme/ThemeProvider';
import {
  api,
  me,
  type FeedPost,
  type UserMe,
} from '@shared/lib/apiClient';
import { normalizeImageUrl } from '@shared/utils/img';

type TabKey = 'public' | 'private';

const PAGE_SIZE = 18;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [user, setUser] = useState<UserMe | null>(null);

  const [tab, setTab] = useState<TabKey>('public');
  const [itemsPublic, setItemsPublic] = useState<FeedPost[]>([]);
  const [cursorPublic, setCursorPublic] = useState<string | null>(null);
  const [itemsPrivate, setItemsPrivate] = useState<FeedPost[]>([]);
  const [cursorPrivate, setCursorPrivate] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isPublic = tab === 'public';
  const items = isPublic ? itemsPublic : itemsPrivate;
  const nextCursor = isPublic ? cursorPublic : cursorPrivate;

  const tileSize = useMemo(() => {
    const pad = 16;
    const gap = 6;
    const cols = 3;
    const width = Dimensions.get('window').width;
    return Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);
  }, []);

  const bioChips = useMemo(() => {
    const raw = (user?.bio || '').replace(/\r/g, '');
    return raw
      .split(/[\n,|]/g)
      .map((s: string) => s.trim())
      .filter((s: string) => Boolean(s))
      .slice(0, 8);
  }, [user?.bio]);

  const profileName = useMemo(() => {
    const parts: string[] = [];
    if (user?.firstName) parts.push(user.firstName);
    if (user?.lastName) parts.push(user.lastName);
    const name = parts.join(' ').trim();
    return name || user?.username || user?.email || 'Profil';
  }, [user]);

  const profileLink = useMemo(() => {
    const id = user?.id || '';
    return `https://growgram.app/u/${id}`;
  }, [user?.id]);

  const fetchPage = useCallback(
    async (visibility: TabKey, cursor?: string | null) => {
      const params: Record<string, any> = {
        limit: PAGE_SIZE,
        visibility,
      };
      if (cursor) params.cursor = cursor;
      const { data } = await api.get('/posts/mine', { params });
      return data as { posts: FeedPost[]; nextCursor: string | null };
    },
    []
  );

  const boot = useCallback(async () => {
    setLoading(true);
    try {
      const u = await me();
      setUser(u);

      const [{ posts: pPub, nextCursor: cPub }, { posts: pPriv, nextCursor: cPriv }] =
        await Promise.all([
          fetchPage('public'),
          fetchPage('private'),
        ]);

      setItemsPublic(pPub || []);
      setCursorPublic(cPub || null);
      setItemsPrivate(pPriv || []);
      setCursorPrivate(cPriv || null);
    } catch (e: any) {
      console.log('profile boot failed', e?.message || e);
      Alert.alert('Fehler', 'Profil konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { posts, nextCursor } = await fetchPage(tab);
      if (tab === 'public') {
        setItemsPublic(posts || []);
        setCursorPublic(nextCursor || null);
      } else {
        setItemsPrivate(posts || []);
        setCursorPrivate(nextCursor || null);
      }
      const u = await me();
      setUser(u);
    } catch (e: any) {
      console.log('refresh failed', e?.message || e);
    } finally {
      setRefreshing(false);
    }
  }, [tab, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts, nextCursor: nx } = await fetchPage(tab, nextCursor);
      if (tab === 'public') {
        setItemsPublic((prev) => [...prev, ...(posts || [])]);
        setCursorPublic(nx || null);
      } else {
        setItemsPrivate((prev) => [...prev, ...(posts || [])]);
        setCursorPrivate(nx || null);
      }
    } catch (e: any) {
      console.log('loadMore failed', e?.message || e);
    } finally {
      setLoadingMore(false);
    }
  }, [tab, nextCursor, loadingMore, fetchPage]);

  const onPressPost = useCallback(
    (post: FeedPost) => {
      Haptics.selectionAsync().catch(() => {});
      navigation.navigate('Post', { post });
    },
    [navigation]
  );

  const renderPost = useCallback(
    ({ item }: { item: FeedPost }) => {
      const uri =
        item.mediaUrls && item.mediaUrls.length > 0
          ? normalizeImageUrl(item.mediaUrls[0])
          : item.thumbnailUrl
          ? normalizeImageUrl(item.thumbnailUrl)
          : null;

      return (
        <Pressable
          onPress={() => onPressPost(item)}
          style={({ pressed }) => [
            styles.tile,
            { width: tileSize, height: tileSize },
            pressed && { opacity: 0.8 },
          ]}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.tileImg}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <View style={styles.tilePlaceholder}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Kein Bild</Text>
            </View>
          )}
        </Pressable>
      );
    },
    [onPressPost, tileSize, colors.muted]
  );

  const keyPost = useCallback((p: FeedPost) => p.id, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profil</Text>
      </View>

      {/* User-Info */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {user?.avatarUrl ? (
              <Image
                source={{ uri: normalizeImageUrl(user.avatarUrl, Date.now()) }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackTxt}>
                  {(user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {profileName}
            </Text>
            {user?.city ? (
              <Text style={[styles.sub, { color: colors.muted }]} numberOfLines={1}>
                {user.city}
              </Text>
            ) : null}
            <Text style={[styles.link, { color: colors.muted }]} numberOfLines={1}>
              {profileLink}
            </Text>
          </View>
        </View>

        {/* Bio-Chips */}
        {bioChips.length > 0 && (
          <View style={styles.chipsRow}>
            {bioChips.map((label: string, i: number) => (
              <View key={`${label}-${i}`} style={[styles.chip, { borderColor: colors.borderSubtle }]}>
                <Text style={[styles.chipTxt, { color: colors.muted }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setTab('public')}
            style={[
              styles.tabBtn,
              isPublic && { borderBottomColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.tabTxt,
                { color: isPublic ? colors.accent : colors.muted },
              ]}
            >
              Öffentlich
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('private')}
            style={[
              styles.tabBtn,
              !isPublic && { borderBottomColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.tabTxt,
                { color: !isPublic ? colors.accent : colors.muted },
              ]}
            >
              Privat
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={items}
        keyExtractor={keyPost}
        numColumns={3}
        renderItem={renderPost}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16 + insets.bottom,
          rowGap: 6,
          columnGap: 6,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40 }}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              Noch keine Beiträge in diesem Bereich.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {},
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#133625',
  },
  avatarFallbackTxt: {
    color: '#b6ffc3',
    fontWeight: '900',
    fontSize: 24,
  },
  name: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  link: { fontSize: 12, marginTop: 4 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTxt: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabTxt: {
    fontSize: 14,
    fontWeight: '700',
  },
  tile: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#07150f',
  },
  tileImg: {
    width: '100%',
    height: '100%',
  },
  tilePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});