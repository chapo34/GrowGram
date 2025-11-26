// backend/nexus/src/services/chat/media.service.ts
import { storage } from '../../config/firebase.js';
import * as Chats from '../../repositories/chats.repo.js';

const BUCKET = storage.bucket();

export async function sendMedia(
  chatId: string,
  userId: string,
  file: { buffer: Buffer; filename: string; contentType: string }
) {
  const path = `chat/${chatId}/${Date.now()}-${file.filename}`;
  const f = BUCKET.file(path);
  await f.save(file.buffer, {
    contentType: file.contentType || 'application/octet-stream',
    resumable: false,
    public: false
  });
  const [url] = await f.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7
  });
  return Chats.attachMedia(chatId, userId, [url]);
}