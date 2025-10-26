const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('📏 CALCULANDO DISTANCIAS ENTRE CIUDADES\n');
console.log('═'.repeat(60));
console.log('');

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en kilómetros

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Cargar ciudades
console.log('📂 Cargando ciudades de España y Portugal...');

const cities = [];

fs.createReadStream(path.join(__dirname, '../Tablas para cálculo de relaciones/Cities.csv'))
  .pipe(csv())
  .on('data', (row) => {
    cities.push({
      city: row.city,
      city_ascii: row.city_ascii,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      country: row.country,
      admin_name: row.admin_name,
      population: parseInt(row.population) || 0
    });
  })
  .on('end', () => {
    console.log(`   ✅ ${cities.length} ciudades cargadas`);
    console.log('');

    console.log('🔢 Calculando distancias...');
    console.log('   Esto puede tardar 1-2 minutos...\n');

    const distances = {};
    let calculationCount = 0;
    const totalCalculations = cities.length * (cities.length - 1) / 2;

    // Calcular distancias entre todas las ciudades
    for (let i = 0; i < cities.length; i++) {
      const city1 = cities[i];
      const cityName1 = city1.city;

      if (!distances[cityName1]) {
        distances[cityName1] = [];
      }

      for (let j = i + 1; j < cities.length; j++) {
        const city2 = cities[j];
        const cityName2 = city2.city;

        const distance = haversineDistance(
          city1.lat, city1.lng,
          city2.lat, city2.lng
        );

        // Guardar distancia (redondeada a 1 decimal)
        const roundedDistance = Math.round(distance * 10) / 10;

        distances[cityName1].push({
          city: cityName2,
          distance: roundedDistance,
          country: city2.country
        });

        // También guardar la inversa
        if (!distances[cityName2]) {
          distances[cityName2] = [];
        }
        distances[cityName2].push({
          city: cityName1,
          distance: roundedDistance,
          country: city1.country
        });

        calculationCount++;

        // Mostrar progreso cada 50,000 cálculos
        if (calculationCount % 50000 === 0) {
          const progress = ((calculationCount / totalCalculations) * 100).toFixed(1);
          console.log(`   Progreso: ${calculationCount.toLocaleString()}/${totalCalculations.toLocaleString()} (${progress}%)`);
        }
      }
    }

    console.log(`   ✅ ${calculationCount.toLocaleString()} distancias calculadas`);
    console.log('');

    // Ordenar distancias por cercanía (menor a mayor)
    for (const cityName in distances) {
      distances[cityName].sort((a, b) => a.distance - b.distance);
    }

    // Guardar resultado completo
    console.log('💾 Guardando archivos...');

    const dataDir = path.join(__dirname, '../data');
    const outputPathFull = path.join(dataDir, 'city_distances_full.json');

    fs.writeFileSync(outputPathFull, JSON.stringify(distances, null, 2));
    console.log(`   ✅ ${outputPathFull}`);

    // Crear versión optimizada (solo ciudades < 150km)
    console.log('');
    console.log('📦 Creando versión optimizada (distancia < 150km)...');

    const distancesOptimized = {};
    let nearbyCount = 0;

    for (const [cityName, nearCities] of Object.entries(distances)) {
      const nearby = nearCities.filter(c => c.distance <= 150);
      if (nearby.length > 0) {
        distancesOptimized[cityName] = nearby;
        nearbyCount += nearby.length;
      }
    }

    const outputPathOptimized = path.join(dataDir, 'city_distances.json');
    fs.writeFileSync(outputPathOptimized, JSON.stringify(distancesOptimized, null, 2));

    console.log(`   ✅ ${outputPathOptimized}`);
    console.log(`   📊 ${nearbyCount.toLocaleString()} relaciones de cercanía (< 150km)`);
    console.log('');

    // Estadísticas
    console.log('═'.repeat(60));
    console.log('📊 ESTADÍSTICAS');
    console.log('═'.repeat(60));

    const avgNearbyCities = (nearbyCount / Object.keys(distancesOptimized).length).toFixed(1);
    console.log(`Ciudades procesadas: ${cities.length}`);
    console.log(`Distancias calculadas: ${calculationCount.toLocaleString()}`);
    console.log(`Ciudades con vecinas < 150km: ${Object.keys(distancesOptimized).length}`);
    console.log(`Promedio de ciudades cercanas: ${avgNearbyCities}`);
    console.log('');

    // Ejemplos de distancias clave
    console.log('═'.repeat(60));
    console.log('📋 EJEMPLOS DE DISTANCIAS');
    console.log('═'.repeat(60));
    console.log('');

    const examples = [
      { from: 'Madrid', to: 'Toledo' },
      { from: 'Madrid', to: 'Guadalajara' },
      { from: 'Madrid', to: 'Barcelona' },
      { from: 'Barcelona', to: 'Girona' },
      { from: 'Lisbon', to: 'Porto' },
      { from: 'Sevilla', to: 'Málaga' }
    ];

    examples.forEach(({ from, to }) => {
      const fromCity = distances[from];
      if (fromCity) {
        const toCity = fromCity.find(c => c.city === to);
        if (toCity) {
          console.log(`${from} → ${to}: ${toCity.distance} km`);
        }
      }
    });

    console.log('');

    // Ciudades más cercanas a Madrid
    console.log('🏙️  Top 10 ciudades más cercanas a Madrid:');
    if (distances['Madrid']) {
      distances['Madrid'].slice(0, 10).forEach((city, idx) => {
        console.log(`   ${idx + 1}. ${city.city} (${city.distance} km)`);
      });
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log('');
  })
  .on('error', (error) => {
    console.error('❌ Error procesando archivo CSV:', error.message);
    process.exit(1);
  });
