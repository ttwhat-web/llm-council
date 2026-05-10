import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed dev port.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "0.0.0.0"
  },
  build: {
    target: ["es2022", "chrome112", "safari16"],
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  envPrefix: ["VITE_", "TAURI_"]
});
