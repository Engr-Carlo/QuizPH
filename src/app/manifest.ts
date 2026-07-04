import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuizPH",
    short_name: "QuizPH",
    description: "A quiz platform with anti-cheat monitoring for Philippine educators",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2563EB",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
