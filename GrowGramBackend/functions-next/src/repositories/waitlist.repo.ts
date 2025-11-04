import { db, FieldValue, nowISO } from '../config/firebase.js';

const WL = db.collection('waitlist');

export async function addToWaitlist(email: string) {
  const doc = WL.doc(email.toLowerCase());
  await doc.set({ email: email.toLowerCase(), joinedAt: nowISO() }, { merge: true });
  return { email };
}

export async function countWaitlist(): Promise<number> {
  const snap = await WL.get();
  return snap.size;
}

export async function bumpMetrics(key: string) {
  const ref = db.collection('metrics').doc('counters');
  await ref.set({ [key]: FieldValue.increment(1) }, { merge: true });
}