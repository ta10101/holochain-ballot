import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** GitHub Pages project sites use a subpath; set VITE_BASE=/repo-name/ in CI (trailing slash required). */
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5175,
  },
});
