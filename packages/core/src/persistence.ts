import type { MockKey } from './handlers/matcher';
import type { Logger } from './logger';
import type { Preset } from './state';

export const PERSIST_VERSION = 1 as const;

export interface PersistedShape {
  version: 1;
  enabledKeys: MockKey[];
  presets: Preset[];
  methodFilter: string[];
  collapsedGroups: string[];
}

export interface Persistence {
  load(): PersistedShape | null;
  save(value: PersistedShape): void;
}

function safeGetStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function createPersistence(storageKey: string, logger: Logger): Persistence {
  const backupKey = `${storageKey}:backup`;
  let warned = false;

  function readRaw(): string | null {
    const ls = safeGetStorage();
    if (!ls) return null;
    try {
      return ls.getItem(storageKey);
    } catch (e) {
      if (!warned) {
        logger.warn('localStorage read failed; using in-memory fallback', e);
        warned = true;
      }
      return null;
    }
  }

  function writeRaw(key: string, value: string): void {
    const ls = safeGetStorage();
    if (!ls) return;
    try {
      // Use Storage.prototype.setItem.call to allow test spies to intercept
      // even when the instance method has been cached by a Proxy wrapper.
      (typeof Storage !== 'undefined' ? Storage.prototype.setItem.bind(ls) : ls.setItem.bind(ls))(
        key,
        value,
      );
    } catch (e) {
      if (!warned) {
        logger.warn('localStorage write failed; using in-memory fallback', e);
        warned = true;
      }
    }
  }

  return {
    load() {
      const raw = readRaw();
      if (!raw) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        writeRaw(backupKey, raw);
        return null;
      }
      if (typeof parsed !== 'object' || parsed === null) {
        writeRaw(backupKey, raw);
        return null;
      }
      const obj = parsed as { version?: unknown };
      if (obj.version !== PERSIST_VERSION) {
        writeRaw(backupKey, raw);
        logger.warn(`persisted state version mismatch (got ${String(obj.version)}); resetting`);
        return null;
      }
      return parsed as PersistedShape;
    },
    save(value) {
      writeRaw(storageKey, JSON.stringify(value));
    },
  };
}
