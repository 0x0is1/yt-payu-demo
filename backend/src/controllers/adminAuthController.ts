import { adminLoginSchema } from '../validators/schemas';
import { authenticateAdmin, generateAdminToken, verifyAdminToken } from '../services/authService';

export async function loginAdminHandler({ body, set }: { body: unknown; set: any }) {
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    set.status = 400;
    return {
      error: 'Invalid login payload',
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const user = authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!user) {
    set.status = 401;
    return {
      error: 'Invalid email or password',
    };
  }

  const token = generateAdminToken(user);
  return {
    success: true,
    token,
    user,
  };
}

export async function getAdminMeHandler({ headers, set }: { headers: Record<string, string | undefined>; set: any }) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    set.status = 401;
    return { error: 'Authentication required' };
  }

  const token = authHeader.slice(7).trim();
  const user = verifyAdminToken(token);
  if (!user) {
    set.status = 401;
    return { error: 'Invalid or expired session token' };
  }

  return {
    success: true,
    user,
  };
}

