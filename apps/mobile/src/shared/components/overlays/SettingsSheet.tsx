// src/shared/components/overlays/SettingsSheet.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
};

const SettingsSheet: React.FC<Props> = ({ visible, onClose, onLogout }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Einstellungen</Text>

          <Pressable style={styles.item} onPress={onLogout}>
            <Text style={styles.itemDanger}>Abmelden</Text>
          </Pressable>

          <Pressable style={[styles.item, styles.lastItem]} onPress={onClose}>
            <Text style={styles.itemText}>Schließen</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#07130c',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    color: '#e6f5ec',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#133625',
  },
  lastItem: { borderBottomWidth: 0 },
  itemText: { color: '#b6ffc3', fontWeight: '600' },
  itemDanger: { color: '#ff8c8c', fontWeight: '700' },
});

export default SettingsSheet;