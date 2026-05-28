import { describe, expect, it, vi } from 'vitest';
import { createEvents } from './events';

type Map = { 'mock-change': [string[]]; reset: [] };

describe('createEvents', () => {
  it('delivers events to subscribers', () => {
    const events = createEvents<Map>();
    const cb = vi.fn();
    events.on('mock-change', cb);
    events.emit('mock-change', ['a', 'b']);
    expect(cb).toHaveBeenCalledWith(['a', 'b']);
  });

  it('returns an unsubscribe function', () => {
    const events = createEvents<Map>();
    const cb = vi.fn();
    const off = events.on('reset', cb);
    off();
    events.emit('reset');
    expect(cb).not.toHaveBeenCalled();
  });

  it('isolates errors in one listener from the others', () => {
    const events = createEvents<Map>();
    const good = vi.fn();
    events.on('reset', () => {
      throw new Error('bad listener');
    });
    events.on('reset', good);
    expect(() => events.emit('reset')).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it('clear() removes all listeners', () => {
    const events = createEvents<Map>();
    const cb = vi.fn();
    events.on('reset', cb);
    events.clear();
    events.emit('reset');
    expect(cb).not.toHaveBeenCalled();
  });
});
