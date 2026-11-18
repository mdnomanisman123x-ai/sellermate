import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SellerMate",
    short_name: "SellerMate",
    description: "Sales, customers, stock, finance and an AI advisor for small businesses.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6F8F7",
    theme_color: "#0F7B5C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
