// src/services/storageService.ts
import { v4 as uuidv4 } from 'uuid';
import { admin, bucket as exportedBucket } from '../config/firebase.js';

/**
 * Einheitlicher Zugriff auf den GCS-Bucket (warm cache).
 * Verwendet denselben Mechanismus wie deine Routes.
 */
const bucket =
  exportedBucket ??
  (global as any).__gg_bucket ??
  ((admin as any).storage && (admin as any).storage().bucket());
(global as any).__gg_bucket = bucket;

function sanitizeFolder(raw?: string): string {
  const f = String(raw || '').trim().replace(/(^\/+|\/+$)/g, '');
  if (!f) return 'uploads';
  return f
    .split('/')
    .map((seg) => seg.replace(/[^\w\-]+/g, '_'))
    .filter(Boolean)
    .join('/');
}

function safeFilename(name: string) {
  return (name || 'file.bin').replace(/[^\w.\-]+/g, '_');
}

export async function uploadBufferToStorage(
  userId: string,
  originalName: string,
  buffer: Buffer,
  mimeType: string,
  folder = 'uploads'
): Promise<{ path: string; url: string; contentType: string; token: string }> {
  if (!bucket || !bucket.name) {
    const err = new Error('storage_not_configured');
    (err as any).status = 500;
    throw err;
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('empty_buffer');
    (err as any).status = 400;
    throw err;
  }
  const destFolder = sanitizeFolder(folder);
  const safeName = safeFilename(originalName || 'upload.bin');

  const ts = Date.now();
  const fileName = `${ts}_${safeName}`;
  const path = `${destFolder}/${userId}/${fileName}`;
  const file = bucket.file(path);

  const token = uuidv4();

  try {
    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: mimeType || 'application/octet-stream',
        cacheControl: 'public,max-age=31536000,immutable',
        metadata: {
          firebaseStorageDownloadTokens: token,
          uploadedBy: userId,
          visibility: 'public',
        } as any,
      },
    });
  } catch (e: any) {
    console.error('[storageService] save failed', { message: e?.message });
    const err = new Error('storage_save_failed');
    (err as any).status = 502;
    throw err;
  }

  const url =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    `${encodeURIComponent(path)}?alt=media&token=${token}`;

  return { path, url, contentType: mimeType || 'application/octet-stream', token };
}