// src/features/profile/components/StatsGlassCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@core/theme/ThemeProvider';

type Stats = {
  posts: number;
  followers: number;
  following: number;
};

type Props = {
  stats: Stats;
};

const formatCount = (num: number) =>
  Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);

const StatsGlassCard: React.FC<Props> = ({ stats }) => {
  const { colors } = useTheme();

  return (
    <BlurView
      intensity={30}
      tint="dark"
      style={[
        styles.card,
        {
          borderColor: 'rgba(190,255,210,0.28)',
          backgroundColor: 'rgba(5, 18, 11, 0.96)',
        },
      ]}
    >
      <View style={styles.row}>
        <Stat
          label="Posts"
          value={stats.posts}
          color={colors.text}
          muted={colors.muted}
        />
        <View style={styles.divider} />
        <Stat
          label="Follower"
          value={stats.followers}
          color={colors.text}
          muted={colors.muted}
        />
        <View style={styles.divider} />
        <Stat
          label="Folgt"
          value={stats.following}
          color={colors.text}
          muted={colors.muted}
        />
      </View>
    </BlurView>
  );
};

type StatProps = {
  label: string;
  value: number;
  color: string;
  muted: string;
};

const Stat: React.FC<StatProps> = ({
  label,
  value,
  color,
  muted,
}) => (
  <View style={styles.stat}>
    <Text
      style={[
        styles.value,
        { color },
      ]}
    >
      {formatCount(value)}
    </Text>
    <Text
      style={[
        styles.label,
        { color: muted },
      ]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(190,255,210,0.18)',
  },
});

export default StatsGlassCard;