const fetch = require('node-fetch');

async function checkTarragonaOffers() {
  console.log('🔍 Verificando ofertas de mantenimiento en Tarragona...\n');

  const url = 'https://job-search-api-psi.vercel.app/api/jobs/search?query=mantenimiento&location=tarragona&limit=10';
  const res = await fetch(url);
  const data = await res.json();

  console.log(`📊 Total matches: ${data.pagination.total_matches}`);
  console.log(`📊 Results: ${data.results.length}\n`);

  if (data.results.length > 0) {
    console.log('🏢 OFERTAS ENCONTRADAS:\n');
    data.results.forEach((offer, i) => {
      console.log(`[${i + 1}] ${offer.titulo || offer.title}`);
      console.log(`    Ciudad: "${offer.ciudad || offer.city}"`);
      console.log(`    Region: "${offer.region || ''}"`);
      console.log(`    Normalized ciudad: "${(offer.ciudad || offer.city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()}"`);
      console.log();
    });
  }
}

checkTarragonaOffers().catch(err => console.error('❌ Error:', err.message));
