/** Préfixe pour déploiement sous sous-chemin (ex. GitHub Pages /MyLife/). Vide en local. */
export function siteBasePath(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_PATH ||
    (typeof window === "undefined" ? process.env.NEXT_BASE_PATH : "") ||
    "";
  return String(raw).replace(/\/+$/, "");
}

export function publicPath(href: string): string {
  const base = siteBasePath();
  const p = href.startsWith("/") ? href : `/${href}`;
  return base ? `${base}${p}` : p;
}
