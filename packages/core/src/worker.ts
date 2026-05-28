import type { RequestHandler } from 'msw';
import type { Logger } from './logger';

export interface Worker {
  start(options?: Record<string, unknown>): Promise<unknown> | unknown;
  stop(): void;
  resetHandlers(): void;
  use(...handlers: unknown[]): void;
}

export interface WorkerSync {
  start(options?: Record<string, unknown>): Promise<void>;
  sync(active: RequestHandler[]): void;
  dispose(): Promise<void>;
}

const DEBOUNCE_MS = 50;

export function createWorkerSync(worker: Worker, logger: Logger): WorkerSync {
  let started = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: RequestHandler[] | null = null;

  async function applyPending() {
    if (disposed || !started) return;
    if (!pending) return;
    try {
      worker.resetHandlers();
      if (pending.length > 0) worker.use(...pending);
    } catch (e) {
      logger.error('worker sync failed', e);
    }
    pending = null;
  }

  return {
    async start(options) {
      if (started || disposed) return;
      try {
        await worker.start(options);
        started = true;
      } catch (e) {
        logger.error('worker start failed', e);
      }
    },
    sync(active) {
      if (disposed) return;
      pending = active;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void applyPending();
      }, DEBOUNCE_MS);
    },
    async dispose() {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      try {
        worker.resetHandlers();
        worker.stop();
      } catch (e) {
        logger.warn('worker stop failed', e);
      }
    },
  };
}
