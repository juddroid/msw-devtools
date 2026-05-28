# MSW Devtools — Public NPM Library Design

**Date**: 2026-05-28
**Owner**: Dongcheol Jeong (@juddroid)
**Origin**: Extracted from internal `bubbletap-admin/packages/admin-service/src/dev/MSWDevtools.tsx`
**Target release**: v0.1.0

---

## 1. Goals & Non-Goals

### Goals

1. Publish a polished public NPM library that lets developers visually toggle MSW request handlers at runtime.
2. Be **framework-agnostic at the core** with a first-class React adapter.
3. Be **safe to install in any production app**: zero impact on host styles, zero global mutations, opt-in via `enabled` prop.
4. **Modern devtools aesthetic** — dark-first UI, compact, keyboard-friendly.
5. **Universal compatibility**: ESM+CJS dual, SSR-safe, works in Vite/Webpack/Rollup/Turbopack/Parcel, React 18+19, Next.js App+Pages router.
6. **Observability for the maintainer**: structured logging, version-tagged errors, GitHub issue templates.

### Non-Goals (v0.1.0)

- Vue/Svelte first-party adapters (vanilla core makes them possible later, but no official packages).
- Telemetry/phone-home (privacy + trust).
- Mock response editor (changing handler body at runtime). Toggle only.
- Recording/replay of real network traffic.
- E2E test automation via Playwright (deferred to v1.x).
- Resizable/pinnable drawer (deferred to v1.x).
- Shadow DOM isolation (deferred to v1.x; revisit if CSS conflicts reported).

---

## 2. Source of Truth — what we are extracting

Current code at `bubbletap-admin/packages/admin-service/src/dev/MSWDevtools.tsx` (commit `dd4e442`) implements:

- FAB + drawer UI to toggle MSW handlers
- Path-prefix automatic grouping (currently hard-coded to bubbletap domains)
- Search box, method filter chips
- Preset save/load/delete
- Share URL via base64-encoded `?msw=` query param
- localStorage persistence via zustand `persist`
- Axios response interceptor — shows "enable mock" toast when an unhandled request matches a registered-but-disabled mock
- `window.dispatchEvent('msw-devtools:reset')` on toggle, consumed by host's ErrorBoundary
- React Query refetch on mock change

Heavy host-app couplings to remove:
- MUI components (`@mui/material`, `@mui/icons-material`)
- `styled-components`
- `zustand` (for `persist`)
- `react-hot-toast`
- `@tanstack/react-query` import
- `axios` `axiosInstanceWithFirebaseAuth` import
- Hard-coded group rules referencing bubbletap routes
- `import.meta.env.VITE_APP_API_BASE_URL` access

---

## 3. Package & Repo Structure

### Repository

- GitHub: `juddroid/msw-devtools` (monorepo)
- License: MIT
- Package manager: pnpm + workspaces
- Lint/format: **Biome** (single tool, no eslint/prettier)
- Build: **tsup** (ESM + CJS dual, .d.ts, `'use client'` banner preservation)
- Tests: **vitest** + `@testing-library/react` + `happy-dom`
- Version/release: **changesets**
- CI: GitHub Actions

### Packages

| Package | Purpose | Peer deps |
|---|---|---|
| `@juddroid/msw-devtools-core` | Framework-agnostic state + DOM-rendered UI | `msw ^2` |
| `@juddroid/msw-devtools-react` | React adapter (Provider + Hook) | `react ^18 \|\| ^19`, `msw ^2`, `@juddroid/msw-devtools-core` |

### Repo layout

```
juddroid/msw-devtools/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── index.ts                  # createMswDevtools, types
│   │       ├── controller.ts             # facade, lifecycle
│   │       ├── state.ts                  # observable state store
│   │       ├── handlers/
│   │       │   ├── registry.ts           # MSW handler → entry conversion
│   │       │   ├── matcher.ts            # path → RegExp
│   │       │   └── grouping.ts           # group inference, user-overridable
│   │       ├── worker.ts                 # setupWorker wrapper + sync
│   │       ├── persistence.ts            # localStorage + migration
│   │       ├── share.ts                  # share URL codec (validated)
│   │       ├── unhandled.ts              # mismatch toast logic
│   │       ├── ui/
│   │       │   ├── render.ts             # root portal mount
│   │       │   ├── fab.ts                # FAB
│   │       │   ├── drawer.ts             # drawer + list
│   │       │   ├── toast.ts              # mini toast
│   │       │   ├── styles.ts             # CSS string (theme variables)
│   │       │   └── icons.ts              # inline SVG strings
│   │       └── events.ts                 # tiny EventEmitter
│   └── react/
│       └── src/
│           ├── index.ts                  # 'use client' + re-exports
│           ├── MswDevtools.tsx           # main component
│           ├── provider.tsx              # Context
│           └── use-msw-devtools.ts       # hook
├── examples/
│   ├── vite-react/
│   ├── nextjs-app/                       # App Router example
│   └── vanilla/
├── pnpm-workspace.yaml
├── biome.json
├── tsconfig.base.json
├── .changeset/
└── .github/
    ├── workflows/
    │   ├── ci.yml
    │   └── release.yml
    └── ISSUE_TEMPLATE/
        └── bug.yml
```

---

## 4. Public API

### 4.1 Core API — `@juddroid/msw-devtools-core`

```ts
import type { RequestHandler } from 'msw';

export type MockKey = string; // "GET::/users/:id"

export interface MswDevtoolsOptions {
  /** MSW request handlers (the same array passed to setupWorker). */
  handlers: RequestHandler[];

  /** API base URL to strip from displayed paths and matching. */
  baseUrl?: string;

  /** Override group inference. Default groups everything under 'Other'. */
  groupBy?: (path: string, method: string) => string;

  /** Keys enabled on first run (only when no persisted state exists). */
  defaultEnabled?: MockKey[];

  /** localStorage namespace. Default 'msw-devtools'. */
  storageKey?: string;

  /** FAB anchor. Default 'bottom-right'. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

  /** Theme. Default 'auto' follows prefers-color-scheme. */
  theme?: 'light' | 'dark' | 'auto';

  /** Z-index for root container. Default 2147483000. */
  zIndex?: number;

  /** URL query param name for share links. Default 'msw'. */
  shareParam?: string;

  /** Enable global keyboard shortcuts (⌘K toggle, / focus search, Esc close, j/k navigate). Default false. */
  keyboard?: boolean;

  /** Auto-start MSW worker on mount. Default true. */
  autoStart?: boolean;

  /** Forwarded to worker.start(). */
  workerStartOptions?: Parameters<ReturnType<typeof import('msw/browser').setupWorker>['start']>[0];

  /** Pluggable logger. Defaults to console.error/warn with '[msw-devtools]' prefix. */
  logger?: {
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
  };

  /** Default 'warn'. */
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export interface MswDevtoolsInstance {
  // lifecycle
  mount(container?: HTMLElement): void;
  unmount(): void;
  dispose(): Promise<void>;

  // queries
  getEnabledKeys(): MockKey[];
  isEnabled(method: string, url: string): boolean;
  findMatching(method: string, url: string): MockEntry | null;
  getState(): DevtoolsState;

  // mutations
  enable(key: MockKey): void;
  disable(key: MockKey): void;
  toggle(key: MockKey): void;
  setEnabled(keys: MockKey[]): void;

  // cross-cutting
  notifyUnhandledRequest(input: { method: string; url: string }): void;

  // events
  on(event: 'mock-change', listener: (keys: MockKey[]) => void): () => void;
  on(event: 'reset', listener: () => void): () => void;
  on(event: 'ready', listener: () => void): () => void;

  // observable state
  subscribe(listener: (state: DevtoolsState) => void): () => void;

  /** Library version baked into the build. */
  readonly version: string;
}

export interface MockEntry {
  key: MockKey;
  method: string;
  path: string;
  displayPath: string;
  group: string;
}

export interface DevtoolsState {
  enabledKeys: MockKey[];
  presets: { name: string; keys: MockKey[] }[];
  methodFilter: string[];
  collapsedGroups: string[];
  searchTerm: string;
  open: boolean;
}

export function createMswDevtools(options: MswDevtoolsOptions): MswDevtoolsInstance;
export function getMockKey(method: string | RegExp, path: string | RegExp): MockKey;
```

### 4.2 React API — `@juddroid/msw-devtools-react`

All exports declare `'use client'`.

```tsx
import type { MockKey, MswDevtoolsOptions } from '@juddroid/msw-devtools-core';

export interface MswDevtoolsProps extends MswDevtoolsOptions {
  children?: ReactNode;
  /** When false the entire devtool is not mounted. Use for production gating. Default true. */
  enabled?: boolean;
  onMockChange?: (keys: MockKey[]) => void;
  onReset?: () => void;
  onReady?: () => void;
}

export function MswDevtools(props: MswDevtoolsProps): JSX.Element;

export function useMswDevtools(): {
  enabledKeys: MockKey[];
  isEnabled(method: string, url: string): boolean;
  enable(key: MockKey): void;
  disable(key: MockKey): void;
  toggle(key: MockKey): void;
  setEnabled(keys: MockKey[]): void;
  notifyUnhandledRequest(input: { method: string; url: string }): void;
};

export type { MockKey, MswDevtoolsOptions } from '@juddroid/msw-devtools-core';
```

### 4.3 Usage patterns

**Vanilla / any framework:**

```ts
import { createMswDevtools } from '@juddroid/msw-devtools-core';
import { handlers } from './mocks/handlers';

const devtools = createMswDevtools({
  handlers,
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});
devtools.mount();
```

**React + axios + react-query:**

```tsx
'use client';
import { MswDevtools, useMswDevtools } from '@juddroid/msw-devtools-react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

function AxiosBridge() {
  const { notifyUnhandledRequest } = useMswDevtools();
  useEffect(() => {
    const id = axios.interceptors.response.use(undefined, (err) => {
      notifyUnhandledRequest({
        method: err.config?.method ?? '',
        url: (err.config?.baseURL ?? '') + (err.config?.url ?? ''),
      });
      throw err;
    });
    return () => axios.interceptors.response.eject(id);
  }, [notifyUnhandledRequest]);
  return null;
}

function App() {
  const queryClient = useQueryClient();
  return (
    <MswDevtools
      handlers={handlers}
      baseUrl={import.meta.env.VITE_API_BASE_URL}
      enabled={import.meta.env.DEV}
      onMockChange={() => queryClient.refetchQueries({ type: 'all' })}
      onReset={() => window.dispatchEvent(new Event('app:error-boundary-reset'))}
    >
      <AxiosBridge />
      <Routes />
    </MswDevtools>
  );
}
```

**Next.js App Router:**

```tsx
// app/providers.tsx
'use client';
import { MswDevtools } from '@juddroid/msw-devtools-react';
import { handlers } from '@/mocks/handlers';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MswDevtools handlers={handlers} enabled={process.env.NODE_ENV !== 'production'}>
      {children}
    </MswDevtools>
  );
}
```

---

## 5. Architecture

### 5.1 Layered structure (core)

```
┌─────────────────────────────────────────────────┐
│  Public API (createMswDevtools)                  │
├─────────────────────────────────────────────────┤
│  Controller (facade, lifecycle)                  │
├─────────────────────────────────────────────────┤
│  State (observable) ←→ Persistence (localStorage)│
├─────────────────────────────────────────────────┤
│  HandlerRegistry / Matcher / Grouping            │
├─────────────────────────────────────────────────┤
│  WorkerSync (setupWorker + resetHandlers + use)  │
├─────────────────────────────────────────────────┤
│  UI Renderer (vanilla DOM: FAB, Drawer, Toast)   │
└─────────────────────────────────────────────────┘
         ↑                       ↑
   Share URL Codec         Unhandled Matcher
```

### 5.2 React adapter

```tsx
function MswDevtools({ enabled = true, children, ...opts }) {
  if (!enabled) return <>{children}</>;
  const [instance, setInstance] = useState<MswDevtoolsInstance | null>(null);

  useEffect(() => {
    const inst = createMswDevtools(opts);
    inst.mount();
    if (opts.onMockChange) inst.on('mock-change', opts.onMockChange);
    if (opts.onReset) inst.on('reset', opts.onReset);
    if (opts.onReady) inst.on('ready', opts.onReady);
    setInstance(inst);
    return () => { void inst.dispose(); };
  }, [stableDeps(opts)]);

  return (
    <MswDevtoolsContext.Provider value={instance}>
      {children}
    </MswDevtoolsContext.Provider>
  );
}

function useMswDevtools() {
  const inst = useContext(MswDevtoolsContext);
  const state = useSyncExternalStore(
    inst?.subscribe ?? noopSubscribe,
    () => inst?.getState() ?? defaultState,
    () => defaultState, // SSR
  );
  return useMemo(/* method bindings */, [inst, state]);
}
```

---

## 6. Data Flow & Lifecycle

### 6.1 Initialization

```
createMswDevtools(options)            [sync, side-effect free]
        ↓ returns instance
instance.mount(container?)            [async]
        ├─ 1. Hydrate state from localStorage (or default)
        ├─ 2. Parse URL share param
        │     ├─ present → decode → set enabled → strip param from URL
        │     └─ absent + no persist → apply defaultEnabled
        ├─ 3. setupWorker(...allHandlers).start(workerStartOptions) ─┐
        ├─ 4. on ready: resetHandlers + use(active subset)           │ await
        ├─ 5. emit 'ready'                                           │
        └─ 6. mount DOM (root div + FAB + drawer + style tag)        │
```

### 6.2 Toggle hot path

```
user toggle
   → state.update(reducer)            [sync]
   → subscribers notified             [immediate UI re-render]
   → persistence.scheduleSave()       [100ms debounce]
   → worker.scheduleSync()            [50ms debounce → resetHandlers + use()]
   → emit 'mock-change' / 'reset'     [200ms debounce, batches bulk toggles]
```

### 6.3 Share URL

- Encode: `btoa(JSON.stringify(enabledKeys))` set to `?${shareParam}=…`.
- Decode: `JSON.parse(decodeURIComponent(escape(atob(param))))`. Result must be `string[]`; anything else is dropped silently with a dev warning.

### 6.4 Unhandled request matching

```
devtools.notifyUnhandledRequest({ method, url })
  → stripBaseUrl(url) → pathOnly
  → find entry where method matches AND matcher.test(pathOnly)
  → if found && disabled:
        show toast id 'msw-miss-<key>' (dedupe within 8s)
        actions: [Dismiss] [Enable mock]
```

### 6.5 State shape

```ts
interface PersistedShape {
  version: 1;
  enabledKeys: string[];
  presets: { name: string; keys: string[] }[];
  methodFilter: string[];
  collapsedGroups: string[];
}
```

`searchTerm` and `open` are transient (not persisted).

**Migration**: on load, if `version` is unknown or higher than the code, the existing blob is moved to `${storageKey}:backup` and state is reset.

### 6.6 Dispose

```
instance.dispose()
  ├─ worker.resetHandlers()
  ├─ worker.stop()                    [async]
  ├─ removeEventListener × N (all)
  ├─ remove <style data-msw-devtools>
  ├─ remove root <div data-msw-devtools-root>
  ├─ clearTimeout × all
  ├─ subscribers.clear()
  └─ events.clear()
```

---

## 7. UI / UX

### 7.1 Visual tone

Modern devtools aesthetic, reference set: React Query Devtools, Vercel toolbar, Linear, Astro DevToolbar.

- **Theme**: dark default; light + auto follow `prefers-color-scheme`.
- **Typography**: system font stack (no remote font load). Monospace for paths/methods.
- **Density**: compact rows (~28px), 12–13px body text.
- **Radii**: 6–8px. Subtle shadows. 1px hairline borders.

### 7.2 Color tokens (CSS variables exposed on root)

```css
[data-msw-devtools-root] {
  --msw-bg:        #0F0F12;
  --msw-bg-elev:   #17171C;
  --msw-border:    #25252C;
  --msw-text:      #ECECEE;
  --msw-text-dim:  #8A8A93;
  --msw-accent:    #8B7FF8;
  --msw-accent-bg: rgba(139,127,248,0.16);
  --msw-danger:    #FF6B6B;
  --msw-m-get:     #5BA9F8;
  --msw-m-post:    #5EC58F;
  --msw-m-put:     #F0A455;
  --msw-m-delete:  #F26D6D;
  --msw-m-patch:   #B98FF5;
}
```

A `[data-theme='light']` variant overrides these for the light theme.

### 7.3 Layout

- FAB: 36–38px circle, bottom-right by default, accent badge for enabled count.
- Drawer: 420px wide on desktop, full-width below 640px, slide-in from `position` anchor.
- Sections (top → bottom): header → search/method-filter → preset bar → action row → grouped list.
- Toast: 280px wide, anchored top-right, accent left border, max 3 stacked.

### 7.4 Interactions

- Click anywhere on a row to toggle.
- Group header click to collapse/expand; group checkbox is its own hit target.
- Search is instant (no debounce — handler list is small).
- Keyboard shortcuts (opt-in via `keyboard: true` option, **default off** to avoid host conflicts):
  - `⌘K` / `Ctrl+K` toggle drawer
  - `/` focus search (when drawer open)
  - `Esc` close drawer
  - `j` / `k` navigate rows
  - `Space` / `Enter` toggle focused row

### 7.5 Accessibility

- `role="dialog"` `aria-modal="false"` on drawer (non-blocking).
- Every interactive element has `aria-label` or accessible text.
- WCAG AA contrast on both themes.
- Focus rings visible (`outline: 2px solid var(--msw-accent)`).
- No focus trap.

### 7.6 Style injection

- A single `<style data-msw-devtools>` element appended to `document.head`.
- All selectors scoped via `[data-msw-devtools-root]` ancestor.
- Global selectors (`*`, `html`, `body`) are never used.
- Inline SVG icons — no icon font, no external sprite.

---

## 8. Library Quality Requirements

### 8.1 Universal compatibility

| Concern | Approach |
|---|---|
| Module format | ESM + CJS dual via tsup |
| `exports` map | Explicit, single entry only |
| Types | `.d.ts` for both ESM/CJS |
| TS support | Strict; targets TS 4.7+ |
| Bundlers | Verified against Vite, Webpack 4/5, Rollup, esbuild, Turbopack, Parcel |
| React | 18.x and 19.x via peer range `^18 \|\| ^19` |
| Next.js | App Router + Pages Router, `'use client'` banner preserved |
| SSR | All `window`/`document`/`localStorage` reads inside `useEffect` or after `mount()` |
| Browsers | Latest Chrome/Firefox/Safari/Edge (MSW v2 baseline) |
| Node | 18+ (MSW v2 baseline) |
| Tree-shake | `"sideEffects": false` + ESM-first |
| Size budget | core ≤ 25 KB gzipped, react ≤ 4 KB gzipped (enforced by `size-limit` in CI) |
| Source maps | Published to npm |

### 8.2 Host-app safety (no style/script interference)

| Concern | Approach |
|---|---|
| CSS scoping | All selectors descend from `[data-msw-devtools-root]`. No `*`, `html`, `body`. |
| Style injection | Single `<style data-msw-devtools>` tag at the end of `<head>`. |
| DOM isolation | Dedicated `<div data-msw-devtools-root>` appended to `document.body`, outside host React tree. |
| Globals | No `window.X = …`, no monkey-patch of `fetch`/`XHR`/`console`. |
| Listener leaks | Every `addEventListener` paired with `removeEventListener` in `dispose()`. |
| z-index | Default `2147483000`; configurable via `zIndex` option. |
| Body scroll | Never locked. Focus is never trapped. |
| Production gating | `enabled` prop (React) or skip `mount()` (vanilla). When `false`, no DOM/listeners/worker. |
| Storage key | Namespaced (`msw-devtools` default, fully overridable). |
| Service worker | Library only starts/stops a worker it created; never touches host SW registrations. |
| Console pollution | Silent on success. Logs only on error/warn (configurable level). |

### 8.3 Observability (so the maintainer can find issues)

| Concern | Approach |
|---|---|
| Internal error boundary | UI render code wrapped in try/catch → fallback UI; never crashes host app. |
| Pluggable logger | `options.logger` (default: `console.*` with `[msw-devtools]` prefix). |
| Log level | `options.logLevel`: `silent`/`error`/`warn`/`info`/`debug`. Default `warn`. |
| Error messages | All messages include "See https://github.com/juddroid/msw-devtools/issues/new" link. |
| Dev-only assertions | Wrapped in `process.env.NODE_ENV !== 'production'` so prod builds strip them. |
| Version | `instance.version` and `MswDevtools.version` static field, baked from `package.json`. |
| Telemetry | **None**. No phone-home in v0/v1. |
| Issue template | `.github/ISSUE_TEMPLATE/bug.yml` auto-asks for version/browser/bundler. |

### 8.4 Security & legal

| Concern | Approach |
|---|---|
| License | MIT (LICENSE file + package.json) |
| Runtime deps | Zero outside peer deps. |
| Share URL input | Strict shape validation (must be `string[]`); silent reject otherwise. |
| XSS | User strings (search, preset names) rendered as text nodes only. No `innerHTML`. |
| npm 2FA | Required on the publisher account. |
| Publish | `npm publish --provenance` via GitHub Actions. |

---

## 9. Error Handling Matrix

| Scenario | Response |
|---|---|
| MSW worker `start()` rejects | logger.error; FAB visible but greyed out; host app unaffected. |
| Empty `handlers` array | Empty state UI; dev warning. |
| Malformed handler entry | Skip entry, dev warning; rest works. |
| localStorage access throws | In-memory fallback; warn once. |
| localStorage JSON parse error | Backup raw to `${storageKey}:backup`; reset to defaults; warn. |
| Persisted schema version mismatch | Try migrator → on failure, backup + reset. |
| Share URL decode failure | Drop param silently; dev warning. |
| `navigator.clipboard` unavailable/denied | Toast with manual-copy URL fallback. |
| UI render exception | Internal ErrorBoundary → fallback UI inside drawer; host unaffected. |
| `dispose()` exception | Swallowed (already tearing down). |
| Double `mount()` | Warn + return existing instance. |
| Multiple `<MswDevtools>` mounted | Warn; first instance wins; context not duplicated. |

---

## 10. Testing Strategy

```
packages/core/__tests__/
├── handlers/
│   ├── matcher.test.ts          # path → regex (params, wildcards, query)
│   ├── grouping.test.ts         # default + custom groupBy
│   └── registry.test.ts         # entry conversion, key stability
├── state.test.ts                 # all mutations, subscribe
├── persistence.test.ts           # save/load, migration, failure fallback
├── share.test.ts                 # encode/decode roundtrip, invalid input
├── unhandled.test.ts             # matching + dedupe
├── controller.test.ts            # mount/unmount/dispose lifecycle
└── integration.test.ts           # MSW worker (happy-dom)

packages/react/__tests__/
├── MswDevtools.test.tsx          # mount, prop changes, enabled guard
├── use-msw-devtools.test.tsx     # hook + SSR snapshot
└── integration.test.tsx          # Provider + hook combined
```

Stack: `vitest` + `@testing-library/react` + `happy-dom`. Coverage thresholds: core ≥ 90%, react ≥ 80%.

Critical scenarios:
- Mount → toggle → unmount × 100 (leak detection).
- Two simultaneous instances (isolation).
- localStorage quota exceeded.
- Handler prop change → worker re-sync.
- SSR snapshot returns safe default.

E2E with Playwright (vite-react example) deferred to v1.x.

---

## 11. Build & Packaging

### tsup config (react)

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  banner: { js: '"use client";' },
  external: ['react', 'react-dom', 'msw', '@juddroid/msw-devtools-core'],
});
```

### package.json (per package)

```json
{
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/juddroid/msw-devtools.git",
    "directory": "packages/<name>"
  },
  "bugs": "https://github.com/juddroid/msw-devtools/issues",
  "homepage": "https://github.com/juddroid/msw-devtools#readme",
  "keywords": ["msw", "mock", "devtools", "mock-service-worker", "react", "developer-tools"]
}
```

CSS is inlined as a JS string — no separate CSS import required by consumers.

---

## 12. CI / CD

### `.github/workflows/ci.yml` (PRs and pushes)

Matrix: Node 18, 20, 22 on Ubuntu only (browser library; OS-independent enough that macOS/Windows are not justified for v0).

```
- pnpm install --frozen-lockfile
- pnpm biome check .
- pnpm typecheck
- pnpm test --coverage
- pnpm build
- pnpm size-limit
```

### `.github/workflows/release.yml` (main pushes)

- `changesets/action` opens/maintains a "Version Packages" PR.
- On merge: `pnpm changeset publish` runs with `NPM_TOKEN` and `--provenance`.
- GitHub Release + CHANGELOG.md updated automatically.

---

## 13. Documentation & Discovery

- **README.md** — English primary, Korean secondary section.
  - 30-second quick start (install → 5-line example).
  - Animated GIF showing FAB → drawer → toggle.
  - Setup recipes: Vite, Next.js (App/Pages), CRA, Vanilla.
  - Integration recipes: axios, fetch interceptor, react-query.
  - API reference (auto-generated from JSDoc via typedoc, optional).
  - Troubleshooting: service-worker path, CORS, Next.js `public/` placement.
- **examples/** runnable: `pnpm --filter vite-react dev`.
- **CONTRIBUTING.md** with local setup + PR guidelines.
- **.github/ISSUE_TEMPLATE/bug.yml** prompting for version/browser/bundler.

---

## 14. Versioning & Roadmap

- First release: **v0.1.0**. Pre-1.0 explicitly allows breaking changes.
- v0.x: stabilize API, gather feedback.
- v1.0: API freeze, SemVer strict.

### Milestones to v0.1.0

| Milestone | Scope | Est. |
|---|---|---|
| M1: Monorepo scaffold | pnpm/biome/tsup/vitest/CI skeleton | 0.5d |
| M2: Core engine | state, persistence, handlers, worker, share, unhandled | 1.5d |
| M3: Core UI | vanilla DOM render (FAB + drawer + toast + styles) | 2d |
| M4: React adapter | Provider/Hook, SSR-safe | 0.5d |
| M5: Examples | vite/nextjs/vanilla | 0.5d |
| M6: Tests/docs/publish | coverage, README, npm publish | 1.5d |
| **Total** | v0.1.0 ship | **~6.5d focused** |

---

## 15. Open Decisions Deferred to Implementation

- Final accent color (locked to `#8B7FF8` in this spec; revisit if usability testing finds contrast issues).
- Exact debounce values (`persist 100ms`, `worker sync 50ms`, `events 200ms`) — starting values, tune from real usage.
- Whether to ship `light` theme tokens in v0.1 or v0.2. **Decision**: ship both themes in v0.1, auto + manual switch.
- Whether `groupBy` default should attempt prefix-based heuristics or always return `'Other'`. **Decision (v0.1)**: return `'Other'` to keep core neutral; document recipes in README.

---

## 16. Notes on Migration from bubbletap-admin

After v0.1.0 ships, the internal `MSWDevtools.tsx` in bubbletap-admin can be replaced by:

```tsx
<MswDevtools
  handlers={handlers}
  baseUrl={import.meta.env.VITE_APP_API_BASE_URL}
  groupBy={bubbletapGroupBy}            // keep current rules locally
  defaultEnabled={DEFAULT_ENABLED_KEYS}
  enabled={import.meta.env.VITE_APP_API_MOCK === 'true'}
  onMockChange={() => queryClient.refetchQueries({ type: 'all' })}
  onReset={() => window.dispatchEvent(new Event('msw-devtools:reset'))}
>
  <AxiosBridge axios={axiosInstanceWithFirebaseAuth} />
  {children}
</MswDevtools>
```

The internal `mockingStore`, `handlerMeta`, and `MSWDevtools.tsx` can then be deleted.
