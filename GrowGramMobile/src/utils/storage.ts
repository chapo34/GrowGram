import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKeyPinned = (uid: string) => `GG_PINNED_CHATS_${uid}`;

export async function getPinnedChats(uid: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(storageKeyPinned(uid));
    return new Set((raw ? JSON.parse(raw) : []) as string[]);
  } catch {
    return new Set();
  }
}

export async function setPinnedChats(uid: string, pinned: Set<string>) {
  try {
    await AsyncStorage.setItem(storageKeyPinned(uid), JSON.stringify([...pinned]));
  } catch (e) {
    console.error('Failed to save pinned chats:', e);
  }
}