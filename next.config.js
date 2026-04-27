/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,          // gzip/brotli des assets JS/CSS
  poweredByHeader: false,  // retire X-Powered-By inutile
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600, // cache images CDN 1h minimum
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
  },

  async headers() {
    return [
      // Cache agressif pour assets statiques (JS, CSS, fonts, images)
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)\\.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff2|woff|ttf)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      {
        source: '/:path*',
        headers: [
          // Empêche le clickjacking (intégration dans une iframe)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Empêche le MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Limite les informations envoyées dans le header Referer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Désactive les fonctionnalités navigateur inutiles
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Force HTTPS pour 1 an (Vercel le gère déjà, mais belt-and-suspenders)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
