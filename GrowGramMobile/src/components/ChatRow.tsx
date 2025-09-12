// src/components/ChatRow.tsx
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Chat } from '../utils/api';
import { useTheme } from '../theme/ThemeProvider';

/* kleine Helper */
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
function toDate(ts: any): Date {
  if (!ts) return new Date(NaN);
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
  if (typeof ts === 'number') return new Date(ts);
  const d = new Date(String(ts));
  return Number.isNaN(d.getTime()) ? new Date(NaN) : d;
}
function dateKey(d: Date) {
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function timeShort(dLike: any) {
  const d = toDate(dLike);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (dateKey(d) === dateKey(now)) {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return d.toLocaleDateString();
}

export type ChatRowProps = {
  item: Chat;
  selfId: string;
  pinned?: boolean;
  onPress: (c: Chat) => void;
  onLong?: (c: Chat) => void;
};

const ChatRow = memo(function ChatRow({
  item, selfId, pinned, onPress, onLong,
}: ChatRowProps) {
  const { colors } = useTheme();
  const unread = (item.unread && selfId && Number(item.unread[selfId])) || 0;
  const last = (item.lastMessage || '').trim() || 'Neue Unterhaltung';
  const when = timeShort(item.updatedAt);

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLong?.(item)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.86 },
      ]}
    >
      <View style={styles.avatarWrap}>
        {item.peer?.avatarUrl ? (
          <Image
            source={{ uri: safeUrl(item.peer.avatarUrl, 120) }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#133625', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#b6ffc3', fontWeight: '900' }}>
              {(item.peer?.firstName?.[0] || item.peer?.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}
        {pinned ? (
          <View style={[styles.pinDot, { backgroundColor: colors.accent, borderColor: colors.card }]}>
            <Text style={{ color: colors.accentFg, fontSize: 10 }}>📌</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {item.peer?.username || [item.peer?.firstName, item.peer?.lastName].filter(Boolean).join(' ') || 'Unbekannt'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
          {last}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[styles.time, { color: colors.muted }]}>{when || ' '}</Text>
        {unread > 0 && (
          <View style={[styles.unread, { backgroundColor: colors.accent }]}>
            <Text style={[styles.unreadTxt, { color: colors.accentFg }]}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

export default ChatRow;

const AVA = 48;
const styles = StyleSheet.create({
  row: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: AVA, height: AVA, borderRadius: 12 },
  pinDot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 2,
  },
  title: { fontWeight: '900', fontSize: 16 },
  subtitle: { marginTop: 2 },
  time: { fontSize: 12 },
  unread: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadTxt: { fontWeight: '900', fontSize: 12 },
});