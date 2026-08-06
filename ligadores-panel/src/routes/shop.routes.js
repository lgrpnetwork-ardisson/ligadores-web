const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { pool } = require('../config/db');
const { getVipTiers, getVipTier } = require('../config/vip');
const { EXTRA_SLOT_PRICE, DEFAULT_BASE_SLOTS } = require('../config/slots');

function getEffectiveVip(row) {
  if (!row) return { level: 'none', expires: null, active: false };
  const active = row.vip_level !== 'none' && (!row.vip_expires || new Date(row.vip_expires) > new Date());
  return { level: active ? row.vip_level : 'none', expires: row.vip_expires, active };
}

router.get('/shop', ensureAuth, async (req, res, next) => {
  try {
    const [items] = await pool.query(
      `SELECT * FROM shop_items WHERE active = 1 ORDER BY category, price ASC`
    );

    const [vipRows] = await pool.query(
      `SELECT vip_level, vip_expires FROM lg_vip_players WHERE discord_id = ? LIMIT 1`,
      [req.user.id]
    );
    const currentVip = getEffectiveVip(vipRows[0]);
    const vipTiers = await getVipTiers();

    const [slotRows] = await pool.query(
      `SELECT slots FROM player_slots WHERE discord_id = ? LIMIT 1`,
      [req.user.id]
    );
    const currentSlots = slotRows.length ? slotRows[0].slots : DEFAULT_BASE_SLOTS;

    res.render('shop', {
      user: req.user,
      title: 'Mercado',
      items,
      vipTiers,
      currentVip,
      currentSlots,
      extraSlotPrice: EXTRA_SLOT_PRICE,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/shop/vip/:level/buy', ensureAuth, async (req, res, next) => {
  try {
    const tier = await getVipTier(req.params.level);
    if (!tier) return res.redirect('/shop');

    const months = Math.max(1, Math.min(24, parseInt(req.body.months, 10) || 1));
    const price = tier.pricePerMonth * months;

    await pool.query(
      `INSERT INTO orders
        (discord_id, discord_username, item_id, item_name, order_type, vip_level, vip_months, price, status, created_at)
       VALUES (?, ?, NULL, ?, 'vip', ?, ?, ?, 'pending', NOW())`,
      [req.user.id, req.user.username, `${tier.label} — ${months} mes(es)`, tier.level, months, price]
    );

    res.render('shop-confirmation', {
      user: req.user,
      title: 'Orden registrada',
      item: { name: `${tier.label} — ${months} mes(es)`, price },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/shop/slots/buy', ensureAuth, async (req, res, next) => {
  try {
    const quantity = Math.max(1, Math.min(10, parseInt(req.body.quantity, 10) || 1));
    const price = EXTRA_SLOT_PRICE * quantity;

    await pool.query(
      `INSERT INTO orders
        (discord_id, discord_username, item_id, item_name, order_type, slot_amount, price, status, created_at)
       VALUES (?, ?, NULL, ?, 'slot', ?, ?, 'pending', NOW())`,
      [req.user.id, req.user.username, `Slot de personaje ×${quantity}`, quantity, price]
    );

    res.render('shop-confirmation', {
      user: req.user,
      title: 'Orden registrada',
      item: { name: `Slot de personaje ×${quantity}`, price },
    });
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
      `INSERT INTO orders (discord_id, discord_username, item_id, item_name, order_type, price, status, created_at)
       VALUES (?, ?, ?, ?, 'shop_item', ?, 'pending', NOW())`,
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
