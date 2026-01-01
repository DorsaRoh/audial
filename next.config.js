/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { esmExternals: "loose" },
  webpack: (config, { dev }) => {
    config.module.rules.push({
      test: /\.worklet\.(js|ts)$/,
      type: "asset/source",
    });
    
    // Disable webpack filesystem cache in development to avoid corruption issues
    if (dev) {
      config.cache = false;
    }
    
    return config;
  },
};

module.exports = nextConfig;
