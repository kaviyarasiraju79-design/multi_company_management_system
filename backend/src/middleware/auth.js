import jwt from 'jsonwebtoken';
import { getCompanyPool } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

/**
 * Verifies the JWT, then attaches:
 *   req.user -> { id, username, fullName, role, companyId } (fresh from the DB)
 *   req.db   -> pool for THIS user's company database only
 *
 * Every protected route uses req.db, so a user can never query another
 * company's database: the company comes from the signed token, never from
 * the request body or URL.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }

  try {
    const db = await getCompanyPool(payload.companyId);
    // Re-read the user so role changes / deactivation take effect immediately
    const { rows } = await db.query(
      'SELECT id, username, full_name, role, is_active FROM users WHERE id = $1',
      [payload.userId]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Account is inactive or no longer exists' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      companyId: payload.companyId,
    };
    req.db = db;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Only Admins can perform this action' });
  }
  next();
}
