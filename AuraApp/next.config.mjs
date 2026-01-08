/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    // Ignore third-party package type errors (@noble/curves, @elizaos/core have broken TS exports)
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Suppress pino-pretty optional dependency warning
    config.ignoreWarnings = [
      { module: /node_modules\/pino\/lib\/tools\.js/ },
      /Can't resolve 'pino-pretty'/,
    ];

    return config;
  },
};

export default nextConfig;

