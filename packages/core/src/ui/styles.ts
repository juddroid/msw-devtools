export const STYLE_TAG_ATTR = 'data-msw-devtools';
export const ROOT_ATTR = 'data-msw-devtools-root';

const cssTokens = `
[${ROOT_ATTR}] {
  --msw-bg: #0F0F12;
  --msw-bg-elev: #17171C;
  --msw-bg-row-active: rgba(139, 127, 248, 0.10);
  --msw-bg-row-hover: rgba(255, 255, 255, 0.04);
  --msw-border: #25252C;
  --msw-text: #ECECEE;
  --msw-text-dim: #8A8A93;
  --msw-text-faint: #5A5A62;
  --msw-accent: #8B7FF8;
  --msw-accent-bg: rgba(139, 127, 248, 0.16);
  --msw-accent-bg-strong: rgba(139, 127, 248, 0.28);
  --msw-danger: #FF6B6B;
  --msw-m-get-bg: rgba(91, 169, 248, 0.15);
  --msw-m-get-fg: #7AB7F9;
  --msw-m-post-bg: rgba(94, 197, 143, 0.15);
  --msw-m-post-fg: #6FCFA0;
  --msw-m-put-bg: rgba(240, 164, 85, 0.15);
  --msw-m-put-fg: #F2B26F;
  --msw-m-delete-bg: rgba(242, 109, 109, 0.15);
  --msw-m-delete-fg: #F58787;
  --msw-m-patch-bg: rgba(185, 143, 245, 0.15);
  --msw-m-patch-fg: #C4A6F7;
}
[${ROOT_ATTR}][data-theme='light'] {
  --msw-bg: #FFFFFF;
  --msw-bg-elev: #F7F7F9;
  --msw-bg-row-active: rgba(139, 127, 248, 0.10);
  --msw-bg-row-hover: rgba(0, 0, 0, 0.04);
  --msw-border: #E5E5EA;
  --msw-text: #1C1C1F;
  --msw-text-dim: #6E6E76;
  --msw-text-faint: #ADADB5;
}
`;

const cssBase = `
[${ROOT_ATTR}] {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--msw-text);
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
}
[${ROOT_ATTR}] * { box-sizing: border-box; }
[${ROOT_ATTR}] button { font-family: inherit; }
`;

const cssFab = `
[${ROOT_ATTR}] .msw-fab {
  position: fixed; width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #8B7FF8 0%, #6E5FF0 100%);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: none;
  box-shadow: 0 4px 14px rgba(110,95,240,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset;
  transition: transform 120ms ease, box-shadow 120ms ease;
}
[${ROOT_ATTR}] .msw-fab:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(110,95,240,0.55); }
[${ROOT_ATTR}] .msw-fab svg { width: 16px; height: 16px; }
[${ROOT_ATTR}] .msw-fab-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: var(--msw-accent); color: #fff;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 2px var(--msw-bg);
}
[${ROOT_ATTR}].pos-bottom-right .msw-fab { right: 18px; bottom: 18px; }
[${ROOT_ATTR}].pos-bottom-left .msw-fab { left: 18px; bottom: 18px; }
[${ROOT_ATTR}].pos-top-right .msw-fab { right: 18px; top: 18px; }
[${ROOT_ATTR}].pos-top-left .msw-fab { left: 18px; top: 18px; }
`;

const cssDrawer = `
[${ROOT_ATTR}] .msw-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 100vw;
  background: var(--msw-bg);
  border-left: 1px solid var(--msw-border);
  box-shadow: -10px 0 40px rgba(0,0,0,0.4);
  display: flex; flex-direction: column;
  transform: translateX(100%); transition: transform 200ms ease-out;
}
[${ROOT_ATTR}] .msw-drawer.open { transform: translateX(0); }
[${ROOT_ATTR}] .msw-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--msw-border);
}
[${ROOT_ATTR}] .msw-title { display: flex; align-items: center; gap: 8px; }
[${ROOT_ATTR}] .msw-logo {
  width: 22px; height: 22px; border-radius: 6px;
  background: linear-gradient(135deg, #8B7FF8, #6E5FF0);
  display: flex; align-items: center; justify-content: center;
}
[${ROOT_ATTR}] .msw-logo svg { width: 12px; height: 12px; color: #fff; }
[${ROOT_ATTR}] .msw-title-text { font-weight: 600; font-size: 14px; }
[${ROOT_ATTR}] .msw-chip-count {
  background: var(--msw-accent-bg); color: var(--msw-accent);
  padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
}
[${ROOT_ATTR}] .msw-close {
  background: transparent; border: none; color: var(--msw-text-dim);
  cursor: pointer; padding: 4px; border-radius: 4px;
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
}
[${ROOT_ATTR}] .msw-close:hover { background: var(--msw-bg-row-hover); color: var(--msw-text); }
[${ROOT_ATTR}] .msw-close svg { width: 14px; height: 14px; }

[${ROOT_ATTR}] .msw-toolbar { padding: 12px 16px 8px; }
[${ROOT_ATTR}] .msw-search {
  width: 100%; box-sizing: border-box;
  background: var(--msw-bg-elev); border: 1px solid var(--msw-border);
  color: var(--msw-text); font-size: 13px;
  padding: 8px 10px 8px 32px; border-radius: 6px;
}
[${ROOT_ATTR}] .msw-search:focus { outline: 2px solid var(--msw-accent); outline-offset: -1px; }
[${ROOT_ATTR}] .msw-method-row { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
[${ROOT_ATTR}] .msw-method-chip {
  font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
  padding: 4px 8px; border-radius: 4px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  cursor: pointer; border: 1px solid transparent; user-select: none;
}
[${ROOT_ATTR}] .msw-method-chip.active { color: #fff; }

[${ROOT_ATTR}] .msw-preset-bar { display: flex; gap: 6px; padding: 6px 16px; align-items: center; }
[${ROOT_ATTR}] .msw-select {
  flex: 1; background: var(--msw-bg-elev); border: 1px solid var(--msw-border);
  color: var(--msw-text); font-size: 12px; padding: 6px 8px; border-radius: 6px; cursor: pointer;
}
[${ROOT_ATTR}] .msw-icon-btn {
  background: var(--msw-bg-elev); border: 1px solid var(--msw-border);
  color: var(--msw-text-dim); width: 30px; height: 30px; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
[${ROOT_ATTR}] .msw-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
[${ROOT_ATTR}] .msw-icon-btn:hover:not(:disabled) {
  background: var(--msw-accent-bg); color: var(--msw-accent);
  border-color: rgba(139,127,248,0.4);
}
[${ROOT_ATTR}] .msw-icon-btn svg { width: 14px; height: 14px; }
[${ROOT_ATTR}] .msw-preset-input-row { display: flex; gap: 6px; padding: 0 16px 10px; align-items: center; }
[${ROOT_ATTR}] .msw-input-sm {
  flex: 1; background: var(--msw-bg-elev); border: 1px solid var(--msw-border);
  color: var(--msw-text); font-size: 12px; padding: 6px 8px; border-radius: 6px;
}
[${ROOT_ATTR}] .msw-divider { height: 1px; background: var(--msw-border); }

[${ROOT_ATTR}] .msw-action-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px;
}
[${ROOT_ATTR}] .msw-checkbox {
  width: 14px; height: 14px; border-radius: 3px;
  border: 1.5px solid var(--msw-text-faint);
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 6px;
}
[${ROOT_ATTR}] .msw-checkbox.checked { background: var(--msw-accent); border-color: var(--msw-accent); }
[${ROOT_ATTR}] .msw-checkbox.checked svg { width: 9px; height: 9px; }
[${ROOT_ATTR}] .msw-checkbox.indeterminate {
  background: var(--msw-accent-bg-strong); border-color: var(--msw-accent);
}
[${ROOT_ATTR}] .msw-checkbox.indeterminate::after {
  content: ''; width: 7px; height: 2px; background: var(--msw-accent); border-radius: 1px;
}

[${ROOT_ATTR}] .msw-text-btn {
  background: transparent; border: none; color: var(--msw-accent);
  font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; cursor: pointer;
}
[${ROOT_ATTR}] .msw-text-btn.muted { color: var(--msw-text-dim); }
[${ROOT_ATTR}] .msw-text-btn:disabled { opacity: 0.5; cursor: not-allowed; }
[${ROOT_ATTR}] .msw-text-btn:hover:not(:disabled) { background: var(--msw-accent-bg); }

[${ROOT_ATTR}] .msw-list { flex: 1; overflow-y: auto; padding: 4px 8px 24px; }
[${ROOT_ATTR}] .msw-group { margin-top: 6px; }
[${ROOT_ATTR}] .msw-group-header {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-radius: 6px; cursor: pointer; user-select: none;
}
[${ROOT_ATTR}] .msw-group-header:hover { background: var(--msw-bg-row-hover); }
[${ROOT_ATTR}] .msw-chevron { color: var(--msw-text-dim); display: flex; transition: transform 120ms ease; }
[${ROOT_ATTR}] .msw-chevron.collapsed { transform: rotate(-90deg); }
[${ROOT_ATTR}] .msw-chevron svg { width: 12px; height: 12px; }
[${ROOT_ATTR}] .msw-group-name { font-weight: 600; font-size: 12px; color: var(--msw-text); flex: 1; }
[${ROOT_ATTR}] .msw-group-count {
  background: var(--msw-bg-elev); color: var(--msw-text-dim);
  padding: 2px 7px; border-radius: 9px; font-size: 10px; font-weight: 600;
}
[${ROOT_ATTR}] .msw-group-count.active { background: var(--msw-accent-bg); color: var(--msw-accent); }

[${ROOT_ATTR}] .msw-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px 5px 4px; margin-left: 14px;
  border-radius: 6px; cursor: pointer;
}
[${ROOT_ATTR}] .msw-row.active { background: var(--msw-bg-row-active); }
[${ROOT_ATTR}] .msw-row:hover { background: var(--msw-bg-row-hover); }
[${ROOT_ATTR}] .msw-row.active:hover { background: var(--msw-accent-bg); }
[${ROOT_ATTR}] .msw-method-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 52px; padding: 2px 6px; border-radius: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.4px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
}
[${ROOT_ATTR}] .msw-path {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 12px; color: var(--msw-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
}
[${ROOT_ATTR}] .msw-row:not(.active) .msw-path { color: var(--msw-text-dim); }

[${ROOT_ATTR}] .msw-toast-stack {
  position: fixed; top: 20px; right: 18px;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}
[${ROOT_ATTR}] .msw-toast {
  width: 280px; background: var(--msw-bg-elev); border: 1px solid var(--msw-border);
  border-left: 2px solid var(--msw-accent); border-radius: 8px;
  padding: 10px 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  pointer-events: auto;
}
[${ROOT_ATTR}] .msw-toast-title { font-size: 11px; font-weight: 700; color: var(--msw-accent); margin-bottom: 4px; }
[${ROOT_ATTR}] .msw-toast-body { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
[${ROOT_ATTR}] .msw-toast-desc { font-size: 11px; color: var(--msw-text-dim); margin-bottom: 8px; line-height: 1.4; }
[${ROOT_ATTR}] .msw-toast-actions { display: flex; justify-content: flex-end; gap: 4px; }
[${ROOT_ATTR}] .msw-toast-btn-primary {
  background: var(--msw-accent); color: #fff; font-size: 11px; font-weight: 600;
  padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer;
}
[${ROOT_ATTR}] .msw-toast-btn-ghost {
  background: transparent; color: var(--msw-text-dim);
  font-size: 11px; padding: 4px 8px; border: none; cursor: pointer; border-radius: 4px;
}

@media (max-width: 640px) {
  [${ROOT_ATTR}] .msw-drawer { width: 100vw; }
}
`;

export const css = `${cssTokens}\n${cssBase}\n${cssFab}\n${cssDrawer}`;
