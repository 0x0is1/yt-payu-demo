import { test, expect } from '@playwright/test';

test.describe('Admin MFE Payment Link Generator & Dashboard', () => {
  let createdOrderId = '';

  test('admin can generate a payment link with duration and no expiry option', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.click('button:has-text("Sign In as Administrator")');

    await expect(page.locator('h1')).toContainText('Payment Request Generator', { timeout: 15000 });

    await page.selectOption('#programDuration', '3 Months');
    await page.fill('#amount', '2500');
    await page.selectOption('#expiry', '0');

    await page.click('button:has-text("Generate Pay Link")');

    await expect(page.locator('h3:has-text("Payment Link Generated")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Active').first()).toBeVisible();

    const linkText = await page.locator('span.select-all').textContent();
    expect(linkText).toContain('/pay/');

    const orderIdText = await page.locator('span:has-text("ORD-")').first().textContent();
    expect(orderIdText).toBeTruthy();
    createdOrderId = orderIdText || '';
  });

  test('admin dashboard lists orders with live status and program duration', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.click('button:has-text("Sign In as Administrator")');

    await page.click('nav a:has-text("Requests")');

    await expect(page.locator('h1')).toContainText('Payment Requests & Reconciliation', { timeout: 15000 });
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('text=3 Months').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=INR 2500.00').first()).toBeVisible();
    await expect(page.locator('text=No Expiry').first()).toBeVisible();
  });
});
