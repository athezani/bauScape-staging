/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // RIMOSSO output: 'standalone' - causa problemi con source-map su Vercel staging
  // Vercel gestisce automaticamente Next.js senza bisogno di standalone mode
  
  // Mantenere compatibilità con struttura esistente
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  turbopack: {},

  
  // src/pages-vite è già ignorato automaticamente perché non è nella struttura app/
  
  productionBrowserSourceMaps: false,
  
  
  // Compressione - HTTP/2 gestisce meglio la compressione, ma manteniamo gzip come fallback
  compress: true,
  
  // Ottimizzazioni per HTTP/2
  // HTTP/2 è già abilitato automaticamente su Vercel
  // Queste configurazioni ottimizzano l'uso di HTTP/2:
  // - Evitare domain sharding (HTTP/2 multiplexing lo rende inutile)
  // - Usare compressione efficiente
  // - Ottimizzare il bundling per sfruttare il multiplexing
  
  // Images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
      {
        protocol: 'https',
        hostname: '**.vettys.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'tourismmedia.italia.it',
      },
      {
        protocol: 'https',
        hostname: 'www.purina.it',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '**.gstatic.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Ottimizzazioni per HTTP/2: formati moderni e compressione
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    // Permetti immagini non ottimizzate per URL esterni che potrebbero non essere supportati
    unoptimized: false,
  },
  
  // Headers di sicurezza e ottimizzazioni HTTP/2
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Ottimizzazioni per HTTP/2
          // Vercel abilita HTTP/2 automaticamente, questi headers ottimizzano l'uso
          {
            key: 'Accept-CH',
            value: 'DPR, Viewport-Width, Width',
          },
        ],
      },
      // Headers specifici per asset statici - ottimizzazioni HTTP/2
      {
        source: '/:path*\\.(js|css|woff|woff2|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

};

module.exports = nextConfig;

