// Asigna el rol de Discord correspondiente al nivel VIP comprado, y quita
// cualquier otro rol de VIP que el usuario tuviera antes (para que no se
// acumulen bronce+plata+oro a la vez).
//
// Requiere un bot de Discord invitado a tu servidor con permiso de
// "Gestionar roles", y que el rol del BOT esté por ENCIMA de los roles de
// VIP en la jerarquía de tu servidor (si no, Discord rechaza la asignación).
//
// Variables de entorno necesarias:
//   DISCORD_BOT_TOKEN   -> el token del bot (Developer Portal -> tu app -> Bot)
//   DISCORD_GUILD_ID    -> el ID de tu servidor de Discord
//
// Los IDs de cada rol (bronce/plata/oro) se configuran desde /admin/vip,
// no aquí — se guardan en la columna `discord_role_id` de `vip_tiers`.

const { pool } = require('./db');

async function syncVipDiscordRole(discordId, newLevel) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    console.error('[vip-discord] Falta DISCORD_GUILD_ID o DISCORD_BOT_TOKEN en el .env — no se pudo asignar el rol.');
    return { ok: false, reason: 'missing_config' };
  }

  const [tiers] = await pool.query(`SELECT level, discord_role_id FROM vip_tiers`);
  const roleByLevel = {};
  for (const t of tiers) roleByLevel[t.level] = t.discord_role_id;

  const newRoleId = roleByLevel[newLevel];
  const headers = {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
  };

  // Quita cualquier otro rol de VIP que tenga
  for (const [level, roleId] of Object.entries(roleByLevel)) {
    if (!roleId || roleId === newRoleId) continue;
    try {
      await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.error(`[vip-discord] No se pudo quitar el rol de ${level}:`, err.message);
    }
  }

  if (!newRoleId) {
    console.error(`[vip-discord] El nivel "${newLevel}" no tiene discord_role_id configurado en /admin/vip.`);
    return { ok: false, reason: 'no_role_configured' };
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${newRoleId}`, {
      method: 'PUT',
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[vip-discord] Discord rechazó la asignación (${res.status}): ${text}`);
      return { ok: false, reason: 'discord_error', status: res.status };
    }

    return { ok: true };
  } catch (err) {
    console.error('[vip-discord] Error de red al llamar a la API de Discord:', err.message);
    return { ok: false, reason: 'network_error' };
  }
}

module.exports = { syncVipDiscordRole };
