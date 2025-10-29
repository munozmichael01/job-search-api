import fs from 'fs';

const distances = JSON.parse(fs.readFileSync('./data/city_distances.json', 'utf-8'));

console.log('🔍 VERIFICACIÓN: Distancias desde Barcelona\n');
console.log('═══════════════════════════════════════════\n');

if (!distances.Barcelona) {
  console.log('❌ ERROR: Barcelona NO está en el archivo\n');
  console.log('Ciudades disponibles (primeras 20):');
  console.log(Object.keys(distances).slice(0, 20).join(', '));
  process.exit(1);
}

console.log('✅ Barcelona está en el archivo\n');

const fromBarcelona = Object.entries(distances.Barcelona)
  .sort((a, b) => a[1] - b[1])
  .slice(0, 20);

console.log('Las 20 ciudades más cercanas a Barcelona:\n');
fromBarcelona.forEach(([city, dist], i) => {
  const distRounded = Math.round(dist);
  console.log(`${(i+1).toString().padStart(2)}. ${city.padEnd(30)} ${distRounded.toString().padStart(4)} km`);
});

// Verificar distancias conocidas
console.log('\n═══════════════════════════════════════════\n');
console.log('Verificando distancias conocidas:\n');

const checks = [
  { city: 'Badalona', expected: 10 },
  { city: 'Madrid', expected: 621 },
  { city: 'Adeje', expected: 2400 }
];

checks.forEach(({ city, expected }) => {
  const actual = distances.Barcelona[city];
  if (actual) {
    const diff = Math.abs(actual - expected);
    const ok = diff < 50; // Margen de 50km
    console.log(`${ok ? '✅' : '⚠️ '} ${city.padEnd(20)} Real: ${Math.round(actual)} km  Esperado: ~${expected} km`);
  } else {
    console.log(`❌ ${city.padEnd(20)} NO encontrada`);
  }
});
