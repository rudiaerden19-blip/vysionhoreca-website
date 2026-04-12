/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

// Content Security Policy - professionele beveiliging
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://maps.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https: http:;
  font-src 'self' https://fonts.gstatic.com data:;
  connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.stripe.com https://*.upstash.io wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://graph.facebook.com;
  frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com;
  frame-ancestors 'self';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  media-src 'self' blob: https:;
  worker-src 'self' blob:;
  manifest-src 'self';
`.replace(/\s{2,}/g, ' ').trim()

// Security headers voor alle responses
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
]

const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_REF ||
      'local',
  },
  // Disable source maps in production to prevent 404 errors
  productionBrowserSourceMaps: false,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
    // Optimalisatie instellingen
    deviceSizes: [400, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Alleen WebP: op zwakke Android-kiosk SoC's is AVIF-decode vaak zwaarder dan gewonnen bandbreedte.
    formats: ['image/webp'],
    // Langere cache voor geoptimaliseerde /_next/image URLs (sneller bij terugkeer op de site)
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  eslint: {
    // ESLint checks enabled - warnings are shown but don't fail build
    // Only actual errors will block deployment
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Security headers voor alle routes
  async headers() {
    const noStoreSuperadmin = [
      { key: 'Cache-Control', value: 'private, no-store, max-age=0, must-revalidate' },
      { key: 'Pragma', value: 'no-cache' },
    ]
    return [
      {
        source: '/superadmin',
        headers: [...securityHeaders, ...noStoreSuperadmin],
      },
      {
        source: '/superadmin/:path*',
        headers: [...securityHeaders, ...noStoreSuperadmin],
      },
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  // Standaard Web App Manifest-pad blijft /manifest.json → dynamische route /manifest
  async rewrites() {
    return [{ source: '/manifest.json', destination: '/manifest' }]
  },
  /** Apex zonder www → canoniek op www (minder dubbele URL’s in Search Console). */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'vysionhoreca.com' }],
        destination: 'https://www.vysionhoreca.com/:path*',
        permanent: true,
      },
      {
        source: '/sectoren/cafe-frituur-kebab',
        destination: '/sectoren/cafe',
        permanent: true,
      },
      {
        source: '/sectoren/hardware-en-platform',
        destination: '/sectoren/retail',
        permanent: true,
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: "vysion-horeca",
  project: "javascript-nextjs-vysion-horeca",
  silent: true,
  widenClientFileUpload: false,
  reactComponentAnnotation: { enabled: false },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  // Sla webpack plugin over → bespaart 2-3 min bouwtijd
  disableClientWebpackPlugin: true,
  disableServerWebpackPlugin: true,
})
