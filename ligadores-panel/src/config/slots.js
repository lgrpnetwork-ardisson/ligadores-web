// Precio por CADA slot de personaje que se compre.
const EXTRA_SLOT_PRICE = 20;

// Cuántos slots tiene un jugador que NUNCA ha comprado ninguno (es decir, el
// valor por defecto que ya maneja tu propio sistema cuando no existe fila en
// player_slots). Ajusta esto al número real de personajes que da tu servidor
// de base, para que "comprar 1 slot" sume 1 sobre esa base y no la pise.
const DEFAULT_BASE_SLOTS = 1;

module.exports = { EXTRA_SLOT_PRICE, DEFAULT_BASE_SLOTS };
