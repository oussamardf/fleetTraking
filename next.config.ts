import type { NextConfig } from "next";

function supabaseImagePattern(): { protocol: "http" | "https"; hostname: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (url) {
    try {
      const parsed = new URL(url)
      const protocol = parsed.protocol === "http:" ? "http" : "https"
      return { protocol, hostname: parsed.hostname }
    } catch {
      // fallback ci-dessous
    }
  }
  return { protocol: "https", hostname: "*.supabase.co" }
}

const supabaseImage = supabaseImagePattern()

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // `googleapis` utilise des modules Node natifs : on l'exclut du bundling
  // côté serveur pour éviter les erreurs de build (Server Actions / Route Handlers).
  serverExternalPackages: ['googleapis'],
  images: {
    remotePatterns: [
      {
        protocol: supabaseImage.protocol,
        hostname: supabaseImage.hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
