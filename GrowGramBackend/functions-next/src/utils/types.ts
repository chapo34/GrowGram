export function omitKeys<T extends Record<string, any>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const s = new Set<K>(keys);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !s.has(k as K))) as Omit<T, K>;
}