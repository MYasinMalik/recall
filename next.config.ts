import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdf.js loads its own worker and font data at runtime; it must not be bundled.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
