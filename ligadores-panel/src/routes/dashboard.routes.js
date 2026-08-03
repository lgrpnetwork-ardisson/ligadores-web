const router = require('express').Router();
const { ensureAuth } = require('../middleware/auth');
const { getCharacterData, pool } = require('../config/db');

function getEffectiveVip(row) {
  if (!row) return { level: 'none', expires: null, active: false };
  const active = row.vip_level !== 'none' && (!row.vip_expires || new Date(row.vip_expires) > new Date());
  return { level: active ? row.vip_level : 'none', expires: row.vip_expires, active };
}

router.get('/dashboard', ensureAuth, async (req, res, next) => {
  try {
    const character = await getCharacterData(req.user.id);

    const [vipRows] = await pool.query(
      `SELECT vip_level, vip_expires FROM lg_vip_players WHERE discord_id = ? LIMIT 1`,
      [req.user.id]
    );
    const vip = getEffectiveVip(vipRows[0]);

    res.render('dashboard', {
      user: req.user,
      title: 'Mi expediente',
      character, // null si el Discord aún no está vinculado a ningún personaje in-game
      vip,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
