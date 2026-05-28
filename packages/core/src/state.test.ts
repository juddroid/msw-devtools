import { describe, expect, it, vi } from 'vitest';
import { createState, defaultState } from './state';

describe('createState', () => {
  it('returns the default state on creation', () => {
    const store = createState();
    expect(store.get()).toEqual(defaultState);
  });

  it('toggleKey adds then removes', () => {
    const store = createState();
    store.toggleKey('GET::/a');
    expect(store.get().enabledKeys).toEqual(['GET::/a']);
    store.toggleKey('GET::/a');
    expect(store.get().enabledKeys).toEqual([]);
  });

  it('toggleMany bulk-enables and bulk-disables', () => {
    const store = createState();
    store.toggleMany(['a', 'b', 'c'], true);
    expect(store.get().enabledKeys).toEqual(['a', 'b', 'c']);
    store.toggleMany(['a', 'b'], false);
    expect(store.get().enabledKeys).toEqual(['c']);
  });

  it('setEnabledKeys replaces wholesale', () => {
    const store = createState();
    store.toggleKey('a');
    store.setEnabledKeys(['x', 'y']);
    expect(store.get().enabledKeys).toEqual(['x', 'y']);
  });

  it('subscribe notifies on change and unsubscribe stops it', () => {
    const store = createState();
    const cb = vi.fn();
    const off = store.subscribe(cb);
    store.toggleKey('a');
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    store.toggleKey('b');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('savePreset adds or replaces by name', () => {
    const store = createState();
    store.setEnabledKeys(['a']);
    store.savePreset('one');
    store.setEnabledKeys(['b']);
    store.savePreset('one');
    expect(store.get().presets).toEqual([{ name: 'one', keys: ['b'] }]);
  });

  it('loadPreset replaces enabledKeys', () => {
    const store = createState();
    store.setEnabledKeys(['a']);
    store.savePreset('p');
    store.setEnabledKeys(['x']);
    store.loadPreset('p');
    expect(store.get().enabledKeys).toEqual(['a']);
  });

  it('deletePreset removes by name', () => {
    const store = createState();
    store.savePreset('p');
    store.deletePreset('p');
    expect(store.get().presets).toEqual([]);
  });

  it('toggleMethodFilter / resetMethodFilter / setSearchTerm / toggleGroup', () => {
    const store = createState();
    store.toggleMethodFilter('GET');
    store.toggleMethodFilter('POST');
    expect(store.get().methodFilter).toEqual(['GET', 'POST']);
    store.toggleMethodFilter('GET');
    expect(store.get().methodFilter).toEqual(['POST']);
    store.resetMethodFilter();
    expect(store.get().methodFilter).toEqual([]);

    store.setSearchTerm('hi');
    expect(store.get().searchTerm).toBe('hi');

    store.toggleGroup('Admin');
    expect(store.get().collapsedGroups).toEqual(['Admin']);
    store.toggleGroup('Admin');
    expect(store.get().collapsedGroups).toEqual([]);

    store.collapseAllGroups(['A', 'B']);
    expect(store.get().collapsedGroups).toEqual(['A', 'B']);
    store.expandAllGroups();
    expect(store.get().collapsedGroups).toEqual([]);
  });

  it('clearAll empties enabledKeys', () => {
    const store = createState();
    store.setEnabledKeys(['a', 'b']);
    store.clearAll();
    expect(store.get().enabledKeys).toEqual([]);
  });
});
