const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { pool } = require('../config/db');

router.get('/shop', ensureAuth, async (req, res, next) => {
  try {
    const [items] = await pool.query(
      `SELECT * FROM shop_items WHERE active = 1 ORDER BY category, price ASC`
    );
    res.render('shop', { user: req.user, title: 'Mercado', items });
  } catch (err) {
    next(err);
  }
});

router.post('/shop/buy/:id', ensureAuth, async (req, res, next) => {
  try {
    const [items] = await pool.query(`SELECT * FROM shop_items WHERE id = ? AND active = 1`, [req.params.id]);
    if (!items.length) return res.redirect('/shop');

    const item = items[0];

    // ============================================================
    // AQUÍ VA TU PASARELA DE PAGO REAL (Tebex, PayPal, Stripe, etc.)
    // Por ahora, la compra queda como orden pendiente para que un
    // admin la confirme manualmente desde /admin/orders.
    // ============================================================
    await pool.query(
      `INSERT INTO orders (discord_id, discord_username, item_id, item_name, price, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [req.user.id, req.user.username, item.id, item.name, item.price]
    );

    res.render('shop-confirmation', {
      user: req.user,
      title: 'Orden registrada',
      item,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
