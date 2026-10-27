import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source
  transpilePackages: [
    "@learnspace/auth-customers",
    "@learnspace/bookings",
    "@learnspace/chat",
    "@learnspace/email",
    "@learnspace/storage",
  ],
};

export default nextConfig;
