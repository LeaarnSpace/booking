import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source
  transpilePackages: ["@learnspace/auth-staff"],
};

export default nextConfig;
