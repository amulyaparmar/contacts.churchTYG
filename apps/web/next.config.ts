import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tkweddqlriikqgylsuxz.supabase.co",
        pathname: "/storage/v1/object/public/images/instagram/media/**"
      }
    ]
  }
};

export default nextConfig;
