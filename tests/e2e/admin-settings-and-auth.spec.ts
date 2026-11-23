import { test, expect } from '@playwright/test';

test.describe('Admin Login & Merchant Settings Verification', () => {
  test('admin can sign in with fixed credentials and manage settings', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await expect(page.locator('h3:has-text("Merchant Administrator Login")')).toBeVisible({ timeout: 15000 });

    await page.fill('#admin-email', 'admin@payflow.internal');
    await page.fill('#admin-password', 'AdminPassword123!');
    await page.click('button:has-text("Sign In as Administrator")');

    await expect(page.locator('h1')).toContainText('Payment Request Generator', { timeout: 15000 });
    await expect(page.locator('text=admin@payflow.internal')).toBeVisible();

    await page.click('nav a:has-text("Settings")');
    await expect(page.locator('h1')).toContainText('Merchant Settings & System Configuration', { timeout: 15000 });

    await page.click('button:has-text("Test Razorpay Connection")');
    await expect(page.locator('text=Razorpay API connectivity verified successfully')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Test Geocoding Service")');
    await expect(page.locator('text=Geocoding service reachable')).toBeVisible({ timeout: 15000 });

    await page.fill('#merchant-name', 'PayU Elite Merchant Flagship');
    await page.click('button:has-text("Save Settings")');
    await expect(page.locator('text=Merchant settings updated and saved to database successfully')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Logout")');
    await expect(page.locator('text=Login').first()).toBeVisible({ timeout: 15000 });
  });
});

