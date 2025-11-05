# 🔗 Sistema de Relaciones: Puestos de Trabajo y Ciudades Cercanas

**Documentación completa del sistema de enriquecimiento, amplificación y búsqueda inteligente**

---

## 📚 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Archivos de Datos (Origen)](#archivos-de-datos-origen)
3. [Fase 1: Enriquecimiento](#fase-1-enriquecimiento)
4. [Fase 2: Búsqueda y Amplificación](#fase-2-búsqueda-y-amplificación)
5. [Estructura de Datos en Cada Etapa](#estructura-de-datos-en-cada-etapa)
6. [Usos Fuera del Chat](#usos-fuera-del-chat)
7. [Optimizaciones y Consideraciones](#optimizaciones-y-consideraciones)

---

## 🎯 Visión General

El sistema funciona en **DOS FASES independientes**:

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: ENRIQUECIMIENTO (al cargar ofertas)                    │
│ ┌─────────────┐      ┌──────────────────┐                      │
│ │ Oferta Raw  │  →   │ Oferta Enriched  │                      │
│ └─────────────┘      └──────────────────┘                      │
│                                                                  │
│ FASE 2: BÚSQUEDA Y AMPLIFICACIÓN (cuando el usuario busca)     │
│ ┌────────────┐  →  ┌──────────────┐  →  ┌──────────────────┐  │
│ │ Query User │     │ Backend Lee  │     │ Response con     │  │
│ │            │     │ enriched     │     │ related_jobs_    │  │
│ │            │     │              │     │ results[]        │  │
│ └────────────┘     └──────────────┘     └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Punto clave:** `enriched` se usa en FASE 1 para BUSCAR, pero NO se necesita en el response final.

---

## 📁 Archivos de Datos (Origen)

### 1. **job_weights.json** (2.3 MB)

**Propósito:** Matriz de similitud entre puestos de trabajo

**Estructura:**
```json
{
  "Camarero": [
    {
      "job": "Ayudante de Camarero",
      "weight": 0.92,
      "jobId": 45,
      "area": "Sala y Restauración",
      "sameArea": true
    },
    {
      "job": "Barman",
      "weight": 0.85,
      "jobId": 23,
      "area": "Sala y Restauración",
      "sameArea": true
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
  "Chef": [...],
  "Recepcionista": [...]
}
```

**Características:**
- Pesos de 0.0 (nada relacionado) a 1.0 (muy relacionado)
- Ordenados de mayor a menor peso
- Incluye área y si es del mismo sector
- ~2000 puestos de trabajo × ~20 relaciones = ~40,000 relaciones

**Generado por:** Scripts de análisis previo (no parte del runtime)

---

### 2. **city_coordinates.json** (2.2 KB)

**Propósito:** Coordenadas GPS de ciudades principales

**Estructura:**
```json
{
  "madrid": { "lat": 40.4168, "lon": -3.7038 },
  "barcelona": { "lat": 41.3851, "lon": 2.1734 },
  "valencia": { "lat": 39.4699, "lon": -0.3763 },
  "sitges": { "lat": 41.2372, "lon": 1.8056 },
  "sant cugat del valles": { "lat": 41.4732, "lon": 2.0856 }
  // ... 43 ciudades
}
```

**Características:**
- Solo ciudades principales
- Usado para calcular distancias dinámicas en runtime
- Nombres normalizados (lowercase, sin acentos)

---

### 3. **city_distances.json** (8.9 MB)

**Propósito:** Distancias pre-calculadas entre ciudades (≤150 km)

**Estructura:**
```json
{
  "Barcelona": [
    {
      "city": "Hospitalet de Llobregat",
      "distance": 4.2,
      "country": "España"
    },
    {
      "city": "Sant Cugat del Vallés",
      "distance": 12.5,
      "country": "España"
    },
    {
      "city": "Sitges",
      "distance": 34.2,
      "country": "España"
    }
    // ... hasta 150km
  ]
}
```

**Características:**
- 1,057 ciudades
- Distancias hasta 150 km
- Pre-calculado para performance
- Usado en `lib/enrichOffers.js` para el campo `enriched.nearby_cities`

---

### 4. **job_id_to_names.json** (759 KB)

**Propósito:** Sinónimos y variaciones multiidioma de puestos

**Estructura:**
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
    "Servidor"
  ]
}
```

**Características:**
- Mapeo jobId → nombres
- Múltiples idiomas (ES, EN, PT)
- Usado para matching robusto en `findBestJobMatch()`

---

## 🔧 FASE 1: Enriquecimiento

**Archivo:** `lib/enrichOffers.js`

**Cuándo se ejecuta:** Al cargar ofertas desde el feed (API `/api/jobs/refresh`)

### Función Principal: `enrichOffers(offers)`

```javascript
// INPUT: Array de ofertas raw
[
  {
    "id": 123,
    "titulo": "Camarero/a - Hotel Meliá",
    "ciudad": "Barcelona",
    "empresa": "Meliá Hotels",
    "url": "https://...",
    // ... otros campos
  }
]

// OUTPUT: Array de ofertas enriched
[
  {
    "id": 123,
    "titulo": "Camarero/a - Hotel Meliá",
    "ciudad": "Barcelona",
    "empresa": "Meliá Hotels",
    "url": "https://...",
    "enriched": {  // ← NUEVO CAMPO
      "related_jobs": [
        {
          "job": "Ayudante de Camarero",
          "weight": 0.92,
          "area": "Sala y Restauración",
          "available_offers": 15
        },
        {
          "job": "Barman",
          "weight": 0.85,
          "area": "Sala y Restauración",
          "available_offers": 8
        }
        // ... hasta 20 trabajos relacionados
      ],
      "nearby_cities": [
        {
          "city": "Hospitalet de Llobregat",
          "distance": 4.2,
          "country": "España",
          "available_offers": 23
        },
        {
          "city": "Sant Cugat del Vallés",
          "distance": 12.5,
          "country": "España",
          "available_offers": 7
        }
        // ... hasta 5 ciudades cercanas
      ]
    }
  }
]
```

### Proceso Paso a Paso

#### 1. **Pre-cálculo de Índices** (O(n))

```javascript
// Crear índices para lookups O(1)
const jobIndex = new Map();
const cityIndex = new Map();

offers.forEach(offer => {
  const jobKey = normalizeJobTitle(offer.titulo);
  jobIndex.set(jobKey, (jobIndex.get(jobKey) || 0) + 1);

  const cityKey = normalizeCityName(offer.ciudad);
  cityIndex.set(cityKey, (cityIndex.get(cityKey) || 0) + 1);
});

// Resultado:
// jobIndex: { "camarero" => 152, "chef" => 87, "recepcionista" => 64 }
// cityIndex: { "Barcelona" => 234, "Madrid" => 189, "Valencia" => 121 }
```

#### 2. **Enriquecer Cada Oferta** (O(n))

**Paso 2.1: Buscar Puestos Relacionados**

```javascript
function enrichOffer(offer, allOffers, jobIndex, cityIndex) {
  // 1. Normalizar título: "Camarero/a - Hotel Meliá" → "camarero"
  const jobMatch = findBestJobMatch(offer.titulo);
  // jobMatch = "Camarero"

  // 2. Buscar en job_weights.json
  const relatedJobs = jobWeights[jobMatch];  // Array de ~20 trabajos

  // 3. Enriquecer con available_offers usando el índice
  enrichedOffer.enriched.related_jobs = relatedJobs
    .slice(0, 20)
    .map(rel => ({
      job: rel.job,
      weight: rel.weight,
      area: rel.area,
      available_offers: jobIndex.get(normalizeJobTitle(rel.job)) || 0
    }))
    .filter(rel => rel.weight > 0.60);
}
```

**Paso 2.2: Buscar Ciudades Cercanas**

```javascript
// 1. Normalizar ciudad: "barcelona" → "Barcelona"
const cityName = normalizeCityName(offer.ciudad);

// 2. Buscar en city_distances.json
const nearbyCities = cityDistances[cityName];  // Array de ~50 ciudades

// 3. Enriquecer con available_offers
enrichedOffer.enriched.nearby_cities = nearbyCities
  .filter(city => city.distance <= 100)
  .slice(0, 5)
  .map(city => ({
    city: city.city,
    distance: city.distance,
    country: city.country,
    available_offers: cityIndex.get(city.city) || 0
  }))
  .filter(city => city.available_offers > 0);
```

### Funciones Auxiliares Importantes

#### `findBestJobMatch(jobTitle)`

Encuentra el puesto en `job_weights.json` que mejor matchea con el título de la oferta.

**Estrategia (en orden):**

1. **Mapeo multiidioma:** "Bartender" → "Barman" (usando `job_id_to_names.json`)
2. **Match exacto:** "Camarero" === "Camarero"
3. **Primera palabra:** "Camarero/a - Bar" → "Camarero"
4. **Inclusión:** "Chef de Partida Pastelería" contiene "Chef de Partida"
5. **Keywords:** "Segundo de Cocina" matchea con "Sous Chef" (keywords: "segundo", "cocina")

**Ejemplo:**
```javascript
findBestJobMatch("Camarero/a - Hotel Meliá")
// → "Camarero"

findBestJobMatch("Bartender - Cocktail Bar")
// → "Barman" (via mapeo multiidioma)

findBestJobMatch("Chef de Partie - Pastry Section")
// → "Chef de Partida" (via keywords)
```

#### `normalizeCityName(cityName)`

Normaliza nombres de ciudades para encontrar match en `city_distances.json`.

**Estrategia:**
1. Capitalización correcta: "BARCELONA" → "Barcelona"
2. Artículos en minúscula: "LAS PALMAS DE GRAN CANARIA" → "Las Palmas de Gran Canaria"
3. Mapeos específicos: "lisboa" → "Lisbon"
4. Variaciones: "Las Palmas de Gran Canaria" → "Las Palmas"

---

## 🔍 FASE 2: Búsqueda y Amplificación

**Archivo:** `api/jobs/search.js`

**Cuándo se ejecuta:** Cuando el usuario hace una búsqueda (GET `/api/jobs/search?query=...&location=...`)

### Mapa Dinámico de Ciudades Cercanas

**Construcción en runtime:**

```javascript
function buildDynamicCityDistances(offers) {
  // 1. Extraer ciudades únicas con ofertas
  const citiesWithOffers = new Set();
  offers.forEach(offer => {
    citiesWithOffers.add(normalizeText(offer.ciudad));
  });
  // citiesWithOffers = ["barcelona", "madrid", "valencia", "sitges", ...]

  // 2. Para cada ciudad, calcular distancias a OTRAS ciudades con ofertas
  const cityMap = {};
  citiesWithOffers.forEach(city1 => {
    const coords1 = findCityInCoordinates(city1, city_coordinates.json);

    const nearbyCities = [];
    citiesWithOffers.forEach(city2 => {
      if (city1 === city2) return;

      const coords2 = city_coordinates.json[city2];
      const distance = calculateDistance(coords1, coords2);

      if (distance <= 50) {  // Solo ≤50km
        nearbyCities.push({ city: city2, distance });
      }
    });

    nearbyCities.sort((a, b) => a.distance - b.distance);
    cityMap[city1] = nearbyCities;
  });

  return cityMap;
}

// Resultado:
// {
//   "barcelona": [
//     { "city": "hospitalet de llobregat", "distance": 4.2 },
//     { "city": "sant cugat del valles", "distance": 12.5 },
//     { "city": "sitges", "distance": 34.2 }
//   ],
//   "sitges": [
//     { "city": "castelldefels", "distance": 8.7 },
//     { "city": "viladecans", "distance": 18.3 },
//     { "city": "barcelona", "distance": 34.2 }
//   ]
// }
```

**Ventaja:** Solo incluye ciudades con ofertas activas (reduce búsquedas innecesarias).

---

### Niveles de Amplificación

#### NIVEL 1: Búsqueda Normal (≥10 resultados)

```javascript
// Query: "camarero madrid"
const results = cacheData.offers.filter(offer =>
  normalizeText(offer.titulo).includes("camarero") &&
  normalizeText(offer.ciudad).includes("madrid")
);

if (results.length >= 10) {
  return {
    results: results.slice(0, 10),
    pagination: { total_matches: results.length },
    amplification_used: null  // ← Sin amplificación
  };
}
```

---

#### NIVEL 0.5: Sin Resultados → Mismo Puesto en Ciudades Cercanas

**Trigger:** `totalMatches === 0 && query && location`

```javascript
// Query: "barman sant cugat" → 0 resultados

// 1. Buscar ciudades cercanas
const nearbyCities = dynamicCityDistances["sant cugat del valles"];
// nearbyCities = [
//   { city: "barcelona", distance: 12.5 },
//   { city: "cerdanyola del valles", distance: 3.8 }
// ]

// 2. Buscar MISMO puesto (barman) en ciudades cercanas
const offersInNearbyCities = [];

nearbyCities.forEach(nearbyCity => {
  const offers = cacheData.offers.filter(offer =>
    normalizeText(offer.titulo).includes("barman") &&
    normalizeText(offer.ciudad).includes(nearbyCity.city)
  );

  offers.forEach(offer => {
    offersInNearbyCities.push({
      ...offer,
      _nearbyCity: nearbyCity.city,
      _distance: nearbyCity.distance
    });
  });
});

// 3. Response
return {
  results: [],  // ← Vacío (0 en sant cugat)
  related_jobs_results: offersInNearbyCities.slice(0, 10),  // ← 4 de Barcelona
  amplification_used: {
    type: "nivel_0_5_nearby",
    nearby_city: "Barcelona",
    distance_km: 12.5,
    original_query: "barman",
    original_location: "sant cugat"
  }
};
```

---

#### NIVEL 1.5: Pocos Resultados (1-9) → Ampliar con Cercanas

**Trigger:** `totalMatches > 0 && totalMatches < 10 && query && location`

```javascript
// Query: "recepcionista viladecans" → 2 resultados

// 1. Buscar ciudades cercanas
const nearbyCities = dynamicCityDistances["viladecans"];
// nearbyCities = [{ city: "barcelona", distance: 8.3 }]

// 2. Buscar MISMO puesto en ciudades cercanas
const offersInNearbyCities = cacheData.offers.filter(offer =>
  normalizeText(offer.titulo).includes("recepcionista") &&
  normalizeText(offer.ciudad).includes("barcelona")
);

// 3. Response
return {
  results: [/* 2 de viladecans */],
  related_jobs_results: offersInNearbyCities.slice(0, 8),  // ← 8 de Barcelona
  amplification_used: {
    type: "nivel_1_5_nearby",
    original_count: 2,
    added_count: 8,
    nearby_city: "Barcelona",
    distance_km: 8.3
  }
};
```

**NUEVO: Fallback a NIVEL 2 si no alcanza 10**

```javascript
// Si después de NIVEL 1.5 aún hay < 10 resultados
if (currentTotal < 10) {
  // Activar NIVEL 2: buscar trabajos RELACIONADOS
  const offersInSameCity = cacheData.offers.filter(job =>
    normalizeText(job.ciudad).includes(location)
  );

  offersInSameCity.forEach(job => {
    if (job.enriched && job.enriched.related_jobs) {
      const matchingRelatedJob = job.enriched.related_jobs.find(rel =>
        normalizeText(rel.job).includes(query) && rel.weight > 0.80
      );

      if (matchingRelatedJob) {
        offersWithRelatedJobs.push({ offer: job, ... });
      }
    }
  });

  // Si aún no llega a 10, buscar en ciudades cercanas (NIVEL 2 NEARBY)
}
```

---

#### NIVEL 2: Sin Resultados → Trabajos Relacionados

**Trigger:** `totalMatches === 0 && query && location && NIVEL_0_5_falló`

```javascript
// Query: "pastelero valencia" → 0 resultados directos
// NIVEL 0.5 no encontró "pastelero" en ciudades cercanas

// 1. Buscar ofertas de Valencia
const offersInValencia = cacheData.offers.filter(offer =>
  normalizeText(offer.ciudad).includes("valencia")
);

// 2. Buscar en enriched.related_jobs de cada oferta
const offersWithRelatedJobs = [];

offersInValencia.forEach(job => {
  if (job.enriched && job.enriched.related_jobs) {
    // Buscar si "pastelero" está en los related_jobs de esta oferta
    const matchingRelatedJob = job.enriched.related_jobs.find(rel =>
      normalizeText(rel.job).includes("pastelero") && rel.weight > 0.80
    );

    if (matchingRelatedJob) {
      // ¡MATCH! Esta oferta tiene "pastelero" como trabajo relacionado
      offersWithRelatedJobs.push({
        offer: job,  // ← La oferta completa (ej: "Chef de Partida")
        relatedJobName: matchingRelatedJob.job,  // ← "Pastelero"
        weight: matchingRelatedJob.weight  // ← 0.85
      });
    }
  }
});

// offersWithRelatedJobs = [
//   { offer: {titulo: "Chef de Partida", ...}, relatedJobName: "Pastelero", weight: 0.85 },
//   { offer: {titulo: "Sous Chef", ...}, relatedJobName: "Pastelero", weight: 0.82 },
// ]

// 3. Extraer solo las ofertas
const relatedJobsResults = offersWithRelatedJobs
  .slice(0, 10)
  .map(item => item.offer);

// 4. Response
return {
  results: [],  // ← Vacío (0 pasteleros directos)
  related_jobs_results: relatedJobsResults,  // ← 5 ofertas (Chef, Sous Chef, etc.)
  amplification_used: {
    type: "nivel_2",
    original_query: "pastelero",
    original_location: "valencia",
    related_job_used: "Pastelero",  // ← El trabajo que buscaba el usuario
    weight: 0.85
  }
};
```

**¿De dónde sale `related_job_used`?**

```javascript
amplification_used.related_job_used = offersWithRelatedJobs[0].relatedJobName;
// = "Pastelero" (el query del usuario)
```

**¿Por qué funciona?**

1. `enriched.related_jobs` tiene la relación bidireccional:
   - "Chef de Partida" → related_jobs incluye "Pastelero" (weight 0.85)
   - "Pastelero" → related_jobs incluye "Chef de Partida" (weight 0.85)

2. El backend busca en TODAS las ofertas de Valencia
3. Encuentra que "Chef de Partida" tiene "Pastelero" en su lista
4. Retorna la oferta de "Chef de Partida" como resultado relacionado

---

#### NIVEL 2 NEARBY: Sin Resultados → Trabajos Relacionados en Ciudades Cercanas

**Trigger:** `NIVEL_2 activado && offersWithRelatedJobs < 10`

```javascript
// Query: "pastelero sitges" → 0 resultados en Sitges

// 1. Buscar en Sitges (NIVEL 2)
const offersInSitges = cacheData.offers.filter(offer =>
  normalizeText(offer.ciudad).includes("sitges")
);

offersInSitges.forEach(job => {
  // Buscar "pastelero" en enriched.related_jobs
  const matchingRelatedJob = job.enriched.related_jobs.find(rel =>
    normalizeText(rel.job).includes("pastelero") && rel.weight > 0.80
  );

  if (matchingRelatedJob) {
    offersWithRelatedJobs.push({ offer: job, ... });
  }
});

// offersWithRelatedJobs.length = 2 (< 10)

// 2. Activar NEARBY: Buscar en ciudades cercanas
const nearbyCities = dynamicCityDistances["sitges"];
// nearbyCities = [
//   { city: "castelldefels", distance: 8.7 },
//   { city: "barcelona", distance: 34.2 }
// ]

const offersInNearbyCities = cacheData.offers.filter(offer =>
  nearbyCities.some(nc => normalizeText(offer.ciudad).includes(nc.city))
);

offersInNearbyCities.forEach(job => {
  const matchingRelatedJob = job.enriched.related_jobs.find(rel =>
    normalizeText(rel.job).includes("pastelero") && rel.weight > 0.80
  );

  if (matchingRelatedJob) {
    offersWithRelatedJobs.push({
      offer: job,
      relatedJobName: matchingRelatedJob.job,
      weight: matchingRelatedJob.weight,
      nearbyCity: job.ciudad,  // ← "Barcelona"
      distance: 34.2  // ← Distancia
    });
  }
});

// 3. Response
return {
  results: [],
  related_jobs_results: offersWithRelatedJobs.slice(0, 10).map(i => i.offer),
  amplification_used: {
    type: "nivel_2_nearby",  // ← Trabajos relacionados + ciudades cercanas
    original_query: "pastelero",
    original_location: "sitges",
    related_job_used: "Pastelero",
    nearby_city: "Barcelona",  // ← Ciudad más común en los resultados
    distance_km: 34.2
  }
};
```

---

## 📊 Estructura de Datos en Cada Etapa

### Etapa 1: Oferta Raw (desde feed XML)

```json
{
  "id": 123,
  "titulo": "Camarero/a - Hotel Meliá Barcelona",
  "empresa": "Meliá Hotels International",
  "ciudad": "Barcelona",
  "region": "Cataluña",
  "url": "https://turijobs.com/oferta/123",
  "salario": "1800-2200€",
  "categoria": "Sala y Restauración",
  "tipo_jornada": "Completa",
  "fecha_publicacion": "2025-11-01"
}
```

---

### Etapa 2: Oferta Enriched (después de `lib/enrichOffers.js`)

```json
{
  "id": 123,
  "titulo": "Camarero/a - Hotel Meliá Barcelona",
  "empresa": "Meliá Hotels International",
  "ciudad": "Barcelona",
  "region": "Cataluña",
  "url": "https://turijobs.com/oferta/123",
  "salario": "1800-2200€",
  "categoria": "Sala y Restauración",
  "tipo_jornada": "Completa",
  "fecha_publicacion": "2025-11-01",

  "enriched": {  // ← NUEVO CAMPO
    "related_jobs": [
      {
        "job": "Ayudante de Camarero",
        "weight": 0.92,
        "area": "Sala y Restauración",
        "available_offers": 15
      },
      {
        "job": "Barman",
        "weight": 0.85,
        "area": "Sala y Restauración",
        "available_offers": 8
      },
      {
        "job": "Sommelier",
        "weight": 0.78,
        "area": "Sala y Restauración",
        "available_offers": 3
      }
      // ... hasta 20
    ],
    "nearby_cities": [
      {
        "city": "Hospitalet de Llobregat",
        "distance": 4.2,
        "country": "España",
        "available_offers": 23
      },
      {
        "city": "Sant Cugat del Vallés",
        "distance": 12.5,
        "country": "España",
        "available_offers": 7
      }
      // ... hasta 5
    ]
  }
}
```

---

### Etapa 3: Objeto Temporal `offersWithRelatedJobs[]` (NIVEL 2)

**Solo existe en memoria durante la búsqueda:**

```javascript
const offersWithRelatedJobs = [
  {
    offer: {  // ← Oferta COMPLETA (incluye enriched)
      "id": 456,
      "titulo": "Chef de Partida - NH Valencia",
      "ciudad": "Valencia",
      "enriched": { ... }
    },
    relatedJobName: "Pastelero",  // ← El query del usuario
    weight: 0.85,  // ← Peso de la relación
    nearbyCity: null,  // ← null si es de la misma ciudad
    distance: null
  },
  {
    offer: {
      "id": 789,
      "titulo": "Sous Chef - Meliá Barcelona",
      "ciudad": "Barcelona",
      "enriched": { ... }
    },
    relatedJobName: "Pastelero",
    weight: 0.82,
    nearbyCity: "Barcelona",  // ← SI es de ciudad cercana
    distance: 34.2
  }
];
```

**Este objeto se usa para:**
1. Construir `related_jobs_results[]`
2. Construir `amplification_used`

**Luego se descarta** (no se envía al cliente).

---

### Etapa 4: Response Final del API

```json
{
  "success": true,

  "results": [],  // ← Resultados directos (vacío en NIVEL 2)

  "related_jobs_results": [  // ← Ofertas relacionadas (de offersWithRelatedJobs)
    {
      "id": 456,
      "titulo": "Chef de Partida - NH Valencia",
      "empresa": "NH Hotels",
      "ciudad": "Valencia",
      "url": "https://...",
      "enriched": {  // ← INCLUIDO pero NO usado por el asistente
        "related_jobs": [...],
        "nearby_cities": [...]
      }
    },
    {
      "id": 789,
      "titulo": "Sous Chef - Meliá Barcelona",
      "empresa": "Meliá Hotels",
      "ciudad": "Barcelona",
      "enriched": { ... }
    }
    // ... hasta 10 ofertas
  ],

  "amplification_used": {  // ← Metadata de amplificación
    "type": "nivel_2_nearby",
    "original_query": "pastelero",
    "original_location": "valencia",
    "related_job_used": "Pastelero",  // ← De offersWithRelatedJobs[0].relatedJobName
    "weight": 0.85,  // ← De offersWithRelatedJobs[0].weight
    "nearby_city": "Barcelona",
    "distance_km": 34.2,
    "total_related_found": 12,
    "related_pagination": {
      "total_matches": 12,
      "returned_results": 10,
      "offset": 0,
      "limit": 10,
      "has_more": true,
      "remaining": 2,
      "next_offset": 10
    }
  },

  "pagination": {
    "total_matches": 0,  // ← 0 porque no hay pasteleros directos
    "returned_results": 0,
    "offset": 0,
    "limit": 10
  },

  "metadata": {
    "last_update": "2025-11-04T08:00:00Z",
    "total_jobs": 2052,
    "cities_with_offers": 323
  }
}
```

---

### Etapa 5: Response Optimizado (sin `enriched`)

**Propuesta de optimización para el chat:**

```json
{
  "success": true,
  "results": [],

  "related_jobs_results": [
    {
      "id": 456,
      "titulo": "Chef de Partida - NH Valencia",
      "empresa": "NH Hotels",
      "ciudad": "Valencia",
      "url": "https://..."
      // ❌ enriched eliminado
    },
    {
      "id": 789,
      "titulo": "Sous Chef - Meliá Barcelona",
      "empresa": "Meliá Hotels",
      "ciudad": "Barcelona",
      "url": "https://..."
    }
  ],

  "amplification_used": {  // ← Toda la info está aquí
    "type": "nivel_2_nearby",
    "related_job_used": "Pastelero",
    "nearby_city": "Barcelona",
    "distance_km": 34.2
  }
}
```

**Reducción:** ~20-30% menos datos transferidos al asistente

---

## 🚀 Usos Fuera del Chat

### Caso 1: Frontend de Búsqueda Tradicional

**Escenario:** Un frontend React/Vue que muestra ofertas de trabajo.

**Implementación:**

```javascript
// Frontend: SearchPage.jsx
const searchJobs = async (query, location) => {
  const response = await fetch(
    `/api/jobs/search?query=${query}&location=${location}&limit=20`
  );
  const data = await response.json();

  // Caso 1: Resultados directos
  if (data.results.length >= 10) {
    return {
      title: `${data.pagination.total_matches} ofertas de ${query} en ${location}`,
      offers: data.results,
      type: 'direct'
    };
  }

  // Caso 2: NIVEL 0.5 - Mismo puesto en ciudades cercanas
  if (data.amplification_used?.type === 'nivel_0_5_nearby') {
    return {
      title: `No hay ${query} en ${location}, pero encontramos ${data.related_jobs_results.length} en ${data.amplification_used.nearby_city} (${data.amplification_used.distance_km} km)`,
      offers: data.related_jobs_results,
      type: 'nearby_same_job',
      nearbyCity: data.amplification_used.nearby_city,
      distance: data.amplification_used.distance_km
    };
  }

  // Caso 3: NIVEL 2 - Trabajos relacionados
  if (data.amplification_used?.type === 'nivel_2') {
    return {
      title: `No hay ${query} en ${location}, pero encontramos ${data.related_jobs_results.length} ofertas relacionadas de ${data.amplification_used.related_job_used}`,
      offers: data.related_jobs_results,
      type: 'related_jobs',
      relatedJobType: data.amplification_used.related_job_used,
      weight: data.amplification_used.weight
    };
  }

  // Caso 4: Sin resultados
  return {
    title: `No encontramos ofertas de ${query} en ${location}`,
    offers: [],
    type: 'no_results'
  };
};
```

**Vista:**

```jsx
<div className="search-results">
  <h2>{result.title}</h2>

  {result.type === 'related_jobs' && (
    <div className="info-banner">
      <InfoIcon />
      <p>
        Estas ofertas son de <strong>{result.relatedJobType}</strong>,
        un puesto similar a {query} (similitud: {Math.round(result.weight * 100)}%)
      </p>
    </div>
  )}

  {result.type === 'nearby_same_job' && (
    <div className="info-banner">
      <LocationIcon />
      <p>
        Estas ofertas están en <strong>{result.nearbyCity}</strong>,
        a {result.distance} km de {location}
      </p>
    </div>
  )}

  <OffersList offers={result.offers} />

  {data.amplification_used?.related_pagination?.has_more && (
    <button onClick={() => loadMore(data.amplification_used.related_pagination.next_offset)}>
      Ver {data.amplification_used.related_pagination.remaining} ofertas más
    </button>
  )}
</div>
```

---

### Caso 2: Widget de "Trabajos Similares"

**Escenario:** Mostrar trabajos similares en la página de detalle de una oferta.

**NO necesitas hacer requests adicionales:**

```javascript
// Opción 1: Usar enriched (si lo mantienes en el API)
const offer = await fetch(`/api/jobs/123`).then(r => r.json());

<SimilarJobsWidget>
  <h3>Trabajos Similares</h3>
  <ul>
    {offer.enriched.related_jobs.slice(0, 5).map(relatedJob => (
      <li key={relatedJob.job}>
        <a href={`/buscar?query=${relatedJob.job}&location=${offer.ciudad}`}>
          {relatedJob.job} ({relatedJob.available_offers} ofertas)
        </a>
        <span className="similarity">{Math.round(relatedJob.weight * 100)}% similar</span>
      </li>
    ))}
  </ul>
</SimilarJobsWidget>
```

**Opción 2: Endpoint dedicado `/api/jobs/similar/:id`**

```javascript
// Backend: api/jobs/similar/[id].js
export default async function handler(req, res) {
  const { id } = req.query;
  const offer = cacheData.offers.find(o => o.id === id);

  if (!offer) return res.status(404).json({ error: 'Not found' });

  // Retornar solo related_jobs SIN el enriched de cada oferta
  return res.json({
    job_title: offer.titulo,
    related_jobs: offer.enriched.related_jobs.map(rel => ({
      job: rel.job,
      weight: rel.weight,
      available_offers: rel.available_offers
    }))
  });
}
```

---

### Caso 3: Autocompletado Inteligente

**Escenario:** Sugerir búsquedas relacionadas mientras el usuario escribe.

```javascript
// Frontend: SearchAutocomplete.jsx
const getSuggestions = async (query) => {
  // Opción 1: Buscar ofertas y extraer related_jobs
  const response = await fetch(`/api/jobs/search?query=${query}&limit=1`);
  const data = await response.json();

  if (data.results.length > 0) {
    const firstOffer = data.results[0];
    return firstOffer.enriched.related_jobs.slice(0, 5).map(rel => ({
      text: rel.job,
      count: rel.available_offers,
      similarity: rel.weight
    }));
  }

  return [];
};

// Vista
<Autocomplete
  value={query}
  onChange={setQuery}
  suggestions={suggestions}
  renderSuggestion={(suggestion) => (
    <div className="suggestion">
      <span className="job-name">{suggestion.text}</span>
      <span className="count">{suggestion.count} ofertas</span>
      <span className="similarity">{Math.round(suggestion.similarity * 100)}%</span>
    </div>
  )}
/>
```

---

### Caso 4: Analytics y Estadísticas

**Escenario:** Dashboard de estadísticas de búsquedas y amplificaciones.

```javascript
// Backend: api/analytics/amplification-stats.js
export default async function handler(req, res) {
  const stats = {
    total_searches: 0,
    nivel_1: 0,  // Búsquedas con resultados directos
    nivel_0_5: 0,  // Amplificadas a ciudades cercanas (mismo puesto)
    nivel_1_5: 0,  // Amplificadas a ciudades cercanas (pocos resultados)
    nivel_2: 0,  // Amplificadas a trabajos relacionados
    nivel_2_nearby: 0,  // Amplificadas a trabajos relacionados en ciudades cercanas
    no_results: 0  // Sin resultados
  };

  // Analizar logs de búsquedas (almacenados en DB o analytics)
  const searchLogs = await getSearchLogs();

  searchLogs.forEach(log => {
    stats.total_searches++;

    if (!log.amplification_used) {
      stats.nivel_1++;
    } else {
      stats[log.amplification_used.type.replace(/-/g, '_')]++;
    }
  });

  return res.json({
    stats,
    amplification_rate: ((stats.total_searches - stats.nivel_1) / stats.total_searches * 100).toFixed(2) + '%',
    most_common_amplification: Object.entries(stats)
      .filter(([key]) => key.startsWith('nivel_'))
      .sort(([,a], [,b]) => b - a)[0]
  });
}
```

---

### Caso 5: Recomendaciones Personalizadas

**Escenario:** Recomendar trabajos basados en el historial del usuario.

```javascript
// Backend: api/recommendations/for-user.js
export default async function handler(req, res) {
  const { userId } = req.query;

  // 1. Obtener trabajos que el usuario ha visto/aplicado
  const userHistory = await getUserJobHistory(userId);
  // userHistory = [{ jobTitle: "Camarero", count: 5 }, { jobTitle: "Barman", count: 2 }]

  // 2. Construir mapa de trabajos relacionados
  const relatedJobsMap = new Map();

  cacheData.offers.forEach(offer => {
    // Verificar si el título de la oferta matchea con el historial
    const historyMatch = userHistory.find(h =>
      normalizeJobTitle(offer.titulo).includes(normalizeJobTitle(h.jobTitle))
    );

    if (historyMatch && offer.enriched?.related_jobs) {
      offer.enriched.related_jobs.forEach(rel => {
        const count = relatedJobsMap.get(rel.job) || 0;
        relatedJobsMap.set(rel.job, count + (rel.weight * historyMatch.count));
      });
    }
  });

  // 3. Ordenar por score (weight × historial)
  const recommendations = Array.from(relatedJobsMap.entries())
    .map(([job, score]) => ({ job, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return res.json({
    recommendations,
    based_on: userHistory.map(h => h.jobTitle)
  });
}
```

---

## ⚡ Optimizaciones y Consideraciones

### 1. **Performance: Índices Pre-calculados**

**Problema:** Calcular `available_offers` para cada trabajo relacionado es O(n²).

**Solución:** Pre-calcular índices en O(n).

```javascript
// ANTES (O(n²) - 2000 ofertas × 20 related_jobs = 40,000 iteraciones)
relatedJobs.map(rel => ({
  job: rel.job,
  available_offers: allOffers.filter(o =>
    normalizeJobTitle(o.titulo) === normalizeJobTitle(rel.job)
  ).length  // ← Itera TODAS las ofertas por cada related_job
}))

// DESPUÉS (O(n) - 2000 ofertas + 20 lookups = 2020 operaciones)
const jobIndex = new Map();
allOffers.forEach(offer => {
  const key = normalizeJobTitle(offer.titulo);
  jobIndex.set(key, (jobIndex.get(key) || 0) + 1);
});

relatedJobs.map(rel => ({
  job: rel.job,
  available_offers: jobIndex.get(normalizeJobTitle(rel.job)) || 0  // ← Lookup O(1)
}))
```

**Resultado:** Enriquecimiento de 2000 ofertas: **25 segundos → 2 segundos**

---

### 2. **Cache: Mapa Dinámico de Ciudades**

**Problema:** `city_distances.json` (8.9 MB) incluye ciudades SIN ofertas.

**Solución:** Construir mapa dinámico solo con ciudades activas.

```javascript
// ANTES
const allCities = Object.keys(city_distances);  // 1,057 ciudades
const nearbyCities = city_distances["sitges"];  // 50 ciudades (muchas sin ofertas)

// DESPUÉS
const dynamicCityDistances = buildDynamicCityDistances(cacheData.offers);
// Solo incluye ciudades con ofertas (323 ciudades)

const nearbyCities = dynamicCityDistances["sitges"];  // 8 ciudades (todas con ofertas)
```

**Ventaja:** Reduce búsquedas innecesarias en ciudades sin ofertas.

---

### 3. **Transferencia de Datos: Eliminar `enriched` en Responses**

**Problema:** El asistente NO usa `enriched`, pero lo recibe en cada oferta.

**Solución:** Eliminar `enriched` antes de enviar al asistente.

```javascript
// ANTES (32 KB por response)
{
  "related_jobs_results": [
    {
      "titulo": "Chef de Partida",
      "enriched": {  // ← 0.63 KB × 10 ofertas = 6.3 KB innecesarios
        "related_jobs": [...],
        "nearby_cities": [...]
      }
    }
  ]
}

// DESPUÉS (25 KB por response)
{
  "related_jobs_results": [
    {
      "titulo": "Chef de Partida"
      // enriched eliminado
    }
  ]
}
```

**Ganancia estimada:** 20-30% reducción en tiempo de procesamiento del asistente.

---

### 4. **Normalización: Fuzzy Matching Robusto**

**Problema:** Títulos de ofertas tienen variaciones:
- "Camarero/a - Hotel Meliá"
- "Camarero (m/f) - Barcelona"
- "Waiter - NH Collection"

**Solución:** Función `findBestJobMatch()` con múltiples estrategias.

```javascript
findBestJobMatch("Camarero/a - Hotel Meliá")
// 1. Limpiar: "Camarero/a - Hotel Meliá" → "Camarero"
// 2. Normalizar: "Camarero" → "camarero"
// 3. Match exacto: "camarero" === "Camarero" ✓
// → Retorna "Camarero"

findBestJobMatch("Waiter - NH Collection")
// 1. Limpiar: "Waiter - NH Collection" → "Waiter"
// 2. Normalizar: "Waiter" → "waiter"
// 3. Match exacto: ✗
// 4. Mapeo multiidioma: "waiter" → "camarero" ✓
// → Retorna "Camarero"
```

---

### 5. **Paginación: `related_offset` vs `offset`**

**Concepto:** Hay DOS tipos de resultados:
- `results[]` → Resultados directos (usa `offset`)
- `related_jobs_results[]` → Resultados de amplificación (usa `related_offset`)

**Implementación:**

```javascript
// Página 1: Usuario busca "recepcionista viladecans"
GET /api/jobs/search?query=recepcionista&location=viladecans&limit=10

// Response:
{
  "results": [/* 2 de viladecans */],
  "related_jobs_results": [/* 8 de Barcelona */],
  "amplification_used": {
    "type": "nivel_1_5_nearby",
    "nearby_pagination": {
      "next_offset": 8  // ← Para la SIGUIENTE página
    }
  }
}

// Página 2: Usuario dice "siguiente"
GET /api/jobs/search?query=recepcionista&location=viladecans&related_offset=8&limit=10
//                                                              ^^^^^^^^^^^^^^
// IMPORTANTE: Usar related_offset, NO offset

// Response:
{
  "results": [],  // ← Vacío (no repetir las 2 de viladecans)
  "related_jobs_results": [/* 10 más de Barcelona */],
  "amplification_used": {
    "nearby_pagination": {
      "next_offset": 18
    }
  }
}
```

---

## 📝 Resumen de Campos Clave

| Campo | Ubicación | Propósito | Usado por |
|-------|-----------|-----------|-----------|
| `enriched.related_jobs` | Cada oferta | Metadata de puestos relacionados | Backend (FASE 2) |
| `enriched.nearby_cities` | Cada oferta | Metadata de ciudades cercanas | Backend (debugging) |
| `related_jobs_results[]` | Response del API | Ofertas filtradas por amplificación | Frontend/Chat |
| `amplification_used` | Response del API | Metadata de amplificación | Frontend/Chat |
| `amplification_used.related_job_used` | Response del API | Nombre del trabajo relacionado | Chat (para mensaje) |
| `amplification_used.nearby_city` | Response del API | Ciudad cercana usada | Chat (para mensaje) |
| `offersWithRelatedJobs[]` | Memoria temporal | Construcción de response | Backend (descartado) |
| `dynamicCityDistances` | Memoria (cache) | Mapa de ciudades con ofertas | Backend (búsqueda) |

---

## 🎯 Conclusiones

1. **`enriched` es metadata de construcción, NO de presentación**
   - Se usa en el backend para BUSCAR
   - NO se necesita en el response final (excepto para debugging)

2. **`related_jobs_results[]` ya contiene las ofertas procesadas**
   - El frontend/chat solo necesita mostrarlas
   - Toda la metadata está en `amplification_used`

3. **Eliminar `enriched` del response al chat:**
   - ✅ Reduce transferencia de datos en ~20-30%
   - ✅ Acelera procesamiento del asistente
   - ✅ Mantiene toda la funcionalidad
   - ✅ NO afecta la lógica de amplificación

4. **Para otros usos (frontend, analytics, widgets):**
   - Usar `related_jobs_results[]` para mostrar ofertas relacionadas
   - Usar `amplification_used` para metadata (qué tipo, peso, distancia)
   - Solo mantener `enriched` si necesitas mostrar "trabajos similares" en la página de detalle
   - Considerar endpoint dedicado `/api/jobs/similar/:id` en ese caso

---

**Documento creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Versión:** 1.0
