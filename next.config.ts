import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bullmq", "ioredis"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
