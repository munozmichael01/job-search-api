// Debug: ¿Por qué NIVEL 0.5 no encuentra las ofertas de Barcelona?

const fs = require('fs');
const path = require('path');

// Cargar datos
const cityDistances = JSON.parse(fs.readFileSync('data/city_distances.json', 'utf-8'));

// Helper normalizeText (igual que en search.js)
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Obtener ciudades cercanas a Sant Cugat
const santCugat = cityDistances['San Cugat del Vallés'];

if (!santCugat) {
  console.log('❌ Sant Cugat no encontrado');
  process.exit(1);
}

console.log('Total ciudades cercanas:', santCugat.length);

// Normalizar ciudades
const nearbyCitiesNormalized = santCugat.map(c => ({
  city: normalizeText(c.city),
  distance: c.distance,
  originalName: c.city
}));

// Ordenar por distancia
nearbyCitiesNormalized.sort((a, b) => a.distance - b.distance);

console.log('\n📍 Primeras 15 ciudades cercanas:');
nearbyCitiesNormalized.slice(0, 15).forEach((c, i) => {
  console.log(`${i + 1}. ${c.originalName} (${c.distance}km) - normalizado: "${c.city}"`);
});

// Buscar Barcelona
const barcelonaIndex = nearbyCitiesNormalized.findIndex(c => c.originalName === 'Barcelona');
console.log(`\n🔍 Barcelona está en posición: ${barcelonaIndex + 1} (distancia: ${nearbyCitiesNormalized[barcelonaIndex]?.distance}km)`);

// Verificar si Barcelona está en las primeras 10
if (barcelonaIndex >= 10) {
  console.log('⚠️  ¡PROBLEMA ENCONTRADO! Barcelona está en posición ' + (barcelonaIndex + 1) + ' pero el código solo busca en las primeras 10 ciudades (.slice(0, 10))');
} else {
  console.log('✅ Barcelona SÍ está en las primeras 10 ciudades');
}

console.log('\n🧪 Test de matching de ciudad:');
const testOffers = [
  { ciudad: 'Barcelona', titulo: 'Bartender Hotel 5*' },
  { ciudad: 'barcelona', titulo: 'Bartender Hotel 5*' },
  { ciudad: 'BARCELONA', titulo: 'Bartender Hotel 5*' }
];

const barcelonaNormalized = normalizeText('Barcelona');
console.log(`Barcelona normalizado: "${barcelonaNormalized}"`);

testOffers.forEach(offer => {
  const cityNormalized = normalizeText(offer.ciudad);
  const match = cityNormalized.includes(barcelonaNormalized) || barcelonaNormalized.includes(cityNormalized);
  console.log(`  - ciudad: "${offer.ciudad}" → normalizado: "${cityNormalized}" → match: ${match}`);
});
