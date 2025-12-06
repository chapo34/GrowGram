// src/features/profile/components/ProfileStatsRow.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { profileColors } from '../theme/profileTheme';

export type ProfileStats = {
  posts: number;
  followers: number;
  following: number;
};

type ProfileStatsRowProps = {
  stats: ProfileStats;
  onPressPosts: () => void;
  onPressFollowers: () => void;
  onPressFollowing: () => void;
};

const ProfileStatsRow: React.FC<ProfileStatsRowProps> = ({
  stats,
  onPressPosts,
  onPressFollowers,
  onPressFollowing,
}) => {
  return (
    <View style={styles.container}>
      <StatItem
        label="POSTS"
        value={stats.posts}
        onPress={onPressPosts}
      />
      <View style={styles.divider} />
      <StatItem
        label="FOLLOWER"
        value={stats.followers}
        onPress={onPressFollowers}
      />
      <View style={styles.divider} />
      <StatItem
        label="FOLGT"
        value={stats.following}
        onPress={onPressFollowing}
      />
    </View>
  );
};

const StatItem = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress: () => void;
}) => (
  <Pressable
    style={styles.item}
    onPress={onPress}
  >
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: profileColors.textPrimary,
    marginBottom: 2,
    textShadowColor: 'rgba(0,255,135,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(229,231,235,0.6)',
  },
  divider: {
    width: 1,
    marginVertical: 4,
    backgroundColor: 'rgba(148,163,184,0.4)',
  },
});

export default ProfileStatsRow;