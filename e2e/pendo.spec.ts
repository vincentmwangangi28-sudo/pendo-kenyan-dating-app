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
    await page.getByRole('button', { name: 'Kilimani Mums' }).click();
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
      await page.locator('article, div').getByRole('button').first().click();
    }
    await expect(page.getByText(/Your Kenyan Vibe Circle Match/i)).toBeVisible();

    // Switch to Meetups tab & attempt RSVP (should cleanly show server trust gate for low-trust guest)
    await page.getByRole('button', { name: /Meetups/i }).click();
    await page.getByRole('button', { name: 'RSVP to Meetup' }).first().click();
    await expect(page.getByText(/Trust Score|requires verified members/i)).toBeVisible();

    // Navigate back to Discover and validate M-Pesa phone check
    await nav.getByRole('button', { name: 'Discover' }).click();
    await page.getByTitle('Pendo Gold & M-Pesa Express').click();
    const phoneInput = page.getByPlaceholder('0712 345 678 or +2547...');
    await phoneInput.fill('12345');
    await page.getByRole('button', { name: /Send M-Pesa STK Prompt/i }).click();
    await expect(page.getByText(/Enter a valid Safaricom\/Kenyan number/i)).toBeVisible();
  });
});
