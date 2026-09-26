// FILE: app/manifest.ts
// Install metadata for the holder-facing Abraxas Passport web app.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/passport",
    name: "Abraxas Passport",
    short_name: "Abraxas",
    description: "Keep verified information private and share only the eligibility result a service needs.",
    start_url: "/passport",
    scope: "/",
    display: "standalone",
    background_color: "#07101f",
    theme_color: "#07101f",
    orientation: "portrait-primary",
    categories: ["finance", "security", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
