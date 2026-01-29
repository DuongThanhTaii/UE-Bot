/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@ue-bot/shared'],
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

module.exports = nextConfig;
