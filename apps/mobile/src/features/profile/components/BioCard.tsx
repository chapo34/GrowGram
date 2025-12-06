import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

type Props = {
  profile: any;
};

const BioCard: React.FC<Props> = ({ profile }) => {
  const bio =
    profile?.bio ??
    'Willkommen bei GrowGram. Baue dein grünes Netzwerk Schritt für Schritt auf.';

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>ÜBER MICH</Text>

      <Text style={styles.bio} numberOfLines={3}>
        {bio}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.divider} />
        <Pressable
          onPress={() => console.log('Mehr anzeigen')}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={styles.moreText}>Mehr anzeigen ›</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  heading: {
    fontSize: 11,
    letterSpacing: 1.3,
    color: 'rgba(148,163,184,0.95)',
    fontWeight: '700',
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    lineHeight: 19,
    color: '#e5e7eb',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(75,85,99,0.6)',
  },
  moreText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },
});

export default BioCard;