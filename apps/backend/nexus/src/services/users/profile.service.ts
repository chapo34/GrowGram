import { db } from "../../config/firebase.js";

export type SafeUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  username?: string | null;
  city?: string | null;
  birthDate?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  // damit die bisherigen Typen zufrieden sind:
  emailLower?: string;
  updatedAt?: unknown;
};

export async function getProfile(userId: string): Promise<SafeUser> {
  const snap = await db.collection("users").doc(userId).get();
  if (!snap.exists) throw new Error("not_found");
  const u = snap.data() as any;
  return {
    id: snap.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    username: u.username ?? null,
    city: u.city ?? null,
    birthDate: u.birthDate ?? null,
    avatarUrl: u.avatarUrl ?? null,
    isVerified: !!u.isVerified,
    emailLower: u.emailLower,
    updatedAt: u.updatedAt,
  };
}

export async function updateProfile(userId: string, patch: Partial<SafeUser>): Promise<SafeUser> {
  const ref = db.collection("users").doc(userId);
  await ref.set(
    {
      firstName: patch.firstName ?? undefined,
      lastName: patch.lastName ?? undefined,
      city: patch.city ?? undefined,
      birthDate: patch.birthDate ?? undefined,
      username: patch.username ?? undefined,
      avatarUrl: patch.avatarUrl ?? undefined,
      updatedAt: (global as any).admin?.firestore?.FieldValue?.serverTimestamp?.() ?? undefined,
    },
    { merge: true }
  );
  return getProfile(userId);
}