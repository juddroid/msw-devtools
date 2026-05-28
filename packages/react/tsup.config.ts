import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  dts: true,
  sourcemap: true,
  clean: true,
  // treeshake is intentionally omitted (defaults to false) so esbuild handles
  // the entire bundle — esbuild preserves the banner directive whereas the
  // rollup tree-shaking pass would strip it as an unrecognised module-level
  // directive.
  banner: { js: '"use client";' },
  external: ['react', 'react-dom', 'msw', 'msw/browser', '@juddroid_raccoon/msw-devtools-core'],
});
