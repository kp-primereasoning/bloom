import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Shopify needs specific HMR config for embedded apps
declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

const port = parseInt(process.env.PORT || "3000");

export default defineConfig({
  server: {
    port,
    allowedHosts: [".trycloudflare.com"],
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 64999,
    },
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
});
