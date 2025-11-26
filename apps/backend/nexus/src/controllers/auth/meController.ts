// src/controllers/auth/meController.ts
//
// Liefert das eigene Profil + AgeTier-Infos zurück.
// GET /api/auth/me
//
// Frontend kann damit entscheiden:
// - Welche Bereiche sichtbar sind (16+ / 18+)
// - Ob Adult-Verifikation fehlt (Banner anzeigen etc.)

import type { Request, Response } from 'express';
import { db } from '../../config/firebase.js';
import { getUserAgeTier, type AgeTierResult } from '../../services/auth/ageTier.service.js';
import { canAccessAdult18PlusAreas, type AgeTier } from '../../utils/ageGate.js';

type AuthedReq = Request & {
  user?: { uid?: string; id?: string } | null;
  auth?: { uid?: string } | null;
  ageTierMeta?: AgeTierResult;
  ageTier?: AgeTier;
};

function extractUserId(req: AuthedReq): string | null {
  return (
    req.user?.uid ||
    req.user?.id ||
    req.auth?.uid ||
    (req.headers['x-user-id'] as string | undefined) ||
    null
  );
}

/**
 * GET /api/auth/me
 */
export async function getMe(req: AuthedReq, res: Response) {
  try {
    const uid = extractUserId(req);
    if (!uid) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const data = snap.data() as any;

    // AgeTierMeta: bevorzugt aus attachAgeTier-Middleware,
    // ansonsten on-the-fly berechnen.
    let ageTierMeta: AgeTierResult | null = req.ageTierMeta ?? null;

    if (!ageTierMeta) {
      ageTierMeta = await getUserAgeTier(uid);
    }

    const tier = ageTierMeta.tier;
    const canAdult = canAccessAdult18PlusAreas(tier);

    // Compliance & AgeVerification aus User-Dokument
    const compliance = data.compliance ?? null;
    const ageVerification = data.ageVerification ?? null;

    // E-Mail / Username / Profilfelder (nur "harmlose" Felder)
    const profile = {
      id: userRef.id,
      email: data.email ?? null,
      username: data.username ?? null,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      city: data.city ?? null,
      birthDate: data.birthDate ?? null,
      isVerified: data.isVerified ?? data.emailVerified ?? false,
      createdAt: data.createdAt ?? null,
    };

    return res.status(200).json({
      ok: true,
      user: profile,
      ageTier: {
        tier,
        canAccessAdult18PlusAreas: canAdult,
        source: {
          birthDate: ageTierMeta.source?.birthDate ?? null,
          isVerified: !!ageTierMeta.source?.isVerified,
          compliance: ageTierMeta.source?.compliance ?? null,
          ageVerifiedAt: ageTierMeta.source?.ageVerifiedAt ?? null,
        },
      },
      compliance,
      ageVerification,
    });
  } catch (err) {
    console.error('[getMe] failed:', err);
    return res.status(500).json({ error: 'internal' });
  }
}