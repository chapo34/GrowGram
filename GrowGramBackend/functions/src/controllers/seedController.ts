// functions/src/controllers/seedController.ts
import type { Request, Response } from 'express';
import { db } from '../config/firebase.js';

const CAPTIONS = [
  'Tag 21: Veg – sie streckt sich 🌱',
  'Blütewoche 3 – erste Trichome sichtbar ✨',
  'Heute umgetopft, Wurzeln lieben es 🪴',
  'LST Training – sanft binden, stark wachsen 💪',
  'Trocknungstag 5 – fast ready 😌',
  'Frisches Setup: 60×60 Zelt, LED 150W 💡',
  'Outdoor Update – Sonne macht Laune ☀️',
  'Nährstoffplan angepasst – CalMag FTW 🧪',
  'Macro-Shot: Frostig! ❄️',
  'Stecklinge erfolgreich angewurzelt 🔪🌱',
];
const TAGS = [
  'indoor',
  'outdoor',
  'veg',
  'flower',
  'harvest',
  'hydro',
  'soil',
  'organic',
  'genetics',
  'training',
];

const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Demo-Bilder (bis Storage-Uploads vorhanden sind)
function growImagePair(i: number) {
  return [
    `https://picsum.photos/seed/growgram_${i}_a/900/600`,
    `https://picsum.photos/seed/growgram_${i}_b/640/960`,
  ];
}

export async function seedPosts(req: Request, res: Response) {
  try {
    const count = Math.min(Number((req.body as any)?.count ?? 40), 120);

    // existierenden Autor nehmen (oder ersten User)
    let authorId = (req.body as any)?.authorId as string | undefined;
    if (!authorId) {
      const u = await db.collection(process.env.USERS_COLLECTION || 'users').limit(1).get();
      if (!u.empty) authorId = u.docs[0].id;
    }
    if (!authorId) return res.status(400).json({ message: 'No user found. Pass authorId in body.' });

    const batch = db.batch();
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const [img1, img2] = growImagePair(i + 1);
      const likes = randInt(3, 250);
      const daysAgo = randInt(0, 60);
      const created = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

      const recencyBoost = 1 - Math.min(daysAgo / 60, 1);
      const score = Math.round(likes * (0.65 + 0.35 * recencyBoost) * 100) / 100;

      const t1 = rand(TAGS);
      const t2 = rand(TAGS);
      const tags = [t1, t2];
      const tagsLower = tags.map(norm);

      const doc = db.collection('posts').doc();
      batch.set(doc, {
        authorId,
        text: rand(CAPTIONS),
        mediaUrls: [img1, img2],
        tags,
        tagsLower,
        visibility: 'public',
        likesCount: likes,
        commentsCount: 0,
        deleted: false,
        score,
        createdAt: created,
        updatedAt: created,
      });
    }

    await batch.commit();
    return res.status(201).json({ ok: true, created: count });
  } catch (err: any) {
    console.error('[seed] error', err);
    return res.status(500).json({ message: 'seed_failed', details: String(err?.message || err) });
  }
}