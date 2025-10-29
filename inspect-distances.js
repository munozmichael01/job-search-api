import fs from 'fs';

const distances = JSON.parse(fs.readFileSync('./data/city_distances.json', 'utf-8'));

console.log('📊 city_distances.json\n');
console.log(`Total ciudades: ${Object.keys(distances).length}\n`);

if (distances.badalona) {
  console.log('🎯 Ciudades cercanas a BADALONA:\n');

  const nearby = Object.entries(distances.badalona)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 15);

  nearby.forEach(([city, dist]) => {
    console.log(`   ${city.padEnd(30)} ${Math.round(dist)} km`);
  });
} else {
  console.log('❌ Badalona no encontrada en el archivo');
}
