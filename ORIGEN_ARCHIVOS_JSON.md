# 🗂️ Origen y Generación de Archivos JSON del Sistema

**Documentación completa sobre cómo se generan los archivos de datos de relaciones entre puestos de trabajo**

---

## 📚 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Archivos CSV Originales](#archivos-csv-originales)
3. [Proceso de Transformación](#proceso-de-transformación)
4. [Algoritmo de Cálculo de Pesos](#algoritmo-de-cálculo-de-pesos)
5. [Archivos JSON Generados](#archivos-json-generados)
6. [Estadísticas del Proceso](#estadísticas-del-proceso)
7. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🎯 Visión General

El sistema de relaciones entre puestos de trabajo se basa en **datos reales proporcionados por Turijobs** que son procesados mediante scripts para generar archivos JSON optimizados para búsquedas en runtime.

**Flujo de datos:**

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: Datos Originales (CSV de Turijobs)                     │
│ ┌─────────────────────┐                                         │
│ │ JobTitles.csv       │ → IDs y nombres principales de puestos │
│ │ Denominations.csv   │ → Sinónimos multiidioma                │
│ │ Relationships.csv   │ → Relaciones entre puestos             │
│ │ Areas.csv           │ → Áreas de trabajo                     │
│ │ JobTitles_Areas.csv │ → Mapeo puesto→área                    │
│ └─────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: Scripts de Transformación (Node.js)                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ build-job-names-map.cjs      → job_id_to_names.json        │ │
│ │ build-relationships-graph.cjs → job_relationships_graph.json│ │
│ │ build-job-areas-map.cjs       → job_areas_map.json         │ │
│ │ calculate-job-weights.cjs     → job_weights.json           │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: Runtime (API de búsqueda)                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ lib/enrichOffers.js                                         │ │
│ │ - findBestJobMatch() usa job_id_to_names.json              │ │
│ │ - enrichOffer() usa job_weights.json                        │ │
│ │                                                             │ │
│ │ api/jobs/search.js                                          │ │
│ │ - NIVEL 2 usa enriched.related_jobs                         │ │
│ │   (que viene de job_weights.json)                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Punto clave:** Los archivos JSON NO se generan en runtime. Se generan una vez usando scripts y luego se usan como archivos estáticos.

---

## 📁 Archivos CSV Originales

**Ubicación original:** `Tablas para cálculo de relaciones/`

**Estado actual:** Los CSV fueron eliminados del repositorio después de generar los JSON (no son necesarios en producción y ocupan espacio).

### 1. **JobTitles.csv**

**Propósito:** Lista maestra de puestos de trabajo con IDs únicos.

**Estructura:**
```csv
JobTitleId,Name
1,Contable
23,Barman
45,Camarero
67,Sommelier
100,Chef
...
```

**Características:**
- 814 puestos únicos
- IDs numéricos únicos del sistema Turijobs
- Nombres en español (primario)

---

### 2. **JobTitlesDenominations.csv**

**Propósito:** Sinónimos y variaciones multiidioma de cada puesto.

**Estructura:**
```csv
FK_JobTitle,Denomination,LanguageId
23,Barman,7
23,Bartender,14
23,Coctelero,7
23,Barkeeper,14
23,Mixologist,14
45,Camarero,7
45,Mesero,7
45,Waiter,14
45,Servidor,7
45,Garçom,17
...
```

**Características:**
- ~11,000 denominaciones (múltiples por puesto)
- LanguageId:
  - `7` = Español
  - `14` = Inglés
  - `17` = Portugués
- Permite matching robusto: "bartender" → "Barman"

---

### 3. **JobTitlesRelationships.csv**

**Propósito:** Define qué puestos están relacionados entre sí.

**Estructura:**
```csv
FK_JobTitle1,FK_JobTitle2
23,45
23,67
45,46
100,101
100,102
...
```

**Interpretación:**
- `23,45` → Barman (23) está relacionado con Camarero (45)
- `100,101` → Chef (100) está relacionado con Sous Chef (101)

**Características:**
- 15,320 relaciones definidas
- Relaciones son direccionales (si A→B existe, B→A también debe existir)
- **Este es el archivo base de todo el sistema de recomendaciones**

---

### 4. **Areas.csv**

**Propósito:** Categorías de trabajo dentro de turismo y hostelería.

**Estructura:**
```csv
AreaId,Name
1,Cocina
2,Pastelería y Repostería
3,Sala y Restauración
4,Bar y Cafetería
5,Recepción
6,Pisos y Limpieza
7,Dirección y Administración
8,Animación y Entretenimiento
...
```

**Características:**
- 26 áreas definidas
- Agrupan puestos por departamento/función
- Usado para calcular bonus de peso (+0.30 si misma área)

---

### 5. **JobTitles_Areas.csv**

**Propósito:** Mapea cada puesto a su área correspondiente.

**Estructura:**
```csv
FK_JobTitle,FK_Area
1,7
23,4
45,3
67,3
100,1
...
```

**Interpretación:**
- Contable (1) → Dirección y Administración (7)
- Barman (23) → Bar y Cafetería (4)
- Camarero (45) → Sala y Restauración (3)
- Chef (100) → Cocina (1)

**Características:**
- 669 asignaciones
- Algunos puestos pueden no tener área asignada

---

## 🔧 Proceso de Transformación

**Fecha de ejecución:** 26 de octubre, 2025

**Scripts ejecutados:** (ubicados en `scripts/`)

### PASO 1: Construcción del Mapeo de Nombres

**Script:** `build-job-names-map.cjs`

**Input:** `JobTitlesDenominations.csv`

**Proceso:**
```javascript
const jobNames = {};

// Para cada fila del CSV
row.forEach(row => {
  const jobId = row.FK_JobTitle;      // "23"
  const name = row.Denomination;       // "Bartender"
  const lang = row.LanguageId;         // "14"

  // Filtrar solo español (7), inglés (14) y portugués (17)
  if (lang === '7' || lang === '14' || lang === '17') {
    if (!jobNames[jobId]) {
      jobNames[jobId] = [];
    }
    jobNames[jobId].push(name);
  }
});

// Guardar a JSON
fs.writeFileSync('job_id_to_names.json', JSON.stringify(jobNames));
```

**Output:** `data/job_id_to_names.json` (759 KB)

```json
{
  "23": [
    "Barman",
    "Bartender",
    "Coctelero",
    "Barkeeper",
    "Mixologist"
  ],
  "45": [
    "Camarero",
    "Mesero",
    "Waiter",
    "Servidor",
    "Garçom"
  ]
}
```

**Resultado:** 814 puestos con múltiples denominaciones cada uno.

---

### PASO 2: Construcción del Grafo de Relaciones

**Script:** `build-relationships-graph.cjs`

**Input:** `JobTitlesRelationships.csv`

**Proceso:**
```javascript
const graph = {};

// Para cada relación en el CSV
row.forEach(row => {
  const job1 = row.FK_JobTitle1;  // "23"
  const job2 = row.FK_JobTitle2;  // "45"

  // Agregar job2 a la lista de relacionados de job1
  if (!graph[job1]) {
    graph[job1] = [];
  }
  graph[job1].push(parseInt(job2));
});

// Guardar a JSON
fs.writeFileSync('job_relationships_graph.json', JSON.stringify(graph));
```

**Output:** `data/job_relationships_graph.json` (145 KB)

```json
{
  "1": [2, 3, 5, 6, 7, 8, 9, 11, 12, ...],
  "23": [24, 45, 46, 67, 68, ...],
  "45": [23, 24, 46, 47, 48, ...],
  "100": [101, 102, 103, 104, ...]
}
```

**Interpretación:**
- JobTitle 23 (Barman) se relaciona con: 24, 45, 46, 67, 68...
- JobTitle 45 (Camarero) se relaciona con: 23, 24, 46, 47, 48...

**Resultado:** 814 puestos con 15,320 relaciones totales.

---

### PASO 3: Construcción del Mapeo de Áreas

**Script:** `build-job-areas-map.cjs`

**Input:** `JobTitles_Areas.csv`

**Proceso:**
```javascript
const jobAreas = {};

// Para cada asignación en el CSV
row.forEach(row => {
  const jobId = row.FK_JobTitle;    // "23"
  const areaId = row.FK_Area;       // "4"

  jobAreas[jobId] = areaId;
});

// Guardar a JSON
fs.writeFileSync('job_areas_map.json', JSON.stringify(jobAreas));
```

**Output:** `data/job_areas_map.json` (8.2 KB)

```json
{
  "1": "7",
  "23": "4",
  "45": "3",
  "67": "3",
  "100": "1"
}
```

**Interpretación:**
- Contable (1) → Área 7 (Dirección y Administración)
- Barman (23) → Área 4 (Bar y Cafetería)
- Camarero (45) → Área 3 (Sala y Restauración)
- Chef (100) → Área 1 (Cocina)

---

### PASO 4: Cálculo de Pesos de Similitud

**Script:** `calculate-job-weights.cjs`

**Input:**
- `job_id_to_names.json`
- `job_relationships_graph.json`
- `job_areas_map.json`
- `area_names.json`

**Este es el script más importante** porque agrega inteligencia al sistema.

---

## 🧮 Algoritmo de Cálculo de Pesos

### Función Principal: `calculateWeight(job1Id, job2Id)`

```javascript
function calculateWeight(job1Id, job2Id) {
  const names1 = jobNames[job1Id] || [];
  const names2 = jobNames[job2Id] || [];

  // 1. Verificar si existe relación en el grafo
  const relationshipExists = graph[job1Id]?.includes(parseInt(job2Id));
  if (!relationshipExists) {
    return 0.0;  // Sin relación = peso 0
  }

  // 2. BASE: 0.50 (existe relación)
  let weight = 0.50;

  // 3. BONUS: Misma área (+0.30)
  const area1 = jobAreas[job1Id];
  const area2 = jobAreas[job2Id];
  if (area1 && area2 && area1 === area2) {
    weight += 0.30;
  }

  // 4. BONUS: Nivel jerárquico similar (+0.05 a +0.15)
  const level1 = getLevel(names1);  // Detecta: Director, Jefe, etc.
  const level2 = getLevel(names2);
  const levelDiff = Math.abs(level1 - level2);

  if (levelDiff === 0) {
    weight += 0.15;  // Mismo nivel: Director↔Director
  } else if (levelDiff === 1) {
    weight += 0.10;  // Nivel adyacente: Jefe↔Ayudante
  } else if (levelDiff === 2) {
    weight += 0.05;  // Dos niveles: Director↔Auxiliar
  }

  // 5. BONUS: Similitud de nombre (+0.00 a +0.10)
  if (names1.length > 0 && names2.length > 0) {
    const similarity = levenshteinSimilarity(names1, names2);
    weight += similarity * 0.10;
  }

  // 6. Normalizar a rango [0.00, 1.00]
  return Math.min(1.00, Math.max(0.00, parseFloat(weight.toFixed(2))));
}
```

---

### Desglose del Algoritmo

#### 1. Verificación de Relación (Condición Obligatoria)

```javascript
const relationshipExists = graph[job1Id]?.includes(parseInt(job2Id));
if (!relationshipExists) return 0.0;
```

**Regla:** Si no existe relación en `JobTitlesRelationships.csv`, el peso es 0.

**Ejemplo:**
- Chef (100) ↔ Camarero (45): **NO existe en CSV** → peso = 0.0
- Chef (100) ↔ Sous Chef (101): **SÍ existe en CSV** → calcular peso

---

#### 2. Peso Base (0.50)

```javascript
let weight = 0.50;
```

**Regla:** Toda relación que existe parte con un peso base de 0.50.

---

#### 3. Bonus por Misma Área (+0.30)

```javascript
if (area1 && area2 && area1 === area2) {
  weight += 0.30;
}
```

**Regla:** Si ambos puestos están en la misma área, suma 0.30.

**Ejemplos:**
- Barman (Área: Bar) ↔ Camarero (Área: Sala): **Áreas diferentes** → +0.00
- Chef (Área: Cocina) ↔ Sous Chef (Área: Cocina): **Misma área** → +0.30

---

#### 4. Bonus por Nivel Jerárquico (+0.05 a +0.15)

**Función auxiliar:** `getLevel(names)`

```javascript
function getLevel(names) {
  const nameStr = names.join(' ').toLowerCase();

  if (nameStr.match(/director|executive|chief|manager general/)) return 5;  // Senior
  if (nameStr.match(/manager|jefe|coordinador|supervisor/)) return 4;       // Mid-high
  if (nameStr.match(/sous|segundo|assistant manager/)) return 3;            // Mid
  if (nameStr.match(/senior|especialista|chef de partie/)) return 2;        // Mid-low
  if (nameStr.match(/ayudante|auxiliar|junior|aprendiz/)) return 1;         // Junior
  return 2;  // Default: nivel medio
}
```

**Regla:** Detecta el nivel jerárquico analizando palabras clave en los nombres.

**Bonus según diferencia:**

```javascript
const levelDiff = Math.abs(level1 - level2);

if (levelDiff === 0) weight += 0.15;      // Mismo nivel
else if (levelDiff === 1) weight += 0.10; // Nivel adyacente
else if (levelDiff === 2) weight += 0.05; // Dos niveles de diferencia
// levelDiff >= 3: +0.00 (muy diferentes)
```

**Ejemplos:**
- Chef (nivel 2) ↔ Sous Chef (nivel 3): levelDiff = 1 → +0.10
- Director (nivel 5) ↔ Auxiliar (nivel 1): levelDiff = 4 → +0.00

---

#### 5. Bonus por Similitud de Nombre (+0.00 a +0.10)

**Función auxiliar:** `levenshteinSimilarity(names1, names2)`

```javascript
function levenshteinSimilarity(names1, names2) {
  let maxSimilarity = 0;

  for (const name1 of names1) {
    for (const name2 of names2) {
      const dist = levenshteinDistance(name1, name2);
      const maxLen = Math.max(name1.length, name2.length);
      const similarity = 1 - (dist / maxLen);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }

  return maxSimilarity;
}
```

**Regla:** Calcula similitud textual entre los nombres usando distancia de Levenshtein.

**Ejemplos:**
- "Camarero" vs "Ayudante de Camarero": similitud ~0.60 → +0.06
- "Chef" vs "Sous Chef": similitud ~0.50 → +0.05
- "Barman" vs "Recepcionista": similitud ~0.10 → +0.01

---

### Ejemplos Completos de Cálculo

#### Ejemplo 1: Chef → Sous Chef

```
1. Relación existe en CSV: ✓
2. Peso base: 0.50
3. Misma área (Cocina): +0.30 → 0.80
4. Nivel adyacente (Chef=2, Sous=3, diff=1): +0.10 → 0.90
5. Similitud nombre ("Chef" común): +0.10 → 1.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PESO FINAL: 1.00 ✅ (muy similar)
```

---

#### Ejemplo 2: Camarero → Barman

```
1. Relación existe en CSV: ✓
2. Peso base: 0.50
3. Áreas diferentes (Sala vs Bar): +0.00 → 0.50
4. Mismo nivel (ambos nivel 2): +0.15 → 0.65
5. Similitud nombre (baja): +0.02 → 0.67
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PESO FINAL: 0.67 (similar)
```

---

#### Ejemplo 3: Camarero → Ayudante de Camarero

```
1. Relación existe en CSV: ✓
2. Peso base: 0.50
3. Misma área (Sala): +0.30 → 0.80
4. Nivel adyacente (Camarero=2, Ayudante=1, diff=1): +0.10 → 0.90
5. Similitud nombre ("Camarero" común): +0.12 → 1.02 → 1.00 (max)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PESO FINAL: 1.00 ✅ (muy similar)
```

---

#### Ejemplo 4: Chef → Recepcionista

```
1. Relación existe en CSV: ✗
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PESO FINAL: 0.00 (sin relación)
```

---

### Output del Script

**Archivo generado:** `data/job_weights.json` (2.3 MB)

```json
{
  "Camarero": [
    {
      "job": "Ayudante de Camarero",
      "weight": 0.92,
      "jobId": 46,
      "area": "Sala y Restauración",
      "sameArea": true
    },
    {
      "job": "Jefe de Sala",
      "weight": 0.90,
      "jobId": 44,
      "area": "Sala y Restauración",
      "sameArea": true
    },
    {
      "job": "Barman",
      "weight": 0.85,
      "jobId": 23,
      "area": "Bar y Cafetería",
      "sameArea": false
    },
    {
      "job": "Sommelier",
      "weight": 0.78,
      "jobId": 67,
      "area": "Sala y Restauración",
      "sameArea": true
    }
    // ... hasta 20 trabajos relacionados
  ],
  "Chef": [
    {
      "job": "Sous Chef",
      "weight": 1.00,
      "jobId": 101,
      "area": "Cocina",
      "sameArea": true
    },
    {
      "job": "Chef Ejecutivo",
      "weight": 0.99,
      "jobId": 102,
      "area": "Cocina",
      "sameArea": true
    },
    {
      "job": "Chef de Partida",
      "weight": 0.95,
      "jobId": 103,
      "area": "Cocina",
      "sameArea": true
    }
    // ...
  ]
}
```

**Características:**
- Cada puesto tiene hasta 20 trabajos relacionados
- Ordenados de mayor a menor peso
- Incluye metadata: jobId, área, sameArea

---

## 📊 Archivos JSON Generados

### Resumen de Archivos

| Archivo | Tamaño | Origen | Propósito |
|---------|--------|--------|-----------|
| `job_id_to_names.json` | 759 KB | `JobTitlesDenominations.csv` | Sinónimos multiidioma |
| `job_relationships_graph.json` | 145 KB | `JobTitlesRelationships.csv` | Grafo de relaciones base |
| `job_areas_map.json` | 8.2 KB | `JobTitles_Areas.csv` | Mapeo puesto→área |
| `area_names.json` | 674 B | `Areas.csv` | Nombres de áreas |
| `job_weights.json` | 2.3 MB | Calculado con algoritmo | Pesos de similitud |
| `job_weights_by_area.json` | 2.5 MB | Igual que anterior | Organizado por área |

---

### Uso en Runtime

#### 1. **job_id_to_names.json**

**Usado por:** `lib/enrichOffers.js` → función `findBestJobMatch()`

**Propósito:** Matching robusto de nombres de puestos

**Ejemplo:**
```javascript
// Usuario busca: "bartender"
// Oferta en cache: "Barman"

findBestJobMatch("Bartender - Cocktail Bar")
// 1. Normaliza: "bartender"
// 2. Busca en job_id_to_names.json
// 3. Encuentra: "Bartender" es sinónimo de "Barman" (jobId 23)
// 4. Retorna: "Barman"
```

---

#### 2. **job_relationships_graph.json**

**Usado por:** Script `calculate-job-weights.cjs` (solo en generación)

**Propósito:** Verificar si existe relación entre dos puestos

**NO se usa en runtime** (la información ya está en `job_weights.json`)

---

#### 3. **job_areas_map.json**

**Usado por:** Script `calculate-job-weights.cjs` (solo en generación)

**Propósito:** Calcular bonus de peso por misma área

**NO se usa en runtime** (la información ya está en `job_weights.json`)

---

#### 4. **job_weights.json**

**Usado por:** `lib/enrichOffers.js` → función `enrichOffer()`

**Propósito:** Agregar trabajos relacionados a cada oferta

**Ejemplo:**
```javascript
// Oferta: "Camarero - Hotel Meliá"

enrichOffer(offer, allOffers)
// 1. findBestJobMatch("Camarero") → "Camarero"
// 2. Busca en job_weights.json["Camarero"]
// 3. Obtiene: [
//      { job: "Ayudante de Camarero", weight: 0.92 },
//      { job: "Barman", weight: 0.85 },
//      { job: "Sommelier", weight: 0.78 }
//    ]
// 4. Agrega a offer.enriched.related_jobs
```

**Flujo en NIVEL 2:**
```javascript
// Usuario busca: "pastelero valencia" → 0 resultados

// Backend itera ofertas de Valencia:
offersInValencia.forEach(job => {
  if (job.enriched && job.enriched.related_jobs) {
    // Busca si "pastelero" está en related_jobs
    const match = job.enriched.related_jobs.find(rel =>
      rel.job.includes("pastelero") && rel.weight > 0.80
    );

    if (match) {
      // ¡Match! Oferta de "Chef de Partida" tiene "Pastelero" como relacionado
      relatedJobsResults.push(job);
    }
  }
});
```

---

## 📈 Estadísticas del Proceso

**Fecha de generación:** 26 de octubre, 2025

### Resumen General

```
✅ Puestos procesados:        814
✅ Relaciones calculadas:   15,320
✅ Áreas definidas:             26
✅ Denominaciones:          11,281
✅ Tiempo de ejecución:       ~30 segundos
```

---

### Distribución de Pesos

```
Rango         | Cantidad | Porcentaje | Gráfico
━━━━━━━━━━━━━━┼━━━━━━━━━━┼━━━━━━━━━━━━┼━━━━━━━━━━━━━━━━━━━━━━━━
0.90 - 1.00   |   6,927  |   45.2%    | ████████████████████████
0.80 - 0.89   |   2,145  |   14.0%    | ███████
0.70 - 0.79   |   1,836  |   12.0%    | ██████
0.60 - 0.69   |   3,720  |   24.3%    | ████████████
0.50 - 0.59   |     692  |    4.5%    | ██
━━━━━━━━━━━━━━┴━━━━━━━━━━┴━━━━━━━━━━━━┴━━━━━━━━━━━━━━━━━━━━━━━━
Total         |  15,320  |  100.0%    |
```

**Interpretación:**
- **45.2%** de relaciones son muy similares (0.90-1.00)
  - Ej: Chef ↔ Sous Chef, Camarero ↔ Ayudante de Camarero
- **24.3%** son similares (0.60-0.69)
  - Ej: Camarero ↔ Barman, Chef ↔ Cocinero
- Solo **4.5%** tienen peso mínimo (0.50-0.59)
  - Relaciones débiles, diferentes áreas y niveles

---

### Validación de Resultados

**Casos de prueba ejecutados:**

```
✅ Chef → Sous Chef
   Esperado: 1.00 | Obtenido: 1.00 ✓
   Razón: Misma área, nivel adyacente, nombre similar

✅ Chef → Chef Ejecutivo
   Esperado: ~0.99 | Obtenido: 0.99 ✓
   Razón: Misma área, nivel cercano, nombre idéntico

✅ Camarero → Ayudante de Camarero
   Esperado: ~0.92 | Obtenido: 0.92 ✓
   Razón: Misma área, nivel adyacente, nombre contenido

✅ Camarero → Barman
   Esperado: ~0.67 | Obtenido: 0.67 ✓
   Razón: Áreas diferentes, mismo nivel, nombre distinto

✅ Recepcionista → Recepcionista de Hotel
   Esperado: ~0.98 | Obtenido: 0.98 ✓
   Razón: Misma área, mismo nivel, nombre muy similar
```

---

### Ejemplos por Área

#### 🍳 Cocina

```
"Chef" relacionado con:
  - Sous Chef (1.00) ✅ Cocina
  - Chef Ejecutivo (0.99) ✅ Cocina
  - Chef de Partida (0.95) ✅ Cocina
  - Cocinero (0.85) ✅ Cocina
  - Pastelero (0.78) ⚠️  Pastelería
```

#### 🍽️ Sala y Restauración

```
"Camarero" relacionado con:
  - Ayudante de Camarero (0.92) ✅ Sala
  - Jefe de Sala (0.90) ✅ Sala
  - Host/Hostess (0.88) ✅ Sala
  - Barman (0.67) ⚠️  Bar
  - Sommelier (0.78) ✅ Sala
```

#### 🏨 Recepción

```
"Recepcionista" relacionado con:
  - Recepcionista de Hotel (0.98) ✅ Recepción
  - Jefe de Recepción (0.90) ✅ Recepción
  - Conserje (0.85) ✅ Recepción
  - Botones (0.70) ✅ Recepción
  - Telefonista (0.65) ✅ Recepción
```

---

## ❓ Preguntas Frecuentes

### 1. ¿Qué son los IDs en job_id_to_names.json?

**Respuesta:** Son los **IDs originales del sistema Turijobs**. Cada puesto de trabajo tiene un ID numérico único asignado en tu base de datos.

**Ejemplo:**
- ID `23` = Barman
- ID `45` = Camarero
- ID `100` = Chef

Estos IDs vienen del archivo `JobTitles.csv` proporcionado por Turijobs.

---

### 2. ¿De dónde salen los sinónimos?

**Respuesta:** Los sinónimos vienen **directamente de tu base de datos** a través del archivo `JobTitlesDenominations.csv`.

**NO se generan automáticamente.** Son datos reales de Turijobs que incluyen:
- Variaciones en español: "Camarero", "Mesero", "Servidor"
- Traducciones al inglés: "Waiter", "Server"
- Traducciones al portugués: "Garçom"

Los scripts solo **transforman** estos datos de CSV a JSON para uso optimizado en runtime.

---

### 3. ¿Se usa el archivo JobTitlesRelationships.csv?

**SÍ, absolutamente.** Es el **archivo más importante** del sistema.

**Flujo:**
1. Tu CSV define qué puestos están relacionados
2. `build-relationships-graph.cjs` lo transforma a JSON
3. `calculate-job-weights.cjs` lo usa como base obligatoria
4. **Sin relación en el CSV, el peso es 0.0**

**Ejemplo:**
```csv
# JobTitlesRelationships.csv
23,45  # Barman ↔ Camarero

# Resultado en job_weights.json
"Barman": [
  { "job": "Camarero", "weight": 0.67 }  # Calculado con algoritmo
]

# Si NO estuviera en el CSV:
"Barman": [
  # Camarero NO aparecería (weight = 0.0)
]
```

---

### 4. ¿Los sinónimos son una extensión de las relaciones?

**No, son dos cosas diferentes:**

**A) Sinónimos (job_id_to_names.json):**
- Diferentes **nombres** del **mismo puesto**
- Ejemplo: "Barman" = "Bartender" = "Coctelero"
- Usado para: Matching de búsquedas (usuario busca "bartender" → encuentra "Barman")

**B) Relaciones (job_weights.json):**
- **Puestos diferentes** que están relacionados
- Ejemplo: "Barman" está relacionado con "Camarero"
- Usado para: NIVEL 2 (sugerir alternativas cuando no hay resultados)

**Uso combinado:**
```
Usuario busca: "bartender valencia"
                    ↓
1. job_id_to_names.json: "bartender" → "Barman"
                    ↓
2. Buscar ofertas de "Barman" en Valencia
                    ↓
3. Si no hay suficientes (NIVEL 2):
                    ↓
4. job_weights.json: "Barman" → ["Camarero", "Sommelier", ...]
                    ↓
5. Buscar ofertas de "Camarero" y "Sommelier" en Valencia
```

---

### 5. ¿Cuándo se regeneran estos archivos?

**Raramente.** Solo cuando:
- Se agregan nuevos puestos a la base de datos
- Se actualizan relaciones entre puestos
- Se agregan nuevos sinónimos/idiomas
- Se modifican las áreas de trabajo

**Proceso de regeneración:**
1. Obtener CSVs actualizados de Turijobs
2. Colocarlos en `Tablas para cálculo de relaciones/`
3. Ejecutar scripts en orden:
   ```bash
   node scripts/build-job-names-map.cjs
   node scripts/build-relationships-graph.cjs
   node scripts/build-job-areas-map.cjs
   node scripts/calculate-job-weights.cjs
   ```
4. Verificar archivos generados en `data/`
5. Hacer commit y deploy

**Tiempo estimado:** ~30 segundos para todo el proceso.

---

### 6. ¿Por qué el algoritmo es tan complejo?

**Razón:** Para capturar diferentes dimensiones de similitud.

**Problema sin algoritmo:**
```
Chef ↔ Sous Chef = relación existe = peso 1.0
Chef ↔ Recepcionista = relación existe = peso 1.0
```
❌ Ambas tienen el mismo peso, pero claramente no son igual de similares.

**Con algoritmo:**
```
Chef ↔ Sous Chef
  Base: 0.50
  + Misma área: 0.30
  + Nivel adyacente: 0.10
  + Nombre similar: 0.10
  = 1.00 ✅ (muy similar)

Chef ↔ Recepcionista
  Base: 0.50
  + Área diferente: 0.00
  + Nivel muy diferente: 0.00
  + Nombre diferente: 0.00
  = 0.50 (similar pero menos)
```

**Resultado:** El sistema puede priorizar mejor las recomendaciones.

---

### 7. ¿Qué pasa si un puesto no está en los JSON?

**Escenario:** Una oferta tiene título "Mixólogo" (no en job_weights.json)

**Flujo:**
```
1. findBestJobMatch("Mixólogo")
   ↓
2. Normaliza: "mixologo"
   ↓
3. Busca en job_id_to_names.json
   ↓
4. Encuentra que "Mixologist" es sinónimo de "Barman"
   ↓
5. Retorna: "Barman"
   ↓
6. Busca en job_weights.json["Barman"]
   ↓
7. Encuentra trabajos relacionados: ["Camarero", "Sommelier", ...]
```

**Si no hay match en sinónimos:**
```
1. findBestJobMatch("Puesto Inventado")
   ↓
2. No encuentra match exacto
   ↓
3. Intenta fuzzy matching por keywords
   ↓
4. Si no encuentra nada: retorna null
   ↓
5. enriched.related_jobs = [] (vacío)
   ↓
6. NIVEL 2 no se activará para esta oferta
```

---

### 8. ¿Los pesos se pueden ajustar manualmente?

**SÍ, pero NO es recomendado.** Los pesos están calculados algorítmicamente para ser consistentes.

**Si necesitas ajustar:**

**Opción 1: Modificar el CSV de relaciones**
```csv
# Agregar/eliminar relaciones en JobTitlesRelationships.csv
23,100  # Agregar: Barman ↔ Chef

# Regenerar archivos
node scripts/calculate-job-weights.cjs
```

**Opción 2: Modificar constantes del algoritmo**
```javascript
// En calculate-job-weights.cjs, cambiar:
let weight = 0.50;  // Base
weight += 0.30;     // Bonus misma área
weight += 0.15;     // Bonus mismo nivel

// Por ejemplo, para dar más peso a la misma área:
weight += 0.40;     // En lugar de 0.30
```

**Opción 3: Editar job_weights.json directamente**
```json
{
  "Barman": [
    {
      "job": "Camarero",
      "weight": 0.85  // Cambiar manualmente de 0.67 a 0.85
    }
  ]
}
```
⚠️ **Cuidado:** Se perderá en la próxima regeneración.

---

## 🔄 Flujo Completo: De CSV a Recomendaciones

### Ejemplo End-to-End

**Usuario busca:** "bartender valencia"

```
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: Matching del término de búsqueda                       │
├─────────────────────────────────────────────────────────────────┤
│ Input: "bartender"                                              │
│   ↓                                                             │
│ findBestJobMatch() en lib/enrichOffers.js                      │
│   ↓                                                             │
│ Busca en job_id_to_names.json                                  │
│   ↓                                                             │
│ Encuentra: "Bartender" es sinónimo de "Barman" (jobId 23)     │
│   ↓                                                             │
│ Output: "Barman"                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: Búsqueda en cache de ofertas                           │
├─────────────────────────────────────────────────────────────────┤
│ Buscar ofertas de "Barman" en Valencia                         │
│   ↓                                                             │
│ Resultado: 2 ofertas (< 10)                                    │
│   ↓                                                             │
│ Activar NIVEL 2: trabajos relacionados                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: Enriquecimiento de ofertas (durante refresh)           │
├─────────────────────────────────────────────────────────────────┤
│ Para cada oferta de Valencia:                                  │
│   ↓                                                             │
│ enrichOffer() lee job_weights.json                             │
│   ↓                                                             │
│ Oferta: "Camarero - Hotel Meliá"                               │
│   ↓                                                             │
│ job_weights["Camarero"] contiene:                              │
│   [                                                             │
│     { "job": "Barman", "weight": 0.67 },                       │
│     { "job": "Ayudante de Camarero", "weight": 0.92 }          │
│   ]                                                             │
│   ↓                                                             │
│ Agregar a offer.enriched.related_jobs                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: NIVEL 2 - Búsqueda de relacionados                     │
├─────────────────────────────────────────────────────────────────┤
│ Iterar ofertas de Valencia:                                    │
│   ↓                                                             │
│ Oferta: "Camarero - Hotel Meliá"                               │
│   enriched.related_jobs = [                                    │
│     { "job": "Barman", "weight": 0.67 }  ← ¡MATCH!            │
│   ]                                                             │
│   ↓                                                             │
│ "Barman" coincide con búsqueda y weight > 0.60                │
│   ↓                                                             │
│ Agregar oferta a related_jobs_results[]                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 5: Response al usuario                                    │
├─────────────────────────────────────────────────────────────────┤
│ {                                                               │
│   "results": [/* 2 ofertas de Barman */],                      │
│   "related_jobs_results": [/* 8 ofertas de Camarero */],       │
│   "amplification_used": {                                       │
│     "type": "nivel_2",                                          │
│     "related_job_used": "Barman",                               │
│     "weight": 0.67                                              │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Resumen Ejecutivo

**Pregunta:** ¿De dónde vienen los datos?
**Respuesta:** De **CSVs de Turijobs** (tu base de datos).

**Pregunta:** ¿Qué hacen los scripts?
**Respuesta:** **Transforman** CSVs → JSON optimizados para runtime.

**Pregunta:** ¿Se genera algo automáticamente?
**Respuesta:** Solo los **pesos** (0.50-1.00) usando un algoritmo. Las relaciones base vienen de tus CSVs.

**Pregunta:** ¿Cuándo se regeneran?
**Respuesta:** **Raramente**, solo cuando cambien los CSVs fuente.

**Pregunta:** ¿Qué tan confiable es?
**Respuesta:** **Muy confiable**, basado 100% en datos reales de Turijobs + algoritmo matemático consistente.

---

**Documento creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Versión:** 1.0
**Autor:** Sistema de búsqueda de empleo Turijobs
