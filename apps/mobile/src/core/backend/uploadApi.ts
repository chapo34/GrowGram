// src/core/backend/uploadApi.ts
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
      `${API_BASE}${path}?filename=avatar.jpg`,
      imageUri,
      {
        httpMethod: 'POST',
        uploadType: FS_BINARY_UPLOAD,
        headers: {
          Authorization: `Bearer ${token}`,
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
        // ignore parse
      }
    }
    let msg: any = res.body;
    try {
      const p = JSON.parse(res.body || '{}');
      msg = p?.details || p?.message || p?.error || res.body;
    } catch {
      // ignore
    }
    throw new Error(`Avatar upload failed (${res.status}): ${msg}`);
  }

  try {
    return await doUpload('/users/me/avatar-binary');
  } catch (e: any) {
    if (String(e?.message || '').includes('(404)')) {
      try {
        return await doUpload('/auth/me/avatar-binary');
      } catch {
        // ignore
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
    `${API_BASE}/posts/upload-binary?${qs}`,
    input.imageUri,
    {
      httpMethod: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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

  let msg: any = result.body;
  try {
    const p = JSON.parse(result.body || '{}');
    msg = p?.message || p?.error || result.body;
  } catch {
    // ignore
  }
  throw new Error(`Upload failed (${result.status}): ${msg}`);
}