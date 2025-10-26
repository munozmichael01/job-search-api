const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

console.log('🔗 Construyendo grafo de relaciones...\n');

const graph = {};
let rowCount = 0;

fs.createReadStream(path.join(__dirname, '../Tablas para cálculo de relaciones/JobTitlesRelationships.csv'))
  .pipe(csv())
  .on('data', (row) => {
    const from = row.FK_JobTitleID;
    const to = row.FK_JobTitleRelatedID;

    rowCount++;

    if (!graph[from]) {
      graph[from] = [];
    }
    graph[from].push(parseInt(to));
  })
  .on('end', () => {
    // Crear carpeta data si no existe
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Guardar resultado
    const outputPath = path.join(dataDir, 'job_relationships_graph.json');
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));

    console.log('✅ Grafo de relaciones creado exitosamente');
    console.log(`📊 Relaciones procesadas: ${rowCount}`);
    console.log(`📊 Puestos con relaciones: ${Object.keys(graph).length}`);
    console.log(`📁 Archivo guardado en: ${outputPath}`);
    console.log('');

    // Mostrar ejemplo
    const exampleId = Object.keys(graph)[0];
    console.log(`📋 Ejemplo - JobTitle ID ${exampleId} relacionado con:`);
    console.log(JSON.stringify(graph[exampleId].slice(0, 10), null, 2));
    console.log(`   ... y ${graph[exampleId].length - 10} más`);
    console.log('');
  })
  .on('error', (error) => {
    console.error('❌ Error procesando archivo CSV:', error.message);
    process.exit(1);
  });
