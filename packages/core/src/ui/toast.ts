export interface ToastInput {
  id: string;
  title: string;
  body: string;
  desc?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastHost {
  show(input: ToastInput): void;
  dismiss(id: string): void;
  destroy(): void;
}

const DEFAULT_DURATION = 4000;
const MAX_STACK = 3;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

export function createToastHost(root: HTMLElement): ToastHost {
  const stack = document.createElement('div');
  stack.className = 'msw-toast-stack';
  root.appendChild(stack);

  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function dismiss(id: string) {
    const t = timers.get(id);
    if (t) {
      clearTimeout(t);
      timers.delete(id);
    }
    const el = stack.querySelector(`[data-id="${CSS.escape(id)}"]`);
    el?.remove();
  }

  function trimStack() {
    while (stack.children.length > MAX_STACK) {
      const first = stack.firstElementChild;
      if (!first) break;
      const id = first.getAttribute('data-id');
      if (id) {
        const t = timers.get(id);
        if (t) clearTimeout(t);
        timers.delete(id);
      }
      first.remove();
    }
  }

  return {
    show(input) {
      dismiss(input.id);
      const el = document.createElement('div');
      el.className = 'msw-toast';
      el.setAttribute('data-id', input.id);
      el.innerHTML = `
        <div class="msw-toast-title">${escapeHtml(input.title)}</div>
        <div class="msw-toast-body">${escapeHtml(input.body)}</div>
        ${input.desc ? `<div class="msw-toast-desc">${escapeHtml(input.desc)}</div>` : ''}
        <div class="msw-toast-actions">
          <button class="msw-toast-btn-ghost" data-act="dismiss">Dismiss</button>
          ${input.action ? `<button class="msw-toast-btn-primary" data-act="primary">${escapeHtml(input.action.label)}</button>` : ''}
        </div>
      `;
      el.querySelector('[data-act="dismiss"]')?.addEventListener('click', () => dismiss(input.id));
      if (input.action) {
        el.querySelector('[data-act="primary"]')?.addEventListener('click', () => {
          input.action?.onClick();
          dismiss(input.id);
        });
      }
      stack.appendChild(el);
      trimStack();

      const t = setTimeout(() => dismiss(input.id), input.duration ?? DEFAULT_DURATION);
      timers.set(input.id, t);
    },
    dismiss,
    destroy() {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      stack.remove();
    },
  };
}
