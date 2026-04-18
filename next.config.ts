import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/today', destination: '/', permanent: false }]
  },
  turbopack: {
    root: appDir,
  },
  /**
   * Required when opening the dev server via your LAN IP (e.g. phone at
   * http://192.168.x.x:3001). Otherwise Next blocks `/_next/*` fetches and
   * the app renders as static HTML with no hydration — no clicks, no toggles.
   * Add your machine’s “Network:” host from `next dev` if it changes.
   */
  allowedDevOrigins: [
    "192.168.1.46",
    ...(process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(/\s*,\s*/).filter(Boolean) ??
      []),
  ],
};

export default nextConfig;
