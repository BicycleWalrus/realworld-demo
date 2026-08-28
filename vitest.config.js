import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    // @vitejs/plugin-react-swc's own `config()` hook (apply: "serve", which
    // covers Vitest) unconditionally sets `esbuild: false` to disable
    // Vite's default esbuild transform in dev/test mode. That hook runs
    // after ours and its `false` wins the config merge, so a top-level
    // `esbuild: { include, loader }` here is silently discarded (verified:
    // resolveConfig(..., "serve").esbuild === false even with that option
    // set). This tiny `enforce: "post"` plugin re-applies the native
    // esbuild option after react-swc's hook has run, restoring JSX support
    // for .test.js files (a testing-library convention not covered by
    // react-swc, which only transforms .jsx/.tsx/.ts/.mdx) with Vite's
    // built-in esbuild loader mechanism rather than a manual transform.
    {
      name: "restore-esbuild-jsx-for-test-js",
      enforce: "post",
      config: () => ({
        esbuild: {
          include: /\.test\.js$/,
          // Vite's esbuild plugin defaults `exclude` to /\.js$/, which
          // would otherwise still exclude our .test.js files even though
          // they match `include` above (createFilter requires matching
          // include AND not matching exclude).
          exclude: [],
          loader: "jsx",
          // esbuild's JSX default is the classic transform, which expects
          // `React` in scope. This project's components use the automatic
          // runtime (via @vitejs/plugin-react-swc), so match that here too.
          jsx: "automatic",
        },
      }),
    },
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "frontend/src/setupTests.js",
    css: true,
  },
});
