import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/pizzerias', destination: '/pizzerie', permanent: true },
      { source: '/login', destination: '/accedi', permanent: true },
      { source: '/profile', destination: '/profilo', permanent: true },
      { source: '/agenda', destination: '/eventi', permanent: true },
      { source: '/planner', destination: '/eventi', permanent: true },
      { source: '/visits', destination: '/eventi', permanent: true },
      { source: '/visits/:id', destination: '/eventi/:id', permanent: true },
    ]
  },
};

export default nextConfig;
