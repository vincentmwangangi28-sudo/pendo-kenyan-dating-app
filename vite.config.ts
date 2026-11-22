import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SEO_ROUTES, SITE_ORIGIN, generateSitemapXml, getFaqsForRoute, buildFaqPageSchema } from './src/lib/seoRoutes';

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

      // 1. Always emit an up-to-date Google Sitemap XML (with hreflang & image tags)
      fs.writeFileSync(path.join(distDir, 'sitemap.xml'), generateSitemapXml(), 'utf-8');

      // 2. Build crawlable internal link nav & visible root FAQ section for static HTML bots (Googlebot / Bingbot)
      const crawlableNav = `<nav aria-label="Kenyan &amp; Diaspora Dating Routes" style="margin-top: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; max-width: 32rem;">${SEO_ROUTES.map(
        r => `<a href="${r.path}" style="color: #fde047; font-size: 11px; font-weight: 700; text-decoration: underline;">${escapeHtml(r.label)}</a>`
      ).join('')}</nav>`;

      const renderVisibleFaqSection = (faqs: ReturnType<typeof getFaqsForRoute>) =>
        `<section aria-label="Frequently Asked Questions" style="margin-top: 1rem; text-align: left; max-width: 24rem; width: 100%; font-size: 11px; color: #e2e8f0;">${faqs
          .map(f => `<details style="margin-bottom: 0.5rem;"><summary style="font-weight: 700; color: #ffffff;">${escapeHtml(f.question)}</summary><p style="margin-top: 0.25rem;">${escapeHtml(f.answer)}</p></details>`)
          .join('')}</section>`;

      const rootHtmlWithoutFaq = template.replace(
        /<div style="width: 1\.5rem; height: 1\.5rem;[^"]*"><\/div>/,
        (match) => `${match}\n          ${crawlableNav}`
      );
      const rootHtmlWithFaq = rootHtmlWithoutFaq.replace(
        /(<nav aria-label="Kenyan &amp; Diaspora Dating Routes"[\s\S]*?<\/nav>)/,
        `$1\n          ${renderVisibleFaqSection(getFaqsForRoute(null))}`
      );
      fs.writeFileSync(indexHtmlPath, rootHtmlWithFaq, 'utf-8');

      for (const route of SEO_ROUTES) {
        const slug = route.path.replace(/^\/+/, '');
        if (!slug) continue;

        const canonicalUrl = `${SITE_ORIGIN}${route.path}`;
        const safeTitle = escapeHtml(route.title);
        const safeDesc = escapeHtml(route.description);
        const safeKeywords = escapeHtml(route.keywords);
        const safeH1 = escapeHtml(route.h1);
        const safeSubtitle = escapeHtml(route.heroSubtitle);

        const breadcrumbJsonLd = `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Pendo Kenya', item: `${SITE_ORIGIN}/` },
            { '@type': 'ListItem', position: 2, name: route.label, item: canonicalUrl }
          ]
        })}</script>`;

        const routeFaqs = getFaqsForRoute(route);
        const routeFaqJsonLd = `<script id="pendo-faq-schema" type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          ...buildFaqPageSchema(routeFaqs)
        })}</script>`;

        const visibleFaqHtml = renderVisibleFaqSection(routeFaqs);

        let html = rootHtmlWithoutFaq
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`)
          .replace(
            /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
            `<meta name="description" content="${safeDesc}" />`
          )
          .replace(
            /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
            `<meta name="keywords" content="${safeKeywords}" />`
          )
          .replace(
            /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
            `<link rel="canonical" href="${canonicalUrl}" />`
          )
          .replace(
            /<link\s+rel="alternate"\s+hreflang="en-KE"\s+href="[^"]*"\s*\/?>/,
            `<link rel="alternate" hreflang="en-KE" href="${canonicalUrl}" />`
          )
          .replace(
            /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/,
            `<link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />`
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
            /<script id="pendo-faq-schema" type="application\/ld\+json">[\s\S]*?<\/script>/,
            routeFaqJsonLd
          )
          .replace(
            /<\/head>/,
            `  ${breadcrumbJsonLd}\n  </head>`
          )
          .replace(
            /(<h1[^>]*>)[\s\S]*?(<\/h1>)/g,
            `$1${safeH1}$2`
          )
          .replace(
            /(<p[^>]*>)[\s\S]*?(<\/p>)/g,
            `$1${safeSubtitle}$2`
          )
          .replace(
            /(<nav aria-label="Kenyan &amp; Diaspora Dating Routes"[\s\S]*?<\/nav>)/,
            `$1\n          ${visibleFaqHtml}`
          );

        const routeDir = path.join(distDir, slug);
        fs.mkdirSync(routeDir, { recursive: true });
        fs.writeFileSync(path.join(routeDir, 'index.html'), html, 'utf-8');
      }
      console.log(`[SEO Prerender] Generated sitemap.xml + ${SEO_ROUTES.length} static route HTML pages in dist/`);
    },
  };
}

export default defineConfig({
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
});

