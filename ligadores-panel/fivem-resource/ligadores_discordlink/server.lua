-- ligadores_discordlink
-- Cada vez que un jugador carga su personaje, guarda (o actualiza) la
-- relación citizenid <-> discord_id en la tabla `discord_links`.
-- El panel web usa esa tabla para saber qué personaje mostrarle a cada
-- usuario que inicia sesión con Discord.

local function getDiscordId(src)
  for _, id in pairs(GetPlayerIdentifiers(src)) do
    if string.find(id, 'discord:') then
      return string.gsub(id, 'discord:', '')
    end
  end
  return nil
end

local function upsertDiscordLink(citizenid, discordId)
  if not citizenid or not discordId then return end

  MySQL.query.await([[
    INSERT INTO discord_links (citizenid, discord_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE discord_id = VALUES(discord_id)
  ]], { citizenid, discordId })
end

-- qbx_core mantiene este evento por compatibilidad con QBCore.
-- Si tu instalación usa un nombre distinto, ajústalo aquí.
AddEventHandler('QBCore:Server:PlayerLoaded', function(Player)
  if not Player or not Player.PlayerData then return end

  local citizenid = Player.PlayerData.citizenid
  local src = Player.PlayerData.source
  local discordId = getDiscordId(src)

  upsertDiscordLink(citizenid, discordId)
end)
