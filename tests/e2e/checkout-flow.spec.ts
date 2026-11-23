import { test, expect } from '@playwright/test';

test.describe('Checkout MFE Geolocation, Member Input & Dynamic Options', () => {
  let checkoutUrl = '';

  test.beforeAll(async () => {
    const res = await fetch('http://localhost:4000/api/orders/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseAmount: 1000,
        programDuration: '2 Months',
        expiryMinutes: 0,
      }),
    });
    const data = await res.json();
    checkoutUrl = data.paymentLink;
  });

  test('member inputs name and location is resolved with domestic UPI and bank options', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const page = await context.newPage();

    await page.goto(checkoutUrl);

    await expect(page.locator('text=Member Registration')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=2 Months').first()).toBeVisible();

    await page.fill('#custName', 'Rahul Sharma');
    await page.fill('#custEmail', 'rahul@example.com');
    await page.click('button:has-text("Continue to Verification")');

    await expect(page.locator('text=Delivery & Billing Address')).toBeVisible({ timeout: 20000 });

    const stateInput = page.locator('#state');
    await expect(stateInput).toBeVisible();
    await expect(stateInput).toBeDisabled();
    await expect(stateInput).toHaveValue(/Karnataka|Verified/);

    await expect(page.locator('text=CGST + SGST (18% Intra-State)')).toBeVisible();
    await expect(page.locator('text=INR 1180.00')).toBeVisible();

    await page.click('button:has-text("Proceed to Payment Options")');

    await expect(page.locator('text=Select Payment Option')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=UPI Transfer')).toBeVisible();
    await expect(page.locator('text=Direct Bank Transfer')).toBeVisible();
    await expect(page.locator('text=Razorpay Gateway')).not.toBeVisible();

    await context.close();
  });

  test('foreign customer mode restricts payment options strictly to Razorpay', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 37.7749, longitude: -122.4194 },
    });
    const page = await context.newPage();

    await page.goto(checkoutUrl);

    await expect(page.locator('text=Member Registration')).toBeVisible({ timeout: 20000 });
    await page.fill('#custName', 'Alex Johnson');
    await page.click('button:has-text("Continue to Verification")');

    await expect(page.locator('text=Delivery & Billing Address')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=International / Foreign')).toBeVisible();

    await page.click('button:has-text("Proceed to Payment Options")');

    await expect(page.locator('text=Select Payment Option')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Razorpay Gateway')).toBeVisible();
    await expect(page.locator('text=UPI Transfer')).not.toBeVisible();
    await expect(page.locator('text=Direct Bank Transfer')).not.toBeVisible();

    await context.close();
  });

  test('free trial link allows direct activation with zero cost', async ({ browser }) => {
    const trialRes = await fetch('http://localhost:4000/api/orders/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseAmount: 0,
        programDuration: 'Free Trial',
        isFreeTrial: true,
        expiryMinutes: 0,
      }),
    });
    const trialData = await trialRes.json();
    const trialUrl = trialData.paymentLink;

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(trialUrl);

    await expect(page.locator('text=Member Registration')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Free Trial').first()).toBeVisible();
    await page.fill('#custName', 'Priya Patel');
    await page.click('button:has-text("Continue to Verification")');

    await page.click('button:has-text("Foreign / International Customer")');
    await page.click('button:has-text("Proceed to Payment Options")');

    await expect(page.locator('text=Activate Your Free Trial')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Activate Free Trial Now")');

    await expect(page.locator('h3:has-text("Free Trial Activated")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Trial Active').first()).toBeVisible();

    await context.close();
  });

  test('razorpay payment verification updates order to paid and shows success screen', async ({ browser }) => {
    const rzpRes = await fetch('http://localhost:4000/api/orders/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseAmount: 2000,
        programDuration: '3 Months',
        expiryMinutes: 0,
      }),
    });
    const rzpData = await rzpRes.json();
    const identifier = rzpData.order.identifierId;

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`http://localhost:3001/pay/${identifier}?status=success&razorpay_payment_id=pay_test_rzp12345`);

    await expect(page.locator('h3:has-text("Payment Successful")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Paid / Confirmed').first()).toBeVisible();
    await expect(page.locator('text=pay_test_rzp12345')).toBeVisible();

    await context.close();
  });
});
