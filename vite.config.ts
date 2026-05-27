import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devPort = Number(env.VITE_DEV_PORT) || 8080;
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8081";

  return {
    plugins: [react()],
    server: {
      port: devPort,
      strictPort: true,
      open: true,
      proxy: {
        "/v1": { target: apiTarget, changeOrigin: true },
        "/actuator": { target: apiTarget, changeOrigin: true },
      },
    },
    preview: {
      port: devPort,
      strictPort: true,
      proxy: {
        "/v1": { target: apiTarget, changeOrigin: true },
        "/actuator": { target: apiTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    publicDir: "public",
  };
});
