import { test, expect } from '@playwright/test';

test.describe('Pendo Kenya Dating E2E', () => {
  test('renders landing page, switches Kenyan Vibe Circles, and toggles Data Saver', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Pendo');

    // Toggle Mobile Data Saver mode
    const dataSaverBtn = page.getByRole('button', { name: /Save Data|Data Saver ON/i });
    await expect(dataSaverBtn).toBeVisible();
    await dataSaverBtn.click();
    await expect(dataSaverBtn).toHaveAttribute('aria-pressed', 'true');

    // Select Kilimani Mums vibe circle
    await page.getByRole('button', { name: 'Kilimani Mums', exact: true }).click();
    await expect(page).toHaveURL(/\/kilimani-mums/);
    await expect(page.locator('h1')).toContainText('Kilimani Mums');

    // Verify new Campus & Diaspora SEO links exist
    await expect(page.getByRole('link', { name: 'Campus Singles KE' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'UK & USA Kenyans' })).toBeVisible();
  });

  test('completes guest onboarding, opens Vibe Circles Quiz, Free Meetups, Notifications & Free Boost', async ({ page }) => {
    await page.goto('/');

    // Enter Guest Preview -> Profile Setup -> Save & Start Matching
    await page.getByRole('button', { name: 'Preview as Guest' }).click();
    await expect(page.getByRole('button', { name: 'Save & Start Matching' })).toBeVisible();
    await page.getByRole('button', { name: 'Save & Start Matching' }).click();

    // Discovery view + sticky nav touch target ergonomics
    const nav = page.getByRole('navigation', { name: 'Primary App Navigation' });
    await expect(nav).toBeVisible();
    const vibesTab = nav.getByRole('button', { name: 'Vibes' });
    const box = await vibesTab.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);

    // Open Notifications drawer
    await page.getByRole('button', { name: 'Open Notifications' }).click();
    await expect(page.getByRole('dialog', { name: 'Real-Time Notifications' })).toBeVisible();
    await page.getByRole('button', { name: 'Close Notifications' }).click();

    // Navigate to Vibe Circles Hub & complete 4-question compatibility quiz
    await vibesTab.click();
    await expect(page.getByRole('heading', { name: 'Kenyan Vibe Circles' })).toBeVisible();
    await page.getByRole('button', { name: 'Vibe Quiz' }).click();
    for (let i = 0; i < 4; i++) {
      await page.getByTestId('vibe-quiz-option').first().click();
    }
    await expect(page.getByText(/Your Kenyan Vibe Circle Match/i)).toBeVisible();

    // Switch to Meetups tab & verify all meetups show Free Entry + trust gate works
    await page.getByRole('button', { name: /Meetups/i }).click();
    await expect(page.getByText('Free Entry').first()).toBeVisible();
    await page.getByRole('button', { name: 'RSVP to Meetup' }).first().click();
    await expect(page.getByText(/Trust Score|requires? verified members/i)).toBeVisible();

    // Navigate back to Discover and verify 100% Free Profile Boost modal
    await nav.getByRole('button', { name: 'Discover' }).click();
    await page.getByRole('button', { name: /Boost Profile \(Free\)/i }).click();
    await expect(page.getByText(/Boost Your Profile \(100% Free\)/i)).toBeVisible();
    await page.getByRole('button', { name: /Activate Boost/i }).click();
    await expect(page.getByRole('button', { name: 'Boosted' })).toBeVisible();
  });

  test('degrades silently with zero WebSocket errors or error banners when /api/health returns 404', async ({ page }) => {
    const wsRequests: string[] = [];
    const notifRequests: string[] = [];
    const pageErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('websocket', (ws) => wsRequests.push(ws.url()));
    await page.route('**/api/health', (route) =>
      route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' })
    );
    await page.route('**/api/notifications/**', (route) => {
      notifRequests.push(route.request().url());
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Preview as Guest' }).click();
    await page.waitForTimeout(800);

    // Pre-flight /api/health guard must prevent WebSocket and /api/notifications 404 spam completely
    expect(wsRequests).toEqual([]);
    expect(notifRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
    await expect(page.getByText(/Network Connection Error|Google Authentication Error/i)).toHaveCount(0);
  });

  test('filters discovery matches by gender preference and age range via the filter sidebar', async ({ page, isMobile }) => {
    await page.goto('/');

    // Enter Guest Preview -> Save & Start Matching -> Discovery
    await page.getByRole('button', { name: 'Preview as Guest' }).click();
    await page.getByRole('button', { name: 'Save & Start Matching' }).click();

    // Open mobile drawer on small viewports; desktop has persistent sidebar open
    const sidebar = isMobile
      ? page.getByRole('dialog', { name: 'Discovery Filter Sidebar' })
      : page.getByRole('complementary', { name: 'Discovery Filter Sidebar' });
    if (isMobile) {
      await page.getByRole('button', { name: 'Open Filter Sidebar' }).click();
    }
    await expect(sidebar).toBeVisible();

    // Filter by Gender Preference: Men
    await sidebar.getByRole('button', { name: 'Men', exact: true }).click();
    await expect(sidebar.getByText(/Showing 5 of 16 profiles/i)).toBeVisible();

    // Narrow Age Range to 35 - 50 -> only Hon. Omondi (Male, 46)
    const minAgeInput = sidebar.getByLabel('Min Age');
    const maxAgeInput = sidebar.getByLabel('Max Age');
    await minAgeInput.fill('35');
    await minAgeInput.blur();
    await maxAgeInput.fill('50');
    await maxAgeInput.blur();
    await expect(sidebar.getByText(/Showing 1 of 16 profiles/i)).toBeVisible();

    if (isMobile) {
      await sidebar.getByRole('button', { name: /Show 1 Match/i }).click();
    }
    await expect(page.getByRole('heading', { name: /Hon\. Omondi, 46/i })).toBeVisible();

    // Re-open mobile drawer if needed and switch to Non-binary + reset age
    if (isMobile) {
      await page.getByRole('button', { name: 'Open Filter Sidebar' }).click();
    }
    await sidebar.getByRole('button', { name: /Reset/i }).first().click();
    await sidebar.getByRole('button', { name: 'Non-binary', exact: true }).click();
    await expect(sidebar.getByText(/Showing 1 of 16 profiles/i)).toBeVisible();

    if (isMobile) {
      await sidebar.getByRole('button', { name: /Show 1 Match/i }).click();
    }
    await expect(page.getByRole('heading', { name: /Zuri, 25/i })).toBeVisible();
  });

  test('hides Admin Center completely from guests and blocks /admin direct access cleanly', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Admin Center/i })).toHaveCount(0);

    await page.getByRole('button', { name: 'Preview as Guest' }).click();
    await page.getByRole('button', { name: 'Save & Start Matching' }).click();
    await expect(page.getByRole('button', { name: /Admin/i })).toHaveCount(0);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Restricted Workspace' })).toBeVisible();
    await expect(page.getByText(/Pendo Copy & Paste Launch Center/i)).toHaveCount(0);
  });
});
