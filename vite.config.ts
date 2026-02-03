import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import webfontDownload from "vite-plugin-webfont-dl";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "esnext",
  },
  plugins: [
    // Order from TanStack Start Cloudflare example
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    webfontDownload(),
  ],
});
