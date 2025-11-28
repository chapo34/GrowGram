import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { normalizeImageUrl } from '@shared/utils/img';
type Props = {
  image?: string;
  title?: string;
  likes?: number;
  comments?: number;
  liked?: boolean;
  saved?: boolean;
  likeLoading?: boolean;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onSave?: () => void;
  onShare?: () => void;
};

function PostCard({
  image, title, likes = 0, comments = 0,
  liked, saved, likeLoading,
  onPress, onLike, onComment, onSave, onShare,
}: Props) {
  const src = image ? normalizeImageUrl(image) : undefined;

  const shareNow = async () => {
    if (onShare) return onShare();
    try {
      await Share.share({ message: title || 'GrowGram', url: src });
    } catch {}
  };

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {src ? (
        <Image
          source={{ uri: src }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}

      <View style={styles.overlay}>
        {!!title && <Text numberOfLines={2} style={styles.title}>{title}</Text>}

        <View style={styles.actions}>
          <Pressable
            hitSlop={8}
            onPress={onLike}
            disabled={!!likeLoading}
            style={[styles.pill, likeLoading && { opacity: 0.6 }]}
          >
            <Icon name={liked ? 'heart' : 'heart-outline'} size={18} color="#FF6B81" />
            <Text style={styles.pillTxt}>{likes}</Text>
          </Pressable>

          <Pressable hitSlop={8} onPress={onComment} style={styles.pill}>
            <Icon name="comment-outline" size={18} color="#D6E5DB" />
            <Text style={styles.pillTxt}>{comments}</Text>
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable hitSlop={8} onPress={onSave} style={styles.iconBtn}>
            <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color="#D6E5DB" />
          </Pressable>

          <Pressable hitSlop={8} onPress={shareNow} style={styles.iconBtn}>
            <Icon name="share-variant" size={20} color="#D6E5DB" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(PostCard);

const R = 16;
const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: R,
    overflow: 'hidden',
    backgroundColor: '#0f2a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    elevation: 2,
  },
  image: { width: '100%', height: 230, backgroundColor: 'rgba(255,255,255,0.04)' },
  imageFallback: { backgroundColor: 'rgba(255,255,255,0.05)' },
  overlay: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  title: { color: '#E6FAEC', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillTxt: { color: '#fff', fontWeight: '700' },
});