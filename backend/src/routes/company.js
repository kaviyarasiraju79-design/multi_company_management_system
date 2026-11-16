import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

const FIELDS = 'name, industry, email, phone, address, website, updated_at';

/** GET /api/company — details of the logged-in user's company */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await req.db.query(`SELECT ${FIELDS} FROM company WHERE id = 1`);
    res.json({ company: rows[0] || null });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/company — Admin only: update company details */
router.put('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, industry, email, phone, address, website } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }
    const { rows } = await req.db.query(
      `UPDATE company
          SET name = $1, industry = $2, email = $3, phone = $4, address = $5, website = $6,
              updated_at = NOW()
        WHERE id = 1
        RETURNING ${FIELDS}`,
      [String(name).trim(), industry || null, email || null, phone || null, address || null, website || null]
    );
    res.json({ company: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
