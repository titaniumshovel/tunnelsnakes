import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's.yimg.com',
        pathname: '/iu/**',
      },
    ],
  },
};

export default nextConfig;
