import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import esbuild from "esbuild";

export default defineConfig({
  plugins: [
    react(),
    // @vitejs/plugin-react-swc only transforms JSX in .jsx/.tsx files, so
    // .test.js files that use JSX (a common testing-library convention)
    // fail Vite's import-analysis parse step. Pre-transform just those
    // files with esbuild's JSX loader before the rest of the pipeline runs.
    {
      name: "jsx-in-test-js",
      enforce: "pre",
      async transform(code, id) {
        if (!id.endsWith(".test.js")) return null;
        const result = await esbuild.transform(code, {
          loader: "jsx",
          jsx: "automatic",
          sourcefile: id,
        });
        return { code: result.code, map: result.map };
      },
    },
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "frontend/src/setupTests.js",
    css: true,
  },
});
