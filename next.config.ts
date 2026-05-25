import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/logowanie", destination: "/login" },
      { source: "/rejestracja", destination: "/register" },
    ];
  },
};

export default nextConfig;
