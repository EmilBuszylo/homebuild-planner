import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/logowanie", destination: "/login" },
      { source: "/rejestracja", destination: "/register" },
      { source: "/panel", destination: "/dashboard" },
      { source: "/ankieta", destination: "/questionnaire" },
      { source: "/moj-plan/:planId", destination: "/plan/:planId" },
    ];
  },
};

export default nextConfig;
