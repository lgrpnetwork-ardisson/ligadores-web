-- Migración 003: agrega soporte de imagen (jpg/png/webp) a los artículos de la tienda.
-- Ejecútala igual que las anteriores: HeidiSQL -> selecciona tu base -> Archivo -> Ejecutar archivo SQL.

ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS image VARCHAR(255) DEFAULT NULL AFTER description;
