import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      // Allow error details to be sent to the client
      allowedOrigins: ['*'],
    },
  },
  // Development-specific settings
  ...(process.env.NODE_ENV === 'development' && {
    // Show detailed error messages in development
    productionBrowserSourceMaps: false,
  }),
};

export default nextConfig;
