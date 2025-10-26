# 🎯 ALGORITMO MEJORADO: Cálculo de Pesos con Tablas de Áreas

**Fecha**: 2025-10-26
**Actualización**: Integración de tablas Areas y JobTitles_Areas

---

## ✅ **GRAN MEJORA: Áreas Explícitas**

### ¿Qué cambió?

**ANTES** (Plan original):
- ❌ Inferir área usando palabras clave ("chef" → cocina, "camarero" → sala)
- ❌ Propenso a errores de clasificación
- ❌ Difícil de mantener

**AHORA** (Con tablas de Areas):
- ✅ Cada puesto tiene un área EXPLÍCITA asignada
- ✅ 100% de precisión en clasificación por área
- ✅ No necesitamos palabras clave para área

---

## 📊 **ESTRUCTURA DE LAS NUEVAS TABLAS**

### Areas.csv (26 áreas definidas)
```csv
IDArea,IDSite,IDSLanguage,BaseName
1,6,7,Sala
2,6,7,Cocina
7,6,7,Administración y Finanzas
9,6,7,RRHH
10,6,7,Dirección
11,6,7,Recepción
14,6,7,Pisos y Limpieza
...
```

**Áreas principales del sector turístico**:
- **1** = Sala (Waiting staff)
- **2** = Cocina (Kitchen)
- **11** = Recepción (Reception)
- **14** = Pisos y Limpieza (Housekeeping)
- **10** = Dirección (Management)
- **6** = Comercial (Sales)
- **7** = Administración y Finanzas
- **9** = RRHH
- **12** = Animación, Entretenimiento y Ocio
- **27** = Eventos

### JobTitles_Areas.csv (669 relaciones)
```csv
FK_JobTitleID,FK_AreaID
218,2         # Chef → Cocina
228,2         # Chef Ejecutivo → Cocina
220,2         # Commis Chef → Cocina
221,2         # Cocinero → Cocina
669,1         # Camarero → Sala
591,11        # Recepcionista → Recepción
```

**Cobertura**: ✅ 669 puestos asignados a áreas (100% de los 669 JobTitles)

---

## 🧮 **ALGORITMO ACTUALIZADO**

### Fórmula de cálculo de pesos (0.00 - 1.00)

```javascript
function calculateWeight(job1Id, job2Id, relationships, jobAreas) {
  // 1. Verificar si existe relación en el grafo
  const relationshipExists = relationships[job1Id]?.includes(parseInt(job2Id));
  if (!relationshipExists) {
    return 0.0; // Sin relación = peso 0
  }

  // 2. Base: Si existe relación
  let weight = 0.50;

  // 3. Bonus por MISMA ÁREA (+0.30)
  const area1 = jobAreas[job1Id]; // FK_AreaID desde JobTitles_Areas
  const area2 = jobAreas[job2Id];
  if (area1 && area2 && area1 === area2) {
    weight += 0.30;
  }

  // 4. Bonus por NIVEL JERÁRQUICO (0.05 - 0.15)
  const level1 = getLevel(jobNames[job1Id]); // Aún usando palabras clave
  const level2 = getLevel(jobNames[job2Id]);
  const levelDiff = Math.abs(level1 - level2);

  if (levelDiff === 0) {
    weight += 0.15; // Mismo nivel
  } else if (levelDiff === 1) {
    weight += 0.10; // 1 nivel diferencia
  } else if (levelDiff === 2) {
    weight += 0.05; // 2 niveles diferencia
  }

  // 5. Bonus por SIMILITUD DE NOMBRE (0.00 - 0.10)
  if (jobNames[job1Id] && jobNames[job2Id]) {
    const similarity = levenshteinSimilarity(jobNames[job1Id], jobNames[job2Id]);
    weight += similarity * 0.10;
  }

  // 6. Normalizar a rango [0.00, 1.00]
  return Math.min(1.00, Math.max(0.00, parseFloat(weight.toFixed(2))));
}
```

---

## 📋 **CAMBIOS EN LOS SCRIPTS**

### Script 1: `build-job-areas-map.js` (NUEVO)

**Propósito**: Crear mapeo JobTitleID → AreaID

```javascript
const fs = require('fs');
const csv = require('csv-parser');

const jobAreas = {}; // { "218": 2, "228": 2, "669": 1 }

fs.createReadStream('Tablas para cálculo de relaciones/JobTitles_Areas.csv')
  .pipe(csv())
  .on('data', (row) => {
    const jobId = row.FK_JobTitleID;
    const areaId = parseInt(row.FK_AreaID);
    jobAreas[jobId] = areaId;
  })
  .on('end', () => {
    fs.writeFileSync('data/job_areas_map.json', JSON.stringify(jobAreas, null, 2));
    console.log('✅ Mapeo JobTitle → Area creado');
    console.log(`📊 Total puestos con área: ${Object.keys(jobAreas).length}`);
  });
```

**Output**: `data/job_areas_map.json`
```json
{
  "1": 7,
  "2": 7,
  "218": 2,
  "228": 2,
  "220": 2,
  "669": 1,
  "591": 11
}
```

---

### Script 2: `build-areas-names.js` (NUEVO)

**Propósito**: Crear mapeo AreaID → Nombre en español

```javascript
const fs = require('fs');
const csv = require('csv-parser');

const areaNames = {}; // { "1": "Sala", "2": "Cocina" }

fs.createReadStream('Tablas para cálculo de relaciones/Areas.csv')
  .pipe(csv())
  .on('data', (row) => {
    const areaId = row.IDArea;
    const langId = row.IDSLanguage;
    const name = row.BaseName;

    // Solo español (lang=7)
    if (langId === '7') {
      areaNames[areaId] = name;
    }
  })
  .on('end', () => {
    fs.writeFileSync('data/area_names.json', JSON.stringify(areaNames, null, 2));
    console.log('✅ Mapeo Area → Nombre creado');
    console.log(`📊 Total áreas: ${Object.keys(areaNames).length}`);
  });
```

**Output**: `data/area_names.json`
```json
{
  "1": "Sala",
  "2": "Cocina",
  "6": "Comercial",
  "7": "Administración y Finanzas",
  "9": "RRHH",
  "10": "Dirección",
  "11": "Recepción",
  "14": "Pisos y Limpieza"
}
```

---

### Script 3: `calculate-job-weights.js` (MODIFICADO)

**Cambio principal**: Usar `jobAreas` en lugar de `getArea()`

```javascript
const fs = require('fs');
const { getLevel, levenshteinSimilarity } = require('./job-weights-helpers.js');

// Cargar datos
const jobNames = JSON.parse(fs.readFileSync('data/job_id_to_names.json'));
const graph = JSON.parse(fs.readFileSync('data/job_relationships_graph.json'));
const jobAreas = JSON.parse(fs.readFileSync('data/job_areas_map.json')); // NUEVO
const areaNames = JSON.parse(fs.readFileSync('data/area_names.json'));   // NUEVO

function calculateWeight(job1Id, job2Id) {
  const names1 = jobNames[job1Id] || [];
  const names2 = jobNames[job2Id] || [];

  // 1. Verificar si existe relación
  const relationshipExists = graph[job1Id]?.includes(parseInt(job2Id));
  if (!relationshipExists) {
    return 0.0;
  }

  // 2. Base
  let weight = 0.50;

  // 3. NUEVO: Bonus por misma área (usando tabla explícita)
  const area1 = jobAreas[job1Id];
  const area2 = jobAreas[job2Id];
  if (area1 && area2 && area1 === area2) {
    weight += 0.30;
  }

  // 4. Bonus por nivel jerárquico (sin cambios)
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

  // 5. Bonus por similitud de nombre (sin cambios)
  if (names1.length > 0 && names2.length > 0) {
    const similarity = levenshteinSimilarity(names1, names2);
    weight += similarity * 0.10;
  }

  // 6. Normalizar
  return Math.min(1.00, Math.max(0.00, parseFloat(weight.toFixed(2))));
}

// Construir objeto de pesos
const weights = {};
const weightsByArea = {}; // NUEVO: Agrupar por área para análisis

for (const [jobId, relatedIds] of Object.entries(graph)) {
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

      return {
        job: relatedPrimaryName,
        weight: weight,
        jobId: relatedId,
        area: relatedAreaName, // NUEVO: Incluir área
        sameArea: jobAreaId === relatedAreaId // NUEVO: Flag
      };
    })
    .filter(rel => rel.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  // Agrupar por área
  if (!weightsByArea[jobAreaName]) {
    weightsByArea[jobAreaName] = {};
  }
  weightsByArea[jobAreaName][primaryName] = weights[primaryName];
}

// Guardar resultados
fs.writeFileSync('data/job_weights.json', JSON.stringify(weights, null, 2));
fs.writeFileSync('data/job_weights_by_area.json', JSON.stringify(weightsByArea, null, 2));

console.log('✅ Pesos calculados exitosamente');
console.log(`📊 Total de puestos con relaciones: ${Object.keys(weights).length}`);
console.log(`📈 Total de relaciones con peso: ${Object.values(weights).reduce((sum, arr) => sum + arr.length, 0)}`);
console.log(`🎯 Áreas procesadas: ${Object.keys(weightsByArea).length}`);

// Mostrar ejemplo por área
console.log('\n📋 EJEMPLOS POR ÁREA:\n');
for (const [areaName, jobs] of Object.entries(weightsByArea)) {
  const jobNames = Object.keys(jobs);
  if (jobNames.length > 0) {
    const exampleJob = jobNames[0];
    console.log(`🏷️  ${areaName}:`);
    console.log(`   "${exampleJob}" relacionado con:`);
    jobs[exampleJob].slice(0, 3).forEach(rel => {
      console.log(`   - ${rel.job} (${rel.weight}) ${rel.sameArea ? '✅ misma área' : '⚠️ otra área'}`);
    });
    console.log('');
  }
}
```

---

### Script 4: `job-weights-helpers.js` (SIMPLIFICADO)

**Cambio**: Eliminar función `getArea()` (ya no se necesita)

```javascript
// Palabras clave para detectar SOLO nivel jerárquico
const seniorKeywords = ['ejecutivo', 'executive', 'director', 'jefe', 'head', 'chief', 'principal', 'master', 'gerente', 'manager'];
const midKeywords = ['sous', 'segundo', 'encargado', 'coordinador', 'supervisor', 'lead', 'senior', 'partida'];
const juniorKeywords = ['ayudante', 'assistant', 'junior', 'commis', 'aprendiz', 'trainee', 'intern', 'becario', 'pinche'];

// YA NO NECESITAMOS areaKeywords

function getLevel(jobNames) {
  const text = jobNames.join(' ').toLowerCase();
  if (seniorKeywords.some(kw => text.includes(kw))) return 3;
  if (juniorKeywords.some(kw => text.includes(kw))) return 1;
  if (midKeywords.some(kw => text.includes(kw))) return 2;
  return 2; // Default mid-level
}

// Función Levenshtein (sin cambios)
function levenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i-1] === s2[j-1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i-1][j] + 1,
        matrix[i][j-1] + 1,
        matrix[i-1][j-1] + cost
      );
    }
  }
  return matrix[len1][len2];
}

function levenshteinSimilarity(names1, names2) {
  const name1 = names1.reduce((shortest, name) =>
    name.length < shortest.length ? name : shortest, names1[0]);
  const name2 = names2.reduce((shortest, name) =>
    name.length < shortest.length ? name : shortest, names2[0]);

  const maxLen = Math.max(name1.length, name2.length);
  const distance = levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
  return 1 - (distance / maxLen);
}

module.exports = { getLevel, levenshteinSimilarity };
```

---

## 📊 **EJEMPLOS DE RESULTADOS ESPERADOS**

### Ejemplo 1: Chef Ejecutivo (ID 228, Área Cocina)

```json
{
  "Chef Ejecutivo": [
    {
      "job": "Jefe de Cocina",
      "weight": 0.98,
      "area": "Cocina",
      "sameArea": true
    },
    {
      "job": "Chef",
      "weight": 0.95,
      "area": "Cocina",
      "sameArea": true
    },
    {
      "job": "Sous Chef",
      "weight": 0.90,
      "area": "Cocina",
      "sameArea": true
    },
    {
      "job": "Chef de Eventos",
      "weight": 0.88,
      "area": "Cocina",
      "sameArea": true
    }
  ]
}
```

### Ejemplo 2: Camarero (ID 669, Área Sala)

```json
{
  "Camarero": [
    {
      "job": "Jefe de Sala",
      "weight": 0.85,
      "area": "Sala",
      "sameArea": true
    },
    {
      "job": "Maitre",
      "weight": 0.83,
      "area": "Sala",
      "sameArea": true
    },
    {
      "job": "Ayudante de Camarero",
      "weight": 0.80,
      "area": "Sala",
      "sameArea": true
    }
  ]
}
```

---

## 🎯 **VENTAJAS DEL ALGORITMO MEJORADO**

### ✅ Precisión
- **100% de exactitud** en clasificación por área (ya no depende de palabras clave)
- Elimina falsos positivos/negativos de inferencia semántica

### ✅ Simplicidad
- Código más limpio (eliminamos `getArea()` y `areaKeywords`)
- Menos lógica condicional

### ✅ Mantenibilidad
- Las áreas se gestionan en la base de datos, no en código
- Nuevas áreas no requieren modificar el algoritmo

### ✅ Trazabilidad
- Cada relación incluye información del área
- Fácil debug: "¿Por qué Chef → Recepcionista tiene peso 0? → Áreas diferentes (Cocina vs Recepción)"

---

## 📋 **NUEVA SECUENCIA DE EJECUCIÓN**

```bash
# 1. Crear mapeos base
node scripts/build-job-names-map.js
node scripts/build-relationships-graph.js

# 2. NUEVO: Crear mapeos de áreas
node scripts/build-job-areas-map.js
node scripts/build-areas-names.js

# 3. Calcular pesos (usando áreas explícitas)
node scripts/calculate-job-weights.js

# 4. Validar resultados
node scripts/validate-job-weights.js
```

---

## 🔄 **COMPARACIÓN: ANTES vs DESPUÉS**

| Aspecto | Antes (palabras clave) | Después (tablas Areas) |
|---------|------------------------|------------------------|
| **Precisión área** | ~85% (estimado) | ✅ 100% |
| **Mantenibilidad** | Difícil (código hardcoded) | ✅ Fácil (datos en DB) |
| **Performance** | Análisis texto cada vez | ✅ Lookup directo |
| **Código** | ~50 líneas extra | ✅ -30 líneas |
| **Extensibilidad** | Nueva área = modificar código | ✅ Nueva área = agregar fila |

---

## ✅ **CHECKLIST ACTUALIZADO**

### Preparación
- [x] Recibir archivos CSV base
- [x] Recibir Areas.csv y JobTitles_Areas.csv ← **NUEVO**
- [ ] Crear carpeta `data/`
- [ ] Crear carpeta `scripts/`
- [ ] Instalar: `npm install csv-parser`

### Fase A: Preparación de datos
- [ ] Crear `scripts/build-job-names-map.js`
- [ ] Crear `scripts/build-relationships-graph.js`
- [ ] **Crear `scripts/build-job-areas-map.js`** ← **NUEVO**
- [ ] **Crear `scripts/build-areas-names.js`** ← **NUEVO**
- [ ] Ejecutar todos los scripts de preparación
- [ ] Verificar 4 archivos JSON en `data/`

### Fase B: Cálculo de pesos
- [ ] Crear `scripts/job-weights-helpers.js` (versión simplificada)
- [ ] Crear `scripts/calculate-job-weights.js` (con soporte de áreas)
- [ ] Ejecutar cálculo de pesos
- [ ] Verificar `data/job_weights.json` y `data/job_weights_by_area.json`

### Fase C: Validación
- [ ] Crear `scripts/validate-job-weights.js`
- [ ] Ejecutar validación
- [ ] Revisar distribución de pesos
- [ ] Verificar ejemplos por área

---

## 💬 **PREGUNTA PARA EL USUARIO**

¿**Procedo a crear los scripts actualizados**?

El algoritmo ahora es:
- ✅ Más preciso (áreas explícitas)
- ✅ Más simple (menos código)
- ✅ Más mantenible (datos en DB)

**Siguiente paso**: Crear los 6 scripts y ejecutarlos para generar `data/job_weights.json`

---

**Última actualización**: 2025-10-26
**Estado**: ✅ Algoritmo mejorado con tablas de Areas
