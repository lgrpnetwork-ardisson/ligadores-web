fx_version 'cerulean'
game 'gta5'

author 'Ligadores'
description 'Vincula el Discord ID de cada jugador con su citizenid para el panel web'
version '1.0.0'

server_scripts {
  '@oxmysql/lib/MySQL.lua',
  'server.lua'
}
