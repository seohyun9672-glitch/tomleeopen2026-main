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
      { source: "/tournament/overview", destination: "/overview", permanent: true },
      { source: "/tournament/rules", destination: "/rules", permanent: true },
      { source: "/tournament/honour-roll", destination: "/honour-roll", permanent: true },
      
    ];
  },
  async rewrites() {
    return [
      { source: "/admin", destination: "/en/admin" },
      { source: "/admin/login", destination: "/en/admin/login" },
    ];
  },
};

export default nextConfig;
