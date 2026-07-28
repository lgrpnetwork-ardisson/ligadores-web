-- Migración 002: reemplaza la whitelist genérica por postulaciones a trabajos,
-- y convierte la normativa en una wiki editable por administradores.
--
-- Cómo ejecutarla en HeidiSQL: selecciona tu base de datos en el panel
-- izquierdo -> Archivo -> Ejecutar archivo SQL... -> elige este archivo -> Ejecutar.
--
-- No borra nada de lo que ya tenías (whitelist_applications puede quedarse
-- sin usarse, o bórrala tú manualmente si ya no la necesitas:
-- DROP TABLE IF EXISTS whitelist_applications;)

CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  active TINYINT(1) NOT NULL DEFAULT 1
);

-- Quiénes son "jefes" de cada trabajo (pueden aprobar/rechazar postulaciones a ESE trabajo)
CREATE TABLE IF NOT EXISTS job_bosses (
  job_id INT NOT NULL,
  discord_id VARCHAR(32) NOT NULL,
  PRIMARY KEY (job_id, discord_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  discord_id VARCHAR(32) NOT NULL,
  discord_username VARCHAR(64) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  age INT NOT NULL,
  motivation TEXT NOT NULL,
  experience TEXT,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(64),
  created_at DATETIME NOT NULL,
  reviewed_at DATETIME,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  INDEX idx_discord_id (discord_id)
);

-- Wiki de normativa: cada artículo lo crea/edita/borra un admin desde /admin/wiki
CREATE TABLE IF NOT EXISTS wiki_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  category VARCHAR(80) NOT NULL DEFAULT 'General',
  content TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  updated_by VARCHAR(64),
  updated_at DATETIME NOT NULL
);

-- Ejemplo de un trabajo y un artículo de bienvenida (edítalos o bórralos desde /admin)
INSERT INTO jobs (name, label, description, active) VALUES
('policia', 'Policía Metropolitana', 'Encárgate del orden en las calles de la ciudad.', 1);

INSERT INTO wiki_articles (title, slug, category, content, position, updated_at) VALUES
('Bienvenida', 'bienvenida', 'General', '# Bienvenido a Ligadores\n\nEste es el código de la calle. Se actualiza con el tiempo — el staff puede editar, agregar o borrar artículos desde el panel de administración.', 0, NOW());
