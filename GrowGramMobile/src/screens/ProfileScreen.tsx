// src/screens/ProfileScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Dimensions, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator, Platform, ActionSheetIOS, Alert, Share,
  Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

// optionale, aber empfohlene Pakete (mit Fallbacks):
let Clipboard: typeof import('expo-clipboard') | null = null;
try { Clipboard = require('expo-clipboard'); } catch {}
let QRCode: any = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch {}

import {
  api, me, type FeedPost, type UserMe,
  setPostVisibility, deletePost,
} from '../utils/api';
import SettingsSheet from '../components/SettingsSheet';

const BG = '#0b1f14';
const CARD = '#0f2219';
const ACCENT = '#4CAF50';
const BORDER = '#1e3a2d';
const TEXT = '#E6EAEF';
const MUTED = '#9fb7a5';

type TabKey = 'public' | 'private';
const PAGE_SIZE = 18;

export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<UserMe | null>(null);
  const [avatarBust, setAvatarBust] = useState<number>(Date.now());
  const [tab, setTab] = useState<TabKey>('public');

  const [itemsPublic, setItemsPublic] = useState<FeedPost[]>([]);
  const [cursorPublic, setCursorPublic] = useState<string | null>(null);
  const [itemsPrivate, setItemsPrivate] = useState<FeedPost[]>([]);
  const [cursorPrivate, setCursorPrivate] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isPublic = tab === 'public';
  const items = isPublic ? itemsPublic : itemsPrivate;
  const nextCursor = isPublic ? cursorPublic : cursorPrivate;

  const tileSize = useMemo(() => {
    const pad = 16, gap = 6, cols = 3;
    const width = Dimensions.get('window').width;
    return Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);
  }, []);

  const profileLink = useMemo(() => {
    const id = user?.id || '';
    return `https://growgram.app/u/${id}`;
  }, [user?.id]);

  const bioChips = useMemo(() => {
    const raw = (user?.bio || '').replace(/\r/g, '');
    return raw
      .split(/[\n,|]/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  }, [user?.bio]);

  // ---- helpers
  const normalizeImg = (u?: string | null, width = 480) => {
    if (!u) return '';
    try {
      const url = new URL(u);
      if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
      if (!url.searchParams.get('w'))  url.searchParams.set('w', String(width));
      url.searchParams.set('q', '85');
      url.searchParams.set('t', String(avatarBust)); // Cache-Buster
      return url.toString();
    } catch {
      const sep = u.includes('?') ? '&' : '?';
      return `${u}${sep}t=${avatarBust}`;
    }
  };

  const fetchPage = useCallback(
    async (visibility: TabKey, cursor?: string | null) => {
      const params: any = { limit: PAGE_SIZE, visibility };
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
      const [{ posts: p1, nextCursor: c1 }, { posts: p2, nextCursor: c2 }] = await Promise.all([
        fetchPage('public'),
        fetchPage('private'),
      ]);
      setItemsPublic(p1 || []);
      setCursorPublic(c1 || null);
      setItemsPrivate(p2 || []);
      setCursorPrivate(c2 || null);
      setAvatarBust(Date.now());
    } catch (e) {
      console.log('profile boot failed', e);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { boot(); }, [boot]);
  useFocusEffect(useCallback(() => { boot(); return () => {}; }, [boot]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { posts, nextCursor } = await fetchPage(tab);
      if (tab === 'public') { setItemsPublic(posts || []); setCursorPublic(nextCursor || null); }
      else { setItemsPrivate(posts || []); setCursorPrivate(nextCursor || null); }
      const u = await me(); setUser(u); setAvatarBust(Date.now());
    } catch (e) {
      console.log('refresh failed', e);
    } finally { setRefreshing(false); }
  }, [tab, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { posts, nextCursor: nx } = await fetchPage(tab, nextCursor);
      if (tab === 'public') { setItemsPublic((prev) => [...prev, ...(posts || [])]); setCursorPublic(nx || null); }
      else { setItemsPrivate((prev) => [...prev, ...(posts || [])]); setCursorPrivate(nx || null); }
    } catch (e) { console.log('loadMore failed', e); }
    finally { setLoadingMore(false); }
  }, [tab, nextCursor, loadingMore, fetchPage]);

  const copyLink = useCallback(async () => {
    try {
      if (Clipboard?.setStringAsync) await Clipboard.setStringAsync(profileLink);
      else await Share.share({ message: profileLink });
      Haptics.selectionAsync();
      Alert.alert('Kopiert', 'Profil-Link wurde kopiert.');
    } catch {}
  }, [profileLink]);

  const onShareProfile = useCallback(async () => {
    try { await Share.share({ message: `Mein GrowGram-Profil 🌿\n${profileLink}` }); } catch {}
  }, [profileLink]);

  const onEdit = useCallback(() => { Haptics.selectionAsync(); nav.navigate('ProfileSetup'); }, [nav]);

  const onOpenPost = useCallback((p: FeedPost) => { nav.navigate('Post', { id: p.id }); }, [nav]);

  const onPostMenu = useCallback((p: FeedPost) => {
    const isPriv = (p.visibility || 'public') === 'private';
    const toggleLabel = isPriv ? 'Als öffentlich markieren' : 'Als privat markieren';

    const doToggle = async () => {
      const next = isPriv ? 'public' : 'private';
      try {
        Haptics.selectionAsync();
        if (tab === 'public') { setItemsPublic((prev) => prev.filter((x) => x.id !== p.id)); setItemsPrivate((prev) => [{ ...p, visibility: next }, ...prev]); }
        else { setItemsPrivate((prev) => prev.filter((x) => x.id !== p.id)); setItemsPublic((prev) => [{ ...p, visibility: next }, ...prev]); }
        await setPostVisibility(p.id, next as 'public' | 'private');
      } catch (e: any) {
        Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Sichtbarkeit nicht ändern.');
        onRefresh();
      }
    };

    const doDelete = async () => {
      Alert.alert('Löschen?', 'Dieser Beitrag wird dauerhaft gelöscht.', [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen', style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await deletePost(p.id);
              setItemsPublic((prev) => prev.filter((x) => x.id !== p.id));
              setItemsPrivate((prev) => prev.filter((x) => x.id !== p.id));
            } catch (e: any) {
              Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Beitrag nicht löschen.');
            }
          }
        }
      ]);
    };

    const doCopy = async () => { try { await Share.share({ message: `${profileLink}?post=${p.id}` }); } catch {} };

    const options = [toggleLabel, 'Beitrag löschen', 'Link teilen', 'Abbrechen'];
    const destructiveButtonIndex = 1, cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex, cancelButtonIndex },
        (i) => { if (i === 0) doToggle(); if (i === 1) doDelete(); if (i === 2) doCopy(); }
      );
    } else {
      Alert.alert('Aktion', '', [
        { text: toggleLabel, onPress: doToggle },
        { text: 'Beitrag löschen', style: 'destructive', onPress: doDelete },
        { text: 'Link teilen', onPress: doCopy },
        { text: 'Abbrechen', style: 'cancel' },
      ]);
    }
  }, [tab, profileLink, onRefresh]);

  /* ---------- Header ---------- */
  const Header = () => {
    const initials =
      (user?.firstName?.[0] || user?.username?.[0] || user?.email?.[0] || 'U').toUpperCase() +
      (user?.lastName?.[0] || '');

    const countPosts = itemsPublic.length;
    const likes = (itemsPublic || []).reduce((acc, p) => acc + (p.likesCount || 0), 0);
    const countPriv = itemsPrivate.length;
    const avatar = normalizeImg(user?.avatarUrl);

    return (
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 6, paddingBottom: 12, backgroundColor: BG }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.gear}><Text style={{ fontSize: 16 }}>⚙︎</Text></Pressable>
          <Pressable onPress={() => setQrOpen(true)} style={styles.qrIcon}><Text style={{ fontSize: 16 }}>▣</Text></Pressable>
        </View>

        {/* Avatar / Name */}
        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <Pressable onPress={onEdit} onLongPress={() => setQrOpen(true)} style={styles.avatarRing}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 140, height: 140, borderRadius: 120 }} contentFit="cover" cachePolicy="none" />
            ) : (
              <Text style={{ color: '#b6ffc3', fontWeight: '900', fontSize: 36 }}>{initials}</Text>
            )}
            <View style={styles.avatarBadge}><Text style={styles.avatarBadgeTxt}>✎</Text></View>
          </Pressable>

          <Text style={styles.name}>
            {user?.firstName || user?.username || (user?.email ? user.email.split('@')[0] : 'Profil')}
          </Text>
          {!!user?.username && (
            <Text style={styles.handle}>@{user.username}{!!user?.city && <Text style={styles.city}>  •  📍 {user.city}</Text>}</Text>
          )}
        </View>

        {/* Bio chips */}
        {bioChips.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {bioChips.map((label, i) => (
              <View key={`${label}-${i}`} style={styles.chip}><Text style={styles.chipTxt}>{label}</Text></View>
            ))}
          </ScrollView>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNum}>{countPosts}</Text><Text style={styles.statLbl}>Beiträge</Text></View>
          <View style={styles.statCard}><Text style={styles.statNum}>{likes}</Text><Text style={styles.statLbl}>Likes</Text></View>
          <View style={styles.statCard}><Text style={styles.statNum}>{countPriv}</Text><Text style={styles.statLbl}>Privat</Text></View>
        </View>

        {/* Tabs */}
        <View style={styles.segment}>
          <Pressable onPress={() => setTab('public')} style={[styles.segBtn, tab === 'public' && styles.segActive]}>
            <Text style={[styles.segTxt, tab === 'public' && styles.segTxtActive]}>Beiträge</Text>
          </Pressable>
          <Pressable onPress={() => setTab('private')} style={[styles.segBtn, tab === 'private' && styles.segActive]}>
            <Text style={[styles.segTxt, tab === 'private' && styles.segTxtActive]}>Privat</Text>
          </Pressable>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable onPress={onShareProfile} style={styles.actionBtn}><Text style={styles.actionTxt}>Teilen</Text></Pressable>
          <Pressable onPress={() => setQrOpen(true)} style={styles.actionBtn}><Text style={styles.actionTxt}>QR zeigen</Text></Pressable>
          <Pressable onPress={copyLink} style={styles.actionBtn}><Text style={styles.actionTxt}>Link kopieren</Text></Pressable>
        </View>
      </View>
    );
  };

  const Empty = () => (
    <View style={{ paddingTop: 40, paddingBottom: 80, alignItems: 'center' }}>
      <Text style={{ color: TEXT, fontWeight: '900', fontSize: 20 }}>Noch keine Beiträge</Text>
      <Text style={{ color: MUTED, marginTop: 6 }}>Lade ein Foto hoch und leg los ✨</Text>
      <Pressable onPress={() => nav.navigate('PostCreate')} style={[styles.cta]}><Text style={styles.ctaTxt}>Neuen Post erstellen</Text></Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: FeedPost }) => {
    const uri = (item.mediaUrls && item.mediaUrls[0]) || undefined;
    const isPriv = (item.visibility || 'public') === 'private';
    return (
      <Pressable
        onPress={() => onOpenPost(item)}
        onLongPress={() => onPostMenu(item)}
        style={{ width: tileSize, height: tileSize, marginRight: 6, marginBottom: 6, borderRadius: 10, overflow: 'hidden', backgroundColor: '#0f2219' }}
      >
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <View style={{ flex: 1, backgroundColor: '#123325' }} />}
        {isPriv && <View style={styles.lockBadge}><Text style={{ color: '#c3ffd1', fontSize: 11 }}>🔒 privat</Text></View>}
      </Pressable>
    );
  };

  if (loading) {
    return (<View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={ACCENT} /></View>);
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        numColumns={3}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={<Empty />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl tintColor={ACCENT} refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.2}
        onEndReached={loadMore}
        ListFooterComponent={loadingMore ? <View style={{ paddingVertical: 16 }}><ActivityIndicator color={ACCENT} /></View> : null}
      />

      {/* Settings Bottom Sheet */}
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} profileLink={profileLink} />

      {/* QR-Sheet */}
      <Modal visible={qrOpen} transparent animationType="slide" onRequestClose={() => setQrOpen(false)}>
        <View style={styles.qrBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setQrOpen(false)} />
          <View style={[styles.qrSheet, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={styles.qrTitle}>Profil-QR</Text>
            <View style={styles.qrBox}>
              {QRCode ? (
                <QRCode value={profileLink} size={220} backgroundColor="transparent" color="#E6EAEF" />
              ) : (
                <Text style={{ color: TEXT, textAlign: 'center' }}>
                  QR-Modul nicht installiert.{'\n'}Nutze „Link kopieren“ oder „Teilen“.
                </Text>
              )}
            </View>
            <Text style={styles.qrLink} numberOfLines={1}>{profileLink}</Text>
            <View style={styles.actionsRow}>
              <Pressable onPress={onShareProfile} style={styles.actionBtn}><Text style={styles.actionTxt}>Teilen</Text></Pressable>
              <Pressable onPress={copyLink} style={styles.actionBtn}><Text style={styles.actionTxt}>Kopieren</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ======= styles ======= */
const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  qrIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },

  avatarRing: {
    width: 140, height: 140, borderRadius: 120, alignItems: 'center', justifyContent: 'center',
    borderWidth: 6, borderColor: 'rgba(168,255,176,0.25)', backgroundColor: '#0f2219', marginTop: 8,
  },
  avatarBadge: {
    position: 'absolute', right: 6, bottom: 6,
    backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
  },
  avatarBadgeTxt: { color: '#0c1a10', fontWeight: '900', fontSize: 12 },

  name: { color: TEXT, fontWeight: '900', fontSize: 28, textAlign: 'center', marginTop: 10 },
  handle: { color: '#cfe4d6', textAlign: 'center', marginTop: 4 },
  city: { color: '#A8FFB0', fontWeight: '800' },

  chipsRow: { paddingTop: 10, alignItems: 'center' },
  chip: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginRight: 8 },
  chipTxt: { color: '#E6EAEF', fontWeight: '700' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 8, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12, alignItems: 'center',
  },
  statNum: { color: TEXT, fontWeight: '900', fontSize: 20 },
  statLbl: { color: MUTED, marginTop: 2 },

  segment: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 4, flexDirection: 'row', gap: 6 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  segActive: { backgroundColor: 'rgba(76,175,80,0.22)' },
  segTxt: { color: '#cfe4d6', fontWeight: '700' },
  segTxtActive: { color: '#A8FFB0' },

  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 12 },
  actionBtn: { backgroundColor: 'rgba(76,175,80,0.18)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  actionTxt: { color: '#b6ffc3', fontWeight: '800' },

  lockBadge: { position: 'absolute', right: 6, top: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },

  cta: { marginTop: 14, backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  ctaTxt: { color: '#0c1a10', fontWeight: '900' },

  // QR Sheet
  qrBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  qrSheet: {
    backgroundColor: BG, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 16, paddingTop: 10,
  },
  qrTitle: { color: TEXT, fontWeight: '900', fontSize: 18, textAlign: 'center', marginBottom: 10 },
  qrBox: { alignSelf: 'center', padding: 16, borderRadius: 16, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  qrLink: { color: MUTED, textAlign: 'center', marginTop: 8 },
});