import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /api to your FastAPI backend so you avoid CORS
// pain while developing. Change the target if your backend runs
// somewhere else.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
