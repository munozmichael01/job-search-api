/**
 * DEBUG: Por qué los niveles no se activan
 *
 * Casos de prueba:
 * 1. "barman sant cugat" → 0 resultados → debería activar NIVEL 0.5
 * 2. "mantenimiento tarragona" → 2 resultados → debería activar NIVEL 1.5
 */

const fetch = require('node-fetch');

async function debugNiveles() {
  console.log('🐛 DEPURANDO POR QUÉ LOS NIVELES NO SE ACTIVAN\n');

  // Test 1: NIVEL 0.5
  console.log('='.repeat(60));
  console.log('TEST 1: BARMAN SANT CUGAT (debería activar NIVEL 0.5)');
  console.log('='.repeat(60));

  const url1 = 'https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat&limit=10';
  const res1 = await fetch(url1);
  const data1 = await res1.json();

  console.log('\n📊 Respuesta:');
  console.log('  - Total matches:', data1.pagination.total_matches);
  console.log('  - Results:', data1.results.length);
  console.log('  - Amplification used:', data1.amplification_used || 'NINGUNO ❌');
  console.log('  - Related jobs results:', data1.related_jobs_results ? data1.related_jobs_results.length : 'NINGUNO ❌');

  console.log('\n✅ Condiciones para NIVEL 0.5:');
  console.log('  - query presente:', 'barman ✓');
  console.log('  - location presente:', 'sant cugat ✓');
  console.log('  - totalMatches === 0:', data1.pagination.total_matches === 0 ? '✓' : '✗');
  console.log('  - startOffset === 0:', '✓');
  console.log('  - !relatedJobsResults:', !data1.related_jobs_results ? '✓' : '✗');

  const nivel05DeberiaActivarse = data1.pagination.total_matches === 0 && !data1.related_jobs_results;
  console.log('\n🎯 NIVEL 0.5 debería activarse:', nivel05DeberiaActivarse ? 'SÍ' : 'NO');
  console.log('🔴 NIVEL 0.5 se activó:', data1.amplification_used ? 'SÍ' : 'NO ❌');

  if (nivel05DeberiaActivarse && !data1.amplification_used) {
    console.log('\n❌ ERROR: NIVEL 0.5 NO SE ACTIVÓ A PESAR DE CUMPLIR CONDICIONES');
  }

  // Test 2: NIVEL 1.5
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST 2: MANTENIMIENTO TARRAGONA (debería activar NIVEL 1.5)');
  console.log('='.repeat(60));

  const url2 = 'https://job-search-api-psi.vercel.app/api/jobs/search?query=mantenimiento&location=tarragona&limit=10';
  const res2 = await fetch(url2);
  const data2 = await res2.json();

  console.log('\n📊 Respuesta:');
  console.log('  - Total matches:', data2.pagination.total_matches);
  console.log('  - Results:', data2.results.length);
  console.log('  - Amplification used:', data2.amplification_used || 'NINGUNO ❌');
  console.log('  - Related jobs results:', data2.related_jobs_results ? data2.related_jobs_results.length : 'NINGUNO ❌');

  console.log('\n✅ Condiciones para NIVEL 1.5:');
  console.log('  - query presente:', 'mantenimiento ✓');
  console.log('  - location presente:', 'tarragona ✓');
  console.log('  - totalMatches > 0:', data2.pagination.total_matches > 0 ? '✓' : '✗');
  console.log('  - totalMatches < 10:', data2.pagination.total_matches < 10 ? '✓' : '✗');
  console.log('  - startOffset === 0:', '✓');
  console.log('  - !relatedJobsResults:', !data2.related_jobs_results ? '✓' : '✗');

  const nivel15DeberiaActivarse = data2.pagination.total_matches > 0 &&
                                   data2.pagination.total_matches < 10 &&
                                   !data2.related_jobs_results;
  console.log('\n🎯 NIVEL 1.5 debería activarse:', nivel15DeberiaActivarse ? 'SÍ' : 'NO');
  console.log('🔴 NIVEL 1.5 se activó:', data2.amplification_used ? 'SÍ' : 'NO ❌');

  if (nivel15DeberiaActivarse && !data2.amplification_used) {
    console.log('\n❌ ERROR: NIVEL 1.5 NO SE ACTIVÓ A PESAR DE CUMPLIR CONDICIONES');
  }

  // Resumen
  console.log('\n\n' + '='.repeat(60));
  console.log('🔍 RESUMEN DEL PROBLEMA');
  console.log('='.repeat(60));
  console.log('\n1. El código de niveles SÍ está en el repo (commit 78a2b05)');
  console.log('2. Vercel SÍ tiene el deployment nuevo (metadata simplificado)');
  console.log('3. Las condiciones SÍ se cumplen');
  console.log('4. Pero los niveles NO se activan');
  console.log('\n🤔 POSIBLES CAUSAS:');
  console.log('  A) El cache no tiene valid_cities → NIVEL 0.5 se salta');
  console.log('  B) Hay un error en try-catch que se silencia');
  console.log('  C) city_distances.json no tiene las ciudades');
  console.log('  D) dynamic_city_distances.json no tiene las ciudades');
  console.log('\n💡 SIGUIENTE PASO: Agregar logs temporales para ver qué pasa dentro del código');
}

debugNiveles().catch(err => console.error('\n❌ Error:', err.message));
