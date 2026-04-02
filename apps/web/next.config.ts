import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/kenya/watamu/beach/garoda-beach",
        destination: "/experiences/watamu/garoda-beach",
        permanent: true,
      },
      {
        source: "/2024/11/06/money-exchange-atm-watamu",
        destination: "/journal/money-exchange-atm-watamu-guide",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
