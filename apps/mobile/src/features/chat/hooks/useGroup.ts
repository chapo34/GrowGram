import { useCallback, useState } from 'react';
import type { UserLite } from '@shared/types/chat';
import { api } from '@shared/lib/apiClient';
/**
 * Hook zur Gruppenerstellung (Name, Mitglieder, Suche)
 */
export function useGroup() {
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<UserLite[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleMember = (u: UserLite) => {
    setMembers(prev =>
      prev.find(m => m.id === u.id)
        ? prev.filter(m => m.id !== u.id)
        : [...prev, u]
    );
  };

  const searchUsers = useCallback(async (q: string) => {
    setSearch(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/chat/searchUsers', { params: { q } });
      setResults(res.data.users || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setGroupName('');
    setMembers([]);
    setSearch('');
    setResults([]);
  };

  return {
    groupName,
    setGroupName,
    members,
    toggleMember,
    search,
    searchUsers,
    results,
    loading,
    reset,
  };
}