import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/logowanie", destination: "/login" },
      { source: "/rejestracja", destination: "/register" },
      { source: "/panel", destination: "/dashboard" },
    ];
  },
};

export default nextConfig;
