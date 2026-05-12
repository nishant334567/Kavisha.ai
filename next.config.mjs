/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.output = {
        ...config.output,
        // Dev first-compile + slow disks (e.g. OneDrive) can exceed default chunk wait
        chunkLoadTimeout: 300_000,
      };
    }
    return config;
  },
};

export default nextConfig;
