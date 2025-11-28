// src/shared/lib/apiClient.ts
// Fassade über core/backend + core/http – alter Import-Pfad bleibt gültig.

import { API_BASE } from '@core/config/api';
import {
  api,
  bootstrapAuthToken,
  setAuthToken,
  STORAGE_KEYS,
  parseApiError,
  tryJson,
} from '@core/http/httpClient';

// src/shared/lib/apiClient.ts
// ...

import type {
  FeedPost,
  Comment,
  Chat,
  ChatMessage,
  UserMe,
} from '@core/backend/types';

import { normalizeImageUrl } from '@shared/utils/img';

export {
  api,
  API_BASE,
  bootstrapAuthToken,
  setAuthToken,
  STORAGE_KEYS,
  parseApiError,
  tryJson,
  normalizeImageUrl,
};

export type {
  FeedPost,
  Comment,
  Chat,
  ChatMessage,
  UserMe,
};

// Domain APIs ...
export * from '@core/backend/authApi';
export * from '@core/backend/feedApi';
export * from '@core/backend/chatApi';
export * from '@core/backend/uploadApi';
export * from '@core/backend/healthApi';
export * from '@core/backend/complianceApi';
