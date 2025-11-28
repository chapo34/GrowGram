// src/api/waitlist.ts (oder src/waitlist.ts)
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = process.env.EXPO_PUBLIC_API_BASE!;
const KEY_ID = 'gg_waitlist_publicId';
const KEY_TK = 'gg_waitlist_token';

export async function joinWaitlist(payload: {
  name?: string; email: string; country?: string; discord?: string; consent: boolean;
  recaptchaToken?: string;
}) {
  const res = await fetch(`${API}/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json() as { ok: boolean; publicId?: string; viewerToken?: string; bot?: boolean };
  if (json.viewerToken && json.publicId) {
    await AsyncStorage.multiSet([[KEY_ID, json.publicId], [KEY_TK, json.viewerToken]]);
  }
  return json;
}

export async function getWaitlistStatus() {
  const [[, publicId],[, token]] = await AsyncStorage.multiGet([KEY_ID, KEY_TK]);
  if (!publicId || !token) throw new Error('no_local_waitlist_ticket');
  const res = await fetch(`${API}/waitlist/status`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ publicId, token }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function markDiscordJoined() {
  const [[, publicId],[, token]] = await AsyncStorage.multiGet([KEY_ID, KEY_TK]);
  if (!publicId || !token) throw new Error('no_local_waitlist_ticket');
  const res = await fetch(`${API}/waitlist/discord-ack`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ publicId, token }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function hasTicket() {
  const [[, publicId],[, token]] = await AsyncStorage.multiGet([KEY_ID, KEY_TK]);
  return Boolean(publicId && token);
}