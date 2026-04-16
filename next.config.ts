import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
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
  },
  async redirects() {
    return [
      { source: "/tournament/about", destination: "/overview", permanent: true },
      { source: "/tournament/overview", destination: "/overview", permanent: true },
      { source: "/tournament/rules", destination: "/rules", permanent: true },
      { source: "/tournament/divisions", destination: "/tournament/categories", permanent: true },
      { source: "/results", destination: "/draws", permanent: true },
      { source: "/tournament/honour-roll", destination: "/honour-roll", permanent: true },
    ];
  },
};

export default nextConfig;
