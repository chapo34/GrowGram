import { useState, useRef, useCallback } from 'react';
import { UserLite } from '../types/chat';
import { chatSearchUsers } from '../utils/api';

export function useSearchUsers(selfId: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abort = useRef<AbortController | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (abort.current) abort.current.abort();

    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timer.current = setTimeout(async () => {
      const baton = new AbortController();
      abort.current = baton;
      try {
        const users = await chatSearchUsers(q.trim());
        if (baton.signal.aborted) return;
        setResults(users.filter(u => String(u.id) !== selfId));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [selfId]);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    if (abort.current) abort.current.abort();
    setQuery('');
    setResults([]);
    setLoading(false);
  };

  return { query, results, loading, search, clear };
}