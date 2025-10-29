import https from 'https';

const url = 'https://job-search-api-psi.vercel.app/api/jobs/search?query=camarero&location=badalona&limit=5';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);

    console.log('\n🔍 VERIFICACIÓN: ¿El API devuelve nearby_cities?\n');
    console.log('═══════════════════════════════════════════\n');
    console.log(`📊 Total matches: ${json.pagination?.total_matches || 0}`);
    console.log(`📦 Returned results: ${json.pagination?.returned_results || 0}\n`);

    if (json.nearby_cities && json.nearby_cities.length > 0) {
      console.log(`✅ SÍ tiene nearby_cities: ${json.nearby_cities.length} ciudades\n`);
      json.nearby_cities.forEach((city, i) => {
        console.log(`   ${i+1}. ${city.city_name} (${city.distance || 'N/A'}) - ${city.results?.length || 0} ofertas`);
      });
    } else {
      console.log('❌ NO tiene nearby_cities en la respuesta del API');
      console.log('   El enriquecimiento de nearby_cities NO está funcionando\n');
    }

    console.log('\n═══════════════════════════════════════════\n');
    console.log('📋 Estructura de la respuesta:');
    console.log(JSON.stringify(json, null, 2).substring(0, 500) + '...\n');
  });
});
