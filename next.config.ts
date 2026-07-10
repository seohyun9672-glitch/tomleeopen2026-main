import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
  webpack(config, { dev }) {
    if (dev && config.watchOptions) {
      config.watchOptions.ignored = [
        "**/node_modules/**",
        "**/.next/**",
        "**/.git/**",
        "**/dev.db",
        "**/*.db",
        "**/*.db-journal",
        "**/*.db-wal",
        "**/*.db-shm",
      ];
    }
    return config;
  }
};

export default nextConfig;
