import type { RequestHandler } from 'msw';

import { buildEntries, type MockEntry } from './handlers/registry';
import type { MockKey } from './handlers/matcher';
import { createEvents } from './events';
import { createLogger, type LoggerOptions } from './logger';
import { createPersistence, PERSIST_VERSION, type PersistedShape } from './persistence';
import { createState, defaultState, type DevtoolsState, type StateStore } from './state';
import { createUnhandledMatcher } from './unhandled';
import { createWorkerSync, type Worker, type WorkerSync } from './worker';
import { decodeShareParam, encodeShareParam } from './share';
import { mountRoot, unmountRoot, type Position, type Theme } from './ui/render';
import { createFab, type Fab } from './ui/fab';
import { createToastHost, type ToastHost } from './ui/toast';
import { createDrawer, type Drawer } from './ui/drawer';

import type { GroupBy } from './handlers/grouping';

export type { MockKey, MockEntry, DevtoolsState };

export interface MswDevtoolsOptions extends LoggerOptions {
  handlers: RequestHandler[];
  baseUrl?: string;
  groupBy?: GroupBy;
  defaultEnabled?: MockKey[];
  storageKey?: string;
  position?: Position;
  theme?: Theme;
  zIndex?: number;
  shareParam?: string;
  keyboard?: boolean;
  autoStart?: boolean;
  workerStartOptions?: Record<string, unknown>;
  /** Test seam: override how the worker is created. Internal/testing use only. */
  workerFactory?: (handlers: RequestHandler[]) => Worker;
}

type EmitterMap = {
  'mock-change': [MockKey[]];
  reset: [];
  ready: [];
};

export interface MswDevtoolsInstance {
  mount(container?: HTMLElement): void;
  unmount(): void;
  dispose(): Promise<void>;
  getEnabledKeys(): MockKey[];
  isEnabled(method: string, url: string): boolean;
  findMatching(method: string, url: string): MockEntry | null;
  getState(): DevtoolsState;
  enable(key: MockKey): void;
  disable(key: MockKey): void;
  toggle(key: MockKey): void;
  setEnabled(keys: MockKey[]): void;
  notifyUnhandledRequest(input: { method: string; url: string }): void;
  on<K extends keyof EmitterMap>(event: K, listener: (...args: EmitterMap[K]) => void): () => void;
  subscribe(listener: (state: DevtoolsState) => void): () => void;
  readonly version: string;
}

const PERSIST_DEBOUNCE = 100;
const EVENT_DEBOUNCE = 200;

declare const __PKG_VERSION__: string;

async function defaultWorkerFactory(handlers: RequestHandler[]): Promise<Worker> {
  const { setupWorker } = await import('msw/browser');
  return setupWorker(...handlers);
}

export function createController(options: MswDevtoolsOptions): MswDevtoolsInstance {
  const logger = createLogger(options);
  const storageKey = options.storageKey ?? 'msw-devtools';
  const position: Position = options.position ?? 'bottom-right';
  const shareParam = options.shareParam ?? 'msw';
  const entries = buildEntries(options.handlers, {
    ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
    ...(options.groupBy !== undefined ? { groupBy: options.groupBy } : {}),
  });
  const unhandledMatcher = createUnhandledMatcher(entries, options.baseUrl);
  const events = createEvents<EmitterMap>();
  const persistence = createPersistence(storageKey, logger);
  const store: StateStore = createState(defaultState);

  let workerSync: WorkerSync | null = null;
  let fab: Fab | null = null;
  let drawer: Drawer | null = null;
  let toasts: ToastHost | null = null;
  let renderHandle: ReturnType<typeof mountRoot> | null = null;
  let mounted = false;
  let disposed = false;

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let changeTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubState: (() => void) | null = null;
  let prevEnabled: MockKey[] = [];

  function snapshotPersisted(): PersistedShape {
    const s = store.get();
    return {
      version: PERSIST_VERSION,
      enabledKeys: s.enabledKeys,
      presets: s.presets,
      methodFilter: s.methodFilter,
      collapsedGroups: s.collapsedGroups,
    };
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => persistence.save(snapshotPersisted()), PERSIST_DEBOUNCE);
  }

  function scheduleChangeEvent(keys: MockKey[]) {
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      events.emit('mock-change', keys);
      events.emit('reset');
    }, EVENT_DEBOUNCE);
  }

  function activeHandlers(): RequestHandler[] {
    const enabled = new Set(store.get().enabledKeys);
    return entries.filter((e) => enabled.has(e.key)).map((e) => e.handler);
  }

  function hydrate() {
    const loaded = persistence.load();
    if (loaded) {
      store.set({
        ...store.get(),
        enabledKeys: loaded.enabledKeys,
        presets: loaded.presets,
        methodFilter: loaded.methodFilter,
        collapsedGroups: loaded.collapsedGroups,
      });
    } else if (options.defaultEnabled && options.defaultEnabled.length > 0) {
      store.setEnabledKeys(options.defaultEnabled);
    }
    prevEnabled = [...store.get().enabledKeys];
  }

  function applyShareParam(): boolean {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(shareParam);
    if (!raw) return false;
    const decoded = decodeShareParam(raw);
    url.searchParams.delete(shareParam);
    window.history.replaceState({}, '', url.toString());
    if (decoded && decoded.length > 0) {
      store.setEnabledKeys(decoded);
      toasts?.show({
        id: 'msw-share-loaded',
        title: 'MSW',
        body: `${decoded.length} mocks loaded from URL`,
      });
      return true;
    }
    return false;
  }

  function copyShareUrl() {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      toasts?.show({ id: 'msw-clipboard', title: 'Share URL', body: 'Clipboard unavailable' });
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set(shareParam, encodeShareParam(store.get().enabledKeys));
    navigator.clipboard.writeText(url.toString()).then(
      () => toasts?.show({ id: 'msw-copied', title: 'Share URL', body: 'Copied to clipboard' }),
      () => toasts?.show({ id: 'msw-copied', title: 'Share URL', body: 'Copy failed' }),
    );
  }

  function onStateChange(next: DevtoolsState) {
    schedulePersist();

    const currentKeys = next.enabledKeys;
    const changed =
      currentKeys.length !== prevEnabled.length ||
      currentKeys.some((k, i) => prevEnabled[i] !== k);
    if (changed) {
      prevEnabled = [...currentKeys];
      workerSync?.sync(activeHandlers());
      scheduleChangeEvent(currentKeys);
      fab?.setBadge(currentKeys.length);
    }
  }

  function notifyUnhandledRequest(input: { method: string; url: string }) {
    const match = unhandledMatcher(input);
    if (!match) return;
    if (store.get().enabledKeys.includes(match.key)) return;
    toasts?.show({
      id: `msw-miss-${match.key}`,
      title: 'MSW: unhandled request matched',
      body: `${match.method} ${match.displayPath}`,
      desc: 'A mock is registered for this path but disabled.',
      duration: 8000,
      action: {
        label: 'Enable mock',
        onClick: () => store.toggleKey(match.key),
      },
    });
  }

  async function mount(container?: HTMLElement) {
    if (mounted || disposed) {
      logger.warn('mount called twice (or after dispose); ignoring');
      return;
    }
    mounted = true;
    hydrate();

    renderHandle = mountRoot({
      position,
      ...(options.theme !== undefined ? { theme: options.theme } : {}),
      ...(options.zIndex !== undefined ? { zIndex: options.zIndex } : {}),
      ...(container !== undefined ? { container } : {}),
    });
    toasts = createToastHost(renderHandle.root);
    fab = createFab({ root: renderHandle.root, onOpen: () => store.setOpen(true) });
    fab.setBadge(store.get().enabledKeys.length);

    drawer = createDrawer({
      root: renderHandle.root,
      state: store,
      entries,
      handlers: {
        onToggle: (key) => store.toggleKey(key),
        onToggleMany: (keys, enabled) => store.toggleMany(keys, enabled),
        onClearAll: () => store.clearAll(),
        onSavePreset: (name) => store.savePreset(name),
        onLoadPreset: (name) => store.loadPreset(name),
        onDeletePreset: (name) => store.deletePreset(name),
        onCopyShare: () => copyShareUrl(),
        onClose: () => store.setOpen(false),
      },
    });

    applyShareParam();
    unsubState = store.subscribe(onStateChange);

    try {
      const worker = options.workerFactory
        ? options.workerFactory(options.handlers)
        : await defaultWorkerFactory(options.handlers);
      workerSync = createWorkerSync(worker, logger);
      await workerSync.start(options.workerStartOptions);
      workerSync?.sync(activeHandlers());
      events.emit('ready');
    } catch (e) {
      logger.error('worker init failed', e);
    }
  }

  function unmount() {
    if (!mounted) return;
    drawer?.destroy(); drawer = null;
    fab?.destroy(); fab = null;
    toasts?.destroy(); toasts = null;
    if (renderHandle) { unmountRoot(renderHandle); renderHandle = null; }
    unsubState?.(); unsubState = null;
    mounted = false;
  }

  return {
    async mount(container) { await mount(container); },
    unmount() { unmount(); },
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (persistTimer) clearTimeout(persistTimer);
      if (changeTimer) clearTimeout(changeTimer);
      try { persistence.save(snapshotPersisted()); } catch { /* ignore */ }
      unmount();
      await workerSync?.dispose();
      workerSync = null;
      events.clear();
    },
    getEnabledKeys: () => [...store.get().enabledKeys],
    isEnabled(method, url) {
      const m = unhandledMatcher({ method, url });
      if (!m) return false;
      return store.get().enabledKeys.includes(m.key);
    },
    findMatching: (method, url) => unhandledMatcher({ method, url }),
    getState: () => store.get(),
    enable: (key) => store.toggleMany([key], true),
    disable: (key) => store.toggleMany([key], false),
    toggle: (key) => store.toggleKey(key),
    setEnabled: (keys) => store.setEnabledKeys(keys),
    notifyUnhandledRequest,
    on: (event, listener) => events.on(event, listener),
    subscribe: (listener) => store.subscribe(listener),
    get version() { return typeof __PKG_VERSION__ === 'string' ? __PKG_VERSION__ : '0.0.0'; },
  };
}
