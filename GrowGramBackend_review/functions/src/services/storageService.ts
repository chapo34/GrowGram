import { v4 as uuidv4 } from 'uuid';
import { admin } from '../config/firebase.js';

const bucket = admin.storage().bucket();

export async function uploadBufferToStorage(
  userId: string,
  originalName: string,
  buffer: Buffer,
  mimeType: string,
  folder = 'uploads'
) {
  const safeName = originalName.replace(/\s+/g, '_').toLowerCase();
  const fileName = `${Date.now()}_${safeName}`;
  const path = `${folder}/${userId}/${fileName}`;
  const file = bucket.file(path);

  const downloadToken = uuidv4();
  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        uploadedBy: userId
      }
    },
    resumable: false,
    public: false
  });

  const url =
    `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
    `/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;

  return { path, url, contentType: mimeType };
}