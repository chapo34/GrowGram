// src/core/backend/complianceApi.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, parseApiError, STORAGE_KEYS } from '@core/http/httpClient';

export function getAppComplianceVersion(): string {
  return '1.0.0';
}

export async function getComplianceAck(
  userId: string | undefined | null
): Promise<boolean> {
  if (!userId) return false;

  const keysToCheck = [
    `${STORAGE_KEYS.COMPLIANCE_PREFIX}${userId}`,
    `GG_COMPLIANCE_${userId}`,
    `GG_COMPLIANCE_ACK_${userId}`,
  ];

  for (const k of keysToCheck) {
    try {
      const v = await AsyncStorage.getItem(k);
      if (!v) continue;
      if (v === '1') return true;
      try {
        const j = JSON.parse(v);
        if (j && (j.agreed === true || j.accepted === true)) return true;
      } catch {
        // ignore parse error
      }
    } catch {
      // ignore storage error
    }
  }
  return false;
}

export async function setComplianceAck(
  userId: string | undefined | null,
  opts?: { version?: string }
): Promise<void> {
  if (!userId) return;
  const payload = JSON.stringify({
    agreed: true,
    over18: true,
    version: opts?.version ?? getAppComplianceVersion(),
    at: Date.now(),
  });
  await AsyncStorage.setItem(
    `${STORAGE_KEYS.COMPLIANCE_PREFIX}${userId}`,
    payload
  );
}

export async function sendComplianceAckToServer(
  params: { agree: boolean; over18: boolean; version: string },
  opts?: { signal?: AbortSignal }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api.post('/compliance/ack', params, { signal: opts?.signal });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: parseApiError(e) };
  }
}