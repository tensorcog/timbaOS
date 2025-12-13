/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for pino/pino-pretty worker threads issue
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pino-pretty');
    }
    return config;
  },
};

export default nextConfig;
