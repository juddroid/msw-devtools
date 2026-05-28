import { css, ROOT_ATTR, STYLE_TAG_ATTR } from './styles';

export type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type Theme = 'light' | 'dark' | 'auto';

export interface MountOptions {
  position: Position;
  theme?: Theme;
  zIndex?: number;
  container?: HTMLElement;
}

export interface RenderHandle {
  root: HTMLElement;
  container: HTMLElement;
}

function ensureStyleTag(): void {
  if (document.head.querySelector(`style[${STYLE_TAG_ATTR}]`)) return;
  const tag = document.createElement('style');
  tag.setAttribute(STYLE_TAG_ATTR, '');
  tag.textContent = css;
  document.head.appendChild(tag);
}

function resolveTheme(theme: Theme | undefined): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') return theme;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export function mountRoot(opts: MountOptions): RenderHandle {
  ensureStyleTag();
  const container = opts.container ?? document.body;
  const root = document.createElement('div');
  root.setAttribute(ROOT_ATTR, '');
  root.classList.add(`pos-${opts.position}`);
  root.setAttribute('data-theme', resolveTheme(opts.theme));
  if (opts.zIndex !== undefined) {
    root.style.zIndex = String(opts.zIndex);
    root.style.position = 'relative';
  }
  container.appendChild(root);
  return { root, container };
}

export function unmountRoot(handle: RenderHandle): void {
  handle.root.remove();
}
