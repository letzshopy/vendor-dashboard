/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "letzshopy.in" },
      { protocol: "https", hostname: "www.letzshopy.in" },
      { protocol: "https", hostname: "template.letzshopy.in" },
      { protocol: "https", hostname: "7pleats.letzshopy.in" },
      { protocol: "https", hostname: "**.wp.com" },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;