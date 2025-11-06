import fs from 'fs';

console.log('🔧 Agregando condición !relatedJobsResults a NIVEL 2...\n');

const file = 'api/jobs/search.js';
let content = fs.readFileSync(file, 'utf-8');

const old = `    // NIVEL 2: Si NO hay resultados, buscar en related_jobs
    if (query && totalMatches === 0 && startOffset === 0) {`;

const newCode = `    // NIVEL 2: Si NO hay resultados Y NIVEL 0.5 no encontró nada, buscar en related_jobs
    if (query && totalMatches === 0 && startOffset === 0 && !relatedJobsResults) {`;

if (content.includes(old)) {
  content = content.replace(old, newCode);
  fs.writeFileSync(file, content, 'utf-8');
  console.log('✅ Condición agregada exitosamente\n');
  console.log('📋 CAMBIO:');
  console.log('  ANTES: if (query && totalMatches === 0 && startOffset === 0)');
  console.log('  AHORA: if (query && totalMatches === 0 && startOffset === 0 && !relatedJobsResults)');
  console.log('');
  console.log('🎯 IMPACTO:');
  console.log('  Si NIVEL 0.5 encontró resultados, NIVEL 2 NO se ejecuta');
  console.log('  Sitges: NIVEL 0.5 → 4 ofertas → NIVEL 2 no corre → mantiene las 4');
  console.log('');
  console.log('🧪 TEST ESPERADO:');
  console.log('  "bartender sitges" → NIVEL 0.5 → Barcelona → 4 ofertas ✅');
} else if (content.includes(newCode)) {
  console.log('⏭️  Condición ya existe');
} else {
  console.log('❌ No se encontró el código');
}
