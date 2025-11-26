import * as functions from 'firebase-functions/v1';
import { db, FieldValue, Timestamp } from '../../config/firebase.js';

/**
 * Firestore Trigger: posts/{postId}
 * - create: Defaults setzen, Suchfield vorbereiten, User.postsCount++
 * - update: Suchfield/Score nachziehen (wenn Text/Tags sich ändern)
 * - delete: User.postsCount--
 *
 * Dieser Trigger ist **idempotent** genug für unsere Zwecke:
 * wir prüfen, ob das relevante Feld bereits gesetzt ist, bevor wir schreiben.
 */
export const onPostWrite = functions
  .region('europe-west3')
  .firestore.document('posts/{postId}')
  .onWrite(async (change, context) => {
    const { postId } = context.params as { postId: string };

    // DELETE
    if (!change.after.exists) {
      const before = change.before.data() as any | undefined;
      const uid = before?.userId as string | undefined;
      if (uid) {
        await db.collection('users').doc(uid).set(
          { stats: { postsCount: FieldValue.increment(-1) } },
          { merge: true }
        );
      }
      return;
    }

    const after = change.after.data() as any;
    const uid = after.userId as string | undefined;
    const ref = db.collection('posts').doc(postId);

    // Hilfsfunktionen
    const normalizeTags = (tags?: string[]) =>
      Array.isArray(tags) ? [...new Set(tags.map(t => String(t).trim().toLowerCase()))] : [];

    const makeSearch = (text?: string, tags?: string[]) =>
      [String(text || ''), ...normalizeTags(tags)].join(' ').trim();

    // CREATE
    if (!change.before.exists) {
      const patch: Record<string, any> = {};

      if (!('createdAt' in after)) patch.createdAt = Timestamp.now();
      if (!('likesCount' in after)) patch.likesCount = 0;
      if (!('commentsCount' in after)) patch.commentsCount = 0;
      if (!('score' in after)) patch.score = 0;

      const tagsNorm = normalizeTags(after.tags);
      if (JSON.stringify(tagsNorm) !== JSON.stringify(after.tags)) patch.tags = tagsNorm;

      const search = makeSearch(after.text, tagsNorm.length ? tagsNorm : after.tags);
      patch.search = search;

      if (Object.keys(patch).length) {
        await ref.set(patch, { merge: true });
      }

      if (uid) {
        await db.collection('users').doc(uid).set(
          { stats: { postsCount: FieldValue.increment(1) } },
          { merge: true }
        );
      }
      return;
    }

    // UPDATE
    const before = change.before.data() as any;
    const changedText = before.text !== after.text;
    const changedTags = JSON.stringify(before.tags || []) !== JSON.stringify(after.tags || []);

    if (changedText || changedTags) {
      const tagsNorm = normalizeTags(after.tags);
      const search = makeSearch(after.text, tagsNorm.length ? tagsNorm : after.tags);

      const patch: Record<string, any> = { search };
      if (JSON.stringify(tagsNorm) !== JSON.stringify(after.tags)) patch.tags = tagsNorm;

      await ref.set(patch, { merge: true });
    }
  });