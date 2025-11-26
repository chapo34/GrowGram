// backend/nexus/src/repositories/waitlist.repo.ts
import { db, FieldValue } from "../config/firebase.js";

export async function addToWaitlist(email: string) {
  const id = email.toLowerCase();
  const ref = db.collection("waitlist").doc(id);
  const ts = FieldValue.serverTimestamp();
  await ref.set(
    { email: id, status: "pending", createdAt: ts, updatedAt: ts },
    { merge: true }
  );
  return (await ref.get()).data();
}

export async function bumpMetrics(kind: "waitlist_join" | string) {
  const ref = db.collection("_metrics").doc("counters");
  const ts = FieldValue.serverTimestamp();
  await db.runTransaction(async (trx) => {
    const snap = await trx.get(ref);
    const cur = (snap.data() as any) ?? {};
    const val = Number(cur[kind] || 0) + 1;
    trx.set(ref, { [kind]: val, updatedAt: ts }, { merge: true });
  });
}

export async function countWaitlist(): Promise<number> {
  const snap = await db.collection("waitlist").count().get();
  return (snap as any).data?.().count ?? 0;
}