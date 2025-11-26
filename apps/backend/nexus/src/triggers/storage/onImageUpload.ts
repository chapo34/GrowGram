import * as functions from 'firebase-functions/v1';
import { bucket as defaultBucket } from '../../config/firebase.js';

/**
 * Storage Trigger: onObjectFinalized
 * - Akzeptiert nur Bilder
 * - Schreibt minimale Metadaten in /files (idempotent per overwrite merge)
 * - Platzhalter für spätere Thumbnail/JOBS
 */
export const onImageUpload = functions
  .region('europe-west3')
  .storage.object()
  .onFinalize(async (object) => {
    const { name, contentType, bucket } = object;
    if (!name) return;

    // Nur Bilder verarbeiten
    if (!contentType || !/^image\/(jpeg|png|webp)$/.test(contentType)) {
      return;
    }

    // Dateimetadaten persistieren (einfaches Katalogisieren)
    const filesCol = 'files';
    const docId = encodeURIComponent(name);
    await defaultBucket.file(name).getMetadata().catch(() => [undefined]);

    await (await import('firebase-admin/firestore')).getFirestore()
      .collection(filesCol)
      .doc(docId)
      .set(
        {
          path: name,
          bucket,
          contentType,
          size: object.size ? Number(object.size) : undefined,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    // Platz für zukünftige Thumbnail-Jobs:
    // z.B. Job-Collection "jobs:thumbnails" füttern
    // await db.collection('jobs').doc('thumbnails').collection('queue').add({ path: name });
  });