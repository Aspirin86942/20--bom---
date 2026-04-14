import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";


export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
