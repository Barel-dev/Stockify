// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the tracing root so the stray lockfile in the home directory doesn't
  // confuse Next.js workspace-root detection.
  outputFileTracingRoot: __dirname,
  images: {
    // Only company logos are rendered via next/image, and they all come from
    // Finnhub. A wildcard here would turn /_next/image into an open proxy.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.finnhub.io",
      },
      {
        protocol: "https",
        hostname: "finnhub.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
