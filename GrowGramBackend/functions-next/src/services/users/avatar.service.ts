// src/services/users/avatar.service.ts
import { admin } from '../../config/firebase.js';

const BUCKET = admin.storage().bucket();

export async function saveAvatarBinary(userId: string, blob: Buffer, filename = 'avatar.jpg', contentType = 'image/jpeg') {
  const path = `avatars/${userId}/${Date.now()}-${filename}`;
  const file = BUCKET.file(path);
  await file.save(blob, { contentType, resumable: false, public: false, metadata: { cacheControl: 'public,max-age=604800' } });
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  return { url, path };
}