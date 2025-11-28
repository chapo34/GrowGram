import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import type { Comment } from '@shared/lib/apiClient';

export type Props = {
  visible: boolean;
  postId: string;
  initialCount: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

const CommentsSheet: React.FC<Props> = ({
  visible,
  postId,
  initialCount,
  onClose,
  onCountChange,
}) => {
  // Für jetzt: statische leere Liste – API-Anbindung später
  const [comments] = React.useState<Comment[]>([]);

  React.useEffect(() => {
    onCountChange?.(comments.length || initialCount);
  }, [comments.length, initialCount, onCountChange]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Kommentare</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Fertig</Text>
            </Pressable>
          </View>

          {comments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Noch keine Kommentare.</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Text style={styles.commentAuthor}>
                    {item.author?.name ?? 'User'}
                  </Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              )}
            />
          )}
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
    maxHeight: '75%',
    backgroundColor: '#02050A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  handle: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#333',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#E5FBEA',
    fontWeight: '600',
    fontSize: 16,
  },
  close: {
    color: '#9FB4A5',
    fontSize: 14,
  },
  empty: {
    padding: 16,
  },
  emptyText: {
    color: '#9FB4A5',
    textAlign: 'center',
  },
  commentRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentAuthor: {
    color: '#E5FBEA',
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    color: '#C5D3C9',
  },
});

export default CommentsSheet;