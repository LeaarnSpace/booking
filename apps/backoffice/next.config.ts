import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared database package ships TypeScript source
  transpilePackages: ["@learnspace/db"],
};

export default nextConfig;
