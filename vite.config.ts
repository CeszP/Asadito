import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["asadito-16.png", "asadito-32.png", "asadito-180.png"],
      manifest: {
        name: "Asadito",
        short_name: "Asadito",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0f0f0f",
        theme_color: "#0f0f0f",
        icons: [
          {
            src: "/asadito-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/asadito-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/asadito-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
