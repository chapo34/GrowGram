import React from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';

type Props = {
  tags: string[];
};

const InterestsRow: React.FC<Props> = ({ tags }) => {
  if (!tags || tags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {tags.map((tag) => (
        <Pressable
          key={tag}
          style={({ pressed }) => [
            styles.chip,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={styles.chipText}>{tag}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.7)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 10,
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  chipText: {
    fontSize: 13,
    color: '#e5e7eb',
    fontWeight: '600',
  },
});

export default InterestsRow;