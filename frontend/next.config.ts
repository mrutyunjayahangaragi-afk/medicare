import type { NextConfig } from "next";

// Production backend URL — set NEXT_PUBLIC_API_URL in the Vercel environment.
// Falls back to localhost only when running locally without an env file.
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// Build the connect-src value so the CSP always matches the actual backend URL.
// In production this resolves to the Render HTTPS URL; locally it allows both
// localhost variants so development still works.
function buildConnectSrc(): string {
  const always = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ];

  if (apiUrl.startsWith("http://localhost") || apiUrl.startsWith("http://127.0.0.1")) {
    // Local dev — allow both http variants
    always.push("http://localhost:8000", "http://127.0.0.1:8000");
  } else {
    // Production — only allow the configured HTTPS backend URL
    always.push(apiUrl);
  }

  return always.join(" ");
}

const nextConfig: NextConfig = {
  // Silence the "multiple lockfiles" workspace root warning from Turbopack
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      // Supabase Storage (public)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Supabase Storage (signed URLs)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      // OpenStreetMap tile server
      {
        protocol: "https",
        hostname: "tile.openstreetmap.org",
      },
      // Google user profile pictures for Google OAuth
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // Leaflet default marker icons (via unpkg CDN)
      {
        protocol: "https",
        hostname: "unpkg.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            // connect-src is built at build time from NEXT_PUBLIC_API_URL so
            // it never contains hardcoded localhost URLs in production builds.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://unpkg.com",
              "img-src 'self' data: https://*.supabase.co https://tile.openstreetmap.org https://lh3.googleusercontent.com https://unpkg.com",
              `connect-src ${buildConnectSrc()}`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
