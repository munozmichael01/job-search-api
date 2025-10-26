const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('🏗️  Construyendo mapeo JobTitle ID → Nombres...\n');

const jobNames = {};
let rowCount = 0;

fs.createReadStream(path.join(__dirname, '../Tablas para cálculo de relaciones/JobTitlesDenominations.csv'))
  .pipe(csv())
  .on('data', (row) => {
    const jobId = row.FK_JobTitle;
    const name = row.Denomination;
    const lang = row.LanguageId;

    rowCount++;

    // Solo español (lang=7)
    if (lang === '7') {
      if (!jobNames[jobId]) {
        jobNames[jobId] = [];
      }
      jobNames[jobId].push(name);
    }
  })
  .on('end', () => {
    // Crear carpeta data si no existe
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Guardar resultado
    const outputPath = path.join(dataDir, 'job_id_to_names.json');
    fs.writeFileSync(outputPath, JSON.stringify(jobNames, null, 2));

    console.log('✅ Mapeo JobTitle ID → Nombres creado exitosamente');
    console.log(`📊 Filas procesadas: ${rowCount}`);
    console.log(`📊 Puestos únicos con nombres en español: ${Object.keys(jobNames).length}`);
    console.log(`📁 Archivo guardado en: ${outputPath}`);
    console.log('');

    // Mostrar ejemplo
    const exampleId = Object.keys(jobNames)[0];
    console.log(`📋 Ejemplo - JobTitle ID ${exampleId}:`);
    console.log(JSON.stringify(jobNames[exampleId], null, 2));
    console.log('');
  })
  .on('error', (error) => {
    console.error('❌ Error procesando archivo CSV:', error.message);
    process.exit(1);
  });
