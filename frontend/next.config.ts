import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules/tailwindcss/index.css"),
    },
  },
};

export default nextConfig;
