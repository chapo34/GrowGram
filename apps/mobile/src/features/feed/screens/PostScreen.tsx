import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { MainNav, MainStackParamList } from '@app/navigation/RootNavigator';
import { useTheme } from '@shared/theme/ThemeProvider';
import { getGrowDockSpace } from '@shared/components/dock/GrowDock';
import CommentsSheet from '@shared/components/overlays/CommentsSheet';
import { normalizeImageUrl } from '@shared/utils/img';
import type { FeedPost } from '@shared/lib/apiClient';
import { likePost, unlikePost } from '@shared/lib/apiClient';

type Route = RouteProp<MainStackParamList, 'Post'>;

export default function PostScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<MainNav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const params = route.params;
  const [post, setPost] = useState<FeedPost | null>(params?.post ?? null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);

  const postId = post?.id ?? params?.id ?? null;

  const tags = useMemo(
    () => (post?.tags ?? []).map((t) => String(t)),
    [post?.tags]
  );

  const dockSpace = getGrowDockSpace(insets.bottom);

  if (!postId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text, fontSize: 16 }}>
          Beitrag nicht gefunden.
        </Text>
      </View>
    );
  }

  const handleToggleLike = async () => {
    if (!post || likeBusy) return;

    const previous = post;
    const nextLiked = !post._liked;
    const nextCount =
      (post.likesCount ?? 0) + (nextLiked ? 1 : -1);

    // Optimistisch updaten
    setPost({
      ...post,
      _liked: nextLiked,
      likesCount: Math.max(0, nextCount),
    });

    setLikeBusy(true);
    try {
      if (nextLiked) {
        await likePost(post.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await unlikePost(post.id);
      }
    } catch (e) {
      // Rollback bei Fehler
      setPost(previous);
    } finally {
      setLikeBusy(false);
    }
  };

  const handleOpenComments = () => {
    if (!postId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommentsVisible(true);
  };

  const handleCommentsCountChange = (nextCount: number) => {
    setPost((current) =>
      current ? { ...current, commentsCount: nextCount } : current
    );
  };

  const imageUrl =
    post?.mediaUrls && post.mediaUrls.length > 0
      ? normalizeImageUrl(post.mediaUrls[0])
      : post?.thumbnailUrl
      ? normalizeImageUrl(post.thumbnailUrl)
      : null;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: dockSpace + 24 },
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={colors.text}
            />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text
              numberOfLines={1}
              style={[
                styles.headerTitle,
                { color: colors.text },
              ]}
            >
              {post?.author?.name ?? 'Beitrag'}
            </Text>
            {post?.location ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.headerSubtitle,
                  { color: colors.muted },
                ]}
              >
                {post.location}
              </Text>
            ) : null}
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Bild */}
        {imageUrl && (
          <View style={styles.mediaWrapper}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.media}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        {/* Text */}
        {post?.caption ? (
          <View style={styles.section}>
            <Text
              style={[
                styles.caption,
                { color: colors.text },
              ]}
            >
              {post.caption}
            </Text>
          </View>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: colors.muted },
                  ]}
                >
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleToggleLike}
            disabled={!post || likeBusy}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialCommunityIcons
              name={post?._liked ? 'heart' : 'heart-outline'}
              size={26}
              color={post?._liked ? colors.accent : colors.text}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: colors.text },
              ]}
            >
              {post?.likesCount ?? 0}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenComments}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialCommunityIcons
              name="comment-outline"
              size={26}
              color={colors.text}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: colors.text },
              ]}
            >
              {post?.commentsCount ?? 0}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <CommentsSheet
        visible={commentsVisible}
        postId={postId}
        initialCount={post?.commentsCount ?? 0}
        onClose={() => setCommentsVisible(false)}
        onCountChange={handleCommentsCountChange}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  mediaWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  media: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  section: {
    marginBottom: 16,
  },
  caption: {
    fontSize: 15,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagText: {
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});