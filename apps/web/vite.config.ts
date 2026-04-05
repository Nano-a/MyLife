import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  let base = env.VITE_BASE_PATH?.trim() || "/";
  if (base !== "/" && !base.endsWith("/")) base += "/";

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        "@mylife/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
