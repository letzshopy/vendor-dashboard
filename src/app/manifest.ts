import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LetzShopy Vendor Dashboard",
    short_name: "LetzShopy",
    description: "LetzShopy vendor admin dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#27346D",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}