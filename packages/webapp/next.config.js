/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@ue-bot/shared', '@ue-bot/database', '@ue-bot/agent-core'],
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

module.exports = nextConfig;
