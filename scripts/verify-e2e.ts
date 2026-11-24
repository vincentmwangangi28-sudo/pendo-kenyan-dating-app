import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import { calculateTrustScore } from '../src/lib/trustScore.ts';
import { scoreVibeCompatibilityQuiz } from '../src/lib/vibeCirclesData.ts';
import { CANONICAL_URLS, SEO_ROUTES, generateSitemapXml, generateSitemapIndexXml } from '../src/lib/seoRoutes.ts';
import { isVincentAdminUser } from '../src/lib/adminAuth.ts';

const WORKDIR = process.cwd();
const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function httpGetRaw(
  targetUrl: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function waitForServerReady(timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Production server did not become healthy in time.');
}

async function runUnitAndStaticChecks() {
  console.log('1. Running unit & static SEO/Sitemap checks...');

  // Trust Score calculation
  const lowTrust = calculateTrustScore({
    name: 'A',
    age: 20,
    location: 'Nairobi',
    bio: 'Hi',
    interests: [],
    languages: [],
    gender: 'Female',
    lookingFor: 'Male',
    photoUrl: '',
  });
  assert.equal(lowTrust.total, 0);

  const fullTrust = calculateTrustScore({
    name: 'Wangari',
    age: 35,
    location: 'Nairobi',
    bio: 'Verified Kilimani interior designer & brunch lover.',
    interests: ['Brunch', 'Soft Life'],
    languages: ['English', 'Swahili'],
    gender: 'Female',
    lookingFor: 'Male',
    photoUrl: 'https://picsum.photos/seed/wangari/400/600',
    voiceUrl: 'https://example.com/voice.webm',
    subscriptionTier: 'FREE',
    isVerified: true,
  });
  assert.equal(fullTrust.total, 100);

  // Vibe Compatibility Quiz scoring
  const quizRes = scoreVibeCompatibilityQuiz({
    weekend_plan: 'roadtrip',
    energy_role: 'queen_boss',
    first_date_style: 'nyama_drive',
    priority_value: 'discretion_loyalty',
  });
  assert.equal(quizRes.recommendedCircle, 'Mama wa Harrier');
  assert.ok(quizRes.compatibilityPercent >= 76 && quizRes.compatibilityPercent <= 98);

  // Strict Vincent-only Admin identity guard
  assert.equal(isVincentAdminUser(null), false);
  assert.equal(isVincentAdminUser({ uid: '1', email: 'guest@pendo.app', isAnonymous: true }), false);
  assert.equal(isVincentAdminUser({ uid: '2', email: 'otheruser@gmail.com', isAnonymous: false, emailVerified: true }), false);
  assert.equal(isVincentAdminUser({ uid: '3', email: 'vincentmwangangi28@gmail.com', isAnonymous: false, emailVerified: false }), false);
  assert.equal(isVincentAdminUser({ uid: '4', email: 'vincentmwangangi28@gmail.com', isAnonymous: false, emailVerified: true }), true);

  // Sitemap parity & new Campus / Diaspora / Vibe Circles routes
  assert.equal(CANONICAL_URLS.length, 25, 'Expected 25 canonical URLs (root + 24 subroutes)');
  const sitemapXml = generateSitemapXml();
  const sitemapIndexXml = generateSitemapIndexXml();
  const publicSitemap = fs.readFileSync(path.join(WORKDIR, 'public', 'sitemap.xml'), 'utf8');
  const publicSitemapIndex = fs.readFileSync(path.join(WORKDIR, 'public', 'sitemap_index.xml'), 'utf8');
  assert.equal(publicSitemap, sitemapXml, 'public/sitemap.xml must match generateSitemapXml()');
  assert.equal(publicSitemapIndex, sitemapIndexXml, 'public/sitemap_index.xml must match generateSitemapIndexXml()');

  for (const requiredPath of ['/campus-dating-kenya', '/diaspora-uk-usa-kenyans', '/vibe-circles']) {
    assert.ok(SEO_ROUTES.some((r) => r.path === requiredPath), `Missing SEO route ${requiredPath}`);
    assert.ok(sitemapXml.includes(`https://www.pendo.website${requiredPath}`), `Missing ${requiredPath} in sitemap`);
  }

  // Dist artifact checks
  assert.ok(fs.existsSync(path.join(WORKDIR, 'dist', 'server.cjs')), 'dist/server.cjs missing (run npm run build first)');
  assert.ok(fs.existsSync(path.join(WORKDIR, 'dist', 'index.html')), 'dist/index.html missing');
  assert.ok(fs.existsSync(path.join(WORKDIR, 'dist', 'sitemap.xml')), 'dist/sitemap.xml missing');
  assert.ok(fs.existsSync(path.join(WORKDIR, 'dist', 'sitemap_index.xml')), 'dist/sitemap_index.xml missing');
  for (const route of SEO_ROUTES) {
    const slug = route.path.replace(/^\/+/, '');
    const htmlPath = path.join(WORKDIR, 'dist', slug, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `Missing pre-rendered HTML for ${route.path}`);
  }
  const nairobiHtml = fs.readFileSync(path.join(WORKDIR, 'dist', 'nairobi-dating', 'index.html'), 'utf8');
  assert.ok(nairobiHtml.includes('<noscript>') && nairobiHtml.includes('Find authentic Kenyan singles'), 'Prerender must preserve noscript fallback text');
  console.log('   ✓ Unit, Admin Guard, Free Trust Rubric, Quiz, and 25-URL Sitemap/SSR build checks passed.');
}

async function runLiveServerE2E() {
  console.log('2. Booting production SSR + WebSocket server on port 3199...');
  const serverProc = spawn('node', ['dist/server.cjs'], {
    cwd: WORKDIR,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(TEST_PORT),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  serverProc.stderr.on('data', (chunk) => (stderr += String(chunk)));

  try {
    await waitForServerReady();

    // Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as { status: string };
    assert.equal(healthJson.status, 'ok');

    // Apex 301 redirect + verification file bypass
    const apexRedirect = await httpGetRaw(`${BASE_URL}/nairobi-dating`, { Host: 'pendo.website' });
    assert.equal(apexRedirect.status, 301);
    assert.equal(apexRedirect.headers.location, 'https://www.pendo.website/nairobi-dating');

    const robotsApex = await httpGetRaw(`${BASE_URL}/robots.txt`, { Host: 'pendo.website' });
    assert.equal(robotsApex.status, 200);
    assert.equal(robotsApex.body.includes('Agentmap:'), false, 'robots.txt must not include invalid Agentmap directive');
    assert.ok(robotsApex.body.includes('Disallow: /admin'), 'robots.txt must disallow /admin');
    assert.ok(robotsApex.body.includes('sitemap_index.xml'), 'robots.txt must declare sitemap_index.xml');

    // Live XML Sitemap, Sitemap Index & .well-known App Store verification endpoints
    const liveSitemap = await fetch(`${BASE_URL}/sitemap.xml`);
    assert.equal(liveSitemap.status, 200);
    assert.ok((liveSitemap.headers.get('content-type') || '').includes('application/xml'));
    const liveSitemapText = await liveSitemap.text();
    assert.ok(liveSitemapText.includes('<urlset'));

    const liveSitemapIndex = await fetch(`${BASE_URL}/sitemap_index.xml`);
    assert.equal(liveSitemapIndex.status, 200);
    assert.ok((liveSitemapIndex.headers.get('content-type') || '').includes('application/xml'));
    const liveSitemapIndexText = await liveSitemapIndex.text();
    assert.ok(liveSitemapIndexText.includes('<sitemapindex'));

    const assetLinksRes = await fetch(`${BASE_URL}/.well-known/assetlinks.json`);
    assert.equal(assetLinksRes.status, 200);
    const assetLinksJson = (await assetLinksRes.json()) as any[];
    assert.equal(assetLinksJson[0]?.target?.package_name, 'com.pendo.kenyandating');

    const appleAssocRes = await fetch(`${BASE_URL}/.well-known/apple-app-site-association`);
    assert.equal(appleAssocRes.status, 200);
    const appleAssocJson = (await appleAssocRes.json()) as any;
    assert.ok(JSON.stringify(appleAssocJson).includes('com.pendo.kenyandating'));

    // Soft-404 protection & strict server-side Admin API guard
    const missingPageRes = await fetch(`${BASE_URL}/this-route-does-not-exist-404`);
    assert.equal(missingPageRes.status, 404, 'Unknown paths must return real HTTP 404 instead of Soft-404 200');

    const unauthAdminAudit = await fetch(`${BASE_URL}/api/admin/seo-audit`);
    assert.equal(unauthAdminAudit.status, 401, '/api/admin/seo-audit must reject unauthenticated callers');

    const unauthAdminIndexNow = await fetch(`${BASE_URL}/api/admin/indexnow`, { method: 'POST' });
    assert.equal(unauthAdminIndexNow.status, 401, '/api/admin/indexnow must reject unauthenticated callers');

    // Pre-rendered SSR HTML checks
    for (const slug of ['/kilimani-mums', '/campus-dating-kenya', '/diaspora-uk-usa-kenyans', '/vibe-circles']) {
      const htmlRes = await fetch(`${BASE_URL}${slug}`);
      assert.equal(htmlRes.status, 200);
      const html = await htmlRes.text();
      assert.ok(html.includes('application/ld+json'), `Missing JSON-LD on ${slug}`);
      assert.ok(html.includes(`https://www.pendo.website${slug}`), `Missing canonical URL on ${slug}`);
    }

    // WebSocket /ws/events real-time connection
    const wsEvents: any[] = [];
    const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws/events?userId=e2e_user_1`);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket handshake timeout')), 5000);
      ws.on('message', (raw) => {
        const msg = JSON.parse(String(raw));
        wsEvents.push(msg);
        if (msg.type === 'CONNECTED') {
          clearTimeout(timer);
          resolve();
        }
      });
      ws.on('error', reject);
    });
    assert.equal(wsEvents[0]?.type, 'CONNECTED');
    assert.equal(wsEvents[0]?.userId, 'e2e_user_1');

    // Verify legacy M-Pesa endpoints are removed (404) & app is 100% free
    const mpesaStkRes = await fetch(`${BASE_URL}/api/mpesa/stk-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'e2e_user_1' }),
    });
    assert.equal(mpesaStkRes.status, 404, 'Removed /api/mpesa/stk-push must return 404');

    const mpesaStatusRes = await fetch(`${BASE_URL}/api/mpesa/status/test`);
    assert.equal(mpesaStatusRes.status, 404, 'Removed /api/mpesa/status must return 404');

    // Vibe Meetup Age/Trust Gating, Free Entry & RSVP Toggle
    const meetupsRes = await fetch(`${BASE_URL}/api/vibes/meetups?userId=e2e_user_1`);
    assert.equal(meetupsRes.status, 200);
    const meetupsJson = (await meetupsRes.json()) as any;
    assert.equal(meetupsJson.meetups.length, 6);
    assert.ok(
      meetupsJson.meetups.every((m: any) => m.coverKes === 0),
      'All Vibe Circle meetups must be 100% free (coverKes === 0)'
    );

    const underageRsvp = await fetch(`${BASE_URL}/api/vibes/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_kilimani_brunch',
        userId: 'e2e_user_1',
        userName: 'Tester',
        userAge: 19,
        userTrustScore: 90,
      }),
    });
    assert.equal(underageRsvp.status, 403);

    const lowTrustRsvp = await fetch(`${BASE_URL}/api/vibes/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_kilimani_brunch',
        userId: 'e2e_user_1',
        userName: 'Tester',
        userAge: 26,
        userTrustScore: 45,
      }),
    });
    assert.equal(lowTrustRsvp.status, 403);

    const joinRsvp = await fetch(`${BASE_URL}/api/vibes/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_kilimani_brunch',
        userId: 'e2e_user_1',
        userName: 'Tester',
        userAge: 26,
        userTrustScore: 85,
      }),
    });
    assert.equal(joinRsvp.status, 200);
    const joinJson = (await joinRsvp.json()) as any;
    assert.equal(joinJson.action, 'JOINED');
    assert.equal(joinJson.event.hasRsvped, true);

    const cancelRsvp = await fetch(`${BASE_URL}/api/vibes/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'evt_kilimani_brunch',
        userId: 'e2e_user_1',
        userName: 'Tester',
        userAge: 26,
        userTrustScore: 85,
      }),
    });
    assert.equal(cancelRsvp.status, 200);
    const cancelJson = (await cancelRsvp.json()) as any;
    assert.equal(cancelJson.action, 'CANCELLED');

    // Notifications REST + WS delivery check
    await new Promise((r) => setTimeout(r, 150));
    assert.ok(
      wsEvents.some((e) => e.type === 'NOTIFICATION' && e.notification?.type === 'MEETUP'),
      'Expected MEETUP notification broadcast over /ws/events'
    );

    const notifRes = await fetch(`${BASE_URL}/api/notifications/e2e_user_1`);
    const notifJson = (await notifRes.json()) as any;
    assert.ok(notifJson.notifications.length >= 1);

    const readRes = await fetch(`${BASE_URL}/api/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'e2e_user_1' }),
    });
    const readJson = (await readRes.json()) as any;
    assert.ok(readJson.notifications.every((n: any) => n.read === true));

    const subRes = await fetch(`${BASE_URL}/api/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'e2e_user_1', endpoint: 'https://push.example/e2e' }),
    });
    assert.equal(subRes.status, 200);

    ws.close();
    console.log('   ✓ Production SSR, WebSocket /ws/events, Free Meetups, and Notification E2E passed!');
  } finally {
    serverProc.kill('SIGKILL');
    if (stderr.trim()) {
      console.error('[Server stderr]', stderr.trim());
    }
  }
}

(async () => {
  await runUnitAndStaticChecks();
  await runLiveServerE2E();
  process.exit(0);
})();
