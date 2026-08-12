import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function isLocalOrigin(value: string) {
  try {
    const url = new URL(value);

    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const DEFAULT_DUEABLE_WEB_ORIGIN = "https://dueable-web.vercel.app";

function resolveWebOrigin(mode: string, fileOrigin?: string) {
  const shellOrigin = process.env.VITE_DUEABLE_WEB_ORIGIN ?? process.env.VITE_DUEABLE_DASHBOARD_URL;
  const allowLocalhostOrigin = process.env.VITE_DUEABLE_ALLOW_LOCALHOST_ORIGIN === "true";
  const configuredOrigin = normalizeOrigin(shellOrigin || fileOrigin || DEFAULT_DUEABLE_WEB_ORIGIN);

  if (mode === "production" && !allowLocalhostOrigin && isLocalOrigin(configuredOrigin)) {
    return DEFAULT_DUEABLE_WEB_ORIGIN;
  }

  return configuredOrigin;
}

function buildManifestPlugin(webOrigin: string): Plugin {
  return {
    name: "dueable-extension-manifest",
    apply: "build",
    generateBundle() {
      const normalizedOrigin = normalizeOrigin(webOrigin);
      const hostPermissions = [
        `${normalizedOrigin}/*`,
        "*://*/courses/*",
        "*://*/assignments/*",
        "*://*.instructure.com/*",
      ];

      const manifest = {
        manifest_version: 3,
        name: "Dueable",
        description: "Canvas import tools for the Dueable planner.",
        version: "0.1.0",
        action: {
          default_title: "Dueable",
        },
        icons: {
          16: "assets/logo.png",
          32: "assets/logo.png",
          48: "assets/logo.png",
          128: "assets/logo.png",
        },
        permissions: ["activeTab", "storage", "tabs", "scripting", "sidePanel"],
        side_panel: {
          default_path: "index.html",
        },
        host_permissions: hostPermissions,
        background: {
          service_worker: "background.js",
          type: "module",
        },
      };

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const webOrigin = resolveWebOrigin(mode, env.VITE_DUEABLE_WEB_ORIGIN || env.VITE_DUEABLE_DASHBOARD_URL);

  return {
    base: "./",
    plugins: [react(), buildManifestPlugin(webOrigin)],
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "index.html"),
          background: resolve(__dirname, "src/background.ts"),
          content: resolve(__dirname, "src/content.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
  };
});
