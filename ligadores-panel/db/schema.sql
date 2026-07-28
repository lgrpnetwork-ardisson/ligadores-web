-- Tablas propias del panel de Ligadores.
-- NO toca las tablas de tu framework (users/players): esas ya existen
-- gracias a tu instalación de ESX o QBCore.

CREATE TABLE IF NOT EXISTS whitelist_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(32) NOT NULL,
  discord_username VARCHAR(64) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  age INT NOT NULL,
  backstory TEXT NOT NULL,
  experience TEXT,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  INDEX idx_discord_id (discord_id)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  image VARCHAR(255) DEFAULT NULL,
  price DECIMAL(10,2) NOT NULL,
  category ENUM('vip', 'coins', 'house', 'otro') NOT NULL DEFAULT 'otro',
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(32) NOT NULL,
  discord_username VARCHAR(64) NOT NULL,
  item_id INT NOT NULL,
  item_name VARCHAR(120) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL,
  INDEX idx_discord_id (discord_id)
);

-- Solo necesaria si FRAMEWORK=qbox. Vincula el Discord ID de cada jugador con
-- su citizenid, porque la tabla `players` de qbx_core no guarda el Discord ID.
-- Se llena automáticamente con el resource fivem-resource/ligadores_discordlink.
CREATE TABLE IF NOT EXISTS discord_links (
  citizenid VARCHAR(50) NOT NULL,
  discord_id VARCHAR(32) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (citizenid),
  UNIQUE KEY idx_discord_id (discord_id)
);

-- Datos de ejemplo para la tienda (bórralos o edítalos desde /admin/shop)
INSERT INTO shop_items (name, description, price, category, active) VALUES
('Pack Cómplice', 'Cola prioritaria + rol de Discord exclusivo', 5.00, 'vip', 1),
('Pack Socio', 'Slot de personaje extra + garaje privado', 12.00, 'vip', 1),
('5,000 monedas', 'Moneda del servidor para negocios in-game', 3.00, 'coins', 1),
('Casa en el barrio alto', 'Propiedad exclusiva de temporada', 20.00, 'house', 1);
