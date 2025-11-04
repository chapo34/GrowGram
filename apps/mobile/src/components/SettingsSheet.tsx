// src/components/SettingsSheet.tsx
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
type Props = {
  visible: boolean;
  onClose: () => void;
  profileLink: string;
  // other props...
};
const ACCENTS = ['#4CAF50', '#2E7D32', '#43A047', '#00C853', '#8BC34A'];

export default function SettingsSheet({ visible, onClose }: Props) {
  const { colors, pref, setPref, accent, setAccent } = useTheme();

  const ModeBtn = ({ m, label }: { m: 'light'|'dark'|'system'; label: string }) => {
    const active = (pref === m);
    return (
      <Pressable
        onPress={() => setPref(m)}
        style={[styles.pill, { borderColor: active ? colors.accent : 'rgba(255,255,255,0.12)' }]}
      >
        <Text style={{ color: active ? colors.accent : colors.muted, fontWeight: '800' }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'} statusBarTranslucent>
      <View style={styles.bg}>
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.text }]}>Einstellungen</Text>

          <Text style={[styles.section, { color: colors.muted }]}>Darstellung</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ModeBtn m="light" label="Hell" />
            <ModeBtn m="dark" label="Dunkel" />
            <ModeBtn m="system" label="System" />
          </View>

          <Text style={[styles.section, { color: colors.muted, marginTop: 14 }]}>Akzentfarbe</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {ACCENTS.map((hex) => {
              const active = accent.toLowerCase() === hex.toLowerCase();
              return (
                <Pressable key={hex} onPress={() => setAccent(hex)} style={[styles.dot, { backgroundColor: hex, borderColor: active ? colors.text : 'transparent' }]} />
              );
            })}
          </View>

          <Pressable onPress={onClose} style={{ alignSelf: 'flex-end', marginTop: 16 }}>
            <Text style={{ color: colors.muted, fontWeight: '800' }}>Schließen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: { padding: 16, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 10 },
  section: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  dot: { width: 28, height: 28, borderRadius: 16, borderWidth: 2 },
});