import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createController } from './controller';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.clear();
});

function fakeWorker() {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    resetHandlers: vi.fn(),
    use: vi.fn(),
  };
}

describe('controller', () => {
  it('mount appends DOM and starts the worker', async () => {
    const worker = fakeWorker();
    const ctrl = createController({
      handlers: [http.get('/x', () => HttpResponse.json({}))],
      storageKey: 'test-1',
      workerFactory: () => worker,
    });
    ctrl.mount();
    await new Promise((r) => setTimeout(r, 10));
    expect(worker.start).toHaveBeenCalled();
    expect(document.querySelector('[data-msw-devtools-root]')).not.toBeNull();
    await ctrl.dispose();
  });

  it('isEnabled reflects toggle()', () => {
    const ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: 'test-2',
      workerFactory: () => fakeWorker(),
    });
    ctrl.mount();
    expect(ctrl.isEnabled('GET', '/a')).toBe(false);
    const entries = ctrl.findMatching('GET', '/a');
    expect(entries).not.toBeNull();
    ctrl.enable(entries!.key);
    expect(ctrl.isEnabled('GET', '/a')).toBe(true);
    void ctrl.dispose();
  });

  it('mock-change event fires on toggle', async () => {
    vi.useFakeTimers();
    const ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: 'test-3',
      workerFactory: () => fakeWorker(),
    });
    const cb = vi.fn();
    ctrl.on('mock-change', cb);
    ctrl.mount();
    const m = ctrl.findMatching('GET', '/a');
    ctrl.toggle(m!.key);
    vi.advanceTimersByTime(250);
    expect(cb).toHaveBeenCalledWith([m!.key]);
    await ctrl.dispose();
    vi.useRealTimers();
  });

  it('persists enabledKeys across instances', async () => {
    const STORAGE_KEY = 'persist-roundtrip';
    let ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: STORAGE_KEY,
      workerFactory: () => fakeWorker(),
    });
    ctrl.mount();
    const m = ctrl.findMatching('GET', '/a');
    ctrl.enable(m!.key);
    await ctrl.dispose();

    ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: STORAGE_KEY,
      workerFactory: () => fakeWorker(),
    });
    ctrl.mount();
    expect(ctrl.isEnabled('GET', '/a')).toBe(true);
    await ctrl.dispose();
  });

  it('dispose removes the root and stops the worker', async () => {
    const worker = fakeWorker();
    const ctrl = createController({
      handlers: [http.get('/x', () => HttpResponse.json({}))],
      storageKey: 'test-dispose',
      workerFactory: () => worker,
    });
    ctrl.mount();
    await ctrl.dispose();
    expect(worker.stop).toHaveBeenCalled();
    expect(document.querySelector('[data-msw-devtools-root]')).toBeNull();
  });

  it('applies a URL share param then strips it', async () => {
    const handlers = [http.get('/users', () => HttpResponse.json([]))];
    const ctrl = createController({
      handlers,
      storageKey: 'test-share',
      workerFactory: () => fakeWorker(),
    });
    const key = 'GET::/users';
    const param = btoa(unescape(encodeURIComponent(JSON.stringify([key]))));
    window.history.replaceState({}, '', `?msw=${param}`);
    ctrl.mount();
    await new Promise((r) => setTimeout(r, 5));
    expect(ctrl.getState().enabledKeys).toEqual([key]);
    expect(window.location.search).not.toContain('msw=');
    await ctrl.dispose();
  });
});
