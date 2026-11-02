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
