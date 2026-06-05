import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import http from "node:http";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://187.127.163.17:3006",
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
        target: "ws://187.127.163.17:3006",
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
});
