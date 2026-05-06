import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse v2 uses pdfjs-dist with a worker module that breaks under
  // Turbopack/webpack bundling. Mark it external so Node loads it directly.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
