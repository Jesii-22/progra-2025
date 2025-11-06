/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Aumentar timeout para las rutas de API (la generación puede tardar)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
