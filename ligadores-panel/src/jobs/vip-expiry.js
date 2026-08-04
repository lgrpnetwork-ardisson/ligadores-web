// Revisa periódicamente si algún VIP venció. Si es así:
//   1. Le quita el rol de Discord correspondiente.
//   2. Marca vip_level = 'none' en la base de datos.
//
// ⚠️ Esto corre DENTRO del proceso de Node — solo funciona mientras el panel
// esté despierto. Si usas el plan gratis de Render (que duerme por
// inactividad), los vencimientos solo se procesan cuando alguien visita el
// panel y lo despierta. Para que sea 100% puntual incluso sin visitas, usa
// el endpoint /internal/vip-expiry-check (ver server.js) con un servicio de
// cron externo gratis como cron-job.org, pegándole cada hora.

const { pool } = require('../config/db');
const { syncVipDiscordRole } = require('../config/discord-roles');

async function checkExpiredVips() {
  const [expired] = await pool.query(
    `SELECT discord_id FROM lg_vip_players
     WHERE vip_level != 'none' AND vip_expires IS NOT NULL AND vip_expires <= NOW()`
  );

  for (const row of expired) {
    try {
      await syncVipDiscordRole(row.discord_id, 'none');
      await pool.query(`UPDATE lg_vip_players SET vip_level = 'none' WHERE discord_id = ?`, [row.discord_id]);
      console.log(`[vip-expiry] VIP vencido, rol quitado para ${row.discord_id}`);
    } catch (err) {
      console.error(`[vip-expiry] Error procesando vencimiento de ${row.discord_id}:`, err.message);
    }
  }

  return expired.length;
}

function startVipExpiryScheduler(intervalMs = 15 * 60 * 1000) {
  checkExpiredVips().catch(err => console.error('[vip-expiry] Error en chequeo inicial:', err.message));

  setInterval(() => {
    checkExpiredVips().catch(err => console.error('[vip-expiry] Error en chequeo periódico:', err.message));
  }, intervalMs);
}

module.exports = { checkExpiredVips, startVipExpiryScheduler };
