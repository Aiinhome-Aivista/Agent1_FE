import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import http from "node:http";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const targetUrl = env.VITE_BACKEND_URL || "http://0.0.0.0:3006";
  const wsTargetUrl = targetUrl.replace(/^http/, "ws");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: targetUrl,
          changeOrigin: true,
          agent: new http.Agent({ keepAlive: true, keepAliveMsecs: 3000 }),
          configure: (proxy) => {
            proxy.on("error", (err) => {
              // Silently swallow noisy/expected network disconnect logs
              if (err.message.includes("ECONNRESET")) return;
            });
          },
        },
        "/ws": {
          target: wsTargetUrl,
          ws: true,
          agent: new http.Agent({ keepAlive: true, keepAliveMsecs: 3000 }),
          configure: (proxy) => {
            proxy.on("error", (err) => {
              if (
                err.message.includes("ECONNRESET") ||
                err.message.includes("ECONNABORTED")
              )
                return;
            });
          },
        },
      },
    },
  };
});
