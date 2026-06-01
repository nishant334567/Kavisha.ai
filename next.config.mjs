/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["sharp"],
  devIndicators: false,
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.output = config.output || {};
      config.output.chunkLoadTimeout = 120000;
    }
    return config;
  },
};

export default nextConfig;
