import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const EXTRA = (Constants.expoConfig?.extra ?? {}) as any;

const API_BASE: string =
  (EXTRA.EXPO_PUBLIC_API_BASE as string) ||
  (EXTRA.API_BASE_URL as string) ||
  'https://europe-west3-growgram-backend.cloudfunctions.net/api';

const STORAGE_KEY = '@gg_waitlist_ticket';

type JoinPayload = {
  name: string;
  email: string;
  country?: string;
  discord?: string;
  consent: boolean;
};

export async function joinWaitlist(payload: JoinPayload): Promise<{
  publicId?: string;
  viewerToken?: string;
}> {
  const res = await fetch(`${API_BASE}/waitlist/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message || 'Fehler beim Beitreten der Warteliste.');
  }

  if (json?.publicId || json?.viewerToken) {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        publicId: json.publicId,
        viewerToken: json.viewerToken,
      }),
    );
  }

  return {
    publicId: json?.publicId,
    viewerToken: json?.viewerToken,
  };
}

export async function hasTicket(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  return !!stored;
}