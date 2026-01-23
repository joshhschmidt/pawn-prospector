import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // Workaround for stale dependency pre-bundles:
  // react-chessboard v5+ uses React 19's `use()` hook, but this project runs React 18.
  // Excluding it from optimizeDeps prevents Vite from serving an older cached prebundle.
  optimizeDeps: {
    exclude: ["react-chessboard"],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure there's only one copy of React in the bundle.
    dedupe: ["react", "react-dom"],
  },
}));
