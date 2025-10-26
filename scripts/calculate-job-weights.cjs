const fs = require('fs');
const path = require('path');
const { getLevel, levenshteinSimilarity } = require('./job-weights-helpers.cjs');

console.log('⚖️  CALCULANDO PESOS DE RELACIONES ENTRE PUESTOS\n');
console.log('═'.repeat(60));
console.log('');

// Cargar datos de preparación
console.log('📂 Cargando archivos de datos...');

const dataDir = path.join(__dirname, '../data');

const jobNames = JSON.parse(fs.readFileSync(path.join(dataDir, 'job_id_to_names.json')));
const graph = JSON.parse(fs.readFileSync(path.join(dataDir, 'job_relationships_graph.json')));
const jobAreas = JSON.parse(fs.readFileSync(path.join(dataDir, 'job_areas_map.json')));
const areaNames = JSON.parse(fs.readFileSync(path.join(dataDir, 'area_names.json')));

console.log(`   ✅ job_id_to_names.json (${Object.keys(jobNames).length} puestos)`);
console.log(`   ✅ job_relationships_graph.json (${Object.keys(graph).length} puestos con relaciones)`);
console.log(`   ✅ job_areas_map.json (${Object.keys(jobAreas).length} asignaciones)`);
console.log(`   ✅ area_names.json (${Object.keys(areaNames).length} áreas)`);
console.log('');

/**
 * Calcula el peso de similitud entre dos puestos
 */
function calculateWeight(job1Id, job2Id) {
  const names1 = jobNames[job1Id] || [];
  const names2 = jobNames[job2Id] || [];

  // 1. Verificar si existe relación en el grafo
  const relationshipExists = graph[job1Id]?.includes(parseInt(job2Id));
  if (!relationshipExists) {
    return 0.0;
  }

  // 2. Base
  let weight = 0.50;

  // 3. Bonus por MISMA ÁREA (+0.30)
  const area1 = jobAreas[job1Id];
  const area2 = jobAreas[job2Id];
  if (area1 && area2 && area1 === area2) {
    weight += 0.30;
  }

  // 4. Bonus por NIVEL JERÁRQUICO (0.05 - 0.15)
  const level1 = getLevel(names1);
  const level2 = getLevel(names2);
  const levelDiff = Math.abs(level1 - level2);

  if (levelDiff === 0) {
    weight += 0.15;
  } else if (levelDiff === 1) {
    weight += 0.10;
  } else if (levelDiff === 2) {
    weight += 0.05;
  }

  // 5. Bonus por SIMILITUD DE NOMBRE (0.00 - 0.10)
  if (names1.length > 0 && names2.length > 0) {
    const similarity = levenshteinSimilarity(names1, names2);
    weight += similarity * 0.10;
  }

  // 6. Normalizar
  return Math.min(1.00, Math.max(0.00, parseFloat(weight.toFixed(2))));
}

console.log('🔢 Calculando pesos para todas las relaciones...\n');

const weights = {};
const weightsByArea = {};
let totalRelations = 0;
let processedJobs = 0;

// Construir objeto de pesos
for (const [jobId, relatedIds] of Object.entries(graph)) {
  processedJobs++;

  const jobNamesArray = jobNames[jobId] || [];
  const primaryName = jobNamesArray[0] || `Job_${jobId}`;
  const jobAreaId = jobAreas[jobId];
  const jobAreaName = areaNames[jobAreaId] || 'Sin área';

  weights[primaryName] = relatedIds
    .map(relatedId => {
      const relatedNames = jobNames[relatedId] || [];
      const relatedPrimaryName = relatedNames[0] || `Job_${relatedId}`;
      const relatedAreaId = jobAreas[relatedId];
      const relatedAreaName = areaNames[relatedAreaId] || 'Sin área';
      const weight = calculateWeight(jobId, String(relatedId));

      totalRelations++;

      return {
        job: relatedPrimaryName,
        weight: weight,
        jobId: relatedId,
        area: relatedAreaName,
        sameArea: jobAreaId === relatedAreaId
      };
    })
    .filter(rel => rel.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  // Agrupar por área
  if (!weightsByArea[jobAreaName]) {
    weightsByArea[jobAreaName] = {};
  }
  weightsByArea[jobAreaName][primaryName] = weights[primaryName];

  // Mostrar progreso cada 100 puestos
  if (processedJobs % 100 === 0) {
    console.log(`   Procesados: ${processedJobs}/${Object.keys(graph).length} puestos...`);
  }
}

console.log(`   Procesados: ${processedJobs}/${Object.keys(graph).length} puestos ✅`);
console.log('');

// Guardar resultados
console.log('💾 Guardando archivos de salida...');

const outputPath1 = path.join(dataDir, 'job_weights.json');
const outputPath2 = path.join(dataDir, 'job_weights_by_area.json');

fs.writeFileSync(outputPath1, JSON.stringify(weights, null, 2));
fs.writeFileSync(outputPath2, JSON.stringify(weightsByArea, null, 2));

console.log(`   ✅ ${outputPath1}`);
console.log(`   ✅ ${outputPath2}`);
console.log('');

// Estadísticas finales
console.log('═'.repeat(60));
console.log('📊 ESTADÍSTICAS FINALES');
console.log('═'.repeat(60));
console.log(`✅ Total de puestos procesados: ${Object.keys(weights).length}`);
console.log(`✅ Total de relaciones calculadas: ${totalRelations}`);
console.log(`✅ Relaciones con peso > 0: ${Object.values(weights).reduce((sum, arr) => sum + arr.length, 0)}`);
console.log(`✅ Áreas procesadas: ${Object.keys(weightsByArea).length}`);
console.log('');

// Distribución de pesos
const weightDistribution = {
  '0.90-1.00': 0,
  '0.80-0.89': 0,
  '0.70-0.79': 0,
  '0.60-0.69': 0,
  '0.50-0.59': 0
};

for (const relations of Object.values(weights)) {
  for (const rel of relations) {
    const w = rel.weight;
    if (w >= 0.90) weightDistribution['0.90-1.00']++;
    else if (w >= 0.80) weightDistribution['0.80-0.89']++;
    else if (w >= 0.70) weightDistribution['0.70-0.79']++;
    else if (w >= 0.60) weightDistribution['0.60-0.69']++;
    else if (w >= 0.50) weightDistribution['0.50-0.59']++;
  }
}

const totalWeights = Object.values(weightDistribution).reduce((sum, count) => sum + count, 0);

console.log('📈 DISTRIBUCIÓN DE PESOS:');
for (const [range, count] of Object.entries(weightDistribution)) {
  const pct = ((count / totalWeights) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(pct / 2));
  console.log(`   ${range}: ${count.toString().padStart(5)} (${pct.padStart(5)}%) ${bar}`);
}
console.log('');

// Mostrar ejemplos por área
console.log('═'.repeat(60));
console.log('📋 EJEMPLOS POR ÁREA');
console.log('═'.repeat(60));
console.log('');

const areasToShow = ['Cocina', 'Sala', 'Recepción', 'Pisos y Limpieza', 'Dirección'];

for (const areaName of areasToShow) {
  if (weightsByArea[areaName]) {
    const jobs = Object.keys(weightsByArea[areaName]);
    if (jobs.length > 0) {
      const exampleJob = jobs[0];
      console.log(`🏷️  ${areaName.toUpperCase()}`);
      console.log(`   "${exampleJob}" relacionado con:`);
      weightsByArea[areaName][exampleJob].slice(0, 5).forEach(rel => {
        const sameAreaIcon = rel.sameArea ? '✅' : '⚠️ ';
        console.log(`   - ${rel.job} (${rel.weight}) ${sameAreaIcon} ${rel.area}`);
      });
      console.log('');
    }
  }
}

console.log('═'.repeat(60));
console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
console.log('═'.repeat(60));
console.log('');
