# MSW Devtools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@juddroid/msw-devtools-core` and `@juddroid/msw-devtools-react` v0.1.0 to npm, extracting and generalizing the existing MSWDevtools.tsx from bubbletap-admin.

**Architecture:** pnpm monorepo with two packages. `core` is framework-agnostic (vanilla TS state engine + DOM-rendered UI). `react` is a thin adapter (Provider + Hook + `'use client'`). Only `react` and `msw` are peer deps. No MUI, zustand, styled-components, react-hot-toast, axios, or react-query in the published bundle.

**Tech Stack:** TypeScript strict, pnpm workspaces, tsup builds (ESM+CJS dual + `.d.ts` + `'use client'` banner), Biome lint/format, vitest + happy-dom + @testing-library/react, msw v2 peer, changesets for releases, GitHub Actions CI, size-limit budgets.

**Spec reference:** `docs/superpowers/specs/2026-05-28-msw-devtools-design.md`

---

## Naming & Type Decisions Log

These identifiers are canonical across all tasks. Do not rename without updating every dependent task.

### Public types
- `MockKey` — string of shape `${METHOD}::${path}`. Created by `getMockKey(method, path)`.
- `MockEntry { key, method, path, displayPath, group }`
- `Preset { name, keys }`
- `DevtoolsState { enabledKeys, presets, methodFilter, collapsedGroups, searchTerm, open }`
- `MswDevtoolsOptions` — see spec §4.1
- `MswDevtoolsInstance` — see spec §4.1
- `Logger { error, warn, info, debug }`

### Internal module exports
- `getMockKey(method: string | RegExp, path: string | RegExp): MockKey`
- `stripBaseUrl(path: string, baseUrl?: string): string`
- `pathToMatcher(path: string | RegExp, baseUrl?: string): RegExp`
- `inferGroup(path: string, method: string, override?: (p,m)=>string): string`
- `buildEntries(handlers, opts): MockEntry[]`
- `encodeShareParam(keys: MockKey[]): string`
- `decodeShareParam(param: string): MockKey[] | null`
- `createState(initial: DevtoolsState): StateStore`
- `createPersistence(storageKey: string, logger: Logger): Persistence`
- `createWorkerSync(handlers, logger): WorkerSync`
- `createUnhandledMatcher(entries, baseUrl?): (input) => MockEntry | null`
- `createEvents(): EventEmitter`
- `createLogger(opts): Logger`
- `createController(options): MswDevtoolsInstance` ← top-level facade

### Storage key shape
- Primary: `${storageKey}` (default `'msw-devtools'`)
- Stored value: `JSON.stringify(PersistedShape)` with `version: 1`
- Backup on parse fail: `${storageKey}:backup`

### Repo layout (canonical paths)
```
packages/core/src/
  index.ts                  controller.ts        state.ts
  handlers/registry.ts      handlers/matcher.ts  handlers/grouping.ts
  worker.ts                 persistence.ts       share.ts
  unhandled.ts              events.ts            logger.ts
  ui/render.ts              ui/fab.ts            ui/drawer.ts
  ui/toast.ts               ui/styles.ts         ui/icons.ts

packages/react/src/
  index.ts                  MswDevtools.tsx      provider.tsx
  use-msw-devtools.ts
```

---

## Task 1: Initialize repo and root tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `biome.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `.nvmrc`
- Create: `LICENSE`
- Create: `README.md` (stub)

- [ ] **Step 1: Init git**

```bash
git init
git branch -M main
```

- [ ] **Step 2: Create `.nvmrc`**

```
20
```

- [ ] **Step 3: Create `.npmrc`**

```
engine-strict=true
auto-install-peers=true
shamefully-hoist=false
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
coverage/
.turbo/
.cache/
*.log
.DS_Store
.env
.env.local
.changeset/*.md
!.changeset/README.md
!.changeset/config.json
```

- [ ] **Step 5: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

- [ ] **Step 6: Create root `package.json`**

```json
{
  "name": "msw-devtools-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r --filter './packages/*' build",
    "test": "pnpm -r --filter './packages/*' test",
    "test:coverage": "pnpm -r --filter './packages/*' test:coverage",
    "typecheck": "pnpm -r --filter './packages/*' typecheck",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "size": "pnpm -r --filter './packages/*' size",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@changesets/cli": "^2.27.10",
    "@types/node": "^22.10.5",
    "typescript": "^5.7.3"
  },
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 7: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 8: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true, "ignore": ["dist", "coverage", ".changeset"] },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "noNonNullAssertion": "off" },
      "suspicious": { "noExplicitAny": "warn" }
    }
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always" }
  }
}
```

- [ ] **Step 9: Create `LICENSE` (MIT, Dongcheol Jeong, 2026)**

```
MIT License

Copyright (c) 2026 Dongcheol Jeong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 10: Create stub `README.md`**

```markdown
# msw-devtools

Visual devtools for toggling [MSW](https://mswjs.io) handlers at runtime. Framework-agnostic core with a React adapter.

Status: pre-release (v0.x). See [the design spec](./docs/superpowers/specs/2026-05-28-msw-devtools-design.md) for details.
```

- [ ] **Step 11: Install root deps**

```bash
pnpm install
```

Expected: lockfile created, `node_modules/.pnpm/` populated. `pnpm lint` and `pnpm typecheck` will fail (no packages yet) — that is expected.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with pnpm + biome + typescript"
```

---

## Task 2: Set up changesets

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`

- [ ] **Step 1: Init changesets**

```bash
pnpm dlx @changesets/cli init
```

This generates the `.changeset/` directory.

- [ ] **Step 2: Replace `.changeset/config.json` with**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [["@juddroid/msw-devtools-core", "@juddroid/msw-devtools-react"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@msw-devtools/example-*"]
}
```

The `linked` config keeps both published packages on the same version. `ignore` keeps example apps out of the version flow.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: configure changesets with linked versions"
```

---

## Task 3: Scaffold core package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/.size-limit.json`
- Create: `packages/core/src/index.ts` (placeholder)

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@juddroid/msw-devtools-core",
  "version": "0.0.0",
  "description": "Framework-agnostic visual devtools for toggling MSW handlers at runtime.",
  "type": "module",
  "sideEffects": false,
  "files": ["dist"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "size": "size-limit"
  },
  "peerDependencies": {
    "msw": "^2"
  },
  "devDependencies": {
    "@size-limit/preset-small-lib": "^11.1.6",
    "@vitest/coverage-v8": "^2.1.8",
    "happy-dom": "^15.11.7",
    "msw": "^2.7.0",
    "size-limit": "^11.1.6",
    "tsup": "^8.3.5",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  },
  "keywords": ["msw", "mock", "devtools", "mock-service-worker", "developer-tools"],
  "license": "MIT",
  "author": "Dongcheol Jeong <dcjeong@bubbletap.com>",
  "homepage": "https://github.com/juddroid/msw-devtools#readme",
  "bugs": "https://github.com/juddroid/msw-devtools/issues",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/juddroid/msw-devtools.git",
    "directory": "packages/core"
  },
  "publishConfig": { "access": "public", "provenance": true }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/core/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['msw', 'msw/browser'],
});
```

- [ ] **Step 4: Create `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.test.ts'],
    },
  },
});
```

- [ ] **Step 5: Create `packages/core/.size-limit.json`**

```json
[
  {
    "path": "dist/index.mjs",
    "limit": "25 KB",
    "gzip": true,
    "ignore": ["msw"]
  }
]
```

- [ ] **Step 6: Create `packages/core/src/index.ts` placeholder**

```ts
export const version = '0.0.0';
```

- [ ] **Step 7: Install package deps**

```bash
pnpm install
```

Verify: `pnpm --filter @juddroid/msw-devtools-core build` succeeds (writes `dist/`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(core): scaffold package with tsup + vitest + size-limit"
```

---

## Task 4: Scaffold react package

**Files:**
- Create: `packages/react/package.json`
- Create: `packages/react/tsconfig.json`
- Create: `packages/react/tsup.config.ts`
- Create: `packages/react/vitest.config.ts`
- Create: `packages/react/.size-limit.json`
- Create: `packages/react/src/index.ts` (placeholder)

- [ ] **Step 1: Create `packages/react/package.json`**

```json
{
  "name": "@juddroid/msw-devtools-react",
  "version": "0.0.0",
  "description": "React adapter for @juddroid/msw-devtools-core. Provider + hook, SSR-safe, Next.js compatible.",
  "type": "module",
  "sideEffects": false,
  "files": ["dist"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "size": "size-limit"
  },
  "peerDependencies": {
    "@juddroid/msw-devtools-core": "workspace:*",
    "msw": "^2",
    "react": "^18 || ^19"
  },
  "dependencies": {
    "@juddroid/msw-devtools-core": "workspace:*"
  },
  "devDependencies": {
    "@size-limit/preset-small-lib": "^11.1.6",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "@vitest/coverage-v8": "^2.1.8",
    "happy-dom": "^15.11.7",
    "msw": "^2.7.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "size-limit": "^11.1.6",
    "tsup": "^8.3.5",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  },
  "keywords": ["msw", "mock", "devtools", "react", "mock-service-worker"],
  "license": "MIT",
  "author": "Dongcheol Jeong <dcjeong@bubbletap.com>",
  "homepage": "https://github.com/juddroid/msw-devtools#readme",
  "bugs": "https://github.com/juddroid/msw-devtools/issues",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/juddroid/msw-devtools.git",
    "directory": "packages/react"
  },
  "publishConfig": { "access": "public", "provenance": true }
}
```

Note: `@juddroid/msw-devtools-core` is listed in both `dependencies` (so consumers get it transitively) and `peerDependencies` (so workspace resolves to local). This is intentional.

- [ ] **Step 2: Create `packages/react/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "types": ["react", "react-dom"]
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules", "**/*.test.tsx", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/react/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  banner: { js: '"use client";' },
  external: ['react', 'react-dom', 'msw', 'msw/browser', '@juddroid/msw-devtools-core'],
});
```

- [ ] **Step 4: Create `packages/react/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.ts', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
```

- [ ] **Step 5: Create `packages/react/.size-limit.json`**

```json
[
  {
    "path": "dist/index.mjs",
    "limit": "4 KB",
    "gzip": true,
    "ignore": ["msw", "@juddroid/msw-devtools-core", "react", "react-dom"]
  }
]
```

- [ ] **Step 6: Create `packages/react/src/index.ts` placeholder**

```ts
export const version = '0.0.0';
```

- [ ] **Step 7: Install and verify builds**

```bash
pnpm install
pnpm build
```

Both packages should now build.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(react): scaffold react adapter package"
```

---

## Task 5: Implement `getMockKey` and matcher

**Files:**
- Create: `packages/core/src/handlers/matcher.ts`
- Create: `packages/core/src/handlers/matcher.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/core/src/handlers/matcher.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getMockKey, pathToMatcher, stripBaseUrl } from './matcher';

describe('getMockKey', () => {
  it('lowercases method? no — uppercases to keep canonical form', () => {
    expect(getMockKey('get', '/users')).toBe('GET::/users');
  });

  it('accepts already-uppercase method', () => {
    expect(getMockKey('POST', '/users')).toBe('POST::/users');
  });

  it('serializes RegExp paths', () => {
    expect(getMockKey('GET', /^\/users\/\d+$/)).toBe('GET::/^\\/users\\/\\d+$/');
  });
});

describe('stripBaseUrl', () => {
  it('removes the base prefix', () => {
    expect(stripBaseUrl('https://api.example.com/users', 'https://api.example.com')).toBe('/users');
  });

  it('returns the input unchanged when no base is given', () => {
    expect(stripBaseUrl('/users', undefined)).toBe('/users');
  });

  it('returns the input unchanged when the base does not match', () => {
    expect(stripBaseUrl('/users', 'https://api.example.com')).toBe('/users');
  });
});

describe('pathToMatcher', () => {
  it('matches a literal path', () => {
    const re = pathToMatcher('/users');
    expect(re.test('/users')).toBe(true);
    expect(re.test('/usersx')).toBe(false);
  });

  it('matches path params (:id) against any non-slash segment', () => {
    const re = pathToMatcher('/users/:id');
    expect(re.test('/users/42')).toBe(true);
    expect(re.test('/users/abc-def')).toBe(true);
    expect(re.test('/users/42/posts')).toBe(false);
  });

  it('matches wildcard (*) as .*', () => {
    const re = pathToMatcher('/static/*');
    expect(re.test('/static/a/b/c.js')).toBe(true);
  });

  it('strips baseUrl before building regex', () => {
    const re = pathToMatcher('https://api.example.com/users/:id', 'https://api.example.com');
    expect(re.test('/users/7')).toBe(true);
  });

  it('passes a query string through', () => {
    const re = pathToMatcher('/users');
    expect(re.test('/users?page=1')).toBe(true);
  });

  it('returns RegExp inputs unchanged', () => {
    const input = /^\/x$/;
    expect(pathToMatcher(input)).toBe(input);
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
pnpm --filter @juddroid/msw-devtools-core test handlers/matcher
```

Expected: all tests fail with "Cannot find module './matcher'".

- [ ] **Step 3: Implement matcher**

`packages/core/src/handlers/matcher.ts`:

```ts
export type MockKey = string;

export function getMockKey(method: string | RegExp, path: string | RegExp): MockKey {
  return `${String(method).toUpperCase()}::${String(path)}`;
}

export function stripBaseUrl(rawPath: string, baseUrl?: string): string {
  if (baseUrl && rawPath.startsWith(baseUrl)) return rawPath.slice(baseUrl.length);
  return rawPath;
}

const REGEX_META = /[.+^${}()|[\]\\]/g;
const PATH_PARAM = /:([a-zA-Z_]\w*)/g;
const ESCAPED_STAR = /\\\*/g;

export function pathToMatcher(rawPath: string | RegExp, baseUrl?: string): RegExp {
  if (rawPath instanceof RegExp) return rawPath;
  const stripped = stripBaseUrl(rawPath, baseUrl);
  const escaped = stripped
    .replace(REGEX_META, '\\$&')
    .replace(PATH_PARAM, '[^/]+')
    .replace(ESCAPED_STAR, '.*');
  return new RegExp(`^${escaped}(?:\\?.*)?$`);
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
pnpm --filter @juddroid/msw-devtools-core test handlers/matcher
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): getMockKey, stripBaseUrl, pathToMatcher with tests"
```

---

## Task 6: Implement group inference

**Files:**
- Create: `packages/core/src/handlers/grouping.ts`
- Create: `packages/core/src/handlers/grouping.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { inferGroup } from './grouping';

describe('inferGroup', () => {
  it('returns "Other" by default for any path', () => {
    expect(inferGroup('/users', 'GET')).toBe('Other');
    expect(inferGroup('/admin/contests', 'POST')).toBe('Other');
  });

  it('uses the override when supplied', () => {
    const groupBy = (path: string) => (path.startsWith('/admin') ? 'Admin' : 'User');
    expect(inferGroup('/admin/x', 'GET', groupBy)).toBe('Admin');
    expect(inferGroup('/users', 'GET', groupBy)).toBe('User');
  });

  it('falls back to "Other" when the override returns an empty string', () => {
    expect(inferGroup('/x', 'GET', () => '')).toBe('Other');
  });

  it('falls back to "Other" when the override throws', () => {
    expect(inferGroup('/x', 'GET', () => { throw new Error('boom'); })).toBe('Other');
  });
});
```

- [ ] **Step 2: Confirm fail**

```bash
pnpm --filter @juddroid/msw-devtools-core test handlers/grouping
```

- [ ] **Step 3: Implement**

`packages/core/src/handlers/grouping.ts`:

```ts
export type GroupBy = (path: string, method: string) => string;

export function inferGroup(path: string, method: string, override?: GroupBy): string {
  if (!override) return 'Other';
  try {
    const result = override(path, method);
    return result || 'Other';
  } catch {
    return 'Other';
  }
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): inferGroup with user-overridable groupBy"
```

---

## Task 7: Implement share URL codec

**Files:**
- Create: `packages/core/src/share.ts`
- Create: `packages/core/src/share.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { decodeShareParam, encodeShareParam } from './share';

describe('share codec', () => {
  it('roundtrips a list of mock keys', () => {
    const keys = ['GET::/users', 'POST::/users/:id'];
    const param = encodeShareParam(keys);
    expect(typeof param).toBe('string');
    expect(decodeShareParam(param)).toEqual(keys);
  });

  it('roundtrips an empty list', () => {
    const param = encodeShareParam([]);
    expect(decodeShareParam(param)).toEqual([]);
  });

  it('handles unicode in the path', () => {
    const keys = ['GET::/검색?q=한글'];
    expect(decodeShareParam(encodeShareParam(keys))).toEqual(keys);
  });

  it('returns null for malformed base64', () => {
    expect(decodeShareParam('@@@not base64@@@')).toBeNull();
  });

  it('returns null when the decoded JSON is not an array', () => {
    const param = btoa(JSON.stringify({ keys: ['x'] }));
    expect(decodeShareParam(param)).toBeNull();
  });

  it('drops non-string elements from the decoded array', () => {
    const param = btoa(JSON.stringify(['GET::/x', 42, null, 'POST::/y']));
    expect(decodeShareParam(param)).toEqual(['GET::/x', 'POST::/y']);
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/share.ts`:

```ts
import type { MockKey } from './handlers/matcher';

export function encodeShareParam(keys: MockKey[]): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(keys))));
  } catch {
    return '';
  }
}

export function decodeShareParam(param: string): MockKey[] | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(param))));
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): share URL codec with input validation"
```

---

## Task 8: Implement logger

**Files:**
- Create: `packages/core/src/logger.ts`
- Create: `packages/core/src/logger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';

afterEach(() => vi.restoreAllMocks());

describe('createLogger', () => {
  it('routes calls to the supplied sink', () => {
    const error = vi.fn();
    const warn = vi.fn();
    const info = vi.fn();
    const debug = vi.fn();
    const log = createLogger({ logger: { error, warn, info, debug }, logLevel: 'debug' });

    log.error('e');
    log.warn('w');
    log.info('i');
    log.debug('d');

    expect(error).toHaveBeenCalledWith('e');
    expect(warn).toHaveBeenCalledWith('w');
    expect(info).toHaveBeenCalledWith('i');
    expect(debug).toHaveBeenCalledWith('d');
  });

  it('respects "warn" level by default (info and debug silenced)', () => {
    const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const log = createLogger({ logger: sink });
    log.error('e');
    log.warn('w');
    log.info('i');
    log.debug('d');
    expect(sink.error).toHaveBeenCalled();
    expect(sink.warn).toHaveBeenCalled();
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.debug).not.toHaveBeenCalled();
  });

  it('silences everything at level "silent"', () => {
    const sink = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
    const log = createLogger({ logger: sink, logLevel: 'silent' });
    log.error('e');
    log.warn('w');
    expect(sink.error).not.toHaveBeenCalled();
    expect(sink.warn).not.toHaveBeenCalled();
  });

  it('falls back to console with the "[msw-devtools]" prefix', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger({});
    log.error('boom');
    log.warn('hmm');
    expect(errorSpy).toHaveBeenCalledWith('[msw-devtools]', 'boom');
    expect(warnSpy).toHaveBeenCalledWith('[msw-devtools]', 'hmm');
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/logger.ts`:

```ts
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

export interface LoggerOptions {
  logger?: Logger;
  logLevel?: LogLevel;
}

const LEVELS: Record<LogLevel, number> = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

const PREFIX = '[msw-devtools]';
const defaultSink: Logger = {
  error: (...a) => console.error(PREFIX, ...a),
  warn: (...a) => console.warn(PREFIX, ...a),
  info: (...a) => console.info(PREFIX, ...a),
  debug: (...a) => console.debug(PREFIX, ...a),
};

export function createLogger(opts: LoggerOptions): Logger {
  const sink = opts.logger ?? defaultSink;
  const threshold = LEVELS[opts.logLevel ?? 'warn'];
  const gate = (level: LogLevel, fn: (...a: unknown[]) => void) =>
    LEVELS[level] <= threshold ? fn : () => {};
  return {
    error: gate('error', sink.error),
    warn: gate('warn', sink.warn),
    info: gate('info', sink.info),
    debug: gate('debug', sink.debug),
  };
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): logger with level-gated, console-prefixed default"
```

---

## Task 9: Implement event emitter

**Files:**
- Create: `packages/core/src/events.ts`
- Create: `packages/core/src/events.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createEvents } from './events';

type Map = { 'mock-change': [string[]]; 'reset': []; };

describe('createEvents', () => {
  it('delivers events to subscribers', () => {
    const events = createEvents<Map>();
    const cb = vi.fn();
    events.on('mock-change', cb);
    events.emit('mock-change', ['a', 'b']);
    expect(cb).toHaveBeenCalledWith(['a', 'b']);
  });

  it('returns an unsubscribe function', () => {
    const events = createEvents<Map>();
    const cb = vi.fn();
    const off = events.on('reset', cb);
    off();
    events.emit('reset');
    expect(cb).not.toHaveBeenCalled();
  });

  it('isolates errors in one listener from the others', () => {
    const events = createEvents<Map>();
    const good = vi.fn();
    events.on('reset', () => { throw new Error('bad listener'); });
    events.on('reset', good);
    expect(() => events.emit('reset')).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  it('clear() removes all listeners', () => {
    const events = createEvents<Map>();
    const cb = vi.fn();
    events.on('reset', cb);
    events.clear();
    events.emit('reset');
    expect(cb).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/events.ts`:

```ts
export interface EventEmitter<Events extends Record<string, unknown[]>> {
  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void;
  emit<K extends keyof Events>(event: K, ...args: Events[K]): void;
  clear(): void;
}

export function createEvents<Events extends Record<string, unknown[]>>(): EventEmitter<Events> {
  const listeners = new Map<keyof Events, Set<(...args: unknown[]) => void>>();

  return {
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      const fn = listener as (...args: unknown[]) => void;
      set.add(fn);
      return () => set?.delete(fn);
    },
    emit(event, ...args) {
      const set = listeners.get(event);
      if (!set) return;
      for (const fn of [...set]) {
        try { fn(...args); } catch { /* one bad listener shouldn't kill the rest */ }
      }
    },
    clear() {
      listeners.clear();
    },
  };
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): typed event emitter with listener isolation"
```

---

## Task 10: Implement state store

**Files:**
- Create: `packages/core/src/state.ts`
- Create: `packages/core/src/state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createState, defaultState } from './state';

describe('createState', () => {
  it('returns the default state on creation', () => {
    const store = createState();
    expect(store.get()).toEqual(defaultState);
  });

  it('toggleKey adds then removes', () => {
    const store = createState();
    store.toggleKey('GET::/a');
    expect(store.get().enabledKeys).toEqual(['GET::/a']);
    store.toggleKey('GET::/a');
    expect(store.get().enabledKeys).toEqual([]);
  });

  it('toggleMany bulk-enables and bulk-disables', () => {
    const store = createState();
    store.toggleMany(['a', 'b', 'c'], true);
    expect(store.get().enabledKeys).toEqual(['a', 'b', 'c']);
    store.toggleMany(['a', 'b'], false);
    expect(store.get().enabledKeys).toEqual(['c']);
  });

  it('setEnabledKeys replaces wholesale', () => {
    const store = createState();
    store.toggleKey('a');
    store.setEnabledKeys(['x', 'y']);
    expect(store.get().enabledKeys).toEqual(['x', 'y']);
  });

  it('subscribe notifies on change and unsubscribe stops it', () => {
    const store = createState();
    const cb = vi.fn();
    const off = store.subscribe(cb);
    store.toggleKey('a');
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    store.toggleKey('b');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('savePreset adds or replaces by name', () => {
    const store = createState();
    store.setEnabledKeys(['a']);
    store.savePreset('one');
    store.setEnabledKeys(['b']);
    store.savePreset('one');
    expect(store.get().presets).toEqual([{ name: 'one', keys: ['b'] }]);
  });

  it('loadPreset replaces enabledKeys', () => {
    const store = createState();
    store.setEnabledKeys(['a']);
    store.savePreset('p');
    store.setEnabledKeys(['x']);
    store.loadPreset('p');
    expect(store.get().enabledKeys).toEqual(['a']);
  });

  it('deletePreset removes by name', () => {
    const store = createState();
    store.savePreset('p');
    store.deletePreset('p');
    expect(store.get().presets).toEqual([]);
  });

  it('toggleMethodFilter / resetMethodFilter / setSearchTerm / toggleGroup', () => {
    const store = createState();
    store.toggleMethodFilter('GET');
    store.toggleMethodFilter('POST');
    expect(store.get().methodFilter).toEqual(['GET', 'POST']);
    store.toggleMethodFilter('GET');
    expect(store.get().methodFilter).toEqual(['POST']);
    store.resetMethodFilter();
    expect(store.get().methodFilter).toEqual([]);

    store.setSearchTerm('hi');
    expect(store.get().searchTerm).toBe('hi');

    store.toggleGroup('Admin');
    expect(store.get().collapsedGroups).toEqual(['Admin']);
    store.toggleGroup('Admin');
    expect(store.get().collapsedGroups).toEqual([]);

    store.collapseAllGroups(['A', 'B']);
    expect(store.get().collapsedGroups).toEqual(['A', 'B']);
    store.expandAllGroups();
    expect(store.get().collapsedGroups).toEqual([]);
  });

  it('clearAll empties enabledKeys', () => {
    const store = createState();
    store.setEnabledKeys(['a', 'b']);
    store.clearAll();
    expect(store.get().enabledKeys).toEqual([]);
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/state.ts`:

```ts
import type { MockKey } from './handlers/matcher';

export interface Preset {
  name: string;
  keys: MockKey[];
}

export interface DevtoolsState {
  enabledKeys: MockKey[];
  presets: Preset[];
  methodFilter: string[];
  collapsedGroups: string[];
  searchTerm: string;
  open: boolean;
}

export const defaultState: DevtoolsState = {
  enabledKeys: [],
  presets: [],
  methodFilter: [],
  collapsedGroups: [],
  searchTerm: '',
  open: false,
};

export interface StateStore {
  get(): DevtoolsState;
  set(next: DevtoolsState): void;
  subscribe(listener: (state: DevtoolsState) => void): () => void;

  setEnabledKeys(keys: MockKey[]): void;
  toggleKey(key: MockKey): void;
  toggleMany(keys: MockKey[], enabled: boolean): void;
  clearAll(): void;

  savePreset(name: string): void;
  loadPreset(name: string): void;
  deletePreset(name: string): void;

  setSearchTerm(term: string): void;
  toggleMethodFilter(method: string): void;
  resetMethodFilter(): void;

  toggleGroup(group: string): void;
  collapseAllGroups(groups: string[]): void;
  expandAllGroups(): void;

  setOpen(open: boolean): void;
}

export function createState(initial: DevtoolsState = defaultState): StateStore {
  let state: DevtoolsState = { ...initial };
  const listeners = new Set<(s: DevtoolsState) => void>();

  function set(next: DevtoolsState) {
    state = next;
    for (const l of [...listeners]) {
      try { l(state); } catch { /* isolate */ }
    }
  }
  function update(reducer: (s: DevtoolsState) => DevtoolsState) {
    set(reducer(state));
  }

  return {
    get: () => state,
    set,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setEnabledKeys: (keys) => update((s) => ({ ...s, enabledKeys: [...keys] })),
    toggleKey: (key) => update((s) => ({
      ...s,
      enabledKeys: s.enabledKeys.includes(key)
        ? s.enabledKeys.filter((k) => k !== key)
        : [...s.enabledKeys, key],
    })),
    toggleMany: (keys, enabled) => update((s) => {
      const next = new Set(s.enabledKeys);
      for (const k of keys) enabled ? next.add(k) : next.delete(k);
      return { ...s, enabledKeys: [...next] };
    }),
    clearAll: () => update((s) => ({ ...s, enabledKeys: [] })),
    savePreset: (name) => update((s) => ({
      ...s,
      presets: [...s.presets.filter((p) => p.name !== name), { name, keys: [...s.enabledKeys] }],
    })),
    loadPreset: (name) => update((s) => {
      const preset = s.presets.find((p) => p.name === name);
      return preset ? { ...s, enabledKeys: [...preset.keys] } : s;
    }),
    deletePreset: (name) => update((s) => ({ ...s, presets: s.presets.filter((p) => p.name !== name) })),
    setSearchTerm: (searchTerm) => update((s) => ({ ...s, searchTerm })),
    toggleMethodFilter: (m) => update((s) => ({
      ...s,
      methodFilter: s.methodFilter.includes(m)
        ? s.methodFilter.filter((x) => x !== m)
        : [...s.methodFilter, m],
    })),
    resetMethodFilter: () => update((s) => ({ ...s, methodFilter: [] })),
    toggleGroup: (g) => update((s) => ({
      ...s,
      collapsedGroups: s.collapsedGroups.includes(g)
        ? s.collapsedGroups.filter((x) => x !== g)
        : [...s.collapsedGroups, g],
    })),
    collapseAllGroups: (groups) => update((s) => ({ ...s, collapsedGroups: [...groups] })),
    expandAllGroups: () => update((s) => ({ ...s, collapsedGroups: [] })),
    setOpen: (open) => update((s) => ({ ...s, open })),
  };
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): observable state store with all mutators"
```

---

## Task 11: Implement persistence layer

**Files:**
- Create: `packages/core/src/persistence.ts`
- Create: `packages/core/src/persistence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersistence, type PersistedShape } from './persistence';
import { createLogger } from './logger';

const STORAGE_KEY = 'msw-devtools-test';
const silentLogger = createLogger({ logLevel: 'silent' });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('persistence', () => {
  it('save then load roundtrips a payload', () => {
    const p = createPersistence(STORAGE_KEY, silentLogger);
    const payload: PersistedShape = {
      version: 1,
      enabledKeys: ['GET::/a'],
      presets: [{ name: 'x', keys: ['GET::/a'] }],
      methodFilter: ['GET'],
      collapsedGroups: ['Admin'],
    };
    p.save(payload);
    expect(p.load()).toEqual(payload);
  });

  it('returns null when there is nothing stored', () => {
    const p = createPersistence(STORAGE_KEY, silentLogger);
    expect(p.load()).toBeNull();
  });

  it('moves an unparseable blob to :backup and returns null', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const p = createPersistence(STORAGE_KEY, silentLogger);
    expect(p.load()).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEY}:backup`)).toBe('{not json');
  });

  it('moves a future-version blob to :backup and returns null', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, enabledKeys: [] }));
    const p = createPersistence(STORAGE_KEY, silentLogger);
    expect(p.load()).toBeNull();
    expect(localStorage.getItem(`${STORAGE_KEY}:backup`)).toContain('999');
  });

  it('falls back to in-memory storage when localStorage throws', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const p = createPersistence(STORAGE_KEY, silentLogger);
    p.save({ version: 1, enabledKeys: ['a'], presets: [], methodFilter: [], collapsedGroups: [] });
    expect(setSpy).toHaveBeenCalled();
    // doesn't throw — that's the contract
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/persistence.ts`:

```ts
import type { Logger } from './logger';
import type { MockKey } from './handlers/matcher';
import type { Preset } from './state';

export const PERSIST_VERSION = 1 as const;

export interface PersistedShape {
  version: 1;
  enabledKeys: MockKey[];
  presets: Preset[];
  methodFilter: string[];
  collapsedGroups: string[];
}

export interface Persistence {
  load(): PersistedShape | null;
  save(value: PersistedShape): void;
}

function safeGetStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function createPersistence(storageKey: string, logger: Logger): Persistence {
  const backupKey = `${storageKey}:backup`;
  let warned = false;

  function readRaw(): string | null {
    const ls = safeGetStorage();
    if (!ls) return null;
    try {
      return ls.getItem(storageKey);
    } catch (e) {
      if (!warned) {
        logger.warn('localStorage read failed; using in-memory fallback', e);
        warned = true;
      }
      return null;
    }
  }

  function writeRaw(key: string, value: string): void {
    const ls = safeGetStorage();
    if (!ls) return;
    try {
      ls.setItem(key, value);
    } catch (e) {
      if (!warned) {
        logger.warn('localStorage write failed; using in-memory fallback', e);
        warned = true;
      }
    }
  }

  return {
    load() {
      const raw = readRaw();
      if (!raw) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        writeRaw(backupKey, raw);
        return null;
      }
      if (typeof parsed !== 'object' || parsed === null) {
        writeRaw(backupKey, raw);
        return null;
      }
      const obj = parsed as { version?: unknown };
      if (obj.version !== PERSIST_VERSION) {
        writeRaw(backupKey, raw);
        logger.warn(`persisted state version mismatch (got ${String(obj.version)}); resetting`);
        return null;
      }
      return parsed as PersistedShape;
    },
    save(value) {
      writeRaw(storageKey, JSON.stringify(value));
    },
  };
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): persistence layer with versioned schema + backup-on-fail"
```

---

## Task 12: Implement handler registry

**Files:**
- Create: `packages/core/src/handlers/registry.ts`
- Create: `packages/core/src/handlers/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { buildEntries } from './registry';

describe('buildEntries', () => {
  it('produces an entry per handler with method/path/key/group', () => {
    const handlers = [
      http.get('https://api.example.com/users', () => HttpResponse.json([])),
      http.post('https://api.example.com/users', () => HttpResponse.json({})),
    ];
    const entries = buildEntries(handlers, { baseUrl: 'https://api.example.com' });
    expect(entries).toHaveLength(2);

    const [a, b] = entries;
    expect(a?.method).toBe('GET');
    expect(a?.displayPath).toBe('/users');
    expect(a?.key).toBe('GET::https://api.example.com/users');
    expect(a?.group).toBe('Other');
    expect(b?.method).toBe('POST');
  });

  it('uses the supplied groupBy', () => {
    const handlers = [http.get('/admin/x', () => HttpResponse.json({}))];
    const entries = buildEntries(handlers, {
      groupBy: (path) => (path.startsWith('/admin') ? 'Admin' : 'Other'),
    });
    expect(entries[0]?.group).toBe('Admin');
  });

  it('skips handlers without info and warns', () => {
    const bad = { not: 'a handler' } as unknown as Parameters<typeof buildEntries>[0][number];
    const handlers = [http.get('/x', () => HttpResponse.json({})), bad];
    const entries = buildEntries(handlers, {});
    expect(entries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/handlers/registry.ts`:

```ts
import type { RequestHandler } from 'msw';
import { inferGroup, type GroupBy } from './grouping';
import { getMockKey, pathToMatcher, stripBaseUrl, type MockKey } from './matcher';

export interface MockEntry {
  key: MockKey;
  method: string;
  path: string;
  displayPath: string;
  group: string;
  matcher: RegExp;
  handler: RequestHandler;
}

export interface BuildEntriesOptions {
  baseUrl?: string;
  groupBy?: GroupBy;
}

interface HandlerInfo {
  method?: string | RegExp;
  path?: string | RegExp;
}

function readInfo(handler: RequestHandler): HandlerInfo | null {
  const info = (handler as unknown as { info?: HandlerInfo }).info;
  if (!info || (info.method === undefined && info.path === undefined)) return null;
  return info;
}

export function buildEntries(
  handlers: RequestHandler[],
  opts: BuildEntriesOptions,
): MockEntry[] {
  const entries: MockEntry[] = [];
  for (const handler of handlers) {
    const info = readInfo(handler);
    if (!info || info.method === undefined || info.path === undefined) continue;
    const method = String(info.method).toUpperCase();
    const path = String(info.path);
    const displayPath = stripBaseUrl(path, opts.baseUrl);
    entries.push({
      key: getMockKey(method, path),
      method,
      path,
      displayPath,
      group: inferGroup(displayPath, method, opts.groupBy),
      matcher: pathToMatcher(info.path, opts.baseUrl),
      handler,
    });
  }
  return entries;
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): handler registry — handlers → enriched entries"
```

---

## Task 13: Implement unhandled-request matcher

**Files:**
- Create: `packages/core/src/unhandled.ts`
- Create: `packages/core/src/unhandled.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { buildEntries } from './handlers/registry';
import { createUnhandledMatcher } from './unhandled';

const entries = buildEntries(
  [
    http.get('https://api.example.com/users/:id', () => HttpResponse.json({})),
    http.post('https://api.example.com/users', () => HttpResponse.json({})),
  ],
  { baseUrl: 'https://api.example.com' },
);

describe('createUnhandledMatcher', () => {
  const match = createUnhandledMatcher(entries, 'https://api.example.com');

  it('matches a request that fits a registered handler', () => {
    const e = match({ method: 'GET', url: 'https://api.example.com/users/42' });
    expect(e?.method).toBe('GET');
  });

  it('returns null when no entry matches', () => {
    expect(match({ method: 'DELETE', url: 'https://api.example.com/users/42' })).toBeNull();
  });

  it('strips the baseUrl before matching', () => {
    const e = match({ method: 'GET', url: '/users/42' });
    expect(e).not.toBeNull();
  });

  it('ignores the query string for matching', () => {
    expect(match({ method: 'POST', url: '/users?include=x' })).not.toBeNull();
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/unhandled.ts`:

```ts
import type { MockEntry } from './handlers/registry';
import { stripBaseUrl } from './handlers/matcher';

export interface UnhandledRequestInput {
  method: string;
  url: string;
}

export type UnhandledMatcher = (input: UnhandledRequestInput) => MockEntry | null;

export function createUnhandledMatcher(entries: MockEntry[], baseUrl?: string): UnhandledMatcher {
  return ({ method, url }) => {
    const m = method.toUpperCase();
    const pathOnly = stripBaseUrl(url, baseUrl).split('?')[0] ?? '';
    return entries.find((e) => e.method === m && e.matcher.test(pathOnly)) ?? null;
  };
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): unhandled-request matcher"
```

---

## Task 14: Implement worker sync

**Files:**
- Create: `packages/core/src/worker.ts`
- Create: `packages/core/src/worker.test.ts`

This module wraps MSW's `setupWorker`. Tests use a fake worker because MSW's SW registration is unavailable in happy-dom.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createWorkerSync, type Worker } from './worker';
import { createLogger } from './logger';

function fakeWorker(): Worker & { _used: unknown[]; _started: boolean; _stopped: boolean } {
  let used: unknown[] = [];
  return {
    _used: used,
    _started: false,
    _stopped: false,
    async start() { (this as any)._started = true; },
    stop() { (this as any)._stopped = true; },
    resetHandlers() { used = []; (this as any)._used = used; },
    use(...handlers: unknown[]) { used.push(...handlers); (this as any)._used = used; },
  };
}

describe('createWorkerSync', () => {
  const logger = createLogger({ logLevel: 'silent' });

  it('start() calls worker.start with the supplied options', async () => {
    const w = fakeWorker();
    const sync = createWorkerSync(w, logger);
    await sync.start({ quiet: true });
    expect(w._started).toBe(true);
  });

  it('sync() debounces resetHandlers + use', async () => {
    vi.useFakeTimers();
    const w = fakeWorker();
    const sync = createWorkerSync(w, logger);
    await sync.start({ quiet: true });

    const h1 = { id: 1 } as unknown;
    const h2 = { id: 2 } as unknown;
    sync.sync([h1, h2]);
    sync.sync([h1]);          // overrides — only the last call should apply
    expect(w._used).toEqual([]);
    vi.advanceTimersByTime(60);
    expect(w._used).toEqual([h1]);

    vi.useRealTimers();
  });

  it('dispose() stops the worker and clears timers', async () => {
    vi.useFakeTimers();
    const w = fakeWorker();
    const sync = createWorkerSync(w, logger);
    await sync.start({ quiet: true });
    sync.sync([{ id: 1 } as unknown]);
    await sync.dispose();
    vi.advanceTimersByTime(200);
    expect(w._stopped).toBe(true);
    expect(w._used).toEqual([]);   // sync was canceled by dispose
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/worker.ts`:

```ts
import type { RequestHandler } from 'msw';
import type { Logger } from './logger';

export interface Worker {
  start(options?: Record<string, unknown>): Promise<unknown> | unknown;
  stop(): void;
  resetHandlers(): void;
  use(...handlers: unknown[]): void;
}

export interface WorkerSync {
  start(options?: Record<string, unknown>): Promise<void>;
  sync(active: RequestHandler[]): void;
  dispose(): Promise<void>;
}

const DEBOUNCE_MS = 50;

export function createWorkerSync(worker: Worker, logger: Logger): WorkerSync {
  let started = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: RequestHandler[] | null = null;

  async function applyPending() {
    if (disposed || !started) return;
    if (!pending) return;
    try {
      worker.resetHandlers();
      if (pending.length > 0) worker.use(...pending);
    } catch (e) {
      logger.error('worker sync failed', e);
    }
    pending = null;
  }

  return {
    async start(options) {
      if (started || disposed) return;
      try {
        await worker.start(options);
        started = true;
      } catch (e) {
        logger.error('worker start failed', e);
      }
    },
    sync(active) {
      if (disposed) return;
      pending = active;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void applyPending();
      }, DEBOUNCE_MS);
    },
    async dispose() {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      try {
        worker.resetHandlers();
        worker.stop();
      } catch (e) {
        logger.warn('worker stop failed', e);
      }
    },
  };
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): debounced worker sync wrapper"
```

---

## Task 15: Implement icons and styles modules

**Files:**
- Create: `packages/core/src/ui/icons.ts`
- Create: `packages/core/src/ui/styles.ts`

These are pure string exports — no tests are necessary at this level (they're consumed and visually verified by drawer tests later).

- [ ] **Step 1: Create `packages/core/src/ui/icons.ts`**

```ts
export const icons = {
  flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6"/><path d="M9 7h6"/><path d="M10 7v6.879c0 .53-.21 1.04-.586 1.414l-2.828 2.828A2 2 0 0 0 6 19.535V21a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1.465a2 2 0 0 0-.586-1.414l-2.828-2.828A2 2 0 0 1 14 13.879V7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 4 3 12 11 12"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
} as const;
```

- [ ] **Step 2: Create `packages/core/src/ui/styles.ts`**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(core): UI styles + inline SVG icons"
```

---

## Task 16: Implement render mount/unmount

**Files:**
- Create: `packages/core/src/ui/render.ts`
- Create: `packages/core/src/ui/render.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/ui/render.ts`:

```ts
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
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): root mount/unmount with idempotent style injection"
```

---

## Task 17: Implement FAB component

**Files:**
- Create: `packages/core/src/ui/fab.ts`
- Create: `packages/core/src/ui/fab.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFab } from './fab';

beforeEach(() => { document.body.innerHTML = ''; });

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
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/ui/fab.ts`:

```ts
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

  function onClick() { onOpen(); }
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
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): FAB component with badge"
```

---

## Task 18: Implement toast component

**Files:**
- Create: `packages/core/src/ui/toast.ts`
- Create: `packages/core/src/ui/toast.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createToastHost } from './toast';

beforeEach(() => { document.body.innerHTML = ''; vi.useFakeTimers(); });

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
      id: 'a', title: 't', body: 'b', duration: 5000,
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
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/ui/toast.ts`:

```ts
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

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
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
        <div class="msw-toast-title">${escape(input.title)}</div>
        <div class="msw-toast-body">${escape(input.body)}</div>
        ${input.desc ? `<div class="msw-toast-desc">${escape(input.desc)}</div>` : ''}
        <div class="msw-toast-actions">
          <button class="msw-toast-btn-ghost" data-act="dismiss">Dismiss</button>
          ${input.action ? `<button class="msw-toast-btn-primary" data-act="primary">${escape(input.action.label)}</button>` : ''}
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
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): toast host with dedup, stack cap, action buttons"
```

---

## Task 19: Implement drawer component

**Files:**
- Create: `packages/core/src/ui/drawer.ts`
- Create: `packages/core/src/ui/drawer.test.ts`

The drawer reads from state and dispatches calls back to the controller. Tests verify the rendered structure and interaction wiring.

- [ ] **Step 1: Write the failing test**

```ts
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEntries } from '../handlers/registry';
import { createState } from '../state';
import { createDrawer } from './drawer';

beforeEach(() => { document.body.innerHTML = ''; });

function setup() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const state = createState();
  const entries = buildEntries([
    http.get('/users', () => HttpResponse.json([])),
    http.post('/users', () => HttpResponse.json({})),
    http.delete('/users/:id', () => HttpResponse.json({})),
  ], {});
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
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/ui/drawer.ts`:

```ts
import type { MockEntry } from '../handlers/registry';
import type { MockKey } from '../handlers/matcher';
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

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
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
        <input class="msw-search" placeholder="Search path or method" value="${escape(s.searchTerm)}" data-act="search"/>
        <div class="msw-method-row">
          ${METHODS.map((m) => {
            const active = s.methodFilter.includes(m);
            return `<span class="msw-method-chip ${active ? 'active' : ''}"
                          data-act="method" data-method="${m}"
                          style="background:var(--msw-m-${m.toLowerCase()}-${active ? 'fg' : 'bg'});${active ? 'color:#fff;' : 'color:var(--msw-m-' + m.toLowerCase() + '-fg);'}">${m}</span>`;
          }).join('')}
          ${s.methodFilter.length > 0 ? '<span class="msw-method-chip" data-act="method-reset" style="border:1px solid var(--msw-border);color:var(--msw-text-dim)">reset</span>' : ''}
        </div>
      </section>

      <section class="msw-preset-bar">
        <select class="msw-select" data-act="preset-select">
          <option value="">Preset…</option>
          ${s.presets.map((p) => `<option value="${escape(p.name)}" ${p.name === selectedPreset ? 'selected' : ''}>${escape(p.name)} (${p.keys.length})</option>`).join('')}
        </select>
        <button class="msw-icon-btn" data-act="save-preset" title="Save preset">${icons.save}</button>
        <button class="msw-icon-btn" data-act="delete-preset" title="Delete preset" ${selectedPreset ? '' : 'disabled'}>${icons.trash}</button>
      </section>

      <section class="msw-preset-input-row">
        <input class="msw-input-sm" placeholder="Save current as preset" value="${escape(presetInputValue)}" data-act="preset-input"/>
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
        ${groups.length === 0
          ? '<div style="padding:40px 16px;text-align:center;color:var(--msw-text-dim);font-size:12px;">No matching handlers.</div>'
          : groups.map(([group, items]) => {
              const collapsed = s.collapsedGroups.includes(group);
              const groupEnabled = items.filter((i) => enabledSet.has(i.key)).length;
              const groupAll = groupEnabled === items.length;
              const groupSome = groupEnabled > 0 && !groupAll;
              return `
                <div class="msw-group">
                  <div class="msw-group-header" data-act="toggle-group" data-group="${escape(group)}">
                    <span class="msw-chevron ${collapsed ? 'collapsed' : ''}">${icons.chevronDown}</span>
                    <span class="msw-group-name">${escape(group)}</span>
                    <span class="msw-group-count ${groupEnabled > 0 ? 'active' : ''}">${groupEnabled}/${items.length}</span>
                    <span class="msw-checkbox ${groupAll ? 'checked' : groupSome ? 'indeterminate' : ''}"
                          data-act="toggle-group-all" data-group="${escape(group)}">${groupAll ? icons.check : ''}</span>
                  </div>
                  ${collapsed ? '' : items.map((it) => {
                    const checked = enabledSet.has(it.key);
                    return `
                      <div class="msw-row ${checked ? 'active' : ''}" data-act="toggle-row" data-key="${escape(it.key)}">
                        <span class="msw-checkbox ${checked ? 'checked' : ''}">${checked ? icons.check : ''}</span>
                        <span class="msw-method-badge" style="background:var(--msw-m-${it.method.toLowerCase()}-bg);color:var(--msw-m-${it.method.toLowerCase()}-fg);">${it.method}</span>
                        <span class="msw-path" title="${escape(it.displayPath)}">${escape(it.displayPath)}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('')}
      </div>
    `;

    el.classList.toggle('open', s.open);
    wire();
  }

  function wire() {
    el.querySelector('[data-act="close"]')?.addEventListener('click', () => { state.setOpen(false); handlers.onClose(); });

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
      chip.addEventListener('click', () => state.toggleMethodFilter((chip as HTMLElement).dataset.method ?? ''));
    }
    el.querySelector('[data-act="method-reset"]')?.addEventListener('click', () => state.resetMethodFilter());

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
      presetInput.addEventListener('input', (e) => { presetInputValue = (e.target as HTMLInputElement).value; });
      presetInput.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          const name = presetInputValue.trim();
          if (name) { handlers.onSavePreset(name); presetInputValue = ''; selectedPreset = name; }
        }
      });
    }

    el.querySelector('[data-act="share"]')?.addEventListener('click', () => handlers.onCopyShare());
    el.querySelector('[data-act="clear"]')?.addEventListener('click', () => handlers.onClearAll());

    el.querySelector('[data-act="toggle-visible"]')?.addEventListener('click', () => {
      const enabled = !(el.querySelector('[data-act="toggle-visible"]') as HTMLElement).classList.contains('checked');
      handlers.onToggleMany(visibleEntries().map((e) => e.key), enabled);
    });
    el.querySelector('[data-act="all-on"]')?.addEventListener('click', () => handlers.onToggleMany(visibleEntries().map((e) => e.key), true));
    el.querySelector('[data-act="all-off"]')?.addEventListener('click', () => handlers.onToggleMany(visibleEntries().map((e) => e.key), false));
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
        handlers.onToggleMany(items.map((i) => i.key), enabled);
      });
    }
    for (const row of el.querySelectorAll('[data-act="toggle-row"]')) {
      row.addEventListener('click', () => handlers.onToggle((row as HTMLElement).dataset.key ?? ''));
    }
  }

  render();

  return {
    el,
    open() { state.setOpen(true); },
    close() { state.setOpen(false); },
    isOpen: () => state.get().open,
    render,
    destroy() {
      unsubState();
      el.remove();
    },
  };
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): drawer component with search, filters, presets, groups"
```

---

## Task 20: Implement the controller facade

**Files:**
- Create: `packages/core/src/controller.ts`
- Create: `packages/core/src/controller.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createController } from './controller';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.clear();
});

function fakeWorker() {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    resetHandlers: vi.fn(),
    use: vi.fn(),
  };
}

describe('controller', () => {
  it('mount appends DOM and starts the worker', async () => {
    const worker = fakeWorker();
    const ctrl = createController({
      handlers: [http.get('/x', () => HttpResponse.json({}))],
      storageKey: 'test-1',
      workerFactory: () => worker,
    });
    ctrl.mount();
    await new Promise((r) => setTimeout(r, 10));
    expect(worker.start).toHaveBeenCalled();
    expect(document.querySelector('[data-msw-devtools-root]')).not.toBeNull();
    await ctrl.dispose();
  });

  it('isEnabled reflects toggle()', () => {
    const ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: 'test-2',
      workerFactory: () => fakeWorker(),
    });
    ctrl.mount();
    const key = ctrl.getState().enabledKeys[0];
    expect(ctrl.isEnabled('GET', '/a')).toBe(false);
    // toggle by matching key
    const entries = ctrl.findMatching('GET', '/a');
    expect(entries).not.toBeNull();
    ctrl.enable(entries!.key);
    expect(ctrl.isEnabled('GET', '/a')).toBe(true);
    void ctrl.dispose();
  });

  it('mock-change event fires on toggle', async () => {
    vi.useFakeTimers();
    const ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: 'test-3',
      workerFactory: () => fakeWorker(),
    });
    const cb = vi.fn();
    ctrl.on('mock-change', cb);
    ctrl.mount();
    const m = ctrl.findMatching('GET', '/a');
    ctrl.toggle(m!.key);
    vi.advanceTimersByTime(250);
    expect(cb).toHaveBeenCalledWith([m!.key]);
    await ctrl.dispose();
    vi.useRealTimers();
  });

  it('persists enabledKeys across instances', async () => {
    const STORAGE_KEY = 'persist-roundtrip';
    let ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: STORAGE_KEY,
      workerFactory: () => fakeWorker(),
    });
    ctrl.mount();
    const m = ctrl.findMatching('GET', '/a');
    ctrl.enable(m!.key);
    await ctrl.dispose();

    ctrl = createController({
      handlers: [http.get('/a', () => HttpResponse.json({}))],
      storageKey: STORAGE_KEY,
      workerFactory: () => fakeWorker(),
    });
    ctrl.mount();
    expect(ctrl.isEnabled('GET', '/a')).toBe(true);
    await ctrl.dispose();
  });

  it('dispose removes the root and stops the worker', async () => {
    const worker = fakeWorker();
    const ctrl = createController({
      handlers: [http.get('/x', () => HttpResponse.json({}))],
      storageKey: 'test-dispose',
      workerFactory: () => worker,
    });
    ctrl.mount();
    await ctrl.dispose();
    expect(worker.stop).toHaveBeenCalled();
    expect(document.querySelector('[data-msw-devtools-root]')).toBeNull();
  });

  it('applies a URL share param then strips it', async () => {
    const handlers = [http.get('/users', () => HttpResponse.json([]))];
    const ctrl = createController({
      handlers,
      storageKey: 'test-share',
      workerFactory: () => fakeWorker(),
    });
    // Pre-set a share URL
    const key = 'GET::/users';
    const param = btoa(unescape(encodeURIComponent(JSON.stringify([key]))));
    window.history.replaceState({}, '', `?msw=${param}`);
    ctrl.mount();
    await new Promise((r) => setTimeout(r, 5));
    expect(ctrl.getState().enabledKeys).toEqual([key]);
    expect(window.location.search).not.toContain('msw=');
    await ctrl.dispose();
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/core/src/controller.ts`:

```ts
import type { RequestHandler } from 'msw';

import { buildEntries, type MockEntry } from './handlers/registry';
import { getMockKey, stripBaseUrl, type MockKey } from './handlers/matcher';
import { createEvents } from './events';
import { createLogger, type Logger, type LoggerOptions } from './logger';
import { createPersistence, type Persistence, PERSIST_VERSION, type PersistedShape } from './persistence';
import { createState, defaultState, type DevtoolsState, type StateStore } from './state';
import { createUnhandledMatcher } from './unhandled';
import { createWorkerSync, type Worker, type WorkerSync } from './worker';
import { decodeShareParam, encodeShareParam } from './share';
import { mountRoot, unmountRoot, type Position, type Theme } from './ui/render';
import { createFab, type Fab } from './ui/fab';
import { createToastHost, type ToastHost } from './ui/toast';
import { createDrawer, type Drawer } from './ui/drawer';

import type { GroupBy } from './handlers/grouping';

export type { MockKey, MockEntry, DevtoolsState };

export interface MswDevtoolsOptions extends LoggerOptions {
  handlers: RequestHandler[];
  baseUrl?: string;
  groupBy?: GroupBy;
  defaultEnabled?: MockKey[];
  storageKey?: string;
  position?: Position;
  theme?: Theme;
  zIndex?: number;
  shareParam?: string;
  keyboard?: boolean;
  autoStart?: boolean;
  workerStartOptions?: Record<string, unknown>;
  /** Test seam: override how the worker is created. Internal/testing use only. */
  workerFactory?: (handlers: RequestHandler[]) => Worker;
}

type EmitterMap = {
  'mock-change': [MockKey[]];
  reset: [];
  ready: [];
};

export interface MswDevtoolsInstance {
  mount(container?: HTMLElement): void;
  unmount(): void;
  dispose(): Promise<void>;
  getEnabledKeys(): MockKey[];
  isEnabled(method: string, url: string): boolean;
  findMatching(method: string, url: string): MockEntry | null;
  getState(): DevtoolsState;
  enable(key: MockKey): void;
  disable(key: MockKey): void;
  toggle(key: MockKey): void;
  setEnabled(keys: MockKey[]): void;
  notifyUnhandledRequest(input: { method: string; url: string }): void;
  on<K extends keyof EmitterMap>(event: K, listener: (...args: EmitterMap[K]) => void): () => void;
  subscribe(listener: (state: DevtoolsState) => void): () => void;
  readonly version: string;
}

const PERSIST_DEBOUNCE = 100;
const EVENT_DEBOUNCE = 200;

declare const __PKG_VERSION__: string;

async function defaultWorkerFactory(handlers: RequestHandler[]): Promise<Worker> {
  const { setupWorker } = await import('msw/browser');
  return setupWorker(...handlers);
}

export function createController(options: MswDevtoolsOptions): MswDevtoolsInstance {
  const logger = createLogger(options);
  const storageKey = options.storageKey ?? 'msw-devtools';
  const position: Position = options.position ?? 'bottom-right';
  const shareParam = options.shareParam ?? 'msw';
  const entries = buildEntries(options.handlers, { baseUrl: options.baseUrl, groupBy: options.groupBy });
  const unhandledMatcher = createUnhandledMatcher(entries, options.baseUrl);
  const events = createEvents<EmitterMap>();
  const persistence = createPersistence(storageKey, logger);
  const store: StateStore = createState(defaultState);

  let workerSync: WorkerSync | null = null;
  let fab: Fab | null = null;
  let drawer: Drawer | null = null;
  let toasts: ToastHost | null = null;
  let renderHandle: ReturnType<typeof mountRoot> | null = null;
  let mounted = false;
  let disposed = false;

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let changeTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubState: (() => void) | null = null;
  let prevEnabled: MockKey[] = [];

  function snapshotPersisted(): PersistedShape {
    const s = store.get();
    return {
      version: PERSIST_VERSION,
      enabledKeys: s.enabledKeys,
      presets: s.presets,
      methodFilter: s.methodFilter,
      collapsedGroups: s.collapsedGroups,
    };
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => persistence.save(snapshotPersisted()), PERSIST_DEBOUNCE);
  }

  function scheduleChangeEvent(keys: MockKey[]) {
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      events.emit('mock-change', keys);
      events.emit('reset');
    }, EVENT_DEBOUNCE);
  }

  function activeHandlers(): RequestHandler[] {
    const enabled = new Set(store.get().enabledKeys);
    return entries.filter((e) => enabled.has(e.key)).map((e) => e.handler);
  }

  function hydrate() {
    const loaded = persistence.load();
    if (loaded) {
      store.set({
        ...store.get(),
        enabledKeys: loaded.enabledKeys,
        presets: loaded.presets,
        methodFilter: loaded.methodFilter,
        collapsedGroups: loaded.collapsedGroups,
      });
    } else if (options.defaultEnabled && options.defaultEnabled.length > 0) {
      store.setEnabledKeys(options.defaultEnabled);
    }
    prevEnabled = [...store.get().enabledKeys];
  }

  function applyShareParam(): boolean {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(shareParam);
    if (!raw) return false;
    const decoded = decodeShareParam(raw);
    url.searchParams.delete(shareParam);
    window.history.replaceState({}, '', url.toString());
    if (decoded && decoded.length > 0) {
      store.setEnabledKeys(decoded);
      toasts?.show({
        id: 'msw-share-loaded',
        title: 'MSW',
        body: `${decoded.length} mocks loaded from URL`,
      });
      return true;
    }
    return false;
  }

  function copyShareUrl() {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      toasts?.show({ id: 'msw-clipboard', title: 'Share URL', body: 'Clipboard unavailable' });
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set(shareParam, encodeShareParam(store.get().enabledKeys));
    navigator.clipboard.writeText(url.toString()).then(
      () => toasts?.show({ id: 'msw-copied', title: 'Share URL', body: 'Copied to clipboard' }),
      () => toasts?.show({ id: 'msw-copied', title: 'Share URL', body: 'Copy failed' }),
    );
  }

  function onStateChange(next: DevtoolsState) {
    schedulePersist();

    const currentKeys = next.enabledKeys;
    const changed =
      currentKeys.length !== prevEnabled.length ||
      currentKeys.some((k, i) => prevEnabled[i] !== k);
    if (changed) {
      prevEnabled = [...currentKeys];
      workerSync?.sync(activeHandlers());
      scheduleChangeEvent(currentKeys);
      fab?.setBadge(currentKeys.length);
    }
  }

  function notifyUnhandledRequest(input: { method: string; url: string }) {
    const match = unhandledMatcher(input);
    if (!match) return;
    if (store.get().enabledKeys.includes(match.key)) return;
    toasts?.show({
      id: `msw-miss-${match.key}`,
      title: 'MSW: unhandled request matched',
      body: `${match.method} ${match.displayPath}`,
      desc: 'A mock is registered for this path but disabled.',
      duration: 8000,
      action: {
        label: 'Enable mock',
        onClick: () => store.toggleKey(match.key),
      },
    });
  }

  async function mount(container?: HTMLElement) {
    if (mounted || disposed) {
      logger.warn('mount called twice (or after dispose); ignoring');
      return;
    }
    mounted = true;
    hydrate();

    renderHandle = mountRoot({
      position,
      theme: options.theme,
      ...(options.zIndex !== undefined ? { zIndex: options.zIndex } : {}),
      ...(container ? { container } : {}),
    });
    toasts = createToastHost(renderHandle.root);
    fab = createFab({ root: renderHandle.root, onOpen: () => store.setOpen(true) });
    fab.setBadge(store.get().enabledKeys.length);

    drawer = createDrawer({
      root: renderHandle.root,
      state: store,
      entries,
      handlers: {
        onToggle: (key) => store.toggleKey(key),
        onToggleMany: (keys, enabled) => store.toggleMany(keys, enabled),
        onClearAll: () => store.clearAll(),
        onSavePreset: (name) => store.savePreset(name),
        onLoadPreset: (name) => store.loadPreset(name),
        onDeletePreset: (name) => store.deletePreset(name),
        onCopyShare: () => copyShareUrl(),
        onClose: () => store.setOpen(false),
      },
    });

    applyShareParam();
    unsubState = store.subscribe(onStateChange);

    try {
      const worker = options.workerFactory
        ? options.workerFactory(options.handlers)
        : await defaultWorkerFactory(options.handlers);
      workerSync = createWorkerSync(worker, logger);
      await workerSync.start(options.workerStartOptions);
      workerSync.sync(activeHandlers());
      events.emit('ready');
    } catch (e) {
      logger.error('worker init failed', e);
    }
  }

  function unmount() {
    if (!mounted) return;
    drawer?.destroy(); drawer = null;
    fab?.destroy(); fab = null;
    toasts?.destroy(); toasts = null;
    if (renderHandle) { unmountRoot(renderHandle); renderHandle = null; }
    unsubState?.(); unsubState = null;
    mounted = false;
  }

  return {
    async mount(container) { await mount(container); },
    unmount() { unmount(); },
    async dispose() {
      if (disposed) return;
      disposed = true;
      if (persistTimer) clearTimeout(persistTimer);
      if (changeTimer) clearTimeout(changeTimer);
      try { persistence.save(snapshotPersisted()); } catch { /* ignore */ }
      unmount();
      await workerSync?.dispose();
      workerSync = null;
      events.clear();
    },
    getEnabledKeys: () => [...store.get().enabledKeys],
    isEnabled(method, url) {
      const m = unhandledMatcher({ method, url });
      if (!m) return false;
      return store.get().enabledKeys.includes(m.key);
    },
    findMatching: (method, url) => unhandledMatcher({ method, url }),
    getState: () => store.get(),
    enable: (key) => store.toggleMany([key], true),
    disable: (key) => store.toggleMany([key], false),
    toggle: (key) => store.toggleKey(key),
    setEnabled: (keys) => store.setEnabledKeys(keys),
    notifyUnhandledRequest,
    on: (event, listener) => events.on(event, listener),
    subscribe: (listener) => store.subscribe(listener),
    get version() { return typeof __PKG_VERSION__ === 'string' ? __PKG_VERSION__ : '0.0.0'; },
  };
}

// Make __PKG_VERSION__ available at build time; fall back at runtime.
declare const __PKG_VERSION__: string;
```

Add a tsup `define` so `__PKG_VERSION__` gets the real value at build time. Update `packages/core/tsup.config.ts`:

```ts
import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['msw', 'msw/browser'],
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
});
```

- [ ] **Step 4: Confirm pass**

```bash
pnpm --filter @juddroid/msw-devtools-core test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(core): controller facade orchestrating state, worker, UI, persistence"
```

---

## Task 21: Export the public core API

**Files:**
- Edit: `packages/core/src/index.ts`

- [ ] **Step 1: Replace `packages/core/src/index.ts`**

```ts
export { createController as createMswDevtools } from './controller';
export type {
  MswDevtoolsOptions,
  MswDevtoolsInstance,
} from './controller';
export type { MockKey, MockEntry, DevtoolsState } from './controller';
export type { Preset } from './state';
export type { Logger, LogLevel, LoggerOptions } from './logger';
export type { GroupBy } from './handlers/grouping';
export type { Position, Theme } from './ui/render';
export { getMockKey } from './handlers/matcher';

declare const __PKG_VERSION__: string;
export const version: string =
  typeof __PKG_VERSION__ === 'string' ? __PKG_VERSION__ : '0.0.0';
```

- [ ] **Step 2: Verify build and types**

```bash
pnpm --filter @juddroid/msw-devtools-core build
pnpm --filter @juddroid/msw-devtools-core typecheck
```

Confirm `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` are produced and the exported names match.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(core): public API surface — createMswDevtools + types"
```

---

## Task 22: React adapter — context and hook

**Files:**
- Create: `packages/react/src/provider.tsx`
- Create: `packages/react/src/use-msw-devtools.ts`
- Create: `packages/react/src/use-msw-devtools.test.tsx`

- [ ] **Step 1: Create context module**

`packages/react/src/provider.tsx`:

```tsx
'use client';
import { createContext } from 'react';
import type { MswDevtoolsInstance } from '@juddroid/msw-devtools-core';

export const MswDevtoolsContext = createContext<MswDevtoolsInstance | null>(null);
```

- [ ] **Step 2: Write the failing hook test**

`packages/react/src/use-msw-devtools.test.tsx`:

```tsx
import { http, HttpResponse } from 'msw';
import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MswDevtoolsContext } from './provider';
import { useMswDevtools } from './use-msw-devtools';
import type { MswDevtoolsInstance } from '@juddroid/msw-devtools-core';

function makeFakeInstance(): MswDevtoolsInstance {
  const listeners = new Set<(s: any) => void>();
  let state: any = {
    enabledKeys: [],
    presets: [], methodFilter: [], collapsedGroups: [], searchTerm: '', open: false,
  };
  return {
    mount: vi.fn(),
    unmount: vi.fn(),
    dispose: vi.fn(async () => {}),
    getEnabledKeys: () => [...state.enabledKeys],
    isEnabled: () => false,
    findMatching: () => null,
    getState: () => state,
    enable: vi.fn(),
    disable: vi.fn(),
    toggle: vi.fn((k: string) => {
      state = { ...state, enabledKeys: [...state.enabledKeys, k] };
      for (const l of listeners) l(state);
    }),
    setEnabled: vi.fn(),
    notifyUnhandledRequest: vi.fn(),
    on: vi.fn(() => () => {}),
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    version: '0.0.0-test',
  };
}

function Probe() {
  const { enabledKeys } = useMswDevtools();
  return <div data-testid="enabled">{enabledKeys.join(',')}</div>;
}

describe('useMswDevtools', () => {
  it('returns default keys when no provider is mounted', () => {
    render(<Probe />);
    expect(screen.getByTestId('enabled').textContent).toBe('');
  });

  it('reflects instance state and updates on subscribe notification', () => {
    const inst = makeFakeInstance();
    render(
      <MswDevtoolsContext.Provider value={inst}>
        <Probe />
      </MswDevtoolsContext.Provider>,
    );
    expect(screen.getByTestId('enabled').textContent).toBe('');
    act(() => { inst.toggle('GET::/a'); });
    expect(screen.getByTestId('enabled').textContent).toBe('GET::/a');
  });
});
```

- [ ] **Step 3: Confirm fail**

- [ ] **Step 4: Implement the hook**

`packages/react/src/use-msw-devtools.ts`:

```ts
'use client';
import { useContext, useMemo, useSyncExternalStore } from 'react';
import type { DevtoolsState, MockKey, MswDevtoolsInstance } from '@juddroid/msw-devtools-core';
import { MswDevtoolsContext } from './provider';

const FALLBACK_STATE: DevtoolsState = {
  enabledKeys: [],
  presets: [],
  methodFilter: [],
  collapsedGroups: [],
  searchTerm: '',
  open: false,
};

const noopSubscribe = () => () => {};
const noop = () => {};

export interface UseMswDevtoolsResult {
  enabledKeys: MockKey[];
  isEnabled: (method: string, url: string) => boolean;
  enable: (key: MockKey) => void;
  disable: (key: MockKey) => void;
  toggle: (key: MockKey) => void;
  setEnabled: (keys: MockKey[]) => void;
  notifyUnhandledRequest: (input: { method: string; url: string }) => void;
}

export function useMswDevtools(): UseMswDevtoolsResult {
  const inst = useContext(MswDevtoolsContext);
  const state = useSyncExternalStore<DevtoolsState>(
    inst ? inst.subscribe : noopSubscribe,
    () => (inst ? inst.getState() : FALLBACK_STATE),
    () => FALLBACK_STATE,
  );

  return useMemo<UseMswDevtoolsResult>(() => ({
    enabledKeys: state.enabledKeys,
    isEnabled: inst ? inst.isEnabled : (() => false),
    enable: inst ? inst.enable : noop,
    disable: inst ? inst.disable : noop,
    toggle: inst ? inst.toggle : noop,
    setEnabled: inst ? inst.setEnabled : noop,
    notifyUnhandledRequest: inst ? inst.notifyUnhandledRequest : noop,
  }), [inst, state]);
}
```

- [ ] **Step 5: Confirm pass**

```bash
pnpm --filter @juddroid/msw-devtools-react test
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(react): MswDevtoolsContext + useMswDevtools hook"
```

---

## Task 23: React adapter — MswDevtools component

**Files:**
- Create: `packages/react/src/MswDevtools.tsx`
- Create: `packages/react/src/MswDevtools.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { http, HttpResponse } from 'msw';
import { render, act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MswDevtools } from './MswDevtools';

const fakeWorkerFactory = () => ({
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  resetHandlers: vi.fn(),
  use: vi.fn(),
});

describe('<MswDevtools />', () => {
  it('renders children only when enabled=false', () => {
    render(
      <MswDevtools enabled={false} handlers={[]} workerFactory={fakeWorkerFactory}>
        <div data-testid="child">child</div>
      </MswDevtools>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(document.querySelector('[data-msw-devtools-root]')).toBeNull();
  });

  it('mounts the devtool DOM when enabled', async () => {
    render(
      <MswDevtools
        handlers={[http.get('/x', () => HttpResponse.json({}))]}
        workerFactory={fakeWorkerFactory}
      >
        <div data-testid="child">child</div>
      </MswDevtools>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(document.querySelector('[data-msw-devtools-root]')).not.toBeNull();
  });

  it('cleans up on unmount', async () => {
    const { unmount } = render(
      <MswDevtools handlers={[]} workerFactory={fakeWorkerFactory} />,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    unmount();
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(document.querySelector('[data-msw-devtools-root]')).toBeNull();
  });
});
```

- [ ] **Step 2: Confirm fail**

- [ ] **Step 3: Implement**

`packages/react/src/MswDevtools.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  createMswDevtools,
  type MockKey,
  type MswDevtoolsInstance,
  type MswDevtoolsOptions,
} from '@juddroid/msw-devtools-core';
import { MswDevtoolsContext } from './provider';

export interface MswDevtoolsProps extends MswDevtoolsOptions {
  children?: ReactNode;
  enabled?: boolean;
  onMockChange?: (keys: MockKey[]) => void;
  onReset?: () => void;
  onReady?: () => void;
}

export function MswDevtools(props: MswDevtoolsProps) {
  const { enabled = true, children, onMockChange, onReset, onReady, ...coreOpts } = props;
  const [instance, setInstance] = useState<MswDevtoolsInstance | null>(null);
  const optsRef = useRef(coreOpts);
  optsRef.current = coreOpts;

  useEffect(() => {
    if (!enabled) return;
    const inst = createMswDevtools(optsRef.current);
    const offs: Array<() => void> = [];
    if (onMockChange) offs.push(inst.on('mock-change', onMockChange));
    if (onReset) offs.push(inst.on('reset', onReset));
    if (onReady) offs.push(inst.on('ready', onReady));
    void inst.mount();
    setInstance(inst);
    return () => {
      for (const off of offs) off();
      void inst.dispose();
      setInstance(null);
    };
    // mount happens once per enabled-cycle; option deps tracked via ref intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  return (
    <MswDevtoolsContext.Provider value={instance}>
      {children}
    </MswDevtoolsContext.Provider>
  );
}
```

- [ ] **Step 4: Confirm pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(react): <MswDevtools/> component with enabled guard and lifecycle"
```

---

## Task 24: Export the public react API

**Files:**
- Edit: `packages/react/src/index.ts`

- [ ] **Step 1: Replace `packages/react/src/index.ts`**

```ts
'use client';
export { MswDevtools } from './MswDevtools';
export type { MswDevtoolsProps } from './MswDevtools';
export { useMswDevtools } from './use-msw-devtools';
export type { UseMswDevtoolsResult } from './use-msw-devtools';
export type {
  MockKey,
  MswDevtoolsOptions,
  MswDevtoolsInstance,
  DevtoolsState,
  Preset,
  Logger,
  LogLevel,
  LoggerOptions,
  GroupBy,
  Position,
  Theme,
} from '@juddroid/msw-devtools-core';
export const version = '0.0.0';
```

- [ ] **Step 2: Build and verify `'use client'` banner is in dist**

```bash
pnpm --filter @juddroid/msw-devtools-react build
head -n 1 packages/react/dist/index.mjs
```

Expected first line: `"use client";`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(react): public API surface"
```

---

## Task 25: Example — vanilla

**Files:**
- Create: `examples/vanilla/package.json`
- Create: `examples/vanilla/index.html`
- Create: `examples/vanilla/src/main.ts`
- Create: `examples/vanilla/src/handlers.ts`
- Create: `examples/vanilla/tsconfig.json`
- Create: `examples/vanilla/vite.config.ts`

- [ ] **Step 1: Create `examples/vanilla/package.json`**

```json
{
  "name": "@msw-devtools/example-vanilla",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@juddroid/msw-devtools-core": "workspace:*",
    "msw": "^2.7.0"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vite": "^6.0.7"
  }
}
```

- [ ] **Step 2: Create `examples/vanilla/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MSW Devtools — Vanilla Example</title>
</head>
<body>
  <h1>Vanilla MSW Devtools demo</h1>
  <p>Click the FAB in the bottom-right corner.</p>
  <pre id="out"></pre>
  <button id="fetch">Fetch /users</button>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Create `examples/vanilla/src/handlers.ts`**

```ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/users', () => HttpResponse.json([{ id: 1, name: 'Alice' }])),
  http.post('/users', () => HttpResponse.json({ ok: true }, { status: 201 })),
  http.get('/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Mocked' })),
];
```

- [ ] **Step 4: Create `examples/vanilla/src/main.ts`**

```ts
import { createMswDevtools } from '@juddroid/msw-devtools-core';
import { handlers } from './handlers';

const devtools = createMswDevtools({
  handlers,
  groupBy: (p) => (p.startsWith('/users') ? 'Users' : 'Other'),
});
void devtools.mount();

document.getElementById('fetch')?.addEventListener('click', async () => {
  const res = await fetch('/users');
  const json = await res.json();
  const out = document.getElementById('out');
  if (out) out.textContent = JSON.stringify(json, null, 2);
});
```

- [ ] **Step 5: Create `examples/vanilla/vite.config.ts` and `tsconfig.json`**

`examples/vanilla/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
export default defineConfig({ server: { port: 5173 } });
```

`examples/vanilla/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 6: Add MSW worker — instruct README via comment for now**

The MSW worker file (`public/mockServiceWorker.js`) is created by:

```bash
cd examples/vanilla
pnpm dlx msw init public/ --save
```

Add this command to the README later. For now just `pnpm install` to wire deps.

- [ ] **Step 7: Smoke-test**

```bash
pnpm install
pnpm --filter @msw-devtools/example-vanilla dev
```

Open http://localhost:5173, verify FAB shows, drawer opens, toggling /users mock changes fetch result.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs(examples): add vanilla example with vite"
```

---

## Task 26: Example — vite-react with axios + react-query

**Files:**
- Create: `examples/vite-react/package.json`
- Create: `examples/vite-react/index.html`
- Create: `examples/vite-react/src/main.tsx`
- Create: `examples/vite-react/src/App.tsx`
- Create: `examples/vite-react/src/handlers.ts`
- Create: `examples/vite-react/src/axios-bridge.tsx`
- Create: `examples/vite-react/tsconfig.json`
- Create: `examples/vite-react/vite.config.ts`

- [ ] **Step 1: `examples/vite-react/package.json`**

```json
{
  "name": "@msw-devtools/example-vite-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@juddroid/msw-devtools-react": "workspace:*",
    "@tanstack/react-query": "^5.62.11",
    "axios": "^1.7.9",
    "msw": "^2.7.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.3",
    "vite": "^6.0.7"
  }
}
```

- [ ] **Step 2: `examples/vite-react/index.html`**

```html
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>MSW Devtools — Vite + React</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

- [ ] **Step 3: `examples/vite-react/src/handlers.ts`**

```ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => HttpResponse.json([{ id: 1, name: 'Alice' }])),
  http.get('/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Mocked user' })),
  http.post('/api/users', () => HttpResponse.json({ ok: true })),
];
```

- [ ] **Step 4: `examples/vite-react/src/axios-bridge.tsx`**

```tsx
import axios from 'axios';
import { useEffect } from 'react';
import { useMswDevtools } from '@juddroid/msw-devtools-react';

export function AxiosBridge() {
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
```

- [ ] **Step 5: `examples/vite-react/src/App.tsx`**

```tsx
import axios from 'axios';
import { MswDevtools } from '@juddroid/msw-devtools-react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { handlers } from './handlers';
import { AxiosBridge } from './axios-bridge';

const client = new QueryClient();

function UsersPanel() {
  const { data, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await axios.get('/api/users')).data,
    retry: false,
  });
  if (isError) return <pre>error: {String((error as Error).message)}</pre>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function Inner() {
  const queryClient = useQueryClient();
  return (
    <MswDevtools
      handlers={handlers}
      onMockChange={() => queryClient.refetchQueries({ type: 'all' })}
    >
      <AxiosBridge />
      <h1>Vite + React + axios + react-query</h1>
      <UsersPanel />
    </MswDevtools>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <Inner />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: `examples/vite-react/src/main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

- [ ] **Step 7: `vite.config.ts` and `tsconfig.json`**

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [react()], server: { port: 5174 } });
```

`tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true,
    "types": ["react", "react-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 8: Initialize MSW worker**

```bash
cd examples/vite-react
pnpm dlx msw init public/ --save
```

- [ ] **Step 9: Smoke-test**

```bash
pnpm --filter @msw-devtools/example-vite-react dev
```

Open http://localhost:5174 — verify devtool works, axios miss-toast appears when toggling /api/users off and clicking refetch.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "docs(examples): add vite + react + axios + react-query example"
```

---

## Task 27: Example — Next.js App Router

**Files:**
- Create: `examples/nextjs-app/package.json`
- Create: `examples/nextjs-app/next.config.mjs`
- Create: `examples/nextjs-app/tsconfig.json`
- Create: `examples/nextjs-app/app/layout.tsx`
- Create: `examples/nextjs-app/app/page.tsx`
- Create: `examples/nextjs-app/app/providers.tsx`
- Create: `examples/nextjs-app/mocks/handlers.ts`

- [ ] **Step 1: `examples/nextjs-app/package.json`**

```json
{
  "name": "@msw-devtools/example-nextjs-app",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 5175",
    "build": "next build",
    "start": "next start -p 5175"
  },
  "dependencies": {
    "@juddroid/msw-devtools-react": "workspace:*",
    "msw": "^2.7.0",
    "next": "^15.1.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: `examples/nextjs-app/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
export default { reactStrictMode: true };
```

- [ ] **Step 3: `examples/nextjs-app/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "jsx": "preserve",
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["app", "mocks", "next-env.d.ts"]
}
```

- [ ] **Step 4: `examples/nextjs-app/mocks/handlers.ts`**

```ts
import { http, HttpResponse } from 'msw';
export const handlers = [
  http.get('/api/posts', () => HttpResponse.json([{ id: 1, title: 'Mocked post' }])),
];
```

- [ ] **Step 5: `examples/nextjs-app/app/providers.tsx`**

```tsx
'use client';
import { MswDevtools } from '@juddroid/msw-devtools-react';
import type { ReactNode } from 'react';
import { handlers } from '../mocks/handlers';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MswDevtools handlers={handlers} enabled={process.env.NODE_ENV !== 'production'}>
      {children}
    </MswDevtools>
  );
}
```

- [ ] **Step 6: `examples/nextjs-app/app/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

- [ ] **Step 7: `examples/nextjs-app/app/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState<unknown>(null);
  useEffect(() => {
    void fetch('/api/posts').then((r) => r.json()).then(setData);
  }, []);
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Next.js App Router + MSW Devtools</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

- [ ] **Step 8: Initialize the MSW worker**

```bash
cd examples/nextjs-app
pnpm dlx msw init public/ --save
```

- [ ] **Step 9: Smoke-test**

```bash
pnpm --filter @msw-devtools/example-nextjs-app dev
```

Open http://localhost:5175 — verify devtool mounts and SSR doesn't error.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "docs(examples): add Next.js App Router example"
```

---

## Task 28: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm size
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "ci: add lint/typecheck/test/build/size pipeline across Node 18/20/22"
```

---

## Task 29: Release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version-packages
          commit: 'chore: release packages'
          title: 'chore: release packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: 'true'
```

`NPM_TOKEN` is created on npm with **Granular Access Token** scoped to publish for `@juddroid/*`. Store as a GitHub Actions secret on the repository.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "ci: add changesets-based release workflow with provenance"
```

---

## Task 30: Issue template

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

- [ ] **Step 1: Create `.github/ISSUE_TEMPLATE/bug.yml`**

```yaml
name: Bug report
description: Something is broken in @juddroid/msw-devtools-core or -react.
labels: [bug]
body:
  - type: input
    id: version
    attributes:
      label: Package version(s)
      placeholder: '@juddroid/msw-devtools-react@0.1.0'
    validations: { required: true }
  - type: dropdown
    id: bundler
    attributes:
      label: Build tool / bundler
      options: [Vite, Webpack, Next.js (App Router), Next.js (Pages Router), Turbopack, Rollup, esbuild, Parcel, Other]
    validations: { required: true }
  - type: input
    id: framework
    attributes:
      label: Framework version
      placeholder: 'react 19.0.0 / next 15.1.4'
  - type: input
    id: browser
    attributes:
      label: Browser
      placeholder: 'Chrome 131'
  - type: textarea
    id: reproduction
    attributes:
      label: Minimal reproduction
      description: Link to a Stackblitz/CodeSandbox or repository.
    validations: { required: true }
  - type: textarea
    id: actual
    attributes:
      label: What happened?
    validations: { required: true }
  - type: textarea
    id: expected
    attributes:
      label: What did you expect?
    validations: { required: true }
```

- [ ] **Step 2: Create `.github/ISSUE_TEMPLATE/config.yml`**

```yaml
blank_issues_enabled: false
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add bug-report issue template"
```

---

## Task 31: README

**Files:**
- Edit: `README.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
# msw-devtools

Visual devtools for toggling [MSW](https://mswjs.io) handlers at runtime.

- **Framework-agnostic core** + thin React adapter
- **Modern dark-first UI** — no MUI/styled-components/zustand in your bundle
- **Persistent state** + URL-share-able mock sets
- **SSR-safe** — works in Next.js App Router & Pages Router
- **Zero impact on your styles** — scoped CSS, no globals

![screenshot](./docs/screenshot.png)

## Install

```bash
# React
pnpm add -D @juddroid/msw-devtools-react msw

# Vanilla / any framework
pnpm add -D @juddroid/msw-devtools-core msw
```

## Quick start (React)

```tsx
'use client';
import { MswDevtools } from '@juddroid/msw-devtools-react';
import { handlers } from './mocks/handlers';

export function Providers({ children }) {
  return (
    <MswDevtools
      handlers={handlers}
      enabled={process.env.NODE_ENV !== 'production'}
    >
      {children}
    </MswDevtools>
  );
}
```

You also need MSW's service worker file in `public/`:

```bash
pnpm dlx msw init public/ --save
```

## Quick start (vanilla)

```ts
import { createMswDevtools } from '@juddroid/msw-devtools-core';
import { handlers } from './handlers';

const devtools = createMswDevtools({ handlers });
devtools.mount();
```

## Recipes

### axios — show "enable mock" toast on a failed request

```tsx
import { useEffect } from 'react';
import { useMswDevtools } from '@juddroid/msw-devtools-react';
import axios from 'axios';

export function AxiosBridge() {
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
```

### react-query — refetch on mock change

```tsx
const queryClient = useQueryClient();
<MswDevtools
  handlers={handlers}
  onMockChange={() => queryClient.refetchQueries({ type: 'all' })}
>
  {/* … */}
</MswDevtools>
```

### Group handlers by path prefix

```tsx
<MswDevtools
  handlers={handlers}
  groupBy={(path) => {
    if (path.startsWith('/admin')) return 'Admin';
    if (path.startsWith('/users')) return 'Users';
    return 'Other';
  }}
/>
```

## API

See [the design spec](./docs/superpowers/specs/2026-05-28-msw-devtools-design.md) for the full reference. The most important option set:

| Option | Default | Purpose |
|---|---|---|
| `handlers` | (required) | MSW request handlers |
| `baseUrl` | `undefined` | API prefix stripped from displayed paths |
| `groupBy` | `() => 'Other'` | Group inference |
| `defaultEnabled` | `[]` | First-run enabled keys |
| `storageKey` | `'msw-devtools'` | localStorage namespace |
| `position` | `'bottom-right'` | FAB anchor |
| `theme` | `'auto'` | `'light' \| 'dark' \| 'auto'` |
| `enabled` (React only) | `true` | Production gate |
| `onMockChange` | — | Called after toggles, debounced |

## Compatibility

- React 18 and 19
- Node 18+
- MSW v2
- Vite, Webpack 4/5, Rollup, esbuild, Turbopack, Parcel
- Next.js (App Router + Pages Router) with `'use client'` preserved

## License

MIT © 2026 Dongcheol Jeong

---

### 한국어

MSW handler를 런타임에 시각적으로 켜고 끄는 devtools. React + vanilla.

자세한 설계는 [디자인 스펙](./docs/superpowers/specs/2026-05-28-msw-devtools-design.md) 참고.
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: README with quick start, recipes, compatibility matrix"
```

---

## Task 32: First publish — v0.1.0

**Files:**
- Create: `.changeset/initial.md`

- [ ] **Step 1: Create changeset entry**

`.changeset/initial.md`:

```md
---
'@juddroid/msw-devtools-core': minor
'@juddroid/msw-devtools-react': minor
---

Initial v0.1.0 release: visual devtools to toggle MSW handlers at runtime. Framework-agnostic core + React adapter with Provider/hook. Dark-first UI, SSR-safe, no global side effects.
```

- [ ] **Step 2: Locally verify the version bump works**

```bash
pnpm version-packages
```

Confirm `packages/core/package.json` and `packages/react/package.json` are bumped to `0.1.0` and a CHANGELOG is generated for each. Revert with `git checkout .` after inspecting — the real version bump runs on CI when merging.

- [ ] **Step 3: Set up npm token**

On npm:
1. Log in to `npmjs.com`.
2. Create the `@juddroid` scope (free, will be created on first publish).
3. **Account → Access tokens → Generate token → Granular Access Token**.
4. Scope: publish, packages `@juddroid/*`.
5. Save the token to GitHub repo secrets as `NPM_TOKEN`.

- [ ] **Step 4: Push to GitHub**

```bash
git remote add origin git@github.com:juddroid/msw-devtools.git
git push -u origin main
```

CI should run and pass.

- [ ] **Step 5: Merge release PR**

The changesets workflow opens a "Version Packages" PR. Review the diff (CHANGELOG, version bumps), then merge. The workflow then runs `pnpm release`, publishing both packages with `--provenance`.

- [ ] **Step 6: Verify publication**

```bash
npm view @juddroid/msw-devtools-core
npm view @juddroid/msw-devtools-react
```

Both should show `0.1.0`.

- [ ] **Step 7: Tag release on GitHub**

The changesets action creates a GitHub Release automatically. Verify it on the Releases page.

- [ ] **Step 8: Smoke-test installed package**

In a scratch directory:

```bash
mkdir /tmp/msw-devtools-smoke && cd /tmp/msw-devtools-smoke
pnpm init
pnpm add @juddroid/msw-devtools-react react react-dom msw
node -e "import('@juddroid/msw-devtools-react').then(m => console.log(Object.keys(m)))"
```

Confirm `MswDevtools`, `useMswDevtools`, `version` are exported.

- [ ] **Step 9: Announce**

(Optional) Post on r/reactjs / Twitter / dev.to. Update bubbletap-admin to use the published package (see spec §16).

---

## Self-Review

**Spec coverage check (numbers refer to spec sections):**

- §1 Goals → covered across tasks 1–32; non-goals (Vue/Svelte, response editor, telemetry, E2E, resizable drawer, Shadow DOM) are explicitly excluded from this plan
- §2 Source of truth — generalized internals: tasks 5–14 (no MUI/zustand/styled-components/axios/react-query referenced)
- §3 Package & repo structure → tasks 1–4
- §4 Public API → tasks 21 (core), 24 (react)
- §5 Architecture → tasks 10 (state), 11 (persistence), 12 (registry), 13 (unhandled), 14 (worker), 20 (controller), 22 (react context+hook), 23 (component)
- §6 Data flow & lifecycle → exercised by task 20 controller tests (hydrate, share param, debounce, dispose)
- §7 UI/UX → tasks 15 (styles + icons), 16 (render), 17 (FAB), 18 (toast), 19 (drawer)
- §8 Library quality — universal compatibility, host-app safety, observability, security → tasks 3–4 (package config, sideEffects, exports), 8 (logger), 15–16 (scoped CSS), 20 (error guards), 28–29 (CI/release with provenance)
- §9 Error handling matrix → tested in tasks 11 (persistence), 14 (worker fail), 20 (controller mount errors, double-mount warn)
- §10 Testing strategy → vitest configs in tasks 3–4, coverage thresholds, integration tests across modules
- §11 Build & packaging → tsup configs in tasks 3–4 with `'use client'` banner and `define: __PKG_VERSION__` in task 20
- §12 CI / CD → tasks 28–29
- §13 Documentation → task 31
- §14 Versioning & roadmap → task 32 first publish
- §15 Open decisions deferred → these are tunings, intentionally not in plan
- §16 Migration from bubbletap-admin → noted in README; actual migration is post-publish work

**No gaps found.**

**Placeholder scan:** No `TBD`, `TODO`, `add appropriate error handling`, or vague placeholders. Every code step ships actual code.

**Type consistency:**

- `MockKey` consistent across tasks 5, 7, 8, 10, 11, 12, 13, 20, 21, 22, 23, 24
- `MswDevtoolsInstance` method names match between task 20 (definition), task 22 (consumed by hook), task 23 (consumed by component) — all use `mount/unmount/dispose/enable/disable/toggle/setEnabled/notifyUnhandledRequest/getEnabledKeys/isEnabled/findMatching/getState/on/subscribe/version`
- `DrawerHandlers` callback names (`onToggle`, `onToggleMany`, `onClearAll`, `onSavePreset`, `onLoadPreset`, `onDeletePreset`, `onCopyShare`, `onClose`) defined in task 19 and supplied identically in task 20
- `createWorkerSync` signature matches between task 14 (definition) and task 20 (consumer)
- `Worker` interface (`start/stop/resetHandlers/use`) used identically in tasks 14, 20, and test fakes in 20, 23
- Storage keys, attributes (`ROOT_ATTR`, `STYLE_TAG_ATTR`), event names (`mock-change`, `reset`, `ready`) consistent everywhere

**No inconsistencies found.**

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-28-msw-devtools.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
