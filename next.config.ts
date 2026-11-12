import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Politique de sécurité du contenu : tout est servi depuis notre domaine
 * (images du catalogue comprises, téléchargées et optimisées à l'import).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Serveur autonome pour l'image Docker (NEXT_OUTPUT=standalone) ; `pnpm start` sinon.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  // L'instantané du catalogue est lu par l'administration (réimport).
  outputFileTracingIncludes: { "/admin/**": ["./data/catalog/products.json"] },
  images: {
    // Sur Vercel, les WebP du catalogue (déjà optimisés à l'import) sont servis tels quels :
    // pas de consommation du quota d'optimisation d'images.
    unoptimized: process.env.VERCEL === "1" || process.env.NEXT_IMAGE_UNOPTIMIZED === "true",
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1920],
    imageSizes: [48, 64, 96, 128, 160, 192, 256, 320, 384],
    localPatterns: [{ pathname: "/catalog/images/**" }, { pathname: "/brand/**" }],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
        ],
      },
      {
        source: "/catalog/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
