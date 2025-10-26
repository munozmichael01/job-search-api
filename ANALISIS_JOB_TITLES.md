# 🔍 ANÁLISIS: Estructura de Job Titles y Plan de Cálculo de Pesos

**Fecha**: 2025-10-26
**Ubicación**: `C:\Dev\job-search-api\Tablas para cálculo de relaciones\`

---

## 📊 1. ESTRUCTURA DE LAS TABLAS

### Tabla: JobTitles.csv
- **Registros**: 669 puestos únicos (670 líneas - 1 header)
- **Campos**:
  - `ID` (PK): Identificador único del puesto
- **Propósito**: Catálogo maestro de puestos (sin nombres, solo IDs)

### Tabla: JobTitlesDenominations.csv
- **Registros**: 24,780 denominaciones (múltiples por puesto)
- **Campos**:
  - `ID` (PK): Identificador de la denominación
  - `Denomination`: Nombre del puesto en un idioma específico
  - `FK_JobTitle` (FK): Apunta a JobTitles.ID
  - `LanguageId`: Idioma de la denominación
    - `7` = Español
    - `14` = Inglés
    - `17` = Portugués
- **Propósito**: Nombres/sinónimos de cada puesto en múltiples idiomas

**Ejemplo de multiplicidad**:
```
FK_JobTitle=1 (Contable):
- ID=1, "Contable", Lang=7 (es)
- ID=2, "Accountant", Lang=14 (en)
- ID=3, "Contabilista", Lang=17 (pt)

FK_JobTitle=218 (Chef):
- ID=559, "Chef", Lang=7
- ID=8126, "Cocinero principal", Lang=7
- ID=8127, "Jefe de Cocina", Lang=7
- ID=8128, "Jefe/a de Cocina", Lang=7
- ID=8129, "Capitán de Cocina", Lang=7
- ID=8130, "Encargado de Cocina", Lang=7
- ID=8134, "Head Chef", Lang=7
- ID=8135, "Chef de Cuisine", Lang=7
- ... (muchas variantes del mismo concepto)
```

### Tabla: JobTitlesRelationships.csv
- **Registros**: 15,320 relaciones (grafo de puestos relacionados)
- **Campos**:
  - `FK_JobTitleID` (FK): Puesto origen
  - `FK_JobTitleRelatedID` (FK): Puesto destino
  - `Priority`: Peso/prioridad de la relación (actualmente **NULL** en todos los registros)
- **Propósito**: Definir qué puestos están relacionados entre sí
- **Tipo**: Grafo dirigido (puede ser bidireccional)

**Ejemplo de relaciones** (Chef Ejecutivo ID=228):
```
228 → 218 (Chef / Jefe de Cocina)
228 → 220 (Commis Chef / Chef Junior)
228 → 221 (Cocinero)
228 → 209 (Chef Panadero)
228 → 213 (Chef de Eventos)
228 → 227 (Chef Entremetier)
...
```

---

## 🎯 2. OBJETIVO DEL ANÁLISIS

**Problema**:
- Tenemos 15,320 relaciones entre puestos
- Todas tienen `Priority = NULL`
- Necesitamos calcular un **peso de similitud** (0.00 - 1.00) para cada relación

**Resultado esperado**:
Archivo `data/job_weights.json` con estructura:
```json
{
  "Chef": [
    {"job": "Jefe de Cocina", "weight": 0.98},
    {"job": "Sous Chef", "weight": 0.90},
    {"job": "Chef Ejecutivo", "weight": 0.95},
    {"job": "Cocinero", "weight": 0.70}
  ],
  "Camarero": [
    {"job": "Jefe de Sala", "weight": 0.85},
    {"job": "Ayudante de Camarero", "weight": 0.75}
  ]
}
```

---

## 🧮 3. ALGORITMO PROPUESTO PARA CALCULAR PESOS

### 3.1. Factores que influyen en el peso

Dado que NO tenemos información explícita de:
- Área (cocina, sala, recepción)
- Nivel jerárquico (junior, mid, senior)
- Sector (hotel, restaurante)

Tendremos que **inferir** estos factores usando:

#### A) **Análisis semántico del nombre**
```javascript
// Palabras clave que indican nivel jerárquico
const seniorKeywords = [
  'ejecutivo', 'executive', 'director', 'jefe', 'head',
  'chief', 'principal', 'master', 'gerente', 'manager'
];

const midKeywords = [
  'sous', 'segundo', 'encargado', 'coordinador',
  'supervisor', 'lead', 'senior'
];

const juniorKeywords = [
  'ayudante', 'assistant', 'junior', 'commis',
  'aprendiz', 'trainee', 'intern', 'becario'
];

// Palabras clave para identificar área
const areaKeywords = {
  cocina: ['chef', 'cocinero', 'cook', 'panadero', 'baker',
           'repostero', 'pastry', 'entremetier', 'saucier'],
  sala: ['camarero', 'waiter', 'sommelier', 'maitre',
         'barista', 'bartender', 'bar'],
  recepcion: ['recepcionista', 'receptionist', 'conserje',
              'concierge', 'porter'],
  housekeeping: ['gobernanta', 'housekeeper', 'camarera',
                 'limpieza', 'houseman'],
  gestion: ['manager', 'director', 'gerente', 'rrhh',
            'recursos humanos', 'comercial']
};
```

#### B) **Distancia en el grafo**
- Relación directa (1 salto) → Mayor peso base
- Relación indirecta (2+ saltos) → Menor peso
- Sin relación en el grafo → Weight = 0

#### C) **Similitud de nombres (distancia de Levenshtein)**
```javascript
// "Chef" vs "Chef Ejecutivo" → alta similitud
// "Chef" vs "Camarero" → baja similitud
```

### 3.2. Fórmula de cálculo propuesta

```javascript
function calculateWeight(job1, job2, relationshipExists) {
  let weight = 0.0;

  // 1. Si NO hay relación en el grafo, peso = 0
  if (!relationshipExists) {
    return 0.0;
  }

  // 2. Base: Si existe relación, empezamos con 0.50
  weight = 0.50;

  // 3. Bonus por misma área (+0.30)
  if (sameArea(job1, job2)) {
    weight += 0.30;
  }

  // 4. Bonus/penalty por nivel jerárquico
  const levelDiff = Math.abs(getLevel(job1) - getLevel(job2));
  if (levelDiff === 0) {
    weight += 0.15; // Mismo nivel
  } else if (levelDiff === 1) {
    weight += 0.10; // 1 nivel de diferencia
  } else if (levelDiff === 2) {
    weight += 0.05; // 2 niveles
  }
  // 3+ niveles: no bonus

  // 5. Bonus por similitud de nombre (0.00 - 0.10)
  const nameSimilarity = levenshteinSimilarity(job1, job2);
  weight += nameSimilarity * 0.10;

  // 6. Normalizar a rango 0.00 - 1.00
  return Math.min(1.00, Math.max(0.00, weight));
}

// Niveles jerárquicos
function getLevel(jobName) {
  if (matchesKeywords(jobName, seniorKeywords)) return 3;
  if (matchesKeywords(jobName, midKeywords)) return 2;
  if (matchesKeywords(jobName, juniorKeywords)) return 1;
  return 2; // Default: mid-level
}
```

### 3.3. Ejemplos de cálculo

```
Caso 1: "Chef Ejecutivo" → "Jefe de Cocina"
- Relación existe: ✅ (base = 0.50)
- Misma área (cocina): ✅ (+0.30)
- Nivel: ambos senior (3-3=0): (+0.15)
- Similitud nombre: alta (~0.08)
→ PESO = 0.50 + 0.30 + 0.15 + 0.08 = 1.00 (cap 1.00)

Caso 2: "Chef" → "Commis Chef"
- Relación existe: ✅ (base = 0.50)
- Misma área (cocina): ✅ (+0.30)
- Nivel: senior vs junior (3-1=2): (+0.05)
- Similitud nombre: media (~0.06)
→ PESO = 0.50 + 0.30 + 0.05 + 0.06 = 0.91

Caso 3: "Chef" → "Camarero"
- Relación existe: ❌
→ PESO = 0.00 (no hay relación en el grafo)

Caso 4: "Chef de Eventos" → "Chef Panadero"
- Relación existe: ✅ (base = 0.50)
- Misma área (cocina): ✅ (+0.30)
- Nivel: ambos mid (2-2=0): (+0.15)
- Similitud nombre: baja (~0.03)
→ PESO = 0.50 + 0.30 + 0.15 + 0.03 = 0.98
```

---

## 🛠️ 4. PLAN DE IMPLEMENTACIÓN

### Fase A: Preparación de datos

✅ **Tarea A1**: Crear mapeo ID → Nombre(s) en español
```javascript
// Resultado esperado: data/job_id_to_names.json
{
  "218": ["Chef", "Cocinero principal", "Jefe de Cocina", "Head Chef"],
  "228": ["Chef Ejecutivo", "Chef Principal", "Executive Chef"],
  "220": ["Commis Chef", "Chef Junior", "Cocinero Junior"]
}
```

**Script**: `scripts/build-job-names-map.js`

```javascript
const fs = require('fs');
const csv = require('csv-parser');

const jobNames = {};

fs.createReadStream('Tablas para cálculo de relaciones/JobTitlesDenominations.csv')
  .pipe(csv())
  .on('data', (row) => {
    const jobId = row.FK_JobTitle;
    const name = row.Denomination;
    const lang = row.LanguageId;

    // Solo español (lang=7) para simplificar
    if (lang === '7') {
      if (!jobNames[jobId]) {
        jobNames[jobId] = [];
      }
      jobNames[jobId].push(name);
    }
  })
  .on('end', () => {
    fs.writeFileSync('data/job_id_to_names.json', JSON.stringify(jobNames, null, 2));
    console.log('✅ Mapeo ID → Nombres creado');
  });
```

---

✅ **Tarea A2**: Crear grafo de relaciones
```javascript
// Resultado esperado: data/job_relationships_graph.json
{
  "218": [209, 210, 211, 213, 217, 218, 220, 221, 222, 224, 227, 228],
  "228": [208, 209, 211, 212, 216, 217, 218, 220, 222, 224, 227]
}
```

**Script**: `scripts/build-relationships-graph.js`

```javascript
const fs = require('fs');
const csv = require('csv-parser');

const graph = {};

fs.createReadStream('Tablas para cálculo de relaciones/JobTitlesRelationships.csv')
  .pipe(csv())
  .on('data', (row) => {
    const from = row.FK_JobTitleID;
    const to = row.FK_JobTitleRelatedID;

    if (!graph[from]) {
      graph[from] = [];
    }
    graph[from].push(parseInt(to));
  })
  .on('end', () => {
    fs.writeFileSync('data/job_relationships_graph.json', JSON.stringify(graph, null, 2));
    console.log('✅ Grafo de relaciones creado');
  });
```

---

### Fase B: Cálculo de pesos

✅ **Tarea B1**: Implementar funciones auxiliares

**Script**: `scripts/job-weights-helpers.js`

```javascript
// Palabras clave para detectar nivel y área
const seniorKeywords = ['ejecutivo', 'executive', 'director', 'jefe', 'head', 'chief', 'principal', 'master', 'gerente', 'manager'];
const midKeywords = ['sous', 'segundo', 'encargado', 'coordinador', 'supervisor', 'lead', 'senior', 'partida'];
const juniorKeywords = ['ayudante', 'assistant', 'junior', 'commis', 'aprendiz', 'trainee', 'intern', 'becario', 'pinche'];

const areaKeywords = {
  cocina: ['chef', 'cocinero', 'cook', 'panadero', 'baker', 'repostero', 'pastry', 'entremetier', 'saucier', 'poissonnier', 'rotisseur', 'patissier', 'chocolatero', 'cocina'],
  sala: ['camarero', 'waiter', 'sommelier', 'maitre', 'barista', 'bartender', 'bar', 'sala'],
  recepcion: ['recepcionista', 'receptionist', 'conserje', 'concierge', 'porter', 'recepción'],
  housekeeping: ['gobernanta', 'housekeeper', 'camarera', 'pisos', 'limpieza', 'houseman'],
  gestion: ['manager', 'director', 'gerente', 'rrhh', 'recursos humanos', 'comercial', 'ventas', 'sales']
};

function getLevel(jobNames) {
  const text = jobNames.join(' ').toLowerCase();
  if (seniorKeywords.some(kw => text.includes(kw))) return 3;
  if (juniorKeywords.some(kw => text.includes(kw))) return 1;
  if (midKeywords.some(kw => text.includes(kw))) return 2;
  return 2; // Default mid-level
}

function getArea(jobNames) {
  const text = jobNames.join(' ').toLowerCase();
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      return area;
    }
  }
  return 'general';
}

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
  // Comparar el nombre principal (más corto) de cada lista
  const name1 = names1.reduce((shortest, name) =>
    name.length < shortest.length ? name : shortest, names1[0]);
  const name2 = names2.reduce((shortest, name) =>
    name.length < shortest.length ? name : shortest, names2[0]);

  const maxLen = Math.max(name1.length, name2.length);
  const distance = levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
  return 1 - (distance / maxLen);
}

module.exports = { getLevel, getArea, levenshteinSimilarity };
```

---

✅ **Tarea B2**: Script principal de cálculo de pesos

**Script**: `scripts/calculate-job-weights.js`

```javascript
const fs = require('fs');
const { getLevel, getArea, levenshteinSimilarity } = require('./job-weights-helpers.js');

// Cargar datos
const jobNames = JSON.parse(fs.readFileSync('data/job_id_to_names.json'));
const graph = JSON.parse(fs.readFileSync('data/job_relationships_graph.json'));

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

  // 3. Bonus por misma área
  const area1 = getArea(names1);
  const area2 = getArea(names2);
  if (area1 === area2 && area1 !== 'general') {
    weight += 0.30;
  }

  // 4. Bonus por nivel jerárquico
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

  // 5. Bonus por similitud de nombre
  if (names1.length > 0 && names2.length > 0) {
    const similarity = levenshteinSimilarity(names1, names2);
    weight += similarity * 0.10;
  }

  // 6. Normalizar
  return Math.min(1.00, Math.max(0.00, parseFloat(weight.toFixed(2))));
}

// Construir objeto de pesos
const weights = {};

for (const [jobId, relatedIds] of Object.entries(graph)) {
  const jobNamesArray = jobNames[jobId] || [];
  const primaryName = jobNamesArray[0] || `Job_${jobId}`;

  weights[primaryName] = relatedIds
    .map(relatedId => {
      const relatedNames = jobNames[relatedId] || [];
      const relatedPrimaryName = relatedNames[0] || `Job_${relatedId}`;
      const weight = calculateWeight(jobId, String(relatedId));

      return {
        job: relatedPrimaryName,
        weight: weight,
        jobId: relatedId
      };
    })
    .filter(rel => rel.weight > 0)
    .sort((a, b) => b.weight - a.weight); // Ordenar por peso descendente
}

// Guardar resultado
fs.writeFileSync('data/job_weights.json', JSON.stringify(weights, null, 2));

console.log('✅ Pesos calculados exitosamente');
console.log(`📊 Total de puestos con relaciones: ${Object.keys(weights).length}`);
console.log(`📈 Total de relaciones con peso: ${Object.values(weights).reduce((sum, arr) => sum + arr.length, 0)}`);

// Mostrar ejemplo
const exampleJob = Object.keys(weights)[0];
console.log(`\n📋 Ejemplo - "${exampleJob}":`);
console.log(JSON.stringify(weights[exampleJob].slice(0, 5), null, 2));
```

---

### Fase C: Validación

✅ **Tarea C1**: Script de validación

**Script**: `scripts/validate-job-weights.js`

```javascript
const fs = require('fs');
const weights = JSON.parse(fs.readFileSync('data/job_weights.json'));

console.log('🔍 VALIDACIÓN DE PESOS CALCULADOS\n');

// 1. Estadísticas generales
const totalJobs = Object.keys(weights).length;
const totalRelations = Object.values(weights).reduce((sum, arr) => sum + arr.length, 0);
const avgRelationsPerJob = (totalRelations / totalJobs).toFixed(2);

console.log(`📊 Total de puestos: ${totalJobs}`);
console.log(`📊 Total de relaciones: ${totalRelations}`);
console.log(`📊 Promedio de relaciones por puesto: ${avgRelationsPerJob}\n`);

// 2. Distribución de pesos
const weightRanges = {
  '0.90-1.00': 0,
  '0.80-0.89': 0,
  '0.70-0.79': 0,
  '0.60-0.69': 0,
  '0.50-0.59': 0,
  '0.00-0.49': 0
};

for (const relations of Object.values(weights)) {
  for (const rel of relations) {
    const w = rel.weight;
    if (w >= 0.90) weightRanges['0.90-1.00']++;
    else if (w >= 0.80) weightRanges['0.80-0.89']++;
    else if (w >= 0.70) weightRanges['0.70-0.79']++;
    else if (w >= 0.60) weightRanges['0.60-0.69']++;
    else if (w >= 0.50) weightRanges['0.50-0.59']++;
    else weightRanges['0.00-0.49']++;
  }
}

console.log('📈 Distribución de pesos:');
for (const [range, count] of Object.entries(weightRanges)) {
  const pct = ((count / totalRelations) * 100).toFixed(1);
  console.log(`  ${range}: ${count} (${pct}%)`);
}

// 3. Puestos de cocina de ejemplo
console.log('\n🍳 EJEMPLO: Puestos de Cocina\n');
const cuisineJobs = ['Chef Ejecutivo', 'Chef', 'Sous Chef', 'Cocinero', 'Commis Chef'];

for (const job of cuisineJobs) {
  if (weights[job]) {
    console.log(`"${job}" relacionado con:`);
    weights[job].slice(0, 5).forEach(rel => {
      console.log(`  - ${rel.job} (${rel.weight})`);
    });
    console.log('');
  }
}
```

---

## 📋 5. CHECKLIST DE EJECUCIÓN

### Preparación
- [x] Recibir archivos CSV en `Tablas para cálculo de relaciones/`
- [x] Analizar estructura de las tablas
- [ ] Crear carpeta `data/` en el proyecto
- [ ] Crear carpeta `scripts/` en el proyecto
- [ ] Instalar dependencia: `npm install csv-parser`

### Fase A: Preparación de datos
- [ ] Crear script `scripts/build-job-names-map.js`
- [ ] Ejecutar: `node scripts/build-job-names-map.js`
- [ ] Verificar: `data/job_id_to_names.json` creado
- [ ] Crear script `scripts/build-relationships-graph.js`
- [ ] Ejecutar: `node scripts/build-relationships-graph.js`
- [ ] Verificar: `data/job_relationships_graph.json` creado

### Fase B: Cálculo de pesos
- [ ] Crear script `scripts/job-weights-helpers.js`
- [ ] Crear script `scripts/calculate-job-weights.js`
- [ ] Ejecutar: `node scripts/calculate-job-weights.js`
- [ ] Verificar: `data/job_weights.json` creado
- [ ] Revisar ejemplos en consola

### Fase C: Validación
- [ ] Crear script `scripts/validate-job-weights.js`
- [ ] Ejecutar: `node scripts/validate-job-weights.js`
- [ ] Verificar distribución de pesos es razonable
- [ ] Revisar manualmente ejemplos de cocina/sala/recepción
- [ ] Ajustar parámetros si es necesario

### Fase D: Integración (después de validación)
- [ ] Actualizar OPTIMIZATION_ROADMAP.md marcando FASE 2 completada
- [ ] Preparar para recibir tablas de ciudades y áreas

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. **Limitaciones del enfoque actual**
- No tenemos información explícita de área/sector
- Dependemos de análisis semántico (palabras clave)
- Algunos puestos pueden clasificarse incorrectamente
- La similitud de nombres puede dar falsos positivos

### 2. **Posibles mejoras futuras**
- Agregar tabla de `JobTitleAreas` (cocina, sala, etc.)
- Agregar tabla de `JobTitleLevels` (junior, mid, senior)
- Machine learning para clasificación automática
- Feedback del usuario para ajustar pesos

### 3. **Validación manual necesaria**
Antes de usar en producción, revisar casos específicos:
- [ ] Chef → Sous Chef (debe ser ~0.90)
- [ ] Chef Ejecutivo → Chef (debe ser ~0.95)
- [ ] Camarero → Jefe de Sala (debe ser ~0.85)
- [ ] Recepcionista → Conserje (debe ser ~0.75)
- [ ] Chef → Camarero (debe ser 0.00 si no hay relación)

---

## 📞 PRÓXIMOS PASOS

1. **AHORA**: Esperar confirmación del usuario antes de crear scripts
2. **DESPUÉS**: Recibir tablas de ciudades (con coordenadas)
3. **DESPUÉS**: Recibir tablas de sectores y áreas
4. **FINALMENTE**: Integrar todo en el proceso de caché

---

**Última actualización**: 2025-10-26
**Estado**: ✅ Análisis completado - Esperando aprobación para crear scripts
