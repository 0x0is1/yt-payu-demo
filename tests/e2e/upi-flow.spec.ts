import { test, expect } from '@playwright/test';

test.describe('Manual UPI & Bank Transfer Payment Flow', () => {
  let checkoutUrl = '';
  let orderId = '';

  test.beforeAll(async () => {
    const res = await fetch('http://localhost:4000/api/orders/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseAmount: 1500,
        programDuration: '1 Month',
        expiryMinutes: 0,
      }),
    });
    const data = await res.json();
    checkoutUrl = data.paymentLink;
    orderId = data.order.id;
  });

  test('customer completes manual UPI payment and admin confirms with transaction ID', async ({ browser }) => {
    const customerContext = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 12.9716, longitude: 77.5946 },
    });
    const customerPage = await customerContext.newPage();

    await customerPage.goto(checkoutUrl);
    await expect(customerPage.locator('text=Member Registration')).toBeVisible({ timeout: 20000 });

    await customerPage.fill('#custName', 'Kavita Rao');
    await customerPage.click('button:has-text("Continue to Verification")');

    await expect(customerPage.locator('text=Delivery & Billing Address')).toBeVisible({ timeout: 20000 });
    await customerPage.click('button:has-text("Proceed to Payment Options")');
    await expect(customerPage.locator('text=Select Payment Option')).toBeVisible({ timeout: 15000 });

    await customerPage.click('text=UPI Transfer');

    await expect(customerPage.locator('img[alt="UPI QR Code"]')).toBeVisible({ timeout: 10000 });
    await expect(customerPage.locator('text=payu-demo@okhdfcbank')).toBeVisible();

    await customerPage.click('button:has-text("I Have Paid via UPI")');

    await expect(customerPage.locator('h3:has-text("UPI Payment Submitted")')).toBeVisible({ timeout: 15000 });
    await expect(customerPage.locator('text=Verification Pending').first()).toBeVisible({ timeout: 15000 });

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await adminPage.goto('http://localhost:3000/login');
    await adminPage.click('button:has-text("Sign In as Administrator")');
    await adminPage.click('nav a:has-text("Requests")');
    await expect(adminPage.locator('h1')).toContainText('Payment Requests & Reconciliation');

    await expect(adminPage.locator(`text=${orderId}`)).toBeVisible({ timeout: 15000 });
    await expect(adminPage.locator('text=UPI Claimed').first()).toBeVisible({ timeout: 15000 });

    await adminPage.click(`tr:has-text("${orderId}") button:has-text("Confirm UPI")`);

    await expect(adminPage.locator('h3:has-text("Confirm Manual UPI Payment")')).toBeVisible();

    await adminPage.fill('#txnId', 'UPI-UTR-9988776655');
    await adminPage.click('button:has-text("Confirm Receipt")');

    await expect(adminPage.locator(`tr:has-text("${orderId}")`).locator('text=Paid').first()).toBeVisible({ timeout: 15000 });

    await customerPage.reload();
    await expect(customerPage.locator('h3:has-text("Payment Successful")')).toBeVisible({ timeout: 15000 });
    await expect(customerPage.locator('text=Paid / Confirmed').first()).toBeVisible({ timeout: 15000 });
    await expect(customerPage.locator('text=UPI-UTR-9988776655')).toBeVisible();

    await customerContext.close();
    await adminContext.close();
  });
});
