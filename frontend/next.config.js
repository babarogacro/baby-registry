/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'babycenter.hr' },
      { protocol: 'https', hostname: '**.babycenter.hr' },
      { protocol: 'https', hostname: 'babycenter.si' },
      { protocol: 'https', hostname: '**.babycenter.si' },
      { protocol: 'https', hostname: 'svijet-beba.hr' },
      { protocol: 'https', hostname: '**.svijet-beba.hr' },
    ],
  },
  // The merchant deck is a ready-made static HTML page in public/; it lives at /za-trgovce.
  async rewrites() {
    return [{ source: '/za-trgovce', destination: '/za-trgovce.html' }]
  },
  // The old topic pages became the gift guides on the blog; 308 keeps their search ranking.
  async redirects() {
    return [
      { source: '/lista-zelja-za-bebu', destination: '/blog/pokloni-za-bebu', permanent: true },
      { source: '/lista-za-djecji-rodendan', destination: '/blog/pokloni-za-djecji-rodendan', permanent: true },
      { source: '/baby-shower-lista', destination: '/blog/pokloni-za-baby-shower', permanent: true },
    ]
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
}

module.exports = nextConfig
