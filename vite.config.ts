import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";
import { writeFileSync } from 'fs';

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname
const appVersion = process.env.VITE_APP_VERSION || '1.0.0'

// Plugin to generate version.json during build
const generateVersionFile = (): PluginOption => {
  return {
    name: 'generate-version-file',
    writeBundle() {
      const versionData = {
        version: appVersion,
        buildTime: new Date().toISOString()
      };
      writeFileSync(
        resolve(projectRoot, 'dist', 'version.json'),
        JSON.stringify(versionData, null, 2)
      );
      console.log(`Generated version.json with version ${appVersion}`);
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin() as PluginOption,
    generateVersionFile() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  }
});
