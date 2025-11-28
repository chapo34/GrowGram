// src/shared/config/api.ts
import Constants from 'expo-constants';

function trimSlash(s?: string | null) {
  const t = String(s || '').trim();
  return t.endsWith('/') ? t.slice(0, -1) : t;
}

export const API_BASE: string =
  trimSlash(process.env.EXPO_PUBLIC_API_BASE as string) ||
  trimSlash(
    ((Constants.expoConfig?.extra as any)?.API_BASE_URL as string) ||
      ((Constants.manifest2 as any)?.extra?.API_BASE_URL as string)
  ) ||
  'https://europe-west3-growgram-backend.cloudfunctions.net/api';