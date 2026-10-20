import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  experimental: {
    // The on-disk dev cache goes stale across restarts here and puts the browser into an
    // "HMR hash mismatch" reload loop. Compiles are fast enough without it.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
