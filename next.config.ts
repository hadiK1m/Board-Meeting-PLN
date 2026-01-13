import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      // Menaikkan batas ukuran body untuk Server Actions menjadi 50MB
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;