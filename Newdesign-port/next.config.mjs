import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const raw = (process.env.NEXT_BASE_PATH || "").trim();
const basePath =
  raw && raw !== "/"
    ? (raw.startsWith("/") ? raw : `/${raw}`).replace(/\/+$/, "")
    : "";

const nextConfig = {
  output: "export",
  transpilePackages: ["@mylife/core"],
  ...(basePath ? { basePath } : {}),
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
