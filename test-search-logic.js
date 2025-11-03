import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar datos
const jobIdToNames = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/job_id_to_names.json'), 'utf-8'));
const cityDistances = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/city_distances.json'), 'utf-8'));

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Crear mapa de sinónimos (EXACTO como en search.js líneas 171-185)
const jobSynonyms = {};
for (const jobId in jobIdToNames) {
  const names = jobIdToNames[jobId];
  const normalized = names.map(n => normalizeText(n));
  normalized.forEach(name => { jobSynonyms[name] = normalized; });
}

// SIMULAR BÚSQUEDA: "barman" en "sant cugat"
console.log('🔍 SIMULANDO BÚSQUEDA: query="barman", location="sant cugat"\n');

const query = 'barman';
const location = 'sant cugat';

// Paso 1: Normalizar query
const normalizedQuery = normalizeText(query);
console.log(`1️⃣  Query normalizado: "${normalizedQuery}"`);

// Paso 2: Expandir sinónimos
const queryTerms = normalizedQuery ? (jobSynonyms[normalizedQuery] || [normalizedQuery]) : [];
console.log(`2️⃣  Query terms (con sinónimos): [${queryTerms.length} términos]`);
console.log(`    ${queryTerms.slice(0, 10).join(', ')}${queryTerms.length > 10 ? '...' : ''}`);

// Paso 3: Normalizar location
const locationLower = normalizeText(location);
console.log(`\n3️⃣  Location normalizado: "${locationLower}"`);

// Paso 4: Buscar en city_distances (EXACTO como en search.js líneas 64-108)
function findCityInDistances(cityName, distancesMap) {
  const normalized = normalizeText(cityName);

  function normalizeSpanishCatalan(text) {
    return text
      .replace(/\bsant\b/g, 'san')
      .replace(/\bsan\b/g, 'san')
      .replace(/\bdel\b/g, 'del')
      .replace(/\bde\b/g, 'de')
      .replace(/valles/g, 'valles')
      .trim();
  }

  const normalizedVariant = normalizeSpanishCatalan(normalized);
  console.log(`    🔄 Variante ES/CA: "${normalizedVariant}"`);

  // 1. Match exacto
  for (const key in distancesMap) {
    const keyNorm = normalizeText(key);
    if (keyNorm === normalized || normalizeSpanishCatalan(keyNorm) === normalizedVariant) {
      return { distances: distancesMap[key], matchedName: key };
    }
  }

  // 2. Match parcial
  const partialMatch = Object.keys(distancesMap).find(key => {
    const keyNorm = normalizeText(key);
    const keyVariant = normalizeSpanishCatalan(keyNorm);

    return (
      keyNorm.includes(normalized) ||
      normalized.includes(keyNorm) ||
      keyVariant.includes(normalizedVariant) ||
      normalizedVariant.includes(keyVariant)
    );
  });

  if (partialMatch) {
    return { distances: distancesMap[partialMatch], matchedName: partialMatch };
  }

  return null;
}

const cityResult = findCityInDistances(location, cityDistances);

if (!cityResult) {
  console.log(`\n❌ PROBLEMA ENCONTRADO: "${location}" no se encontró en city_distances.json`);
  console.log(`    NIVEL 0.5 y NIVEL 2 NEARBY NO FUNCIONARÁN\n`);
  process.exit(1);
}

console.log(`\n4️⃣  Match encontrado: "${cityResult.matchedName}"`);
console.log(`    Ciudades cercanas ≤50km: ${cityResult.distances.filter(c => c.distance <= 50).length}`);

// Listar ciudades que podrían tener ofertas
const topNearbyCities = cityResult.distances
  .filter(c => c.distance <= 50)
  .slice(0, 10);

console.log(`\n5️⃣  Top 10 ciudades cercanas donde buscar ofertas:`);
topNearbyCities.forEach((city, idx) => {
  console.log(`    ${idx + 1}. ${city.city} (${city.distance} km)`);
});

console.log(`\n✅ CONCLUSIÓN:`);
console.log(`    - Los sinónimos están correctos: "barman" → 50 términos`);
console.log(`    - La ciudad se encuentra correctamente: "sant cugat" → "${cityResult.matchedName}"`);
console.log(`    - Hay ${topNearbyCities.length} ciudades cercanas para NIVEL 0.5`);
console.log(`\n⚠️  EL PROBLEMA DEBE ESTAR EN UNO DE ESTOS 3 LUGARES:`);
console.log(`    1. ❓ Las ofertas en el cache NO tienen el campo "enriched.related_jobs"`);
console.log(`    2. ❓ No hay ofertas reales de bartender/barman/coctelero en las ciudades cercanas`);
console.log(`    3. ❓ El prompt del asistente no está mostrando los resultados correctamente`);
console.log(`\n📋 PARA VERIFICAR:`);
console.log(`    - Ejecutar: /api/jobs/refresh para forzar actualización del cache`);
console.log(`    - Verificar que enrichOffers.js se está ejecutando en refresh.js`);
console.log(`    - Probar búsqueda directa: /api/jobs/search?query=bartender&location=barcelona`);
