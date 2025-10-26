import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar city_distances
const distancesPath = path.join(__dirname, 'data/city_distances.json');
const cityDistances = JSON.parse(fs.readFileSync(distancesPath, 'utf-8'));

console.log('📊 Ciudades en city_distances.json:');
console.log(`   Total ciudades: ${Object.keys(cityDistances).length}`);
console.log('\n🔍 Primeras 20 ciudades:');
Object.keys(cityDistances).slice(0, 20).forEach((city, idx) => {
  console.log(`   ${idx + 1}. ${city} (${cityDistances[city].length} ciudades cercanas)`);
});

// Probar normalizaciones
function normalizeCityName(cityName) {
  if (!cityName) return '';
  return cityName
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const testCities = ['Barcelona', 'Madrid', 'Melilla', 'barcelona', 'BARCELONA', 'Barcelona '];
console.log('\n🧪 Pruebas de normalización:');
testCities.forEach(city => {
  const normalized = normalizeCityName(city);
  const exists = cityDistances[normalized];
  console.log(`   "${city}" → "${normalized}" → ${exists ? '✅ EXISTE' : '❌ NO EXISTE'}`);
  if (exists) {
    console.log(`      (${exists.length} ciudades cercanas)`);
  }
});

// Buscar Barcelona específicamente
console.log('\n🔎 Buscando "Barcelona" en todas las claves:');
const barcelonaKeys = Object.keys(cityDistances).filter(k => k.toLowerCase().includes('barcelona'));
if (barcelonaKeys.length > 0) {
  console.log(`   Encontradas ${barcelonaKeys.length} claves:`);
  barcelonaKeys.forEach(key => {
    console.log(`      "${key}" (${cityDistances[key].length} ciudades cercanas)`);
    if (cityDistances[key].length > 0) {
      console.log(`         Primeras 3: ${cityDistances[key].slice(0, 3).map(c => c.city).join(', ')}`);
    }
  });
} else {
  console.log('   ❌ No se encontró Barcelona');
}
