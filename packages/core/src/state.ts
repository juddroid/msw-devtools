import type { MockKey } from './handlers/matcher';

export interface Preset {
  name: string;
  keys: MockKey[];
}

export interface DevtoolsState {
  enabledKeys: MockKey[];
  presets: Preset[];
  methodFilter: string[];
  collapsedGroups: string[];
  searchTerm: string;
  open: boolean;
}

export const defaultState: DevtoolsState = {
  enabledKeys: [],
  presets: [],
  methodFilter: [],
  collapsedGroups: [],
  searchTerm: '',
  open: false,
};

export interface StateStore {
  get(): DevtoolsState;
  set(next: DevtoolsState): void;
  subscribe(listener: (state: DevtoolsState) => void): () => void;

  setEnabledKeys(keys: MockKey[]): void;
  toggleKey(key: MockKey): void;
  toggleMany(keys: MockKey[], enabled: boolean): void;
  clearAll(): void;

  savePreset(name: string): void;
  loadPreset(name: string): void;
  deletePreset(name: string): void;

  setSearchTerm(term: string): void;
  toggleMethodFilter(method: string): void;
  resetMethodFilter(): void;

  toggleGroup(group: string): void;
  collapseAllGroups(groups: string[]): void;
  expandAllGroups(): void;

  setOpen(open: boolean): void;
}

export function createState(initial: DevtoolsState = defaultState): StateStore {
  let state: DevtoolsState = { ...initial };
  const listeners = new Set<(s: DevtoolsState) => void>();

  function set(next: DevtoolsState) {
    state = next;
    for (const l of [...listeners]) {
      try {
        l(state);
      } catch {
        /* isolate */
      }
    }
  }
  function update(reducer: (s: DevtoolsState) => DevtoolsState) {
    set(reducer(state));
  }

  return {
    get: () => state,
    set,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setEnabledKeys: (keys) => update((s) => ({ ...s, enabledKeys: [...keys] })),
    toggleKey: (key) =>
      update((s) => ({
        ...s,
        enabledKeys: s.enabledKeys.includes(key)
          ? s.enabledKeys.filter((k) => k !== key)
          : [...s.enabledKeys, key],
      })),
    toggleMany: (keys, enabled) =>
      update((s) => {
        const next = new Set(s.enabledKeys);
        for (const k of keys) enabled ? next.add(k) : next.delete(k);
        return { ...s, enabledKeys: [...next] };
      }),
    clearAll: () => update((s) => ({ ...s, enabledKeys: [] })),
    savePreset: (name) =>
      update((s) => ({
        ...s,
        presets: [...s.presets.filter((p) => p.name !== name), { name, keys: [...s.enabledKeys] }],
      })),
    loadPreset: (name) =>
      update((s) => {
        const preset = s.presets.find((p) => p.name === name);
        return preset ? { ...s, enabledKeys: [...preset.keys] } : s;
      }),
    deletePreset: (name) =>
      update((s) => ({ ...s, presets: s.presets.filter((p) => p.name !== name) })),
    setSearchTerm: (searchTerm) => update((s) => ({ ...s, searchTerm })),
    toggleMethodFilter: (m) =>
      update((s) => ({
        ...s,
        methodFilter: s.methodFilter.includes(m)
          ? s.methodFilter.filter((x) => x !== m)
          : [...s.methodFilter, m],
      })),
    resetMethodFilter: () => update((s) => ({ ...s, methodFilter: [] })),
    toggleGroup: (g) =>
      update((s) => ({
        ...s,
        collapsedGroups: s.collapsedGroups.includes(g)
          ? s.collapsedGroups.filter((x) => x !== g)
          : [...s.collapsedGroups, g],
      })),
    collapseAllGroups: (groups) => update((s) => ({ ...s, collapsedGroups: [...groups] })),
    expandAllGroups: () => update((s) => ({ ...s, collapsedGroups: [] })),
    setOpen: (open) => update((s) => ({ ...s, open })),
  };
}
