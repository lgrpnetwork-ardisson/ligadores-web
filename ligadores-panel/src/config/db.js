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
 * QBOX (qbx_core) + ox_inventory + player_vehicles + vms_housing
 * ============================================================================
 * La tabla `players` de qbx_core.sql identifica al personaje por `citizenid`,
 * y su identificador persistente es el `license` de Rockstar — NO guarda el
 * Discord ID en ninguna columna por defecto.
 *
 * Por eso este panel usa una tabla puente `discord_links` (citizenid <-> discord_id)
 * que se llena SOLA desde tu servidor de FiveM gracias al resource
 * fivem-resource/ligadores_discordlink. Instálalo en tu servidor o esta
 * función siempre devolverá null. Ver README.md sección 5.1 para instalarlo.
 *
 * IMPORTANTE: un mismo Discord puede tener VARIOS personajes vinculados
 * (varias filas en discord_links con el mismo discord_id, distinto
 * citizenid). Cuando eso pasa, el panel muestra el personaje con el que
 * jugaste MÁS RECIENTE (columna updated_at, que se actualiza cada vez que
 * el resource de FiveM detecta que ese personaje se conectó).
 *
 * Estructura de qbx_core.sql:
 *   players(id, citizenid, license, name, money, charinfo, job, gang, position, metadata, inventory)
 *
 * En esta instalación, ox_inventory guarda el inventario directo en la columna
 * `inventory` (JSON) de la propia tabla `players` — no en una tabla aparte.
 * ============================================================================
 */

async function getCharacterByCitizenId(citizenid) {
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

  const photo = metadata?.photo || charinfo?.image || null;

  return {
    citizenid,
    name: `${charinfo?.firstname || ''} ${charinfo?.lastname || ''}`.trim() || 'Personaje sin nombre',
    job: job?.label || 'Desempleado',
    cash: money?.cash ?? 0,
    bank: money?.bank ?? 0,
    playtimeMinutes: metadata?.playtime ?? 0,
    photo,
    inventory: parseOxInventory(player.inventory),
    vehicles: await getVehicles(citizenid),
    properties: await getProperties(citizenid),
  };
}

// Trae TODOS los personajes vinculados a un Discord, del más reciente al
// más antiguo (una persona puede tener varios personajes).
async function getAllCharacters(discordId) {
  const [links] = await pool.query(
    `SELECT citizenid FROM discord_links WHERE discord_id = ? ORDER BY updated_at DESC`,
    [discordId]
  );
  if (!links.length) return [];

  const characters = [];
  for (const link of links) {
    const character = await getCharacterByCitizenId(link.citizenid);
    if (character) characters.push(character);
  }
  return characters;
}

// Se mantiene por compatibilidad: devuelve solo el personaje más reciente.
async function getCharacterData(discordId) {
  const characters = await getAllCharacters(discordId);
  return characters[0] || null;
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

// `player_vehicles` es la tabla estándar de Qbox/QBCore para vehículos
// propios: player_vehicles(id, license, citizenid, vehicle, hash, plate, garage, state, ...)
// El campo `vehicle` guarda el nombre interno del modelo (ej. "asbo"), no un
// nombre bonito — no hay tabla de traducción de modelos por defecto en la DB.
async function getVehicles(citizenid) {
  try {
    const [rows] = await pool.query(
      `SELECT vehicle, plate, garage, state FROM player_vehicles WHERE citizenid = ? ORDER BY id DESC`,
      [citizenid]
    );
    return rows.map(v => ({
      model: v.vehicle,
      plate: v.plate,
      garage: v.garage,
      parked: v.state === 1 || v.state === true,
    }));
  } catch (err) {
    console.error('No se pudo leer player_vehicles:', err.message);
    return [];
  }
}

// AJUSTA AQUÍ — vms_housing no tiene un esquema 100% estandarizado/documentado
// públicamente y puede variar según la versión que tengas instalada. Esta
// consulta usa el nombre de tabla más común reportado (`houses`, con una
// columna `owner` guardando el identificador del dueño). Si tu instalación
// usa otro nombre de tabla o columna, este es el lugar exacto para corregirlo
// — el try/catch de abajo evita que el dashboard se rompa mientras tanto.
async function getProperties(citizenid) {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, owner_name, renter FROM houses WHERE owner = ? ORDER BY id DESC`,
      [citizenid]
    );
    return rows.map(p => ({
      id: p.id,
      type: p.type || 'Propiedad',
      rented: !!p.renter,
    }));
  } catch (err) {
    console.error('No se pudo leer propiedades (vms_housing):', err.message);
    return [];
  }
}

module.exports = { pool, getCharacterData, getAllCharacters };
