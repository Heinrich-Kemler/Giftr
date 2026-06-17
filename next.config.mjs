/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Linting is not required for the build to pass.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep type checking ON during the build.
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
