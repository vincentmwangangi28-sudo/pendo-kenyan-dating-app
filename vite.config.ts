import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SEO_ROUTES } from './src/lib/seoRoutes';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function seoPrerenderPlugin(): Plugin {
  return {
    name: 'pendo-seo-prerender',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const indexHtmlPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexHtmlPath)) return;

      const template = fs.readFileSync(indexHtmlPath, 'utf-8');

      for (const route of SEO_ROUTES) {
        const slug = route.path.replace(/^\/+/, '');
        if (!slug) continue;

        const canonicalUrl = `https://www.pendo.website${route.path}`;
        const safeTitle = escapeHtml(route.title);
        const safeDesc = escapeHtml(route.description);
        const safeLabel = escapeHtml(route.label);

        let html = template
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`)
          .replace(
            /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
            `<meta name="description" content="${safeDesc}" />`
          )
          .replace(
            /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
            `<link rel="canonical" href="${canonicalUrl}" />`
          )
          .replace(
            /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
            `<meta property="og:url" content="${canonicalUrl}" />`
          )
          .replace(
            /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
            `<meta property="og:title" content="${safeTitle}" />`
          )
          .replace(
            /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
            `<meta property="og:description" content="${safeDesc}" />`
          )
          .replace(
            /<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/,
            `<meta name="twitter:url" content="${canonicalUrl}" />`
          )
          .replace(
            /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
            `<meta name="twitter:title" content="${safeTitle}" />`
          )
          .replace(
            /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
            `<meta name="twitter:description" content="${safeDesc}" />`
          )
          .replace(
            /"url":\s*"https:\/\/www\.pendo\.website\/"/,
            `"url": "${canonicalUrl}"`
          )
          .replace(
            /Pendo — Kenya's #1 Dating & Matchmaking App/g,
            `${safeLabel} — Pendo Kenya`
          );

        const routeDir = path.join(distDir, slug);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, 'index.html'), html, 'utf-8');
      }
      console.log(`[SEO Prerender] Generated ${SEO_ROUTES.length} static route HTML pages in dist/`);
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
        ws: false,
      },
      plugins: [
        react(),
        tailwindcss(),
        seoPrerenderPlugin(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon.svg'],
          manifest: {
            id: '/',
            name: "Pendo | Kenya's #1 Dating & Matchmaking App",
            short_name: 'Pendo',
            description: 'Find authentic Kenyan singles for real relationships. Connect with verified matches through voice lounges and safe video dates on Pendo.',
            theme_color: '#e11d48',
            background_color: '#faf8f5',
            display: 'standalone',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^https:\/\/picsum\.photos\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'profile-images-cache',
                  expiration: {
                    maxEntries: 60,
                    maxAgeSeconds: 60 * 60 * 24 * 7,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
          devOptions: {
            enabled: true,
            type: 'module',
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: true,
        cssCodeSplit: true,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              'vendor-icons': ['lucide-react'],
              'vendor-motion': ['motion/react'],
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

