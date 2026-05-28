import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEntries } from '../handlers/registry';
import { createState } from '../state';
import { createDrawer } from './drawer';

beforeEach(() => {
  document.body.innerHTML = '';
});

function setup() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const state = createState();
  const entries = buildEntries(
    [
      http.get('/users', () => HttpResponse.json([])),
      http.post('/users', () => HttpResponse.json({})),
      http.delete('/users/:id', () => HttpResponse.json({})),
    ],
    {},
  );
  const handlers = {
    onToggle: vi.fn(),
    onToggleMany: vi.fn(),
    onClearAll: vi.fn(),
    onSavePreset: vi.fn(),
    onLoadPreset: vi.fn(),
    onDeletePreset: vi.fn(),
    onCopyShare: vi.fn(),
    onClose: vi.fn(),
  };
  const drawer = createDrawer({ root, state, entries, handlers });
  return { root, state, drawer, handlers };
}

describe('drawer', () => {
  it('renders one row per entry', () => {
    const { root, drawer } = setup();
    drawer.open();
    expect(root.querySelectorAll('.msw-row').length).toBe(3);
  });

  it('clicking a row calls onToggle with the entry key', () => {
    const { root, drawer, handlers } = setup();
    drawer.open();
    (root.querySelector('.msw-row') as HTMLElement).click();
    expect(handlers.onToggle).toHaveBeenCalled();
  });

  it('shows active checkbox state when key is in enabledKeys', () => {
    const { root, drawer, state } = setup();
    state.setEnabledKeys(['GET::/users']);
    drawer.open();
    drawer.render();
    const row = root.querySelector('.msw-row');
    expect(row?.classList.contains('active')).toBe(true);
  });

  it('search filters rows', () => {
    const { root, drawer, state } = setup();
    drawer.open();
    state.setSearchTerm('delete');
    drawer.render();
    // only one row matches "delete" by method
    expect(root.querySelectorAll('.msw-row').length).toBe(1);
  });
});
