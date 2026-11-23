import { sqlite } from './client';

export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      identifier_id TEXT NOT NULL UNIQUE,
      base_amount REAL NOT NULL,
      gst_rate REAL NOT NULL DEFAULT 18.0,
      cgst REAL NOT NULL DEFAULT 0,
      sgst REAL NOT NULL DEFAULT 0,
      igst REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      address_line TEXT,
      city TEXT,
      state TEXT,
      country TEXT DEFAULT 'India',
      is_foreign INTEGER DEFAULT 0,
      nationality TEXT DEFAULT 'Indian',
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      rzp_payment_link_id TEXT,
      rzp_payment_link_url TEXT,
      rzp_payment_id TEXT,
      rzp_fee REAL DEFAULT 0,
      upi_transaction_id TEXT,
      upi_marked_paid_at INTEGER,
      upi_confirmed_at INTEGER,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_attempts (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      platform TEXT NOT NULL,
      status TEXT NOT NULL,
      reference_data TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS merchant_settings (
      id TEXT PRIMARY KEY,
      merchant_name TEXT NOT NULL DEFAULT 'PayU Merchant Store',
      merchant_upi_id TEXT NOT NULL DEFAULT 'payu-demo@okhdfcbank',
      merchant_state TEXT NOT NULL DEFAULT 'Karnataka',
      rzp_key_id TEXT NOT NULL DEFAULT 'rzp_test_2xGYyaqTbp0HNw',
      rzp_key_secret TEXT NOT NULL DEFAULT 'Bj7via42B9PX6GS38kQM6fVq',
      rzp_webhook_secret TEXT NOT NULL DEFAULT 'rzp_webhook_secret_key',
      default_gst_rate REAL NOT NULL DEFAULT 18.0,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_identifier ON orders(identifier_id);
    CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);

    INSERT OR IGNORE INTO merchant_settings (
      id, merchant_name, merchant_upi_id, merchant_state,
      rzp_key_id, rzp_key_secret, rzp_webhook_secret, default_gst_rate, updated_at
    ) VALUES (
      'default', 'PayU Merchant Store', 'payu-demo@okhdfcbank', 'Karnataka',
      'rzp_test_2xGYyaqTbp0HNw', 'Bj7via42B9PX6GS38kQM6fVq', 'rzp_webhook_secret_key', 18.0, 1700000000000
    );
  `);
}
