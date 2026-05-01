/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'lightweight-charts', 'lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.getpara.com https://*.getpara.com",
              "style-src 'self' 'unsafe-inline' https://cdn.getpara.com https://*.getpara.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://cdn.getpara.com https://*.getpara.com",
              "connect-src 'self' https://api.aomi.dev https://aomi.dev https://*.aomi.dev https://gamma-api.polymarket.com https://clob.polymarket.com https://api.getpara.com https://*.getpara.com https://rpc.walletconnect.com https://relay.walletconnect.com wss: https:",
              "frame-src 'self' https://cdn.getpara.com https://*.getpara.com",
              "worker-src blob: 'self'",
              "child-src blob: 'self' https://*.getpara.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub missing Solana/Farcaster peer deps that Para SDK pulls in transitively
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@farcaster/mini-app-solana': false,
        '@solana/web3.js': false,
        '@solana/wallet-adapter-base': false,
        '@solana/wallet-adapter-react': false,
      };
    }
    // Also alias them to false on server to prevent SSR errors
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': false,
    };
    return config;
  },
}

module.exports = nextConfig;

