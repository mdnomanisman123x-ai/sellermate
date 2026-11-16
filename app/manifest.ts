import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SellerMate — সেলার খাতা",
    short_name: "SellerMate",
    description: "গ্রাহক, বাকি ও ফলো-আপের সহজ খাতা",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7EE",
    theme_color: "#0E2B25",
    lang: "bn",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
