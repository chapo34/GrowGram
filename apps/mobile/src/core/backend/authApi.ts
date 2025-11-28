// src/core/backend/authApi.ts
import { api, tryJson, setAuthToken } from '@core/http/httpClient';
import type { UserMe } from './types';

export async function me(): Promise<UserMe> {
  return tryJson(
    async () => (await api.get('/users/me')).data as UserMe,
    async () => (await api.get('/auth/me')).data as UserMe
  );
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // ignore
  }
  await setAuthToken(null);
}

export async function getUserPublic(
  userId: string
): Promise<Partial<UserMe> & { id: string }> {
  const { data } = await api.get(`/users/${userId}`);
  return data;
}

export async function updateAccountSettings(
  patch: Partial<UserMe>
): Promise<UserMe> {
  return tryJson(
    async () => (await api.patch('/users/me', patch)).data as UserMe,
    async () => (await api.patch('/auth/me', patch)).data as UserMe
  );
}