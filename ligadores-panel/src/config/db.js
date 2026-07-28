const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

/**
 * ============================================================================
 * QBOX (qbx_core) + ox_inventory
 * ============================================================================
 * La tabla `players` de qbx_core.sql identifica al personaje por `citizenid`,
 * y su identificador persistente es el `license` de Rockstar — NO guarda el
 * Discord ID en ninguna columna por defecto.
 *
 * Por eso este panel usa una tabla puente `discord_links` (citizenid <-> discord_id)
 * que se llena SOLA desde tu servidor de FiveM gracias al resource incluido en
 * fivem-resource/ligadores_discordlink. Instálalo en tu servidor o esta función
 * siempre devolverá null. Ver README.md sección 5.1 para instalarlo.
 *
 * Estructura de qbx_core.sql:
 *   players(id, citizenid, license, name, money, charinfo, job, gang, position, metadata, inventory)
 *
 * En esta instalación, ox_inventory guarda el inventario directo en la columna
 * `inventory` (JSON) de la propia tabla `players` — no en una tabla aparte.
 * ============================================================================
 */

async function getCharacterData(discordId) {
  // 1. Encuentra el citizenid vinculado a este Discord ID
  const [links] = await pool.query(
    `SELECT citizenid FROM discord_links WHERE discord_id = ? LIMIT 1`,
    [discordId]
  );
  if (!links.length) return null;
  const { citizenid } = links[0];

  // 2. Trae los datos del personaje, incluyendo el inventario
  const [rows] = await pool.query(
    `SELECT citizenid, charinfo, money, job, metadata, inventory
     FROM players WHERE citizenid = ? LIMIT 1`,
    [citizenid]
  );
  if (!rows.length) return null;
  const player = rows[0];

  const charinfo = typeof player.charinfo === 'string' ? JSON.parse(player.charinfo) : player.charinfo;
  const money = typeof player.money === 'string' ? JSON.parse(player.money) : player.money;
  const job = typeof player.job === 'string' ? JSON.parse(player.job) : player.job;
  const metadata = typeof player.metadata === 'string' ? JSON.parse(player.metadata) : player.metadata;

  return {
    name: `${charinfo?.firstname || ''} ${charinfo?.lastname || ''}`.trim() || 'Personaje sin nombre',
    job: job?.label || 'Desempleado',
    cash: money?.cash ?? 0,
    bank: money?.bank ?? 0,
    // AJUSTA AQUÍ: Qbox no trackea tiempo jugado por defecto. Necesitas un
    // resource propio que lo mida y lo guarde (por ejemplo, en `metadata.playtime`).
    playtimeMinutes: metadata?.playtime ?? 0,
    inventory: parseOxInventory(player.inventory),
  };
}

function parseOxInventory(raw) {
  if (!raw) return [];
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // ox_inventory suele guardar los slots como un array o como un objeto
    // { "1": {name, count, ...}, "2": {...} } dependiendo de la versión.
    const slots = Array.isArray(data) ? data : Object.values(data || {});

    return slots
      .filter(Boolean)
      .map(slot => ({
        item: slot.name || slot.item,
        count: slot.count || slot.amount || 1,
      }));
  } catch (err) {
    console.error('No se pudo leer players.inventory:', err.message);
    return [];
  }
}

module.exports = { pool, getCharacterData };
