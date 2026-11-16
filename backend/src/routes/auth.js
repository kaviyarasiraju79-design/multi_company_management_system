import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { masterPool, getCompanyPool } from '../config/db.js';
import { authenticate, signToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/login  { username, password }
 * 1. Find the user's company in the master user_directory.
 * 2. Connect to that company's database and check the password.
 * 3. Return a JWT carrying userId, role and companyId.
 */
router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const invalid = () => res.status(401).json({ message: 'Invalid username or password' });

    const dir = await masterPool.query(
      'SELECT company_id FROM user_directory WHERE username = $1',
      [username]
    );
    if (dir.rows.length === 0) return invalid();

    const companyId = dir.rows[0].company_id;
    const db = await getCompanyPool(companyId);

    const { rows } = await db.query(
      'SELECT id, username, password_hash, full_name, role, is_active FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user) return invalid();

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return invalid();

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact your admin.' });
    }

    const company = await db.query('SELECT name FROM company WHERE id = 1');

    const token = signToken({ userId: user.id, role: user.role, companyId });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        companyId,
        companyName: company.rows[0]?.name || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me — who am I (used to restore a session on page reload) */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const company = await req.db.query('SELECT name FROM company WHERE id = 1');
    res.json({ user: { ...req.user, companyName: company.rows[0]?.name || null } });
  } catch (err) {
    next(err);
  }
});

export default router;
