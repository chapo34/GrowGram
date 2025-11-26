// src/controllers/posts/createPostController.ts
//
// Controller für POST /api/posts
// Kette im Router:
//   authRequired → requireAdultTier → validate.body(Posts.CreateBody) → createPost
//
// → Nur 18+ VERIFIZIERTE User (AGE18_VERIFIED) dürfen posten.
// → Posts tragen Age-Meta, damit Feed/Explore jugendschutz-konform filtern kann.

import type { Request, Response } from 'express';
import { db, FieldValue } from '../../config/firebase.js';
import {
  normalizePostAgeMeta,
  type AgeTier,
} from '../../utils/ageGate.js';
import type { CreateBodyT } from '../../validators/posts.schema.js';

type AuthedReq = Request & {
  user?: { uid?: string; id?: string } | null;
  auth?: { uid?: string } | null;
  ageTier?: AgeTier;
};

export async function createPost(req: AuthedReq, res: Response) {
  try {
    // 1) User-ID aus authRequired / Firebase-Auth / Header
    const uid =
      req.user?.uid ||
      req.user?.id ||
      req.auth?.uid ||
      (req.headers['x-user-id'] as string | undefined);

    if (!uid) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    // 2) Validierter Body (Zod → CreateBodyT)
    const body = req.body as CreateBodyT;

    // 3) Alters-Meta normalisieren (AgeGate)
    const ageMeta = normalizePostAgeMeta({
      minAge: body.minAge,
      adultOnly: body.adultOnly ?? body.isAdultOnly ?? false,
      audience: body.audience ?? null,
      tags: body.tags ?? [],
    });

    // 4) Post-Daten aufbauen
    const now = FieldValue.serverTimestamp();
    const postsCol = db.collection('posts');
    const docRef = postsCol.doc();

    const postData = {
      id: docRef.id,
      userId: uid,

      // Inhalt
      caption: body.caption ?? '',
      tags: body.tags ?? [],
      visibility: body.visibility ?? 'public',

      // Medien (1..10)
      media: body.media,
      location: body.location ?? null,

      // Alters-Meta – wird später im Feed verwendet,
      // zusammen mit req.ageTier / getUserAgeTier(...)
      age: {
        minAge: ageMeta.minAge ?? 16,
        adultOnly: !!ageMeta.adultOnly,
        audience: ageMeta.audience ?? 'ALL',
        tags: ageMeta.tags ?? [],
      },

      // Moderation / Status
      flagged: false,
      removed: false,

      // Client-Meta
      client: body.client ?? {},

      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(postData);

    // 5) Audit-Log am User anlegen
    await db
      .collection('users')
      .doc(uid)
      .collection('audit')
      .add({
        type: 'post_created',
        postId: docRef.id,
        age: postData.age,
        visibility: postData.visibility,
        ts: FieldValue.serverTimestamp(),
      });

    return res.status(201).json({
      ok: true,
      postId: docRef.id,
      post: postData,
    });
  } catch (err) {
    console.error('[createPost] failed:', err);
    return res.status(500).json({ error: 'internal' });
  }
}