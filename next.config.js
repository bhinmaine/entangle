/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable instrumentation hook (instrumentation.ts) for running DB migrations on startup.
    // Stable in Next.js 15+; experimental in 14.x.
    instrumentationHook: true,
  },
}
module.exports = nextConfig
