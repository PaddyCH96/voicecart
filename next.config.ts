import type { NextConfig } from "next";

const withPWA = (
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("next-pwa") as (config: NextConfig & { pwa?: Record<string, unknown> }) => NextConfig
);

const nextConfig: NextConfig = withPWA({
  output: "standalone",
  turbopack: {},
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
  },
});

export default nextConfig;
