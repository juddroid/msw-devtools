import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';
import { type PersistedShape, createPersistence } from './persistence';

const STORAGE_KEY = 'msw-devtools-test';
const silentLogger = createLogger({ logLevel: 'silent' });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('persistence', () => {
  it('save then load roundtrips a payload', () => {
    const p = createPersistence(STORAGE_KEY, silentLogger);
    const payload: PersistedShape = {
      version: 1,
      enabledKeys: ['GET::/a'],
      presets: [{ name: 'x', keys: ['GET::/a'] }],
      methodFilter: ['GET'],
      collapsedGroups: ['Admin'],
    };
    p.save(payload);
    expect(p.load()).toEqual(payload);
  });

  it('returns null when there is nothing stored', () => {
    const p = createPersistence(STORAGE_KEY, silentLogger);
    expect(p.load()).toBeNull();
  });

  it('moves an unparseable blob to :backup and returns null', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const p = createPersistence(STORAGE_KEY, silentLogger);
    expect(p.load()).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEY}:backup`)).toBe('{not json');
  });

  it('moves a future-version blob to :backup and returns null', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, enabledKeys: [] }));
    const p = createPersistence(STORAGE_KEY, silentLogger);
    expect(p.load()).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEY}:backup`)).toContain('999');
  });

  it('falls back to in-memory storage when localStorage throws', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const p = createPersistence(STORAGE_KEY, silentLogger);
    p.save({ version: 1, enabledKeys: ['a'], presets: [], methodFilter: [], collapsedGroups: [] });
    expect(setSpy).toHaveBeenCalled();
    // doesn't throw — that's the contract
  });
});
