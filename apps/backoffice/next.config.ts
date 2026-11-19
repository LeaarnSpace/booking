import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source
  transpilePackages: [
    "@learnspace/auth-staff",
    "@learnspace/bookings",
    "@learnspace/storage",
    "@learnspace/website-content",
  ],
};

export default nextConfig;
