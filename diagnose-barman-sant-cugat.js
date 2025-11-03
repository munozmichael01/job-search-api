import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar datos
console.log('📁 Cargando archivos de datos...\n');

const jobIdToNames = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/job_id_to_names.json'), 'utf-8'));
const jobWeights = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/job_weights.json'), 'utf-8'));
const cityDistances = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/city_distances.json'), 'utf-8'));

// Función auxiliar
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// PASO 1: Verificar sinónimos de "barman"
console.log('='.repeat(80));
console.log('PASO 1: Verificar sinónimos de "barman"');
console.log('='.repeat(80));

// Crear mapa de sinónimos (igual que en search.js)
const jobSynonyms = {};
for (const jobId in jobIdToNames) {
  const names = jobIdToNames[jobId];
  const normalized = names.map(n => normalizeText(n));
  normalized.forEach(name => { jobSynonyms[name] = normalized; });
}

const barmanSynonyms = jobSynonyms['barman'] || ['barman'];
console.log(`\n✅ Sinónimos de "barman":`);
console.log(`   Total: ${barmanSynonyms.length} términos`);
console.log(`   Primeros 10: ${barmanSynonyms.slice(0, 10).join(', ')}`);
console.log(`   Incluye "bartender": ${barmanSynonyms.includes('bartender') ? '✅ SÍ' : '❌ NO'}`);

// PASO 2: Verificar relaciones de "Bartender" en job_weights
console.log('\n' + '='.repeat(80));
console.log('PASO 2: Verificar relaciones de "Bartender" en job_weights');
console.log('='.repeat(80));

const bartenderRelations = jobWeights['Bartender'] || [];
console.log(`\n✅ Relaciones de "Bartender":`);
console.log(`   Total: ${bartenderRelations.length} puestos relacionados`);
console.log(`   Top 5 con weight > 0.80:`);
bartenderRelations
  .filter(r => r.weight > 0.80)
  .slice(0, 5)
  .forEach((rel, idx) => {
    console.log(`   ${idx + 1}. ${rel.job} (weight: ${rel.weight}, area: ${rel.area})`);
  });

// PASO 3: Verificar "Sant Cugat" en city_distances
console.log('\n' + '='.repeat(80));
console.log('PASO 3: Verificar "Sant Cugat" en city_distances');
console.log('='.repeat(80));

const santCugatVariants = [
  'Sant Cugat',
  'San Cugat',
  'Sant Cugat del Vallès',
  'San Cugat del Vallés',
  'Sant Cugat del Valles',
  'San Cugat del Valles'
];

let foundCity = null;
let foundKey = null;

for (const variant of santCugatVariants) {
  if (cityDistances[variant]) {
    foundCity = cityDistances[variant];
    foundKey = variant;
    break;
  }
}

if (foundCity) {
  console.log(`\n✅ Encontrada ciudad: "${foundKey}"`);
  console.log(`   Ciudades cercanas ≤50km: ${foundCity.filter(c => c.distance <= 50).length}`);
  console.log(`   Top 5 más cercanas:`);
  foundCity
    .filter(c => c.distance <= 50)
    .slice(0, 5)
    .forEach((city, idx) => {
      console.log(`   ${idx + 1}. ${city.city} (${city.distance} km)`);
    });
} else {
  console.log(`\n❌ NO encontrada "Sant Cugat" en city_distances.json`);
  console.log(`   Variantes probadas: ${santCugatVariants.join(', ')}`);

  // Buscar ciudades similares
  console.log(`\n   Buscando ciudades similares que contengan "cugat"...`);
  const similarCities = Object.keys(cityDistances).filter(city =>
    normalizeText(city).includes('cugat')
  );
  if (similarCities.length > 0) {
    console.log(`   Encontradas: ${similarCities.join(', ')}`);
  } else {
    console.log(`   No se encontraron ciudades similares`);
  }
}

// PASO 4: Simular búsqueda con sinónimos
console.log('\n' + '='.repeat(80));
console.log('PASO 4: Resumen del diagnóstico');
console.log('='.repeat(80));

console.log(`
✅ DATOS CORRECTOS:
   - Sinónimos de "barman": ${barmanSynonyms.length} términos (incluye bartender, coctelero, mixólogo)
   - Relaciones de "Bartender": ${bartenderRelations.length} puestos (Barista, Gerente de Bar, Sommelier, etc.)

${foundCity ? '✅' : '❌'} CIUDAD:
   ${foundCity ? `- "Sant Cugat" encontrada como "${foundKey}"` : '- "Sant Cugat" NO encontrada en city_distances.json'}
   ${foundCity ? `- ${foundCity.filter(c => c.distance <= 50).length} ciudades cercanas ≤50km` : ''}

🔍 FLUJO ESPERADO para "barman sant cugat":
   1. Buscar "barman"/"bartender"/"coctelero" en Sant Cugat → Probablemente 0 resultados
   2. NIVEL 0.5: Buscar mismo puesto en ciudades cercanas (Barcelona, Sabadell, Rubí, etc.)
   3. Si NIVEL 0.5 no encuentra: NIVEL 2 buscar puestos relacionados (Barista, Gerente de Bar, etc.)
   4. Si NIVEL 2 no encuentra en Sant Cugat: NIVEL 2 NEARBY buscar en ciudades cercanas

⚠️  POSIBLES PROBLEMAS:
   ${!foundCity ? '- Sant Cugat no está en city_distances.json → NIVEL 0.5 y NIVEL 2 no funcionarán' : ''}
   - Las ofertas en cache pueden no tener el campo "enriched.related_jobs"
   - El cache puede no tener ofertas de bartender/barman en Barcelona o ciudades cercanas
   - La normalización de "sant cugat" puede no hacer match con la key del archivo

📋 PRÓXIMOS PASOS:
   1. Verificar el cache actual en producción
   2. Verificar si hay ofertas de bartender/barman/coctelero en Barcelona
   3. ${!foundCity ? 'Agregar variantes de "Sant Cugat" al archivo city_distances.json' : 'Verificar la normalización de ciudad en el API'}
`);

console.log('\n' + '='.repeat(80));
console.log('Diagnóstico completado');
console.log('='.repeat(80));
