import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-7cd50ebcfa544478acb6545cc8dadf40.r2.dev",
      },
    ],
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
