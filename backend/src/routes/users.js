import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { masterPool } from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

const ROLES = ['Admin', 'Employee'];
const USERNAME_RE = /^[a-z0-9._-]{3,50}$/;
const PUBLIC_FIELDS = 'id, username, full_name, email, role, is_active, created_at, updated_at';

/** GET /api/users — all users of the logged-in user's company (Admin + Employee) */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await req.db.query(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY id`);
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

/** GET /api/users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await req.db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [
      Number(req.params.id),
    ]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** POST /api/users — Admin only: add a user to THIS company */
router.post('/', requireAdmin, async (req, res, next) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const { password, fullName, email } = req.body || {};
  const role = req.body?.role || 'Employee';

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      message: 'Username must be 3-50 characters: lowercase letters, numbers, dot, dash or underscore',
    });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ message: 'Full name is required' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'Role must be Admin or Employee' });
  }

  // Reserve the username globally first (usernames are unique across all companies,
  // because the shared login page uses them to find the company).
  try {
    await masterPool.query(
      'INSERT INTO user_directory (username, company_id) VALUES ($1, $2)',
      [username, req.user.companyId]
    );
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That username is already taken' });
    }
    return next(err);
  }

  try {
    const hash = await bcrypt.hash(String(password), 10);
    const { rows } = await req.db.query(
      `INSERT INTO users (username, password_hash, full_name, email, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${PUBLIC_FIELDS}`,
      [username, hash, String(fullName).trim(), email || null, role]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    // Undo the directory reservation so the two databases stay in sync
    await masterPool
      .query('DELETE FROM user_directory WHERE username = $1', [username])
      .catch(() => {});
    next(err);
  }
});

/**
 * PUT /api/users/:id — Admin only: edit user details.
 * Editable: fullName, email, role, isActive, password (optional).
 * Username is fixed after creation (it is the login key in the master directory).
 */
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await req.db.query('SELECT id, role, is_active FROM users WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ message: 'User not found' });

    const { fullName, email, role, isActive, password } = req.body || {};
    const isSelf = id === req.user.id;

    if (role !== undefined && !ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role must be Admin or Employee' });
    }
    if (isSelf && role !== undefined && role !== 'Admin') {
      return res.status(400).json({ message: 'You cannot remove your own Admin role' });
    }
    if (isSelf && isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    if (fullName !== undefined && !String(fullName).trim()) {
      return res.status(400).json({ message: 'Full name cannot be empty' });
    }
    if (password && String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Build the UPDATE from only the fields that were sent
    const sets = [];
    const values = [];
    const add = (col, val) => {
      values.push(val);
      sets.push(`${col} = $${values.length}`);
    };
    if (fullName !== undefined) add('full_name', String(fullName).trim());
    if (email !== undefined) add('email', email || null);
    if (role !== undefined) add('role', role);
    if (isActive !== undefined) add('is_active', Boolean(isActive));
    if (password) add('password_hash', await bcrypt.hash(String(password), 10));

    if (sets.length === 0) return res.status(400).json({ message: 'Nothing to update' });

    values.push(id);
    const { rows } = await req.db.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING ${PUBLIC_FIELDS}`,
      values
    );
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/users/:id — Admin only: permanently delete a user */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const { rows } = await req.db.query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });

    await masterPool.query('DELETE FROM user_directory WHERE username = $1', [rows[0].username]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
