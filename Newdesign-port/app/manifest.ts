import type { MetadataRoute } from "next";
import { siteBasePath } from "@/lib/sitePath";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const base = siteBasePath();
  const prefix = base || "";

  return {
    name: "LifeFlow - Suivi de Vie Personnel",
    short_name: "LifeFlow",
    description: "Votre compagnon quotidien pour organiser votre vie",
    start_url: prefix ? `${prefix}/` : "/",
    display: "standalone",
    background_color: "#0f0f1a",
    theme_color: "#6366f1",
    orientation: "portrait-primary",
    icons: [
      {
        src: `${prefix}/apple-icon.png`,
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["productivity", "lifestyle", "health"],
  };
}
