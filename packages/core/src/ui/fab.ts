import { icons } from './icons';

export interface FabOptions {
  root: HTMLElement;
  onOpen: () => void;
}

export interface Fab {
  el: HTMLButtonElement;
  setBadge(count: number): void;
  destroy(): void;
}

export function createFab({ root, onOpen }: FabOptions): Fab {
  const btn = document.createElement('button');
  btn.className = 'msw-fab';
  btn.setAttribute('aria-label', 'Open MSW Devtools');
  btn.innerHTML = icons.flask;

  const badge = document.createElement('span');
  badge.className = 'msw-fab-badge';
  badge.hidden = true;
  btn.appendChild(badge);

  function onClick() {
    onOpen();
  }
  btn.addEventListener('click', onClick);
  root.appendChild(btn);

  return {
    el: btn,
    setBadge(count) {
      if (count > 0) {
        badge.hidden = false;
        badge.textContent = String(count);
        if (!badge.isConnected) btn.appendChild(badge);
      } else if (badge.isConnected) {
        badge.remove();
      }
    },
    destroy() {
      btn.removeEventListener('click', onClick);
      btn.remove();
    },
  };
}
