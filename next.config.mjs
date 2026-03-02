/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Allow WordPress uploads from your sites (adjust if needed)
      { protocol: "https", hostname: "letzshopy.in" },
      { protocol: "https", hostname: "www.letzshopy.in" },
      { protocol: "https", hostname: "template.letzshopy.in" },
      // Add any CDN/Jetpack domain you use for images
      { protocol: "https", hostname: "**.wp.com" },
    ],
  },

  eslint: {
    // ✅ Do not fail `next build` because of ESLint errors/warnings
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
