const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('🌍 Filtrando ciudades de España y Portugal...\n');

const cities = [];
let totalRows = 0;

fs.createReadStream(path.join(__dirname, '../Tablas para cálculo de relaciones/worldcities.csv'))
  .pipe(csv())
  .on('data', (row) => {
    totalRows++;

    // Filtrar solo España y Portugal
    if (row.country === 'Spain' || row.country === 'Portugal') {
      cities.push({
        city: row.city,
        city_ascii: row.city_ascii,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        country: row.country,
        admin_name: row.admin_name,
        population: parseInt(row.population) || 0
      });
    }
  })
  .on('end', () => {
    console.log(`📊 Total de ciudades procesadas: ${totalRows}`);
    console.log(`📊 Ciudades de España y Portugal: ${cities.length}`);
    console.log('');

    // Ordenar por población (mayor a menor)
    cities.sort((a, b) => b.population - a.population);

    // Contar por país
    const spainCities = cities.filter(c => c.country === 'Spain').length;
    const portugalCities = cities.filter(c => c.country === 'Portugal').length;

    console.log(`   España: ${spainCities} ciudades`);
    console.log(`   Portugal: ${portugalCities} ciudades`);
    console.log('');

    // Guardar resultado
    const outputPath = path.join(__dirname, '../Tablas para cálculo de relaciones/Cities.csv');

    // Crear CSV manualmente
    const csvLines = [
      'city,city_ascii,lat,lng,country,admin_name,population'
    ];

    cities.forEach(city => {
      csvLines.push(`"${city.city}","${city.city_ascii}",${city.lat},${city.lng},"${city.country}","${city.admin_name}",${city.population}`);
    });

    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

    console.log('✅ Archivo filtrado guardado exitosamente');
    console.log(`📁 ${outputPath}`);
    console.log('');

    // Mostrar top 10 ciudades por población
    console.log('📋 Top 10 ciudades por población:');
    cities.slice(0, 10).forEach((city, idx) => {
      console.log(`   ${idx + 1}. ${city.city} (${city.country}) - ${city.population.toLocaleString()} hab.`);
    });
    console.log('');

    // Verificar coordenadas de ciudades clave
    console.log('🗺️  Coordenadas de ciudades clave:');
    const keyCities = ['Madrid', 'Barcelona', 'Lisboa', 'Valencia', 'Sevilla', 'Porto'];
    keyCities.forEach(cityName => {
      const city = cities.find(c => c.city === cityName || c.city_ascii === cityName);
      if (city) {
        console.log(`   ${city.city}: ${city.lat}, ${city.lng}`);
      }
    });
    console.log('');
  })
  .on('error', (error) => {
    console.error('❌ Error procesando archivo CSV:', error.message);
    process.exit(1);
  });
