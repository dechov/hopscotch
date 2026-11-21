import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";

// GitHub Pages serves the app at /hopscotch/, so production builds use that base path.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/hopscotch/" : "/",
  plugins: [
    { enforce: "pre", ...mdx({ jsxImportSource: "react" }) },
    react(),
  ],
}));
