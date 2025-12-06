import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';

export type ProfileTabKey = 'posts' | 'liked' | 'saved';

type Props = {
  active: ProfileTabKey;
  onChange: (tab: ProfileTabKey) => void;
};

const ProfileTabs: React.FC<Props> = ({ active, onChange }) => {
  return (
    <View style={styles.container}>
      <TabItem
        label="Posts"
        isActive={active === 'posts'}
        onPress={() => onChange('posts')}
      />
      <TabItem
        label="Gefällt"
        isActive={active === 'liked'}
        onPress={() => onChange('liked')}
      />
      <TabItem
        label="Gespeichert"
        isActive={active === 'saved'}
        onPress={() => onChange('saved')}
      />
    </View>
  );
};

const TabItem = ({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.tabItem,
      isActive && styles.tabItemActive,
      { opacity: pressed ? 0.7 : 1 },
    ]}
  >
    <Text
      style={[
        styles.tabLabel,
        isActive && styles.tabLabelActive,
      ]}
    >
      {label}
    </Text>
    {isActive && <View style={styles.activeBar} />}
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(31,41,55,1)',
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabItemActive: {
    backgroundColor: 'rgba(6,95,70,0.6)',
  },
  tabLabel: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#e5e7eb',
  },
  activeBar: {
    marginTop: 6,
    height: 2,
    width: 40,
    borderRadius: 999,
    backgroundColor: '#4ade80',
  },
});

export default ProfileTabs;