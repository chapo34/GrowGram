// src/core/http/httpClient.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { API_BASE } from '@core/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ApiErrorPayload = {
  message?: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  payload?: ApiErrorPayload;

  constructor(message: string, options?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    if (options) {
      this.status = options.status;
      this.code = options.code;
      this.payload = options;
    }
  }
}

export const AUTH_STORAGE_KEYS = {
  accessToken: 'gg_auth_access_token',
  refreshToken: 'gg_auth_refresh_token',
} as const;

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: false,
});

export function setAuthTokenHeader(token: string | null) {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuthTokenHeader() {
  delete api.defaults.headers.common.Authorization;
}

export async function bootstrapAuthHeaderFromStorage(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
    setAuthTokenHeader(token);
    return token;
  } catch {
    return null;
  }
}

export async function tryJson<T = unknown>(
  fn: () => Promise<AxiosResponse<any>>,
): Promise<T> {
  try {
    const res = await fn();
    return res.data as T;
  } catch (err) {
    const axiosErr = err as AxiosError<any>;
    if (axiosErr.response) {
      const data = axiosErr.response.data as any;
      const message =
        data?.message ||
        data?.error ||
        `Request failed with status ${axiosErr.response.status}`;
      throw new ApiError(message, {
        status: axiosErr.response.status,
        code: data?.code,
        errors: data?.errors,
        ...data,
      });
    }
    if (axiosErr.request) {
      throw new ApiError(
        'Netzwerkfehler – bitte prüfe deine Verbindung oder versuche es später erneut.',
      );
    }
    throw new ApiError(axiosErr.message || 'Unbekannter Fehler');
  }
}

// Kleine Convenience-Wrapper
export async function getJson<T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  return tryJson<T>(() => api.get(url, config));
}

export async function postJson<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return tryJson<T>(() => api.post(url, data, config));
}

export async function patchJson<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return tryJson<T>(() => api.patch(url, data, config));
}

export async function delJson<T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  return tryJson<T>(() => api.delete(url, config));
}