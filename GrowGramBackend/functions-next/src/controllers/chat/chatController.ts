import type { Request, Response } from 'express';

// ---- stubs ----
async function openDM(_userId: string, _peerId: string) {
  return { id: 'chat-1', members: [_userId, _peerId] };
}
async function sendMsg(_chatId: string, _userId: string, _text: string, _replyToId?: string) {
  return { id: 'msg-1', text: _text, replyToId: _replyToId ?? null };
}
async function listMsgs(_chatId: string, _userId: string, _opts: { limit?: number; cursor?: string }) {
  return { messages: [], nextCursor: null as null | string };
}
async function setRead(_chatId: string, _userId: string) { /* noop */ }
// ----------------

export async function open(req: Request, res: Response) {
  const userId = (req as any).user?.id ?? 'me';
  const { peerId } = (req as any).body || {};
  const chat = await openDM(String(userId), String(peerId || 'peer'));
  return res.json({ chat });
}

export async function listMessages(req: Request, res: Response) {
  const userId = (req as any).user?.id ?? 'me';
  const { chatId } = req.params as any;
  const { limit, cursor } = (req as any).query || {};
  const data = await listMsgs(String(chatId), String(userId), {
    limit: limit ? Number(limit) : undefined,
    cursor: cursor ? String(cursor) : undefined,
  });
  return res.json(data);
}

export async function sendMessage(req: Request, res: Response) {
  const userId = (req as any).user?.id ?? 'me';
  const { chatId } = req.params as any;
  const { text, replyToId } = (req as any).body || {};
  const m = await sendMsg(String(chatId), String(userId), String(text || ''), replyToId ? String(replyToId) : undefined);
  return res.json({ message: m });
}

export async function editMessage(_req: Request, res: Response)   { return res.status(501).json({ error: 'not_implemented' }); }
export async function unsendMessage(_req: Request, res: Response) { return res.status(501).json({ error: 'not_implemented' }); }
export async function sendMedia(_req: Request, res: Response)     { return res.status(501).json({ error: 'not_implemented' }); }

export async function markRead(req: Request, res: Response) {
  const userId = (req as any).user?.id ?? 'me';
  const { chatId } = req.params as any;
  await setRead(String(chatId), String(userId));
  return res.status(204).end();
}