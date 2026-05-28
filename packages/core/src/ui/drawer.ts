import type { MockKey } from '../handlers/matcher';
import type { MockEntry } from '../handlers/registry';
import type { StateStore } from '../state';
import { icons } from './icons';

export interface DrawerHandlers {
  onToggle(key: MockKey): void;
  onToggleMany(keys: MockKey[], enabled: boolean): void;
  onClearAll(): void;
  onSavePreset(name: string): void;
  onLoadPreset(name: string): void;
  onDeletePreset(name: string): void;
  onCopyShare(): void;
  onClose(): void;
}

export interface DrawerOptions {
  root: HTMLElement;
  state: StateStore;
  entries: MockEntry[];
  handlers: DrawerHandlers;
}

export interface Drawer {
  el: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  render(): void;
  destroy(): void;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

export function createDrawer({ root, state, entries, handlers }: DrawerOptions): Drawer {
  const el = document.createElement('aside');
  el.className = 'msw-drawer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'false');
  el.setAttribute('aria-label', 'MSW Devtools');
  root.appendChild(el);

  let presetInputValue = '';
  let selectedPreset = '';
  const unsubState = state.subscribe(() => render());

  function visibleEntries() {
    const s = state.get();
    const term = s.searchTerm.trim().toLowerCase();
    return entries.filter((e) => {
      if (s.methodFilter.length > 0 && !s.methodFilter.includes(e.method)) return false;
      if (!term) return true;
      return e.displayPath.toLowerCase().includes(term) || e.method.toLowerCase().includes(term);
    });
  }

  function groupedEntries() {
    const groups = new Map<string, MockEntry[]>();
    for (const e of visibleEntries()) {
      const list = groups.get(e.group) ?? [];
      list.push(e);
      groups.set(e.group, list);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function render() {
    const s = state.get();
    const enabledSet = new Set(s.enabledKeys);
    const filtered = visibleEntries();
    const visibleEnabled = filtered.filter((e) => enabledSet.has(e.key)).length;
    const allChecked = filtered.length > 0 && visibleEnabled === filtered.length;
    const someChecked = visibleEnabled > 0 && !allChecked;
    const groups = groupedEntries();
    const visibleGroupNames = groups.map(([n]) => n);
    const allCollapsed =
      visibleGroupNames.length > 0 && visibleGroupNames.every((g) => s.collapsedGroups.includes(g));
    const enabledCount = entries.filter((e) => enabledSet.has(e.key)).length;

    el.innerHTML = `
      <header class="msw-header">
        <div class="msw-title">
          <span class="msw-logo">${icons.flask}</span>
          <span class="msw-title-text">MSW Devtools</span>
          <span class="msw-chip-count">${enabledCount} / ${entries.length}</span>
        </div>
        <button class="msw-close" data-act="close" aria-label="Close">${icons.close}</button>
      </header>

      <section class="msw-toolbar">
        <input class="msw-search" placeholder="Search path or method" value="${escapeHtml(s.searchTerm)}" data-act="search"/>
        <div class="msw-method-row">
          ${METHODS.map((m) => {
            const active = s.methodFilter.includes(m);
            return `<span class="msw-method-chip ${active ? 'active' : ''}"
                          data-act="method" data-method="${m}"
                          style="background:var(--msw-m-${m.toLowerCase()}-${active ? 'fg' : 'bg'});${active ? 'color:#fff;' : `color:var(--msw-m-${m.toLowerCase()}-fg);`}">${m}</span>`;
          }).join('')}
          ${s.methodFilter.length > 0 ? '<span class="msw-method-chip" data-act="method-reset" style="border:1px solid var(--msw-border);color:var(--msw-text-dim)">reset</span>' : ''}
        </div>
      </section>

      <section class="msw-preset-bar">
        <select class="msw-select" data-act="preset-select">
          <option value="">Preset…</option>
          ${s.presets.map((p) => `<option value="${escapeHtml(p.name)}" ${p.name === selectedPreset ? 'selected' : ''}>${escapeHtml(p.name)} (${p.keys.length})</option>`).join('')}
        </select>
        <button class="msw-icon-btn" data-act="save-preset" title="Save preset">${icons.save}</button>
        <button class="msw-icon-btn" data-act="delete-preset" title="Delete preset" ${selectedPreset ? '' : 'disabled'}>${icons.trash}</button>
      </section>

      <section class="msw-preset-input-row">
        <input class="msw-input-sm" placeholder="Save current as preset" value="${escapeHtml(presetInputValue)}" data-act="preset-input"/>
        <button class="msw-icon-btn" data-act="share" title="Copy share URL">${icons.link}</button>
        <button class="msw-icon-btn" data-act="clear" title="Disable all" ${s.enabledKeys.length === 0 ? 'disabled' : ''}>${icons.reset}</button>
      </section>

      <div class="msw-divider"></div>

      <section class="msw-action-row">
        <label style="display:flex;align-items:center;font-size:11px;color:var(--msw-text-dim);cursor:pointer;">
          <span class="msw-checkbox ${allChecked ? 'checked' : someChecked ? 'indeterminate' : ''}" data-act="toggle-visible">${allChecked ? icons.check : ''}</span>
          Visible ${visibleEnabled} / ${filtered.length}
        </label>
        <div style="display:flex;align-items:center;gap:4px;">
          <button class="msw-text-btn" data-act="all-on" ${filtered.length === 0 ? 'disabled' : ''}>All on</button>
          <button class="msw-text-btn muted" data-act="all-off" ${visibleEnabled === 0 ? 'disabled' : ''}>All off</button>
          <button class="msw-text-btn muted" data-act="toggle-collapse-all" ${visibleGroupNames.length === 0 ? 'disabled' : ''}>${allCollapsed ? 'Expand' : 'Collapse'} all</button>
        </div>
      </section>

      <div class="msw-list">
        ${
          groups.length === 0
            ? '<div style="padding:40px 16px;text-align:center;color:var(--msw-text-dim);font-size:12px;">No matching handlers.</div>'
            : groups
                .map(([group, items]) => {
                  const collapsed = s.collapsedGroups.includes(group);
                  const groupEnabled = items.filter((i) => enabledSet.has(i.key)).length;
                  const groupAll = groupEnabled === items.length;
                  const groupSome = groupEnabled > 0 && !groupAll;
                  return `
                <div class="msw-group">
                  <div class="msw-group-header" data-act="toggle-group" data-group="${escapeHtml(group)}">
                    <span class="msw-chevron ${collapsed ? 'collapsed' : ''}">${icons.chevronDown}</span>
                    <span class="msw-group-name">${escapeHtml(group)}</span>
                    <span class="msw-group-count ${groupEnabled > 0 ? 'active' : ''}">${groupEnabled}/${items.length}</span>
                    <span class="msw-checkbox ${groupAll ? 'checked' : groupSome ? 'indeterminate' : ''}"
                          data-act="toggle-group-all" data-group="${escapeHtml(group)}">${groupAll ? icons.check : ''}</span>
                  </div>
                  ${
                    collapsed
                      ? ''
                      : items
                          .map((it) => {
                            const checked = enabledSet.has(it.key);
                            return `
                      <div class="msw-row ${checked ? 'active' : ''}" data-act="toggle-row" data-key="${escapeHtml(it.key)}">
                        <span class="msw-checkbox ${checked ? 'checked' : ''}">${checked ? icons.check : ''}</span>
                        <span class="msw-method-badge" style="background:var(--msw-m-${it.method.toLowerCase()}-bg);color:var(--msw-m-${it.method.toLowerCase()}-fg);">${it.method}</span>
                        <span class="msw-path" title="${escapeHtml(it.displayPath)}">${escapeHtml(it.displayPath)}</span>
                      </div>
                    `;
                          })
                          .join('')
                  }
                </div>
              `;
                })
                .join('')
        }
      </div>
    `;

    el.classList.toggle('open', s.open);
    wire();
  }

  function wire() {
    el.querySelector('[data-act="close"]')?.addEventListener('click', () => {
      state.setOpen(false);
      handlers.onClose();
    });

    const search = el.querySelector('[data-act="search"]') as HTMLInputElement | null;
    if (search) {
      search.addEventListener('input', (e) => {
        state.setSearchTerm((e.target as HTMLInputElement).value);
        // Keep focus stable
        queueMicrotask(() => {
          const next = el.querySelector('[data-act="search"]') as HTMLInputElement | null;
          if (next) {
            next.focus();
            next.selectionStart = next.selectionEnd = next.value.length;
          }
        });
      });
    }

    for (const chip of el.querySelectorAll('[data-act="method"]')) {
      chip.addEventListener('click', () =>
        state.toggleMethodFilter((chip as HTMLElement).dataset.method ?? ''),
      );
    }
    el.querySelector('[data-act="method-reset"]')?.addEventListener('click', () =>
      state.resetMethodFilter(),
    );

    const presetSelect = el.querySelector('[data-act="preset-select"]') as HTMLSelectElement | null;
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        selectedPreset = presetSelect.value;
        if (selectedPreset) handlers.onLoadPreset(selectedPreset);
      });
    }
    el.querySelector('[data-act="save-preset"]')?.addEventListener('click', () => {
      const name = presetInputValue.trim();
      if (!name) return;
      handlers.onSavePreset(name);
      presetInputValue = '';
      selectedPreset = name;
    });
    el.querySelector('[data-act="delete-preset"]')?.addEventListener('click', () => {
      if (selectedPreset) {
        handlers.onDeletePreset(selectedPreset);
        selectedPreset = '';
      }
    });

    const presetInput = el.querySelector('[data-act="preset-input"]') as HTMLInputElement | null;
    if (presetInput) {
      presetInput.addEventListener('input', (e) => {
        presetInputValue = (e.target as HTMLInputElement).value;
      });
      presetInput.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          const name = presetInputValue.trim();
          if (name) {
            handlers.onSavePreset(name);
            presetInputValue = '';
            selectedPreset = name;
          }
        }
      });
    }

    el.querySelector('[data-act="share"]')?.addEventListener('click', () => handlers.onCopyShare());
    el.querySelector('[data-act="clear"]')?.addEventListener('click', () => handlers.onClearAll());

    el.querySelector('[data-act="toggle-visible"]')?.addEventListener('click', () => {
      const enabled = !(
        el.querySelector('[data-act="toggle-visible"]') as HTMLElement
      ).classList.contains('checked');
      handlers.onToggleMany(
        visibleEntries().map((e) => e.key),
        enabled,
      );
    });
    el.querySelector('[data-act="all-on"]')?.addEventListener('click', () =>
      handlers.onToggleMany(
        visibleEntries().map((e) => e.key),
        true,
      ),
    );
    el.querySelector('[data-act="all-off"]')?.addEventListener('click', () =>
      handlers.onToggleMany(
        visibleEntries().map((e) => e.key),
        false,
      ),
    );
    el.querySelector('[data-act="toggle-collapse-all"]')?.addEventListener('click', () => {
      const names = groupedEntries().map(([n]) => n);
      const s = state.get();
      const allCollapsed = names.length > 0 && names.every((g) => s.collapsedGroups.includes(g));
      if (allCollapsed) state.expandAllGroups();
      else state.collapseAllGroups(names);
    });

    for (const gh of el.querySelectorAll('[data-act="toggle-group"]')) {
      gh.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-act="toggle-group-all"]')) return;
        state.toggleGroup((gh as HTMLElement).dataset.group ?? '');
      });
    }
    for (const gc of el.querySelectorAll('[data-act="toggle-group-all"]')) {
      gc.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = (gc as HTMLElement).dataset.group ?? '';
        const items = entries.filter((en) => en.group === group);
        const enabledSet = new Set(state.get().enabledKeys);
        const enabled = items.some((i) => !enabledSet.has(i.key));
        handlers.onToggleMany(
          items.map((i) => i.key),
          enabled,
        );
      });
    }
    for (const row of el.querySelectorAll('[data-act="toggle-row"]')) {
      row.addEventListener('click', () =>
        handlers.onToggle((row as HTMLElement).dataset.key ?? ''),
      );
    }
  }

  render();

  return {
    el,
    open() {
      state.setOpen(true);
    },
    close() {
      state.setOpen(false);
    },
    isOpen: () => state.get().open,
    render,
    destroy() {
      unsubState();
      el.remove();
    },
  };
}
