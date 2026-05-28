export interface EventEmitter<Events extends Record<string, unknown[]>> {
  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void;
  emit<K extends keyof Events>(event: K, ...args: Events[K]): void;
  clear(): void;
}

export function createEvents<Events extends Record<string, unknown[]>>(): EventEmitter<Events> {
  const listeners = new Map<keyof Events, Set<(...args: unknown[]) => void>>();

  return {
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      const fn = listener as (...args: unknown[]) => void;
      set.add(fn);
      return () => set?.delete(fn);
    },
    emit(event, ...args) {
      const set = listeners.get(event);
      if (!set) return;
      for (const fn of [...set]) {
        try { fn(...args); } catch { /* one bad listener shouldn't kill the rest */ }
      }
    },
    clear() {
      listeners.clear();
    },
  };
}
