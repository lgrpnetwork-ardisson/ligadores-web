// Planes VIP disponibles en la tienda.
// Para cambiar precios o beneficios, edita este archivo directamente —
// no requiere tocar la base de datos.
const VIP_TIERS = [
  {
    level: 'bronce',
    label: 'VIP Bronce',
    pricePerMonth: 5,
    benefits: [
      'Cola de acceso prioritaria',
      'Rol de Discord exclusivo',
      '1 vehículo cosmético',
    ],
  },
  {
    level: 'plata',
    label: 'VIP Plata',
    pricePerMonth: 10,
    benefits: [
      'Todo lo de Bronce',
      'Slot de personaje adicional',
      'Acceso a garaje privado',
    ],
  },
  {
    level: 'oro',
    label: 'VIP Oro',
    pricePerMonth: 20,
    benefits: [
      'Todo lo de Plata',
      'Propiedad exclusiva de temporada',
      'Acceso anticipado a eventos',
    ],
  },
];

module.exports = { VIP_TIERS };
