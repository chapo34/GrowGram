// src/components/SwipeableRow.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

const GREEN_GRAD  = ['#4CAF50', '#66E08E'] as const;
const ORANGE_GRAD = ['#FFA726', '#FFC46B'] as const;
const RED_GRAD    = ['#FF6B6B', '#FF8A8A'] as const;

type Props = {
  children: React.ReactNode;
  archived?: boolean;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onDelete?: () => void;
  height?: number; // zeilenhöhe (default 80)
};

const SwipeableRow = memo(({ children, archived, onArchive, onUnarchive, onDelete, height = 80 }: Props) => {
  const renderLeft = () => (
    <View style={[styles.side, { justifyContent: 'center' }]}>
      <LinearGradient
        colors={archived ? GREEN_GRAD : ORANGE_GRAD}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.action, { width: 140, height }]}
      >
        <Text style={styles.text}>{archived ? 'Wiederherstellen' : 'Archivieren'}</Text>
      </LinearGradient>
    </View>
  );
  const renderRight = () => (
    <View style={[styles.side, { alignItems: 'flex-end', justifyContent: 'center' }]}>
      <LinearGradient
        colors={RED_GRAD}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.action, { width: 120, height }]}
      >
        <Text style={styles.text}>Löschen</Text>
      </LinearGradient>
    </View>
  );

  return (
    <Swipeable
      renderLeftActions={renderLeft}
      renderRightActions={renderRight}
      overshootFriction={8}
      onSwipeableOpen={(dir) => {
        if (dir === 'left') { (archived ? onUnarchive : onArchive)?.(); }
        if (dir === 'right') { onDelete?.(); }
      }}
    >
      {children}
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  side: { flex: 1 },
  action: { borderRadius: 18, marginHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#0c1a10', fontWeight: '900' },
});

export default SwipeableRow;