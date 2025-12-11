import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Zentrale Storage Keys für die ganze App
 * – hier ruhig alles bündeln, was irgendwo gebraucht wird.
 */
export const STORAGE_KEYS = {
  TOKEN: "growgram:authToken",
  USER: "growgram:me",
  COMPLIANCE_ACK: "growgram:complianceAck",
} as const;

/**
 * Base URL:
 *  - bevorzugt EXPO_PUBLIC_API_BASE_URL (für Dev / Staging)
 *  - sonst produktive Nexus-API
 */
const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://europe-west3-growgram-backend.cloudfunctions.net/nexusApi/api";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

console.log("[apiClient] baseURL →", api.defaults.baseURL);

/* -------------------------------------------------------------------------- */
/* Auth-Token Handling                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Setzt / entfernt den Bearer-Token:
 *  - speichert ihn in AsyncStorage
 *  - hängt ihn an axios.defaults.headers.common.Authorization
 */
export async function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    delete api.defaults.headers.common.Authorization;
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
}

/**
 * Lädt den Token aus AsyncStorage und hängt ihn an axios,
 * falls vorhanden. Praktisch für Boot-Flow.
 */
export async function bootstrapAuthToken() {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("[apiClient] bootstrapAuthToken failed:", e);
  }
}

/* -------------------------------------------------------------------------- */
/* Compliance Ack (KJM / 16+ / 18+)                                           */
/* -------------------------------------------------------------------------- */

export type ComplianceAck = {
  agree: true;
  over16: true;
  over18?: boolean;
  version?: string;
  device?: string;
};

/** Local aus Storage holen */
export async function getComplianceAck(): Promise<ComplianceAck | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPLIANCE_ACK);
    if (!raw) return null;
    return JSON.parse(raw) as ComplianceAck;
  } catch (e) {
    console.warn("[apiClient] getComplianceAck failed:", e);
    return null;
  }
}

/** Local in Storage schreiben / löschen */
export async function setComplianceAck(value: ComplianceAck | null) {
  try {
    if (!value) {
      await AsyncStorage.removeItem(STORAGE_KEYS.COMPLIANCE_ACK);
      return;
    }
    await AsyncStorage.setItem(
      STORAGE_KEYS.COMPLIANCE_ACK,
      JSON.stringify(value),
    );
  } catch (e) {
    console.warn("[apiClient] setComplianceAck failed:", e);
  }
}