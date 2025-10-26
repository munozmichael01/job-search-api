const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('🏷️  Construyendo mapeo JobTitle ID → Area ID...\n');

const jobAreas = {};
let rowCount = 0;

fs.createReadStream(path.join(__dirname, '../Tablas para cálculo de relaciones/JobTitles_Areas.csv'))
  .pipe(csv())
  .on('data', (row) => {
    const jobId = row.FK_JobTitleID;
    const areaId = parseInt(row.FK_AreaID);

    rowCount++;
    jobAreas[jobId] = areaId;
  })
  .on('end', () => {
    // Crear carpeta data si no existe
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Guardar resultado
    const outputPath = path.join(dataDir, 'job_areas_map.json');
    fs.writeFileSync(outputPath, JSON.stringify(jobAreas, null, 2));

    console.log('✅ Mapeo JobTitle → Area creado exitosamente');
    console.log(`📊 Asignaciones procesadas: ${rowCount}`);
    console.log(`📊 Puestos con área asignada: ${Object.keys(jobAreas).length}`);
    console.log(`📁 Archivo guardado en: ${outputPath}`);
    console.log('');

    // Contar puestos por área
    const areaCount = {};
    for (const areaId of Object.values(jobAreas)) {
      areaCount[areaId] = (areaCount[areaId] || 0) + 1;
    }

    console.log('📊 Distribución de puestos por área:');
    const sortedAreas = Object.entries(areaCount).sort((a, b) => b[1] - a[1]);
    sortedAreas.slice(0, 10).forEach(([areaId, count]) => {
      console.log(`   Area ${areaId}: ${count} puestos`);
    });
    console.log('');

    // Mostrar ejemplos específicos
    console.log('📋 Ejemplos:');
    console.log(`   Chef (ID 218) → Area ${jobAreas['218']}`);
    console.log(`   Chef Ejecutivo (ID 228) → Area ${jobAreas['228']}`);
    console.log(`   Camarero (ID 669) → Area ${jobAreas['669']}`);
    console.log(`   Recepcionista (ID 591) → Area ${jobAreas['591']}`);
    console.log('');
  })
  .on('error', (error) => {
    console.error('❌ Error procesando archivo CSV:', error.message);
    process.exit(1);
  });
