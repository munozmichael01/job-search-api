const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('🏷️  Construyendo mapeo Area ID → Nombre...\n');

const areaNames = {};
let rowCount = 0;

fs.createReadStream(path.join(__dirname, '../Tablas para cálculo de relaciones/Areas.csv'))
  .pipe(csv())
  .on('data', (row) => {
    const areaId = row.IDArea;
    const langId = row.IDSLanguage;
    const name = row.BaseName;

    rowCount++;

    // Solo español (lang=7)
    if (langId === '7') {
      areaNames[areaId] = name;
    }
  })
  .on('end', () => {
    // Crear carpeta data si no existe
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Guardar resultado
    const outputPath = path.join(dataDir, 'area_names.json');
    fs.writeFileSync(outputPath, JSON.stringify(areaNames, null, 2));

    console.log('✅ Mapeo Area → Nombre creado exitosamente');
    console.log(`📊 Filas procesadas: ${rowCount}`);
    console.log(`📊 Áreas únicas en español: ${Object.keys(areaNames).length}`);
    console.log(`📁 Archivo guardado en: ${outputPath}`);
    console.log('');

    console.log('📋 Lista de áreas:');
    Object.entries(areaNames).forEach(([id, name]) => {
      console.log(`   ${id}: ${name}`);
    });
    console.log('');
  })
  .on('error', (error) => {
    console.error('❌ Error procesando archivo CSV:', error.message);
    process.exit(1);
  });
