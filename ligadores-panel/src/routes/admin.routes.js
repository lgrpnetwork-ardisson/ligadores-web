const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { ensureAdmin } = require('../middleware/auth');
const { pool } = require('../config/db');
const { syncVipDiscordRole } = require('../config/discord-roles');

// ---------- Subida de imágenes de la tienda ----------
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'shop');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `item-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.get('/admin', ensureAdmin, async (req, res, next) => {
  try {
    const [[{ pendingJobs }]] = await pool.query(
      `SELECT COUNT(*) as pendingJobs FROM job_applications WHERE status = 'pending'`
    );
    const [[{ orders }]] = await pool.query(
      `SELECT COUNT(*) as orders FROM orders WHERE status = 'pending'`
    );
    res.render('admin-home', { user: req.user, title: 'Panel de administración', pendingJobs, orders });
  } catch (err) {
    next(err);
  }
});

// ---------- Trabajos ----------
router.get('/admin/jobs', ensureAdmin, async (req, res, next) => {
  try {
    const [jobs] = await pool.query(`SELECT * FROM jobs ORDER BY label`);
    res.render('admin-jobs', { user: req.user, title: 'Administrar trabajos', jobs });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/jobs/create', ensureAdmin, async (req, res, next) => {
  try {
    const { name, label, description } = req.body;
    await pool.query(
      `INSERT INTO jobs (name, label, description, active) VALUES (?, ?, ?, 1)`,
      [name, label, description]
    );
    res.redirect('/admin/jobs');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/jobs/:id/toggle', ensureAdmin, async (req, res, next) => {
  try {
    await pool.query(`UPDATE jobs SET active = NOT active WHERE id = ?`, [req.params.id]);
    res.redirect('/admin/jobs');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/jobs/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM jobs WHERE id = ?`, [req.params.id]);
    res.redirect('/admin/jobs');
  } catch (err) {
    next(err);
  }
});

// ---------- Jefes de cada trabajo ----------
router.get('/admin/jobs/:id/bosses', ensureAdmin, async (req, res, next) => {
  try {
    const [[job]] = await pool.query(`SELECT * FROM jobs WHERE id = ?`, [req.params.id]);
    if (!job) return res.redirect('/admin/jobs');
    const [bosses] = await pool.query(`SELECT * FROM job_bosses WHERE job_id = ?`, [req.params.id]);
    res.render('admin-jobs-bosses', { user: req.user, title: `Jefes — ${job.label}`, job, bosses });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/jobs/:id/bosses/add', ensureAdmin, async (req, res, next) => {
  try {
    const discordId = (req.body.discord_id || '').trim();
    if (discordId) {
      await pool.query(`INSERT IGNORE INTO job_bosses (job_id, discord_id) VALUES (?, ?)`, [req.params.id, discordId]);
    }
    res.redirect(`/admin/jobs/${req.params.id}/bosses`);
  } catch (err) {
    next(err);
  }
});

router.post('/admin/jobs/:id/bosses/:discordId/remove', ensureAdmin, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM job_bosses WHERE job_id = ? AND discord_id = ?`, [req.params.id, req.params.discordId]);
    res.redirect(`/admin/jobs/${req.params.id}/bosses`);
  } catch (err) {
    next(err);
  }
});

// ---------- Planes VIP ----------
router.get('/admin/vip', ensureAdmin, async (req, res, next) => {
  try {
    const [tiers] = await pool.query(`SELECT * FROM vip_tiers ORDER BY position`);
    res.render('admin-vip', { user: req.user, title: 'Planes VIP', tiers });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/vip/:level/edit', ensureAdmin, async (req, res, next) => {
  try {
    const { label, price_per_month, benefits, discord_role_id } = req.body;
    await pool.query(
      `UPDATE vip_tiers SET label = ?, price_per_month = ?, benefits = ?, discord_role_id = ? WHERE level = ?`,
      [label, price_per_month, benefits, discord_role_id ? discord_role_id.trim() : null, req.params.level]
    );
    res.redirect('/admin/vip');
  } catch (err) {
    next(err);
  }
});

// ---------- Tienda ----------
router.get('/admin/shop', ensureAdmin, async (req, res, next) => {
  try {
    const [items] = await pool.query(`SELECT * FROM shop_items ORDER BY category, price ASC`);
    res.render('admin-shop', { user: req.user, title: 'Administrar tienda', items });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/shop/create', ensureAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const { name, description, price, category } = req.body;
    const image = req.file ? `/uploads/shop/${req.file.filename}` : null;
    await pool.query(
      `INSERT INTO shop_items (name, description, image, price, category, active) VALUES (?, ?, ?, ?, ?, 1)`,
      [name, description, image, price, category]
    );
    res.redirect('/admin/shop');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/shop/:id/toggle', ensureAdmin, async (req, res, next) => {
  try {
    await pool.query(`UPDATE shop_items SET active = NOT active WHERE id = ?`, [req.params.id]);
    res.redirect('/admin/shop');
  } catch (err) {
    next(err);
  }
});

router.post('/admin/shop/:id/delete', ensureAdmin, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM shop_items WHERE id = ?`, [req.params.id]);
    res.redirect('/admin/shop');
  } catch (err) {
    next(err);
  }
});

// ---------- Órdenes ----------
router.get('/admin/orders', ensureAdmin, async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC`
    );
    res.render('admin-orders', { user: req.user, title: 'Órdenes pendientes', orders });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/orders/:id/fulfill', ensureAdmin, async (req, res, next) => {
  try {
    const [[order]] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [req.params.id]);
    if (!order) return res.redirect('/admin/orders');

    if (order.order_type === 'vip' && order.vip_level && order.vip_months) {
      // Si ya tenía VIP vigente, se extiende desde su fecha de vencimiento;
      // si no tenía o ya venció, se cuenta desde hoy.
      await pool.query(
        `INSERT INTO lg_vip_players (discord_id, vip_level, vip_expires)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MONTH))
         ON DUPLICATE KEY UPDATE
           vip_level = VALUES(vip_level),
           vip_expires = DATE_ADD(GREATEST(IFNULL(vip_expires, NOW()), NOW()), INTERVAL ? MONTH)`,
        [order.discord_id, order.vip_level, order.vip_months, order.vip_months]
      );

      // No dejamos que un fallo en Discord tumbe la confirmación del pago —
      // si falla, el admin puede asignar el rol a mano y el log queda en consola.
      try {
        await syncVipDiscordRole(order.discord_id, order.vip_level);
      } catch (err) {
        console.error('[vip-discord] Error inesperado sincronizando el rol:', err.message);
      }
    }

    await pool.query(`UPDATE orders SET status = 'fulfilled' WHERE id = ?`, [req.params.id]);
    res.redirect('/admin/orders');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
