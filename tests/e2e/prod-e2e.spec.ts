import { test, expect } from '@playwright/test';

const PROD_ADMIN_URL = 'https://admin-payu-yt.vercel.app';
const PROD_PORTAL_URL = 'https://portal-payu-yt.vercel.app';

test.describe('Production Verification on Vercel Live Deployments', () => {
  test('production admin portal renders login and authenticates administrator', async ({ page }) => {
    await page.goto(`${PROD_ADMIN_URL}/login`);

    await expect(page.locator('h3:has-text("Merchant Administrator Login")')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=admin@payflow.internal').first()).toBeVisible();

    await page.fill('#admin-email', 'admin@payflow.internal');
    await page.fill('#admin-password', 'AdminPassword123!');
    await page.click('button:has-text("Sign In as Administrator")');

    await expect(page.locator('h1')).toContainText('Payment Request Generator', { timeout: 20000 });
    await expect(page.locator('text=admin@payflow.internal')).toBeVisible();

    await page.click('nav a:has-text("Requests")');
    await expect(page.locator('h1')).toContainText('Payment Requests & Reconciliation', { timeout: 20000 });

    await page.click('nav a:has-text("Settings")');
    await expect(page.locator('h1')).toContainText('Merchant Settings & System Configuration', { timeout: 20000 });
    await expect(page.locator('#merchant-name')).toBeVisible();
    await expect(page.locator('#merchant-upi')).toBeVisible();
  });

  test('production checkout portal displays direct checkout link requirement guard', async ({ page }) => {
    await page.goto(PROD_PORTAL_URL);

    await expect(page.locator('h3:has-text("Direct Checkout Link Required")')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=PayU Checkout')).toBeVisible();
    await expect(page.locator('text=256-Bit SSL Encrypted')).toBeVisible();
  });
});
