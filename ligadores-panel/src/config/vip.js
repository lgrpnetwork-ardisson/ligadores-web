// Los planes VIP ya no viven hardcodeados aquí — se administran desde
// /admin/vip y se guardan en la tabla `vip_tiers`. Este archivo solo trae
// funciones de ayuda para leerlos con un formato cómodo de usar.
const { pool } = require('./db');

async function getVipTiers() {
  const [rows] = await pool.query(`SELECT * FROM vip_tiers ORDER BY position`);
  return rows.map(formatTier);
}

async function getVipTier(level) {
  const [rows] = await pool.query(`SELECT * FROM vip_tiers WHERE level = ? LIMIT 1`, [level]);
  if (!rows.length) return null;
  return formatTier(rows[0]);
}

function formatTier(row) {
  return {
    level: row.level,
    label: row.label,
    pricePerMonth: Number(row.price_per_month),
    benefits: (row.benefits || '').split('\n').map(s => s.trim()).filter(Boolean),
    discordRoleId: row.discord_role_id,
  };
}

module.exports = { getVipTiers, getVipTier };
