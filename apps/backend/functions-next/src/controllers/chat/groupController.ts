import type { Request, Response } from 'express';
import { db, admin } from '../../config/firebase.js';

const now = () => admin.firestore.FieldValue.serverTimestamp();

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

/**
 * POST /chat/group
 * Body: { name: string, members: string[] }
 * Erstellt eine Gruppen-Konversation.
 */
export async function createGroup(req: Request, res: Response) {
  try {
    const ownerId = (req as any).user?.userId;
    if (!ownerId) return res.status(401).json({ error: 'unauthorized' });

    const { name, members } = (req.body ?? {}) as { name?: string; members?: string[] };
    const mem = uniq([ownerId, ...(members ?? [])]).filter(Boolean);
    if (!name?.trim() || mem.length < 2) {
      return res.status(400).json({ error: 'bad_request', details: 'name_and_min_two_members_required' });
    }

    const ref = db.collection('chats').doc();
    const doc = {
      id: ref.id,
      type: 'group' as const,
      name: name.trim(),
      ownerId,
      participants: mem,
      admins: [ownerId],
      createdAt: now(),
      updatedAt: now(),
      lastMessageAt: now(),
    };
    await ref.set(doc);
    return res.status(201).json({ chat: doc });
  } catch (e: any) {
    console.error('[createGroup]', e);
    return res.status(500).json({ error: 'internal' });
  }
}

/**
 * PATCH /chat/group/:chatId
 * Body: { name?: string, add?: string[], remove?: string[] }
 * Nur Owner/Admins dürfen ändern.
 */
export async function updateGroup(req: Request, res: Response) {
  try {
    const uid = (req as any).user?.userId;
    if (!uid) return res.status(401).json({ error: 'unauthorized' });

    const { chatId } = req.params as any;
    const { name, add = [], remove = [] } = (req.body ?? {}) as { name?: string; add?: string[]; remove?: string[] };

    const ref = db.collection('chats').doc(chatId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not_found' });

    const data = snap.data() as any;
    if (data.type !== 'group') return res.status(400).json({ error: 'bad_request', details: 'not_a_group' });

    const isAdmin = (data.admins ?? []).includes(uid);
    const isOwner = data.ownerId === uid;
    if (!isAdmin && !isOwner) return res.status(403).json({ error: 'forbidden' });

    const patch: any = { updatedAt: now() };

    if (name && name.trim() && (isOwner || isAdmin)) patch.name = name.trim();

    if (Array.isArray(add) && add.length) {
      const merged = uniq([...(data.participants ?? []), ...add]);
      patch.participants = merged;
    }

    if (Array.isArray(remove) && remove.length) {
      const filtered = (patch.participants ?? data.participants ?? []).filter((u: string) => !remove.includes(u));
      // Owner darf nicht entfernt werden
      if (!filtered.includes(data.ownerId)) filtered.push(data.ownerId);
      patch.participants = uniq(filtered);
    }

    await ref.set(patch, { merge: true });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[updateGroup]', e);
    return res.status(500).json({ error: 'internal' });
  }
}

/**
 * POST /chat/group/:chatId/messages
 * Body: { text?: string, mediaUrls?: string[] }
 */
export async function sendGroupMessage(req: Request, res: Response) {
  try {
    const uid = (req as any).user?.userId;
    if (!uid) return res.status(401).json({ error: 'unauthorized' });

    const { chatId } = req.params as any;
    const { text = '', mediaUrls = [] } = (req.body ?? {}) as any;

    const ref = db.collection('chats').doc(chatId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not_found' });
    const data = snap.data() as any;
    if (data.type !== 'group') return res.status(400).json({ error: 'bad_request', details: 'not_a_group' });

    const members: string[] = data.participants ?? [];
    if (!members.includes(uid)) return res.status(403).json({ error: 'forbidden' });

    const msgRef = ref.collection('messages').doc();
    const doc = {
      id: msgRef.id,
      chatId,
      senderId: uid,
      text: String(text || ''),
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      createdAt: now(),
      editedAt: null as any,
      deletedAt: null as any,
      readBy: [uid],
      type: 'text' as const,
    };

    await msgRef.set(doc);
    await ref.set(
      { lastMessageAt: now(), lastMessage: { text: doc.text, senderId: uid, createdAt: now() }, updatedAt: now() },
      { merge: true }
    );

    // Optional Fanout
    try {
      const svc = await import('../../services/chat/message.service.js').catch(() => null) as any;
      if (svc?.fanoutNewMessage) await svc.fanoutNewMessage({ chatId, message: { ...doc, createdAt: new Date().toISOString() } });
    } catch (e) {
      console.warn('[sendGroupMessage] fanout skipped:', e);
    }

    return res.status(201).json({ message: doc });
  } catch (e: any) {
    console.error('[sendGroupMessage]', e);
    return res.status(500).json({ error: 'internal' });
  }
}