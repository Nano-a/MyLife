import type { MetadataRoute } from "next";
import { publicPath, siteBasePath } from "@/lib/sitePath";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const base = siteBasePath();
  const prefix = base || "";

  return {
    name: "MyLife — Suivi de vie personnel",
    short_name: "MyLife",
    description: "Suivi local : habitudes, hydratation, finances, agenda et objectifs",
    start_url: prefix ? `${prefix}/` : "/",
    display: "standalone",
    background_color: "#0f0f1a",
    theme_color: "#1a6b52",
    orientation: "portrait-primary",
    icons: [
      {
        src: publicPath("/icon"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: publicPath("/icon"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: publicPath("/apple-icon"),
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: publicPath("/mylife-pwa.svg"),
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["productivity", "lifestyle", "health"],
  };
}
