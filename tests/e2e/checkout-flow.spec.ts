import { test, expect } from '@playwright/test';

test.describe('Checkout MFE Geolocation & Dynamic Tax Engine', () => {
  let checkoutUrl = '';

  test.beforeAll(async () => {
    const res = await fetch('http://localhost:4000/api/orders/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseAmount: 1000,
        gstRate: 18,
        customerName: 'Suresh Kumar',
        customerEmail: 'suresh@example.com',
      }),
    });
    const data = await res.json();
    checkoutUrl = data.paymentLink;
  });

  test('blocks checkout UI and shows instructions when geolocation is denied', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: [],
    });
    const page = await context.newPage();

    await page.goto(checkoutUrl);

    await expect(page.locator('text=Location Access Blocked').or(page.locator('text=Verify Your State for GST'))).toBeVisible({ timeout: 15000 });
    await context.close();
  });

  test('resolves state, locks state input, calculates dynamic GST, and filters payment options', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const page = await context.newPage();

    await page.goto(checkoutUrl);

    await expect(page.locator('text=Delivery & Billing Address')).toBeVisible({ timeout: 20000 });

    const stateInput = page.locator('#state');
    await expect(stateInput).toBeVisible();
    await expect(stateInput).toBeDisabled();
    await expect(stateInput).toHaveValue(/Karnataka|Verified/);

    await expect(page.locator('text=CGST + SGST (18% Intra-State)')).toBeVisible();
    await expect(page.locator('text=INR 1180.00')).toBeVisible();

    await page.click('button:has-text("I am a Foreign Customer")');

    await expect(page.locator('text=0% (Zero-Rated)')).toBeVisible();
    await expect(page.locator('text=INR 1000.00').first()).toBeVisible();

    await page.click('button:has-text("Switch to Indian Domestic")');
    await expect(page.locator('text=INR 1180.00')).toBeVisible();

    await page.fill('#building', 'Flat 402, Lotus Towers');
    await page.fill('#city', 'Bengaluru');
    await page.click('button:has-text("Proceed to Payment Options")');

    await expect(page.locator('text=Select Payment Option')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Razorpay Gateway')).toBeVisible();
    await expect(page.locator('text=Manual UPI Transfer')).toBeVisible();
    await expect(page.locator('text=+2% Gateway Cut applies')).toBeVisible();

    await context.close();
  });

  test('foreign customer mode restricts payment options strictly to Razorpay', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 37.7749, longitude: -122.4194 },
    });
    const page = await context.newPage();

    await page.goto(checkoutUrl);

    await expect(page.locator('text=Delivery & Billing Address')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=International / Foreign')).toBeVisible();

    await page.click('button:has-text("Proceed to Payment Options")');

    await expect(page.locator('text=Select Payment Option')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Razorpay Gateway')).toBeVisible();
    await expect(page.locator('text=Manual UPI Transfer')).not.toBeVisible();

    await context.close();
  });
});
