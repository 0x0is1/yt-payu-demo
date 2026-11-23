import crypto from 'node:crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@payflow.internal';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
const JWT_SECRET = process.env.JWT_SECRET || 'payu-secret-admin-signing-key-45f60';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

export function authenticateAdmin(emailInput: string, passwordInput: string): AdminUser | null {
  const cleanEmail = emailInput.trim().toLowerCase();
  const targetEmail = ADMIN_EMAIL.trim().toLowerCase();

  if ((cleanEmail === targetEmail || cleanEmail === 'admin') && passwordInput === ADMIN_PASSWORD) {
    return {
      id: 'admin_primary',
      email: ADMIN_EMAIL,
      name: 'Merchant Administrator',
      role: 'admin',
    };
  }

  return null;
}

export function generateAdminToken(user: AdminUser): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(tokenString: string): AdminUser | null {
  if (!tokenString || typeof tokenString !== 'string') {
    return null;
  }

  const parts = tokenString.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
