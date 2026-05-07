import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf uses pdfjs-dist internally — mark as external so Node loads it directly.
  serverExternalPackages: ["unpdf", "pdfjs-dist"],
};

export default nextConfig;
