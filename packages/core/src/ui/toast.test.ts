import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createToastHost } from './toast';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

describe('toast host', () => {
  it('shows a toast and auto-dismisses after the given duration', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = createToastHost(root);
    host.show({ id: 't1', title: 'title', body: 'body', duration: 1000 });
    expect(root.querySelectorAll('.msw-toast').length).toBe(1);
    vi.advanceTimersByTime(1100);
    expect(root.querySelectorAll('.msw-toast').length).toBe(0);
  });

  it('deduplicates by id (re-show keeps one toast and resets timer)', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = createToastHost(root);
    host.show({ id: 'x', title: 't', body: 'b', duration: 1000 });
    vi.advanceTimersByTime(500);
    host.show({ id: 'x', title: 't', body: 'b', duration: 1000 });
    expect(root.querySelectorAll('.msw-toast').length).toBe(1);
    vi.advanceTimersByTime(700);
    expect(root.querySelectorAll('.msw-toast').length).toBe(1); // restarted
    vi.advanceTimersByTime(400);
    expect(root.querySelectorAll('.msw-toast').length).toBe(0);
  });

  it('action button triggers callback and dismisses', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = createToastHost(root);
    const onAction = vi.fn();
    host.show({
      id: 'a',
      title: 't',
      body: 'b',
      duration: 5000,
      action: { label: 'Go', onClick: onAction },
    });
    (root.querySelector('.msw-toast-btn-primary') as HTMLButtonElement).click();
    expect(onAction).toHaveBeenCalled();
    expect(root.querySelectorAll('.msw-toast').length).toBe(0);
  });

  it('caps stack to max 3 oldest-out', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = createToastHost(root);
    host.show({ id: '1', title: 't', body: 'b' });
    host.show({ id: '2', title: 't', body: 'b' });
    host.show({ id: '3', title: 't', body: 'b' });
    host.show({ id: '4', title: 't', body: 'b' });
    expect(root.querySelectorAll('.msw-toast').length).toBe(3);
    expect(root.querySelector('.msw-toast')?.getAttribute('data-id')).toBe('2');
  });
});
