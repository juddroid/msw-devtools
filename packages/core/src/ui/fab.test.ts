import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFab } from './fab';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createFab', () => {
  it('renders a button with badge count', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const fab = createFab({ root, onOpen: () => {} });
    fab.setBadge(7);
    expect(root.querySelector('.msw-fab')).not.toBeNull();
    expect(root.querySelector('.msw-fab-badge')?.textContent).toBe('7');
  });

  it('hides the badge when count is 0', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const fab = createFab({ root, onOpen: () => {} });
    fab.setBadge(0);
    expect(root.querySelector('.msw-fab-badge')).toBeNull();
  });

  it('calls onOpen when clicked', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onOpen = vi.fn();
    createFab({ root, onOpen });
    (root.querySelector('.msw-fab') as HTMLButtonElement).click();
    expect(onOpen).toHaveBeenCalled();
  });
});
