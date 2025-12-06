// src/features/profile/utils/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, STORAGE_KEYS } from '@shared/lib/apiClient';

// --------------------------------------------------
// DTOs
// --------------------------------------------------

export type ProfileStatsDto = {
  posts: number;
  followers: number;
  following: number;
};

export type ProfileDto = {
  id: string;
  handle: string;
  displayName: string;
  city?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;

  // klassische Stats
  stats: ProfileStatsDto;

  // 🔥 Gamification / Leveling (für später im Header)
  level?: number;
  xp?: number;
  xpToNext?: number;
  badges?: string[];

  createdAt?: string;
  updatedAt?: string;
};

export type UpdateProfilePayload = {
  displayName?: string;
  handle?: string;        // wichtig: damit ProfileSetupScreen keinen Fehler wirft
  city?: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
};

// --------------------------------------------------
// interner Helper für Auth-Requests
// --------------------------------------------------

async function authFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token =
    (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)) ?? undefined;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  return res;
}

// --------------------------------------------------
// API-Funktionen
// --------------------------------------------------

export async function getMyProfile(): Promise<ProfileDto> {
  const res = await authFetch('/profile/me', {
    method: 'GET',
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const message =
      typeof json?.error === 'string'
        ? json.error
        : `Profil konnte nicht geladen werden (${res.status})`;
    throw new Error(message);
  }

  return json as ProfileDto;
}

export async function updateProfile(
  patch: UpdateProfilePayload,
): Promise<ProfileDto> {
  const res = await authFetch('/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const message =
      typeof json?.error === 'string'
        ? json.error
        : `Profil konnte nicht gespeichert werden (${res.status})`;
    throw new Error(message);
  }

  return json as ProfileDto;
}