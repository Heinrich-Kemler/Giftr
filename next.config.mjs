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
};

export default nextConfig;
