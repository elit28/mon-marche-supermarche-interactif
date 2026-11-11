/**
 * Petit cache mémoire à durée de vie courte pour les lectures très fréquentes
 * (liste des rayons, sélection mise en avant). Invalidé par l'administration.
 */
interface Entry {
  expires: number;
  value: Promise<unknown>;
}

const store = new Map<string, Entry>();

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = load().catch((error) => {
    store.delete(key);
    throw error;
  });
  store.set(key, { expires: now + ttlMs, value });
  return value;
}

export function invalidateMemo(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
