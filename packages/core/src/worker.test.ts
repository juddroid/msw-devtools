import { describe, expect, it, vi } from 'vitest';
import { createWorkerSync, type Worker } from './worker';
import { createLogger } from './logger';

function fakeWorker(): Worker & { _used: unknown[]; _started: boolean; _stopped: boolean } {
  let used: unknown[] = [];
  return {
    _used: used,
    _started: false,
    _stopped: false,
    async start() { (this as any)._started = true; },
    stop() { (this as any)._stopped = true; },
    resetHandlers() { used = []; (this as any)._used = used; },
    use(...handlers: unknown[]) { used.push(...handlers); (this as any)._used = used; },
  };
}

describe('createWorkerSync', () => {
  const logger = createLogger({ logLevel: 'silent' });

  it('start() calls worker.start with the supplied options', async () => {
    const w = fakeWorker();
    const sync = createWorkerSync(w, logger);
    await sync.start({ quiet: true });
    expect(w._started).toBe(true);
  });

  it('sync() debounces resetHandlers + use', async () => {
    vi.useFakeTimers();
    const w = fakeWorker();
    const sync = createWorkerSync(w, logger);
    await sync.start({ quiet: true });

    const h1 = { id: 1 } as unknown;
    const h2 = { id: 2 } as unknown;
    sync.sync([h1, h2]);
    sync.sync([h1]);          // overrides — only the last call should apply
    expect(w._used).toEqual([]);
    vi.advanceTimersByTime(60);
    expect(w._used).toEqual([h1]);

    vi.useRealTimers();
  });

  it('dispose() stops the worker and clears timers', async () => {
    vi.useFakeTimers();
    const w = fakeWorker();
    const sync = createWorkerSync(w, logger);
    await sync.start({ quiet: true });
    sync.sync([{ id: 1 } as unknown]);
    await sync.dispose();
    vi.advanceTimersByTime(200);
    expect(w._stopped).toBe(true);
    expect(w._used).toEqual([]);   // sync was canceled by dispose
    vi.useRealTimers();
  });
});
