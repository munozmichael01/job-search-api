// Test: Verificar que "sant cugat" hace match con "san cugat del valles"

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function normalizeSpanishCatalan(text) {
  return text
    .replace(/\bsant\b/g, 'san')
    .replace(/\bsan\b/g, 'san')
    .replace(/\bdel\b/g, 'del')
    .replace(/\bde\b/g, 'de')
    .replace(/valles/g, 'valles')
    .trim();
}

// TEST
const location = 'sant cugat';
const locationNormalized = normalizeText(location);
const locationVariant = normalizeSpanishCatalan(locationNormalized);

console.log('Usuario busca:', location);
console.log('Normalizado:', locationNormalized);
console.log('Variante ES/CA:', locationVariant);

// Simular valid_cities
const validCities = ['san cugat del valles', 'barcelona', 'madrid'];

// Buscar match (NUEVA LÓGICA)
const cityInValidList = validCities.find(city => {
  const cityVariant = normalizeSpanishCatalan(city);
  return (
    city === locationNormalized ||
    cityVariant === locationVariant ||
    city.includes(locationNormalized) ||
    cityVariant.includes(locationVariant) ||
    locationNormalized.includes(city) ||
    locationVariant.includes(cityVariant)
  );
});

console.log('\nResultado:');
if (cityInValidList) {
  console.log('✅ Match encontrado:', cityInValidList);
  console.log('✅ NIVEL 0.5 puede activarse');
} else {
  console.log('❌ No encontrado');
  console.log('❌ NIVEL 0.5 NO se activará');
}
