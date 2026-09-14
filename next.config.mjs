/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // The skill and its knowledge packs are read from disk at request time,
  // so they must be traced into the serverless bundle.
  outputFileTracingIncludes: {
    "/api/generate": ["./lib/skill/**/*.md"],
    "/api/refine": ["./lib/skill/**/*.md"],
  },
};
export default nextConfig;
