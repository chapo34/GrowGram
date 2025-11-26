// backend/nexus/src/repositories/files.repo.ts
import { storage } from '../config/firebase.js';
import { v4 as uuid } from 'uuid';

/** Signierte (zeitlich limitierte) Download-URL für einen Bucket-Pfad */
export async function getSignedDownloadUrl(
  path: string,
  opts?: { expiresInSeconds?: number }
): Promise<string> {
  const bucket = storage.bucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) throw new Error('file_not_found');

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + (opts?.expiresInSeconds ?? 60 * 60 * 1000), // 1h
    version: 'v4',
  });
  return url;
}

/** Einfacher Upload-Helfer, wenn du z.B. aus Buffer hochladen willst */
export async function uploadBuffer(
  destPath: string,
  buffer: Buffer,
  contentType = 'application/octet-stream',
  makePublic = false
): Promise<{ path: string; publicUrl?: string }> {
  const bucket = storage.bucket();
  const file = bucket.file(destPath);
  const token = uuid();

  await file.save(buffer, {
    contentType,
    metadata: {
      metadata: { firebaseStorageDownloadTokens: token },
      cacheControl: 'public, max-age=31536000, immutable',
    },
    resumable: false,
    validation: 'crc32c',
  });

  if (makePublic) {
    await file.makePublic();
    return { path: destPath, publicUrl: file.publicUrl() };
  }
  // v2 download URL
  const publicUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
    encodeURIComponent(destPath) +
    `?alt=media&token=${token}`;
  return { path: destPath, publicUrl };
}