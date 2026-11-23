import { client } from './client';

export async function initializeDatabase() {
  await client`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      identifier_id VARCHAR(64) NOT NULL UNIQUE,
      base_amount DOUBLE PRECISION NOT NULL,
      program_duration VARCHAR(64) NOT NULL DEFAULT '1 Month',
      is_free_trial BOOLEAN NOT NULL DEFAULT FALSE,
      gst_rate DOUBLE PRECISION NOT NULL DEFAULT 18.0,
      cgst DOUBLE PRECISION NOT NULL DEFAULT 0,
      sgst DOUBLE PRECISION NOT NULL DEFAULT 0,
      igst DOUBLE PRECISION NOT NULL DEFAULT 0,
      total_amount DOUBLE PRECISION NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      address_line TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'India',
      is_foreign BOOLEAN DEFAULT FALSE,
      nationality TEXT DEFAULT 'Indian',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(32),
      rzp_order_id TEXT,
      rzp_payment_link_id TEXT,
      rzp_payment_link_url TEXT,
      rzp_payment_id TEXT,
      rzp_fee DOUBLE PRECISION DEFAULT 0,
      upi_transaction_id TEXT,
      upi_marked_paid_at TIMESTAMP,
      upi_confirmed_at TIMESTAMP,
      bank_reference_id TEXT,
      bank_marked_paid_at TIMESTAMP,
      bank_confirmed_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS payment_attempts (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
      platform VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL,
      reference_data TEXT,
      created_at TIMESTAMP NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS merchant_settings (
      id VARCHAR(64) PRIMARY KEY,
      merchant_name TEXT NOT NULL DEFAULT 'PayU Merchant Store',
      merchant_upi_id TEXT NOT NULL DEFAULT 'payu-demo@okhdfcbank',
      bank_account_number TEXT NOT NULL DEFAULT '919876543210',
      bank_ifsc TEXT NOT NULL DEFAULT 'HDFC0001234',
      bank_account_name TEXT NOT NULL DEFAULT 'PayU Merchant Store Private Limited',
      bank_name TEXT NOT NULL DEFAULT 'HDFC Bank',
      merchant_state TEXT NOT NULL DEFAULT 'Karnataka',
      rzp_key_id TEXT NOT NULL DEFAULT 'rzp_test_2xGYyaqTbp0HNw',
      rzp_key_secret TEXT NOT NULL DEFAULT 'Bj7via42B9PX6GS38kQM6fVq',
      rzp_webhook_secret TEXT NOT NULL DEFAULT 'rzp_test_whsec_987654321',
      default_gst_rate DOUBLE PRECISION NOT NULL DEFAULT 18.0,
      updated_at TIMESTAMP NOT NULL
    );
  `;

  await client`
    CREATE INDEX IF NOT EXISTS idx_orders_identifier ON orders(identifier_id);
  `;
  await client`
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);
  `;

  await client`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS rzp_order_id TEXT;
  `;

  const existingSettings = await client`
    SELECT id FROM merchant_settings WHERE id = 'default' LIMIT 1;
  `;

  if (existingSettings.length === 0) {
    await client`
      INSERT INTO merchant_settings (
        id, merchant_name, merchant_upi_id, bank_account_number, bank_ifsc,
        bank_account_name, bank_name, merchant_state, rzp_key_id, rzp_key_secret,
        rzp_webhook_secret, default_gst_rate, updated_at
      ) VALUES (
        'default', 'PayU Merchant Store', 'payu-demo@okhdfcbank', '919876543210', 'HDFC0001234',
        'PayU Merchant Store Private Limited', 'HDFC Bank', 'Karnataka', 'rzp_test_2xGYyaqTbp0HNw',
        'Bj7via42B9PX6GS38kQM6fVq', 'rzp_test_whsec_987654321', 18.0, NOW()
      );
    `;
  }
}
