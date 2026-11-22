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

  test('completes guest onboarding, opens Vibe Circles Quiz, Meetups, Notifications & M-Pesa validation', async ({ page }) => {
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

    // Switch to Meetups tab & attempt RSVP (should cleanly show server trust gate for low-trust guest)
    await page.getByRole('button', { name: /Meetups/i }).click();
    await page.getByRole('button', { name: 'RSVP to Meetup' }).first().click();
    await expect(page.getByText(/Trust Score|requires? verified members/i)).toBeVisible();

    // Navigate back to Discover and validate M-Pesa phone check
    await nav.getByRole('button', { name: 'Discover' }).click();
    await page.getByTitle('Pendo Gold & M-Pesa Express').click();
    const phoneInput = page.getByPlaceholder('0712 345 678 or +2547...');
    await phoneInput.fill('12345');
    await page.getByRole('button', { name: /Send M-Pesa STK Prompt/i }).click();
    await expect(page.getByText(/Enter a valid Safaricom\/Kenyan number/i)).toBeVisible();
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
});
