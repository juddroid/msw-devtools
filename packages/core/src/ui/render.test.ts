import { beforeEach, describe, expect, it } from 'vitest';
import { mountRoot, unmountRoot } from './render';
import { ROOT_ATTR, STYLE_TAG_ATTR } from './styles';

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('mountRoot / unmountRoot', () => {
  it('appends a root div and a single style tag', () => {
    const handle = mountRoot({ position: 'bottom-right', theme: 'dark', zIndex: 9999 });
    expect(document.body.querySelector(`[${ROOT_ATTR}]`)).toBe(handle.root);
    expect(document.head.querySelectorAll(`style[${STYLE_TAG_ATTR}]`).length).toBe(1);
  });

  it('does not duplicate the style tag across multiple mounts', () => {
    mountRoot({ position: 'bottom-right' });
    mountRoot({ position: 'bottom-right' });
    expect(document.head.querySelectorAll(`style[${STYLE_TAG_ATTR}]`).length).toBe(1);
  });

  it('unmountRoot removes the root', () => {
    const handle = mountRoot({ position: 'bottom-right' });
    unmountRoot(handle);
    expect(document.body.querySelector(`[${ROOT_ATTR}]`)).toBeNull();
  });

  it('applies position class and theme attribute', () => {
    const handle = mountRoot({ position: 'top-left', theme: 'light' });
    expect(handle.root.classList.contains('pos-top-left')).toBe(true);
    expect(handle.root.getAttribute('data-theme')).toBe('light');
  });
});
