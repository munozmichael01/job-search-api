const fetch = require('node-fetch');

async function debugTarragona() {
  console.log('🔍 Obteniendo debug logs para "mantenimiento tarragona"...\n');

  const url = 'https://job-search-api-psi.vercel.app/api/jobs/search?query=mantenimiento&location=tarragona&limit=10&debug=true';
  const res = await fetch(url);
  const data = await res.json();

  if (data.debug_logs) {
    console.log('📋 LOGS RELEVANTES:\n');
    data.debug_logs.forEach((log, i) => {
      if (log.includes('NIVEL 1.5') ||
          log.includes('dynamicCityDistances') ||
          log.includes('tarragona') ||
          log.includes('Buscando') ||
          log.includes('Match exacto')) {
        console.log(`[${i.toString().padStart(3, ' ')}] ${log}`);
      }
    });
  } else {
    console.log('⚠️  No hay debug_logs en la respuesta');
    console.log('\nRespuesta completa:', JSON.stringify(data, null, 2).substring(0, 500));
  }
}

debugTarragona().catch(err => console.error('❌ Error:', err.message));
