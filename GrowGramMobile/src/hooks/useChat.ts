// FILE: src/hooks/useChat.ts
// Robuster Chat-Hook: Liste laden/cachen, Pinnen, Archivieren, Löschen, Gelesen markieren, Chat öffnen.
// Keine RN-spezifischen Imports → überall nutzbar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, chatList, chatOpen } from '../utils/api';
import type { Chat } from '../types/chat';

export type UseChatOptions = {
  /** Wenn true → nur archivierte Chats laden */
  showArchived?: boolean;
  /** Optionaler eigener Cache-Suffix (z. B. für getrennte Tabs) */
  cacheSuffix?: string;
};

const storageKeyPinned = (uid?: string) => `GG_PINNED_CHATS_${uid || 'anon'}`;
const storageKeyCache = (uid?: string, suffix?: string, archived?: boolean) =>
  `GG_CHAT_CACHE_${uid || 'anon'}_${archived ? 'arch' : 'inbox'}${suffix ? `_${suffix}` : ''}`;

/** Hilfsfunktionen für Sortierung/Datumslogik */
function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
  if (typeof ts === 'number') return new Date(ts);
  const d = new Date(String(ts));
  return Number.isNaN(+d) ? new Date(0) : d;
}
const byUpdatedDesc = (a: Chat, b: Chat) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime();

/**
 * useChat – zentraler Hook für die Chat-Liste
 *
 * @param selfId Aktuelle User-ID (für unread-Map & lokale Keys)
 * @param opts   Optionen (Archiv-Ansicht, eigener Cache-Key)
 */
export function useChat(selfId: string, opts: UseChatOptions = {}) {
  const { showArchived = false, cacheSuffix } = opts;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [degraded, setDegraded] = useState(false);

  const pinnedRef = useRef<Set<string>>(new Set());
  const bootedPins = useRef(false);

  /** Pins aus Storage holen (einmalig pro selfId) */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKeyPinned(selfId));
        pinnedRef.current = new Set((raw ? JSON.parse(raw) : []) as string[]);
        bootedPins.current = true;
      } catch {
        pinnedRef.current = new Set();
        bootedPins.current = true;
      }
    })();
  }, [selfId]);

  /** Interne Loaderoutine (mit Fallback & Caching) */
  const _load = useCallback(async () => {
    setError(null);
    setDegraded(false);
    try {
      // Cache zuerst zeigen (optimistic UI)
      const cacheRaw = await AsyncStorage.getItem(storageKeyCache(selfId, cacheSuffix, showArchived));
      if (cacheRaw) {
        try {
          const cached = JSON.parse(cacheRaw) as Chat[];
          if (cached?.length) setChats(cached);
        } catch {}
      }

      // Netzwerk
      let list: Chat[] = [];
      try {
        if (showArchived) {
          const { data } = await api.get('/chat/list', { params: { archived: 1 } });
          list = (data?.chats || []) as Chat[];
        } else {
          list = await chatList();
        }
      } catch {
        // Fallback auf Legacy-Endpoint oder Emu
        const { data } = await api.get('/chat/list');
        list = (data?.chats || []) as Chat[];
        setDegraded(true);
      }

      const filtered = showArchived
        ? (list || []).filter((c: any) => c.archived)
        : (list || []).filter((c: any) => !c.archived);

      const sorted = filtered.sort(byUpdatedDesc);
      setChats(sorted);

      await AsyncStorage.setItem(
        storageKeyCache(selfId, cacheSuffix, showArchived),
        JSON.stringify(sorted),
      );
    } catch (e: any) {
      setError(String(e?.response?.data?.details || e?.message || 'Unbekannter Fehler'));
    } finally {
      setLoading(false);
    }
  }, [selfId, cacheSuffix, showArchived]);

  /** Initial + bei Ansichtwechsel neu laden */
  useEffect(() => {
    setLoading(true);
    void _load();
  }, [_load]);

  /** Öffentliches Refresh (Pull-To-Refresh) */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await _load();
    } finally {
      setRefreshing(false);
    }
  }, [_load]);

  /** Pin toggeln (rein lokal, wird aber persistiert) */
  const togglePin = useCallback(async (chatId: string) => {
    if (!bootedPins.current) return;
    const pins = pinnedRef.current;
    pins.has(chatId) ? pins.delete(chatId) : pins.add(chatId);
    // Liste neu sortieren (Pins ganz oben, dann updatedAt)
    setChats(prev =>
      [...prev].sort((a, b) => {
        const pa = pins.has(a.id) ? 1 : 0;
        const pb = pins.has(b.id) ? 1 : 0;
        if (pa !== pb) return pb - pa;
        return byUpdatedDesc(a, b);
      }),
    );
    try {
      await AsyncStorage.setItem(storageKeyPinned(selfId), JSON.stringify(Array.from(pins)));
    } catch {}
  }, [selfId]);

  /** Archivieren / Wiederherstellen */
  const setArchived = useCallback(async (chatId: string, to = true) => {
    try {
      await api.post(to ? '/chat/archive' : '/chat/unarchive', { chatId });
      setChats(prev => prev.map(c => (c.id === chatId ? ({ ...c, archived: to } as Chat) : c)));
    } catch (e: any) {
      setError(String(e?.response?.data?.details || e?.message || 'Konnte Archivstatus nicht ändern'));
      throw e;
    }
  }, []);

  /** Endgültig löschen (nur für den User) */
  const remove = useCallback(async (chatId: string) => {
    try {
      await api.post('/chat/delete', { chatId });
      setChats(prev => prev.filter(c => c.id !== chatId));
    } catch (e: any) {
      setError(String(e?.response?.data?.details || e?.message || 'Konnte Chat nicht löschen'));
      throw e;
    }
  }, []);

  /** Als gelesen markieren (nur local UI + optional API) */
  const markRead = useCallback(async (chatId: string) => {
    setChats(prev =>
      prev.map(c =>
        c.id === chatId ? ({ ...c, unread: { ...(c.unread || {}), [selfId]: 0 } } as Chat) : c,
      ),
    );
    // Optionaler Server-Call (falls vorhanden)
    try { await api.post?.('/chat/mark-read', { chatId }); } catch {}
  }, [selfId]);

  /** Chat öffnen oder neu starten → gibt die Chat-ID zurück */
  const openOrStart = useCallback(async (peerId: string): Promise<string> => {
    try {
      const chat = await chatOpen(peerId);
      return chat.id as string;
    } catch {
      const { data } = await api.post('/chat/start', { peerId });
      const thr = (data?.thread || data?.chat || {}) as { id?: string };
      if (!thr?.id) throw new Error('Konnte Chat nicht starten');
      return thr.id!;
    }
  }, []);

  /** Abgeleitete Werte */
  const pins = pinnedRef.current;
  const items = useMemo(() => {
    const list = [...chats];
    // Pins ganz oben
    list.sort((a, b) => {
      const pa = pins.has(a.id) ? 1 : 0;
      const pb = pins.has(b.id) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return byUpdatedDesc(a, b);
    });
    return list;
  }, [chats, pins]);

  return {
    /** State */
    loading,
    refreshing,
    error,
    degraded,
    chats: items,

    /** Actions */
    refresh,
    togglePin,
    setArchived,
    remove,
    markRead,
    openOrStart,

    /** Utils */
    isPinned: (id: string) => pins.has(id),
  };
}

export default useChat;