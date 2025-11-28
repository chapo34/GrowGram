set -e

mkdir -p src/core/http
mkdir -p src/core/backend
mkdir -p src/core/utils
mkdir -p src/shared/lib

cat <<'FILE' > src/core/http/httpClient.ts
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
    if (t) api.defaults.headers.common.Authorization = \`Bearer \${t}\`;
  } catch {
  }
}

export async function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    api.defaults.headers.common.Authorization = \`Bearer \${token}\`;
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
        (config.headers ??= {} as AxiosRequestHeaders).Authorization = \`Bearer \${inMemoryToken}\`;
      }
    } catch {
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
FILE

cat <<'FILE' > src/core/utils/img.ts
export function normalizeImageUrl(
  u?: string | null,
  bust?: number,
  opts?: { w?: number; q?: number; fm?: string }
) {
  if (!u) return '';
  try {
    const url = new URL(u);
    if (opts?.fm && !url.searchParams.get('fm')) url.searchParams.set('fm', opts.fm);
    if (opts?.w && !url.searchParams.get('w')) url.searchParams.set('w', String(opts.w));
    if (opts?.q && !url.searchParams.get('q')) url.searchParams.set('q', String(opts.q));
    if (bust) url.searchParams.set('t', String(bust));
    return url.toString();
  } catch {
    const sep = u.includes('?') ? '&' : '?';
    return bust ? \`\${u}\${sep}t=\${bust}\` : u;
  }
}
FILE

cat <<'FILE' > src/core/backend/types.ts
export type FeedPostAuthor = {
  id?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
};

export type FeedPost = {
  id: string;
  text?: string;
  caption?: string;
  mediaUrls?: string[];
  thumbnailUrl?: string | null;
  tags?: string[];
  likesCount?: number;
  commentsCount?: number;
  score?: number;
  createdAt?: any;
  visibility?: 'public' | 'private';
  author?: FeedPostAuthor;
  location?: string;
  _liked?: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  text: string;
  author?: { id?: string; name?: string; avatarUrl?: string };
  likesCount?: number;
  liked?: boolean;
  createdAt: string;
};

export type UserMe = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  city?: string;
  birthDate?: string;
  bio?: string;
  avatarUrl?: string;
  privateProfile?: boolean;
  hideSensitive?: boolean;
  pushOptIn?: boolean;
};

export type Chat = {
  id: string;
  members: string[];
  membersKey?: string;
  lastMessage?: string;
  lastSender?: string;
  updatedAt?: any;
  unread?: Record<string, number>;
  peer?: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
};

export type ChatMessage = {
  id: string;
  senderId: string;
  type: 'text';
  text: string;
  createdAt: any;
};

export type ApiChatMessage = ChatMessage;

export type MediaPart = { uri: string; name: string; type: string };
FILE

cat <<'FILE' > src/core/backend/authApi.ts
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
  }
  await setAuthToken(null);
}

export async function getUserPublic(
  userId: string
): Promise<Partial<UserMe> & { id: string }> {
  const { data } = await api.get(\`/users/\${userId}\`);
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
FILE

cat <<'FILE' > src/core/backend/complianceApi.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, parseApiError, STORAGE_KEYS } from '@core/http/httpClient';

export function getAppComplianceVersion(): string {
  return '1.0.0';
}

export async function getComplianceAck(
  userId: string | undefined | null
): Promise<boolean> {
  if (!userId) return false;

  const keysToCheck = [
    \`\${STORAGE_KEYS.COMPLIANCE_PREFIX}\${userId}\`,
    \`GG_COMPLIANCE_\${userId}\`,
    \`GG_COMPLIANCE_ACK_\${userId}\`,
  ];

  for (const k of keysToCheck) {
    try {
      const v = await AsyncStorage.getItem(k);
      if (!v) continue;
      if (v === '1') return true;
      try {
        const j = JSON.parse(v);
        if (j && (j.agreed === true || j.accepted === true)) return true;
      } catch {
      }
    } catch {
    }
  }
  return false;
}

export async function setComplianceAck(
  userId: string | undefined | null,
  opts?: { version?: string }
): Promise<void> {
  if (!userId) return;
  const payload = JSON.stringify({
    agreed: true,
    over18: true,
    version: opts?.version ?? getAppComplianceVersion(),
    at: Date.now(),
  });
  await AsyncStorage.setItem(
    \`\${STORAGE_KEYS.COMPLIANCE_PREFIX}\${userId}\`,
    payload
  );
}

export async function sendComplianceAckToServer(
  params: { agree: boolean; over18: boolean; version: string },
  opts?: { signal?: AbortSignal }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.post('/compliance/ack', params, { signal: opts?.signal });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: parseApiError(e) };
  }
}
FILE

cat <<'FILE' > src/core/backend/feedApi.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@core/http/httpClient';
import type { FeedPost, Comment } from './types';

export async function fetchTrendingPage(
  limit = 20,
  cursor?: string,
  tag?: string
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const params: any = { limit };
  if (cursor) params.cursor = cursor;
  if (tag) params.tag = tag;
  const { data } = await api.get('/feed/trending', { params });
  return data as { posts: FeedPost[]; nextCursor: string | null };
}

export async function fetchTrendingTags(
  limit = 16
): Promise<{ tag: string; count: number }[]> {
  const { data } = await api.get('/feed/trending-tags', { params: { limit } });
  return (data?.tags ?? []) as { tag: string; count: number }[];
}

export async function fetchForYou(
  cursor?: string,
  limit = 20
): Promise<{ posts: FeedPost[]; nextCursor?: string | null }> {
  const { data } = await api.get('/feed/for-you', { params: { cursor, limit } });
  return data as { posts: FeedPost[]; nextCursor?: string | null };
}

export async function likePost(
  postId: string
): Promise<{ likesCount?: number }> {
  try {
    const { data } = await api.post(\`/posts/\${postId}/like\`);
    return data;
  } catch {
    return {};
  }
}

export async function unlikePost(
  postId: string
): Promise<{ likesCount?: number }> {
  try {
    const { data } = await api.post(\`/posts/\${postId}/unlike\`);
    return data;
  } catch {
    return {};
  }
}

const localCommentKey = (postId: string) => \`GG_COMMENTS_\${postId}\`;

export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const { data } = await api.get(\`/posts/\${postId}/comments\`);
    return (data?.comments ?? []) as Comment[];
  } catch {
    const raw = await AsyncStorage.getItem(localCommentKey(postId));
    return raw ? (JSON.parse(raw) as Comment[]) : [];
  }
}

export async function addComment(
  postId: string,
  text: string
): Promise<Comment> {
  const payload = { text };
  try {
    const { data } = await api.post(\`/posts/\${postId}/comments\`, payload);
    return data?.comment as Comment;
  } catch {
    const now = new Date().toISOString();
    const c: Comment = {
      id: \`\${Date.now()}\`,
      postId,
      text,
      author: { name: 'Du' },
      createdAt: now,
      likesCount: 0,
      liked: false,
    };
    const cur = await getComments(postId);
    const next = [c, ...cur];
    await AsyncStorage.setItem(localCommentKey(postId), JSON.stringify(next));
    return c;
  }
}

export async function likeComment(postId: string, commentId: string) {
  try {
    const { data } = await api.post(
      \`/posts/\${postId}/comments/\${commentId}/like\`
    );
    return data;
  } catch {
    return {};
  }
}

export async function unlikeComment(postId: string, commentId: string) {
  try {
    const { data } = await api.post(
      \`/posts/\${postId}/comments/\${commentId}/unlike\`
    );
    return data;
  } catch {
    return {};
  }
}

export async function searchPostsPage(
  q: string,
  limit = 20,
  cursor?: string,
  tag?: string,
  mode: 'prefix' | 'exact' | 'tag' = 'prefix'
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const query = q.trim();
  if (!query) return { posts: [], nextCursor: null };

  const params: any = { q: query, limit };
  if (cursor) params.cursor = cursor;
  if (tag) params.tag = tag;

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const TAG_WORDS = new Set([
    'sativa',
    'indica',
    'hybrid',
    'haze',
    'kush',
    'cali',
    'indoor',
    'outdoor',
  ]);
  let finalMode = mode;
  if (finalMode === 'prefix' && tokens.length === 1 && TAG_WORDS.has(tokens[0])) {
    finalMode = 'tag';
  }
  params.mode = finalMode;

  try {
    const { data } = await api.get('/feed/search', { params });
    const posts = (data?.posts ?? data?.results ?? []) as FeedPost[];
    const nextCursor = (data?.nextCursor ?? data?.next ?? null) as string | null;
    return { posts, nextCursor };
  } catch {
    try {
      const { posts } = await fetchTrendingPage(60, undefined, tag);
      const needle = query.toLowerCase();
      const filtered =
        (posts ?? []).filter((p) => {
          const t = (p.text || '').toLowerCase();
          const tg = (p.tags || []).join(' ').toLowerCase();
          return t.includes(needle) || tg.includes(needle);
        }) || [];
      return { posts: filtered.slice(0, limit), nextCursor: null };
    } catch {
      return { posts: [], nextCursor: null };
    }
  }
}
FILE

cat <<'FILE' > src/core/backend/uploadApi.ts
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@core/config/api';
import { STORAGE_KEYS } from '@core/http/httpClient';

const FS_BINARY_UPLOAD: any =
  (FileSystem as any).FileSystemUploadType?.BINARY_CONTENT ??
  (FileSystem as any).FileSystemUploadType?.BINARY ??
  (FileSystem as any).UploadType?.BINARY_CONTENT ??
  0;

export async function uploadAvatar(
  imageUri: string
): Promise<{ url: string }> {
  const token = (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)) ?? '';

  async function doUpload(path: string) {
    const res = await FileSystem.uploadAsync(
      \`\${API_BASE}\${path}?filename=avatar.jpg\`,
      imageUri,
      {
        httpMethod: 'POST',
        uploadType: FS_BINARY_UPLOAD,
        headers: {
          Authorization: \`Bearer \${token}\`,
          'Content-Type': 'image/jpeg',
          Accept: 'application/json',
        },
      }
    );
    if (res.status >= 200 && res.status < 300) {
      try {
        const j = JSON.parse(res.body || '{}');
        if (j?.url) return { url: String(j.url) };
      } catch {
      }
    }
    let msg = res.body;
    try {
      const p = JSON.parse(res.body || '{}');
      msg = p?.details || p?.message || p?.error || res.body;
    } catch {
    }
    throw new Error(\`Avatar upload failed (\${res.status}): \${msg}\`);
  }

  try {
    return await doUpload('/users/me/avatar-binary');
  } catch (e: any) {
    if (String(e?.message || '').includes('(404)')) {
      try {
        return await doUpload('/auth/me/avatar-binary');
      } catch {
      }
      return await doUpload('/auth/avatar-binary');
    }
    throw e;
  }
}

export async function createPost(input: {
  text: string;
  tags: string[];
  visibility: 'public' | 'private';
  imageUri: string;
}) {
  const token = (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)) ?? '';
  const qs = new URLSearchParams({
    filename: 'upload.jpg',
    visibility: input.visibility,
    text: input.text,
    tags: JSON.stringify(input.tags ?? []),
    folder: 'uploads',
  }).toString();

  const result = await FileSystem.uploadAsync(
    \`\${API_BASE}/posts/upload-binary?\${qs}\`,
    input.imageUri,
    {
      httpMethod: 'POST',
      headers: {
        Authorization: \`Bearer \${token}\`,
        'Content-Type': 'image/jpeg',
        Accept: 'application/json',
      },
      uploadType: FS_BINARY_UPLOAD,
    }
  );

  if (result.status >= 200 && result.status < 300) {
    try {
      return JSON.parse(result.body || '{}');
    } catch {
      return { ok: true, raw: result.body };
    }
  }

  let msg = result.body;
  try {
    const p = JSON.parse(result.body || '{}');
    msg = p?.message || p?.error || result.body;
  } catch {
  }
  throw new Error(\`Upload failed (\${result.status}): \${msg}\`);
}
FILE

cat <<'FILE' > src/core/backend/chatApi.ts
import { api } from '@core/http/httpClient';
import type { Chat, ChatMessage } from './types';

export type ApiChatMessage = ChatMessage;

export async function chatList(): Promise<Chat[]> {
  try {
    const { data } = await api.get('/chat/list');
    return (data?.chats ?? []) as Chat[];
  } catch (e: any) {
    try {
      const { data } = await api.get('/chat/threads', { params: { limit: 50 } });
      return (data?.threads ?? []) as Chat[];
    } catch {
      throw e;
    }
  }
}

export async function chatOpen(peerId: string): Promise<Chat> {
  try {
    const { data } = await api.post('/chat/open', { peerId });
    return (data?.chat ?? data?.thread) as Chat;
  } catch {
    const { data } = await api.post('/chat/start', { peerId });
    return (data?.thread ?? data?.chat) as Chat;
  }
}

export async function chatSearchUsers(q: string): Promise<any[]> {
  const params = { q };
  try {
    return ((await api.get('/chat/users/search', { params })).data?.users ??
      []) as any[];
  } catch {
  }
  try {
    return ((await api.get('/users/search', { params })).data?.users ??
      []) as any[];
  } catch {
  }
  try {
    return ((await api.get('/search/users', { params })).data?.users ??
      []) as any[];
  } catch {
  }
  return [];
}

export async function chatGetMessages(
  chatId: string,
  limit = 30,
  cursor?: string | number | null
) {
  const params: any = { limit };
  if (cursor) params.cursor = cursor;
  try {
    const { data } = await api.get(\`/chat/\${chatId}/messages\`, { params });
    return data as { messages: ChatMessage[]; nextCursor: number | null };
  } catch (e: any) {
    const { data } = await api.get(\`/chat/threads/\${chatId}/messages\`, {
      params,
    });
    return data as { messages: ChatMessage[]; nextCursor: number | null };
  }
}

export async function chatSendMessageBasic(
  chatId: string,
  text: string
): Promise<ChatMessage> {
  try {
    const { data } = await api.post(\`/chat/\${chatId}/messages\`, { text });
    return data as ChatMessage;
  } catch {
    const { data } = await api.post(\`/chat/threads/\${chatId}/send\`, { text });
    return (data?.message ?? data) as ChatMessage;
  }
}

export async function chatSendMessage(
  chatId: string,
  text: string,
  extra?: string | { replyToId?: string | null }
) {
  let replyToId: string | undefined;
  if (typeof extra === 'string') replyToId = extra || undefined;
  else if (extra && typeof extra === 'object') replyToId = extra.replyToId ?? undefined;

  const payload: any = { text };
  if (replyToId) payload.replyToId = replyToId;

  try {
    const { data } = await api.post(\`/chat/\${chatId}/messages\`, payload);
    return data?.message || data;
  } catch {
    const { data } = await api.post(\`/chat/threads/\${chatId}/send\`, payload);
    return data?.message || data;
  }
}

export async function chatEditMessage(
  chatId: string,
  messageId: string,
  text: string
) {
  const { data } = await api.post(
    \`/chat/\${chatId}/messages/\${messageId}/edit\`,
    { text }
  );
  return data?.message || data;
}

export async function chatUnsendMessage(
  chatId: string,
  messageId: string
) {
  const { data } = await api.post(
    \`/chat/\${chatId}/messages/\${messageId}/unsend\`,
    {}
  );
  return data?.ok ?? true;
}

export async function chatMarkRead(chatId: string) {
  try {
    await api.post(\`/chat/\${chatId}/read\`);
  } catch {
    await api.post(\`/chat/threads/\${chatId}/read\`);
  }
}

export async function chatSendMedia(chatId: string, file: { uri: string; name: string; type: string }) {
  const fd = new FormData();
  fd.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  fd.append('chatId', chatId);

  const { data } = await api.post(\`/chat/\${chatId}/media\`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data?.message || data;
}

export async function groupCreate(name: string, memberIds: string[]) {
  try {
    const { data } = await api.post('/group/create', { name, memberIds });
    const thr = data?.thread || data?.chat;
    if (thr?.id) return thr;
  } catch {
  }
  const { data: r } = await api.post('/chat/startGroup', { name, memberIds });
  const thr = r?.thread || r?.chat;
  if (!thr?.id) throw new Error('Group create failed');
  return thr;
}

export async function chatArchive(chatId: string, to = true): Promise<void> {
  try {
    if (to) await api.post('/chat/archive', { chatId });
    else await api.post('/chat/unarchive', { chatId });
  } catch {
    try {
      if (to) await api.post(\`/chat/\${chatId}/archive\`);
      else await api.post(\`/chat/\${chatId}/unarchive\`);
    } catch (e) {
      throw e;
    }
  }
}

export async function chatMute(chatId: string, mute = true): Promise<void> {
  try {
    await api.post('/chat/mute', { chatId, mute });
  } catch {
    await api.post(\`/chat/\${chatId}/mute\`, { mute });
  }
}

export async function chatDelete(chatId: string): Promise<void> {
  try {
    await api.post('/chat/delete', { chatId });
  } catch {
    try {
      await api.delete(\`/chat/\${chatId}\`);
    } catch {
      await api.delete(\`/chat/threads/\${chatId}\`);
    }
  }
}

export async function groupLeave(chatId: string): Promise<void> {
  try {
    await api.post('/group/leave', { chatId });
  } catch {
    try {
      await api.post(\`/chat/\${chatId}/leave\`, {});
    } catch {
      await api.post(\`/chat/threads/\${chatId}/leave\`, {});
    }
  }
}
FILE

cat <<'FILE' > src/core/backend/healthApi.ts
import { api } from '@core/http/httpClient';

export async function pingApi(): Promise<void> {
  try {
    const r = await api.get('/healthz');
    console.log('API /healthz ->', r.status, r.data);
  } catch (e) {
    console.log('API ping failed', e);
  }
}
FILE

cat <<'FILE' > src/shared/lib/apiClient.ts
export * from '@core/http/httpClient';
export * from '@core/backend/types';
export * from '@core/backend/authApi';
export * from '@core/backend/feedApi';
export * from '@core/backend/chatApi';
export * from '@core/backend/uploadApi';
export * from '@core/backend/complianceApi';
export * from '@core/backend/healthApi';
export { normalizeImageUrl } from '@core/utils/img';
FILE

