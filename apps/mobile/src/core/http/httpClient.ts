// src/core/http/httpClient.ts
import axios, { AxiosError, AxiosRequestHeaders } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_BASE } from '@core/config/api';

export const STORAGE_KEYS = {
  TOKEN: 'GG_TOKEN',
  USER: 'GG_USER',
  COMPLIANCE_PREFIX: '@growgram/compliance_ack:',
  COMPLIANCE_ACK: '@growgram/compliance_ack',
} as const;

let inMemoryToken: string | null = null;

function appHeaders() {
  const ver =
    (Constants.expoConfig as any)?.version ||
    (Constants.manifest2 as any)?.extra?.appVersion ||
    'dev';
  const runtime = Constants.executionEnvironment || 'standalone';
  const platform = (Constants.platform as any)?.ios
    ? 'ios'
    : (Constants.platform as any)?.android
    ? 'android'
    : 'web';

  return {
    'X-Client': 'GrowGram-Mobile',
    'X-App-Version': String(ver),
    'X-Platform': platform,
    'X-Runtime': String(runtime),
  } as Record<string, string>;
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

export async function bootstrapAuthToken() {
  try {
    const t = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    inMemoryToken = t;
    if (t) api.defaults.headers.common.Authorization = `Bearer ${t}`;
  } catch {
    // ignore
  }
}

export async function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    delete (api.defaults.headers.common as any)?.Authorization;
  }
}

api.interceptors.request.use(async (config) => {
  if (!inMemoryToken) {
    try {
      inMemoryToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (inMemoryToken) {
        (config.headers ??= {} as AxiosRequestHeaders).Authorization = `Bearer ${inMemoryToken}`;
      }
    } catch {
      // ignore
    }
  }

  const h = (config.headers ??= {} as AxiosRequestHeaders);
  h.Accept = 'application/json';

  const isForm =
    typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (!isForm && !h['Content-Type']) {
    h['Content-Type'] = 'application/json';
  }

  const extra = appHeaders();
  for (const k of Object.keys(extra)) {
    (h as any)[k] = (extra as any)[k];
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<any>) => {
    const method = (err?.config?.method || 'get').toUpperCase();
    const url = err?.config?.url || '';
    const status = err?.response?.status;
    const body = err?.response?.data;
    console.log(
      'API ERROR →',
      method,
      url,
      '→',
      status ?? err.code ?? err.message,
      body ?? ''
    );

    if (status === 401) await setAuthToken(null);
    return Promise.reject(err);
  }
);

export function parseApiError(e: any): string {
  const d = e?.response?.data;
  return d?.details || d?.message || d?.error || e?.message || 'Unbekannter Fehler';
}

export async function tryJson<T>(
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.response?.status === 404 && fallback) return await fallback();
    throw e;
  }
}