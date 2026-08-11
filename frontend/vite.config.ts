import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      strictPort: true,
    },
    build: {
      target: "es2020",
      outDir: "dist",
      sourcemap: mode === "development",
      minify: "esbuild",
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            react: ["react", "react-dom"],
            router: ["react-router-dom"],
            vendor: ["axios", "@tanstack/react-query"],
          },
        },
      },
    },
    envPrefix: "VITE_",
  };
});