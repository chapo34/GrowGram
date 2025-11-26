import type { Request, Response } from 'express';

// ---- simple stubs / replace with real services later ----
async function updateProfile(_userId: string, patch: any) {
  return { id: _userId || 'me', ...patch };
}
async function getPublic(_userId: string) {
  return { id: _userId, username: 'user', isVerified: true };
}
async function getMe(_userId: string) {
  return {
    id: _userId,
    email: 'me@example.com',
    username: 'me',
    isVerified: true,
  };
}
// ---------------------------------------------------------

// PATCH /me  (alias: updateMe)
export async function update(req: Request, res: Response) {
  const userId = ((req as any).user?.id ?? 'me') as string;
  const next = await updateProfile(userId, (req as any).body || {});
  return res.json({ user: next });
}
export { update as updateMe };

// GET /users/:userId (alias: getPublicProfile)
export async function get(req: Request, res: Response) {
  const { userId } = req.params as any;
  const data = await getPublic(String(userId));
  return res.json({ user: data });
}
export { get as getPublicProfile };

// GET /me
export async function me(req: Request, res: Response) {
  const userId = ((req as any).user?.id ?? 'me') as string;
  const data = await getMe(userId);
  return res.json({ user: data });
}