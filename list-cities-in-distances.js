import fs from 'fs';

const distances = JSON.parse(fs.readFileSync('./data/city_distances.json', 'utf-8'));

const cities = Object.keys(distances).sort();

console.log(`Total: ${cities.length} ciudades\n`);
console.log('Primeras 50 ciudades:\n');
cities.slice(0, 50).forEach((city, i) => {
  console.log(`${(i+1).toString().padStart(3)}. ${city}`);
});

// Buscar variaciones de badalona
console.log('\n\nBuscando "badalona", "barcelona" y similares:\n');
const matches = cities.filter(c =>
  c.includes('bad') ||
  c.includes('barc') ||
  c.includes('hospi') ||
  c.includes('santa coloma') ||
  c.includes('sant cugat')
);
matches.forEach(city => console.log(`   ✓ ${city}`));
