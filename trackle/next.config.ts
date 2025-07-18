import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Prevent ESLint errors from blocking Vercel build
  },
};

export default nextConfig;
