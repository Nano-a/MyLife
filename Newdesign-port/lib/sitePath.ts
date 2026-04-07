/** Préfixe pour déploiement sous sous-chemin (ex. GitHub Pages /MyLife/). Vide en local. */
export function siteBasePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");
}

export function publicPath(href: string): string {
  const base = siteBasePath();
  const p = href.startsWith("/") ? href : `/${href}`;
  return base ? `${base}${p}` : p;
}
