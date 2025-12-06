// src/features/profile/components/ProfileHeaderCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  profileColors,
  profileSpacing,
  profileRadius,
} from '../theme/profileTheme';
import ProfileStatsRow from './ProfileStatsRow';

type ProfileHeaderCardProps = {
  profile: any;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
};

const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  profile,
  loading,
  error,
  onRefresh,
  onEditProfile,
  onOpenSettings,
}) => {
  const displayName = profile?.displayName ?? 'DEV';
  const handle = profile?.handle ?? '@DEV_ADMIN';
  const city = profile?.city ?? 'Berlin';

  const levelLabel = profile?.levelLabel ?? 'LEVEL 1 · SEEDLING';
  const xpCurrent = profile?.xpCurrent ?? 0;
  const xpNext = profile?.xpNext ?? 500;
  const isVerified = profile?.isVerified ?? true;

  const stats = profile?.stats ?? {
    posts: 0,
    followers: 0,
    following: 0,
  };

  const progressPct =
    xpNext > 0 ? Math.min(1, xpCurrent / xpNext) : 0;

  return (
    <View style={styles.shadowWrap}>
      <BlurView intensity={140} tint="light" style={styles.glassCard}>
        {/* diagonales Sheen-Band */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.85)',
            'rgba(255,255,255,0.25)',
            'rgba(255,255,255,0.0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.4 }}
          style={styles.sheenBand}
        />

        {/* leichte Abdunklung nur für Lesbarkeit */}
        <View style={styles.tintLayer} />

        {/* Soft-Glow unten */}
        <LinearGradient
          colors={[
            'rgba(0,0,0,0)',
            'rgba(129,140,248,0.40)', // indigo
            'rgba(34,197,94,0.45)',   // neon green
          ]}
          start={{ x: 0.1, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={styles.bottomGlow}
        />

        <View style={styles.cardContent}>
          {/* Brand + Actions */}
          <View style={styles.topRow}>
            <View>
              <Text style={styles.appTitle}>GrowGram</Text>
              <Text style={styles.appHandle}>{handle}</Text>
            </View>

            <View style={styles.topActions}>
              <GlassIcon
                icon="refresh"
                onPress={onRefresh}
                disabled={loading}
              />
              <GlassIcon
                icon="share-variant-outline"
                onPress={() => console.log('share profile')}
              />
              <GlassIcon
                icon="cog-outline"
                onPress={onOpenSettings}
              />
            </View>
          </View>

          {/* Identity */}
          <View style={styles.identityRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarGlow} />

              <View style={styles.avatarRingOuter}>
                <View style={styles.avatarRingInner} />
              </View>

              <View style={styles.avatarInner}>
                <MaterialCommunityIcons
                  name="account"
                  size={38}
                  color="#0f172a"
                />
              </View>
            </View>

            <View style={styles.identityText}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName}</Text>
                {isVerified && (
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedText}>18+ VERIFIED</Text>
                  </View>
                )}
              </View>

              <Text style={styles.handleLine}>{handle}</Text>

              <View style={styles.metaRow}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={14}
                  color={profileColors.textSecondary}
                />
                <Text style={styles.metaText}>{city}</Text>
              </View>
            </View>
          </View>

          {/* Level + XP */}
          <View style={styles.levelRow}>
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>
                {levelLabel.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.xpLabel}>
              {xpCurrent} / {xpNext} XP
            </Text>
          </View>

          {/* XP-Bar */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#22c55e', '#38bdf8', '#a855f7']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0.08, progressPct) * 100}%`,
                },
              ]}
            />
          </View>

          {/* Stats */}
          <View style={styles.statsWrap}>
            <ProfileStatsRow
              stats={stats}
              onPressPosts={() => console.log('open posts')}
              onPressFollowers={() => console.log('open followers')}
              onPressFollowing={() => console.log('open following')}
            />
          </View>

          {/* Error */}
          {!loading && error && (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color="#b91c1c"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Edit-Fab */}
          <Pressable
            onPress={onEditProfile}
            style={({ pressed }) => [
              styles.editFab,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <BlurView
              tint="dark"
              intensity={70}
              style={StyleSheet.absoluteFill}
            />
            <MaterialCommunityIcons
              name="pencil"
              size={18}
              color="#f9fafb"
            />
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
};

const GlassIcon = ({
  icon,
  onPress,
  disabled,
}: {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={!!disabled}
    style={({ pressed }) => [
      styles.iconBtn,
      { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
    ]}
  >
    <BlurView tint="dark" intensity={80} style={styles.iconBtnBlur}>
      <MaterialCommunityIcons
        name={icon as any}
        size={18}
        color="#e5f5ff"
      />
    </BlurView>
  </Pressable>
);

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: profileRadius.card,
    marginBottom: profileSpacing.sectionGap,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowOpacity: 1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
  },
  glassCard: {
    borderRadius: profileRadius.card,
    overflow: 'hidden',
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.06)', // HELL, nicht dunkel
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.06)', // nur leichte Abdunklung
  },
  sheenBand: {
    position: 'absolute',
    left: -40,
    top: -30,
    width: '120%',
    height: 140,
    transform: [{ rotate: '-6deg' }],
    opacity: 0.9,
  },
  bottomGlow: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -120,
    height: 230,
    opacity: 0.9,
  },

  cardContent: {
    position: 'relative',
    paddingHorizontal: profileSpacing.lg,
    paddingTop: profileSpacing.md,
    paddingBottom: profileSpacing.lg,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: profileSpacing.md,
  },
  appTitle: {
    color: profileColors.accentStrong,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  appHandle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(15,23,42,0.8)',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  iconBtnBlur: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.7)',
    backgroundColor: 'rgba(15,23,42,0.70)',
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: profileSpacing.md,
  },
  avatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: profileSpacing.md,
  },
  avatarGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(34,197,94,0.30)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  avatarRingOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: profileColors.accentStrong,
    borderRightColor: 'transparent',
    transform: [{ rotate: '-35deg' }],
  },
  avatarRingInner: {
    flex: 1,
  },
  avatarInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(148,163,184,0.9)',
  },

  identityText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  displayName: {
    color: '#020617',
    fontSize: 22,
    fontWeight: '800',
  },
  verifiedPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.9)',
  },
  verifiedText: {
    fontSize: 10,
    color: '#e5e7eb',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  handleLine: {
    fontSize: 13,
    color: 'rgba(15,23,42,0.75)',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: profileColors.textSecondary,
  },

  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: profileRadius.pill,
    backgroundColor: 'rgba(15,23,42,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.75)',
  },
  levelPillText: {
    color: '#e5e7eb',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  xpLabel: {
    marginLeft: 'auto',
    fontSize: 11,
    color: 'rgba(15,23,42,0.80)',
    fontWeight: '500',
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.28)',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  statsWrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#b91c1c',
  },

  editFab: {
    position: 'absolute',
    right: profileSpacing.lg,
    bottom: profileSpacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(248,250,252,0.7)',
    backgroundColor: 'rgba(15,23,42,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProfileHeaderCard;