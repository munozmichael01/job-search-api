# Turijobs AI Chat Widget - Documento Funcional de Producto V2

**Versión:** 2.1
**Fecha:** 3 de noviembre de 2025
**Actualización:** Incluye reordenamiento NIVEL 0.5 y NIVEL 2 (commits eab6412, 18fa9db)

---

## Cambios desde V1

### Mejoras Principales

1. **Widget JavaScript Standalone** (antes React)
   - Más ligero: un solo archivo `embed.js`
   - Integración simple: `<script src="..."></script>`
   - Compatible con Webflow y cualquier sitio web

2. **NIVEL 0.5: Búsqueda en Ciudades Cercanas** (NUEVO - Nov 2025)
   - Búsqueda del MISMO puesto en ciudades cercanas cuando hay 0 resultados
   - Caso "bartender sitges": busca "Bartender" en "Barcelona" (38km)
   - Caso "barman sant cugat": busca "Barman" en "Barcelona" (12km)
   - Más específico que NIVEL 2 (mantiene el puesto exacto)

3. **NIVEL 2 + NEARBY CITIES**
   - Búsqueda ampliada: puestos relacionados + ciudades cercanas
   - Caso "sushiman castelldefels": busca "Cocinero" en "Barcelona" (20km)
   - Ahora es fallback de NIVEL 0.5 (solo si NIVEL 0.5 no encuentra nada)

4. **Optimizaciones de Performance**
   - Índices pre-calculados: O(n²) → O(n)
   - Refresh: 5+ minutos → 12 segundos
   - Cache reducido: 11.5MB → 3-4MB

5. **Mejoras de UX**
   - Mensajes más precisos: "ofertas relacionadas" vs "ofertas de [puesto]"
   - Paginación natural (GPT-4 decide cuántas ofertas mostrar)

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Flujo de Datos](#flujo-de-datos)
4. [Sistema de Enriquecimiento](#sistema-de-enriquecimiento)
5. [Estrategia de Búsqueda Multinivel](#estrategia-de-búsqueda-multinivel)
6. [Procesos y Scripts](#procesos-y-scripts)
7. [Widget de Chat](#widget-de-chat)
8. [API Endpoints](#api-endpoints)
9. [Performance y Optimizaciones](#performance-y-optimizaciones)
10. [Estado Actual](#estado-actual)

---

## Resumen Ejecutivo

El **Turijobs AI Chat Widget** es un asistente conversacional alimentado por GPT-4o que permite buscar ofertas de empleo del sector turístico mediante lenguaje natural.

### Características Clave

- 🎯 **Búsqueda Inteligente**: Amplifica resultados con puestos relacionados y ciudades cercanas
- 🌍 **Multiidioma**: 13,903 denominaciones en 8+ idiomas
- 📍 **Geo-aware**: 43,854 ciudades con distancias calculadas
- ⚡ **Alta Performance**: Refresh en 12 segundos, cache de 3-4MB
- 💬 **Conversacional**: Asistente proactivo que muestra resultados automáticamente

### Estado Actual (Noviembre 2025)

- ✅ ~3,000 ofertas activas en caché
- ✅ 95%+ ofertas con puestos relacionados (20 por oferta)
- ✅ 85%+ ofertas con ciudades cercanas (5 por oferta)
- ✅ Widget JavaScript standalone en producción
- ✅ Refresh en 12.2 segundos (optimizado con índices)
- ✅ Cache de 3-4MB (eliminada descripcion)

---

## Arquitectura del Sistema

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO (Web/Mobile)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          JavaScript Chat Widget (Frontend)                   │
│  - widget/embed.js (standalone, vanilla JS)                  │
│  - Auto-contenido: HTML + CSS + JS en un archivo            │
│  - Responsive: Desktop, Tablet, Mobile                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Vercel Serverless)                  │
│  - /api/chat/create-thread (crear conversación)             │
│  - /api/chat/send-message (enviar mensaje)                  │
│  - /api/chat/get-messages (obtener historial)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         OpenAI Assistants API (GPT-4o)                       │
│  - Assistant ID: asst_vfJs03e6YW2A0eCr9IrzhPBn              │
│  - Prompt: assistant_prompt_with_nearby_v2.txt              │
│  - Function calling: searchJobs                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Job Search API (Backend)                        │
│  - /api/jobs/search (búsqueda con amplificación)            │
│  - /api/jobs/refresh (actualización de cache)               │
│  - /api/jobs/status (estado del cache)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    lib/enrichOffers.js (Enriquecimiento de Datos)           │
│  - enrichOffer(): Añade related_jobs y nearby_cities        │
│  - enrichOffers(): Procesa batch con índices O(n)           │
│  - findBestJobMatch(): Fuzzy matching de puestos            │
│  - normalizeCityName(): Normalización de ciudades           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    Data Files (Datos Pre-calculados)                        │
│  - data/job_weights.json (puestos relacionados)             │
│  - data/city_distances.json (ciudades cercanas)             │
│  - data/job_id_to_names.json (sinónimos multiidioma)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vercel KV (Redis)                           │
│  - Key: job_offers_cache                                    │
│  - Value: {metadata, offers: compactOffers}                 │
│  - TTL: 48 horas (172800 segundos)                          │
│  - Size: ~3-4MB (sin descripcion)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Turijobs.com XML Feed                           │
│  - URL: https://www.turijobs.com/turijobs.xml              │
│  - Actualización: On-demand cuando cache expira            │
│  - Parsing: xml2js → JSON                                   │
└─────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| **Frontend** | Vanilla JavaScript | ES6+ |
| **Backend** | Node.js + Express/Vercel Functions | 18.x |
| **IA** | OpenAI GPT-4o | gpt-4o |
| **Cache** | Vercel KV (Redis) | Latest |
| **Deployment** | Vercel | Latest |
| **Data Processing** | Node.js scripts | 18.x |

---

## Flujo de Datos

### 1. Refresh del Cache (Actualización de Ofertas)

**Trigger:** Cache expirado (>48h) o llamada manual a `/api/jobs/refresh`

**Proceso:**

```
1. Descargar XML
   └─> GET https://www.turijobs.com/turijobs.xml
   └─> Parse con xml2js
   └─> Normalizar datos

2. Enriquecer Ofertas (lib/enrichOffers.js)
   ├─> Pre-calcular índices (jobIndex, cityIndex)
   │   └─> Map<string, number> para lookups O(1)
   │
   ├─> Para cada oferta:
   │   ├─> findBestJobMatch() → Buscar puesto en job_weights.json
   │   │   └─> Fuzzy matching multiidioma
   │   │   └─> Prioriza primera palabra significativa
   │   │
   │   ├─> Añadir related_jobs (top 20, weight > 0.60)
   │   │   └─> Lookup O(1) en jobIndex para available_offers
   │   │
   │   └─> Añadir nearby_cities (top 5, distance ≤ 100km)
   │       └─> Lookup O(1) en cityIndex para available_offers
   │
   └─> Resultado: Array de ofertas enriquecidas

3. Compactar para Cache
   └─> Eliminar campo "descripcion" (70% del tamaño)
   └─> Mantener todos los demás campos

4. Guardar en Vercel KV
   └─> Key: "job_offers_cache"
   └─> Value: { metadata: {...}, offers: compactOffers }
   └─> TTL: 48 horas
   └─> Size: ~3-4MB

⏱️ Tiempo total: ~12.2 segundos
```

### 2. Búsqueda de Ofertas (Search)

**Endpoint:** `/api/jobs/search`

**Proceso:**

```
1. Normalizar Query
   ├─> Convertir a minúsculas
   ├─> Eliminar acentos
   ├─> Trim espacios
   └─> Buscar en job_id_to_names.json → Expandir sinónimos

2. Buscar en Cache
   ├─> Filtrar por query en: titulo, empresa
   ├─> Filtrar por location en: ciudad, region
   └─> Filtrar por categoria (opcional)

3. Evaluar Nivel de Amplificación
   ├─> 10+ resultados → NIVEL 1 (búsqueda directa)
   ├─> 1-9 resultados → NIVEL 1.5 (ampliar con related_jobs)
   └─> 0 resultados → NIVEL 2 o NIVEL 2 NEARBY
       ├─> Buscar related_jobs con weight > 0.85 y available_offers > 0
       └─> Si no hay → Buscar en nearby_cities
           └─> NIVEL 2 NEARBY: related_jobs + nearby_cities

4. Retornar Resultados
   └─> {
       success: true,
       results: [...],
       related_jobs_results: [...],
       amplification_used: {
         type: "nivel_2_nearby",
         original_query: "sushiman",
         original_location: "Castelldefels",
         related_job_used: "Cocinero",
         nearby_city: "Barcelona",
         distance_km: 20
       }
     }
```

---

## Sistema de Enriquecimiento

### Archivo: `lib/enrichOffers.js`

**Funciones Principales:**

#### `enrichOffers(offers)` - Batch Processing

```javascript
export function enrichOffers(offers) {
  // 1. Pre-calcular índices (OPTIMIZACIÓN CLAVE)
  const jobIndex = new Map();  // job_title → count
  const cityIndex = new Map(); // city_name → count

  offers.forEach(offer => {
    const jobKey = normalizeJobTitle(offer.titulo);
    jobIndex.set(jobKey, (jobIndex.get(jobKey) || 0) + 1);

    const cityKey = normalizeCityName(offer.ciudad);
    cityIndex.set(cityKey, (cityIndex.get(cityKey) || 0) + 1);
  });

  // 2. Enriquecer cada oferta con lookups O(1)
  return offers.map(offer => enrichOffer(offer, offers, jobIndex, cityIndex));
}
```

**Beneficio:** O(n²) → O(n) = 180M comparaciones → 60K lookups

#### `enrichOffer(offer, allOffers, jobIndex, cityIndex)` - Individual

```javascript
export function enrichOffer(offer, allOffers, jobIndex, cityIndex) {
  // 1. Buscar puesto en job_weights.json
  const jobMatch = findBestJobMatch(offer.titulo);

  // 2. Añadir related_jobs (top 20, weight > 0.60)
  enrichedOffer.enriched.related_jobs = jobWeights[jobMatch]
    .filter(rel => !rel.job.match(/^Job_\\d+$/))  // Filtrar genéricos
    .slice(0, 20)  // Top 20 (aumentado desde 5)
    .map(rel => ({
      job: rel.job,
      weight: rel.weight,
      area: rel.area,
      available_offers: jobIndex.get(normalizeJobTitle(rel.job)) || 0  // O(1)
    }))
    .filter(rel => rel.weight > 0.60);  // Solo relevantes

  // 3. Añadir nearby_cities (top 5, distance ≤ 100km)
  enrichedOffer.enriched.nearby_cities = cityDistances[cityName]
    .filter(city => city.distance <= 100)
    .slice(0, 5)
    .map(city => ({
      city: city.city,
      distance: city.distance,
      country: city.country,
      available_offers: cityIndex.get(city.city) || 0  // O(1)
    }))
    .filter(city => city.available_offers > 0);

  return enrichedOffer;
}
```

#### `findBestJobMatch(jobTitle)` - Fuzzy Matching

**Estrategia de búsqueda:**

```javascript
// 0. Mapeo multiidioma (job_id_to_names.json)
if (denominationToKey[normalized]) return denominationToKey[normalized];

// 1. Búsqueda exacta (case insensitive)
for (const key in jobWeights) {
  if (normalizeJobTitle(key) === normalized) return key;
}

// 1.5. Primera palabra significativa
// "Camarero/a - Bar" → "Camarero" (exact match prioritario)
const firstWord = normalized.split(' ')[0];
if (firstWord.length > 3 && jobWeights[firstWord]) return firstWord;

// 2. Búsqueda por inclusión (≥2 palabras)
for (const key in jobWeights) {
  if (normalized.includes(normalizedKey) && keyWords.length >= 2) return key;
}

// 3. Búsqueda por palabras clave (keywords matching)
// Requiere ≥2 keywords coincidentes O ≥50% de las keywords de la clave
```

#### `normalizeCityName(cityName)` - Normalización de Ciudades

```javascript
// 1. Capitalize correctamente: "madrid" → "Madrid"
// 2. Mapeos específicos: "lisboa" → "Lisbon"
// 3. Variaciones comunes:
//    - "Las Palmas de Gran Canaria" → "Las Palmas"
//    - "Palma de Mallorca" → "Palma"
//    - "Santa Cruz de Tenerife" → "Santa Cruz"
```

---

## Estrategia de Búsqueda Multinivel

**ORDEN DE EJECUCIÓN** (noviembre 2025):
1. NIVEL 1 - Búsqueda directa (10+ resultados)
2. NIVEL 1.5 - Amplificación ligera (1-9 resultados)
3. **NIVEL 0.5 - MISMO puesto en ciudades cercanas (0 resultados)** ⭐ NUEVO
4. NIVEL 2 - Puestos relacionados (0 resultados, si NIVEL 0.5 no encontró nada)

### NIVEL 1: Búsqueda Directa

```
Condición: 10+ resultados encontrados
Acción: Retornar resultados directos
Mensaje: "Encontré 45 ofertas de camarero en Madrid"
```

### NIVEL 1.5: Amplificación Ligera

```
Condición: 1-9 resultados encontrados
Acción: Ampliar con related_jobs (weight > 0.80)
Mensaje: "Encontré 5 ofertas de chef ejecutivo. También agregué 8 ofertas de
         Jefe de Cocina (puesto equivalente):"

Ejemplo:
  Results: 5 ofertas de "Chef Ejecutivo"
  Related: 8 ofertas de "Jefe de Cocina" (weight: 0.95)
  Total: 13 ofertas mostradas
```

### NIVEL 0.5: MISMO Puesto en Ciudades Cercanas ⭐ NUEVO (Nov 2025)

```
Condición: 0 resultados directos + ciudad solicitada tiene coordenadas
Acción: Buscar el MISMO puesto (query) en ciudades cercanas (≤50km)
Mensaje: "No encontré ofertas de bartender en Sitges, pero encontré 4 ofertas
         de bartender en Barcelona (38 km):"

IMPORTANTE: Mantiene el puesto exacto solicitado por el usuario
(a diferencia de NIVEL 2 que busca puestos relacionados)

Lógica:
  1. Verificar que la ciudad tiene coordenadas en city_coordinates.json
  2. Buscar ciudades cercanas (≤50km) que tengan ofertas activas
  3. Calcular distancias con Haversine
  4. Buscar el MISMO puesto (usando sinónimos) en esas ciudades
  5. Retornar resultados de la ciudad más cercana con ofertas

Ejemplo Real (bartender sitges):
  1. Búsqueda directa: "Bartender" en "Sitges" → 0 resultados
  2. Sitges tiene coordenadas: { lat: 41.2376, lon: 1.8114 }
  3. Ciudades cercanas con ofertas: Barcelona (38km), Hospitalet (32km)
  4. Nueva búsqueda: "Bartender" (mismo puesto) en "Barcelona" → 4 ofertas
  5. Retorna 4 ofertas de Bartender en Barcelona

  Amplification:
    type: "nivel_0_5_nearby"
    original_query: "bartender"
    original_location: "Sitges"
    nearby_city: "Barcelona"
    distance_km: 38
    total_nearby_found: 4

Ventaja sobre NIVEL 2:
  - Sitges: NIVEL 0.5 → 4 ofertas de "Bartender" ✅
  - Sitges: NIVEL 2 → 1 oferta de "Ayudante de Barra" (menos relevante)
```

### NIVEL 2: Puestos Relacionados

```
Condición: 0 resultados directos + NIVEL 0.5 no encontró nada (!relatedJobsResults)
Acción: Buscar automáticamente el related_job más relevante
Mensaje: "No encontré ofertas de chef ejecutivo, pero encontré 12 ofertas
         relacionadas:"

Lógica:
  1. Buscar en enriched.related_jobs del puesto original
  2. Filtrar por weight > 0.85 y available_offers > 0
  3. Ordenar por weight descendente
  4. Tomar el primero
  5. Hacer nueva búsqueda con ese puesto

NOTA: Solo se ejecuta si NIVEL 0.5 NO encontró resultados
      (condición: && !relatedJobsResults)
```

### NIVEL 2 NEARBY: Puestos Relacionados + Ciudades Cercanas

```
Condición: 0 resultados directos + 0 related_jobs en la ciudad + hay nearby_cities
Acción: Buscar related_jobs en ciudades cercanas
Mensaje: "No encontré ofertas de sushiman en Castelldefels, pero encontré 10
         ofertas relacionadas en Barcelona (20 km):"

Ejemplo Real (sushiman castelldefels):
  1. Búsqueda directa: "Sushiman" en "Castelldefels" → 0 resultados
  2. NIVEL 0.5: Buscar "Sushiman" en ciudades cercanas → 0 resultados
  3. NIVEL 2: Related jobs de "Sushiman": "Cocinero" (weight: 0.87, pos 17/40)
  4. Nearby cities de "Castelldefels": Barcelona (20 km, 450 ofertas)
  5. Nueva búsqueda: "Cocinero" en "Barcelona" → 10 ofertas

  Amplification:
    type: "nivel_2_nearby"
    original_query: "sushiman"
    original_location: "Castelldefels"
    related_job_used: "Cocinero"
    nearby_city: "Barcelona"
    distance_km: 20
```

---

## Procesos y Scripts

### Scripts de Optimización Aplicados

#### `fix-performance-with-indexes.js`
**Propósito:** Optimizar cálculo de `available_offers` con índices pre-calculados

```javascript
// ANTES: O(n²) - 180M comparaciones
const count = allOffers.filter(o =>
  normalizeJobTitle(o.titulo) === normalizeJobTitle(rel.job)
).length;

// DESPUÉS: O(1) - lookup en Map
const count = jobIndex.get(normalizeJobTitle(rel.job)) || 0;
```

**Impacto:** Refresh de >5min → 12 segundos

#### `fix-cache-size-limit.js`
**Propósito:** Reducir tamaño del cache para caber en Vercel KV (10MB limit)

```javascript
// Eliminar descripcion (70% del tamaño)
const compactOffers = enrichedJobs.map(job => {
  const { descripcion, ...rest } = job;
  return rest;
});

// Guardar compactOffers en lugar de enrichedJobs
await kv.set('job_offers_cache', { metadata, offers: compactOffers });
```

**Impacto:** 11.5MB → 3-4MB

#### `fix-related-jobs-limit.js`
**Propósito:** Aumentar límite de related_jobs para mejorar amplificación

```javascript
// ANTES
.slice(0, 5)  // Top 5 related jobs

// DESPUÉS
.slice(0, 20)  // Top 20 related jobs (incluye posiciones como "Sushiman" en pos 17)
```

**Impacto:** Casos como "sushiman castelldefels" ahora funcionan (Sushiman está en posición 17 de related_jobs de Cocinero)

#### `fix-prompt-final-clean.js`
**Propósito:** Limpiar prompt del asistente, mejorar mensajes UX

```javascript
// ANTES: "pero encontré 10 ofertas de Sushiman en Barcelona"
// DESPUÉS: "pero encontré 10 ofertas relacionadas en Barcelona"

// Eliminadas instrucciones anti-paginación que no funcionaban
// GPT-4 pagina naturalmente (~3 ofertas + botón "siguiente")
```

### Scripts de Actualización del Asistente

#### `update-assistant-prompt.js`
**Propósito:** Actualizar el prompt del asistente en OpenAI

```javascript
import OpenAI from 'openai';
import fs from 'fs';

const newInstructions = fs.readFileSync('assistant_prompt_with_nearby_v2.txt', 'utf-8');

await openai.beta.assistants.update(assistantId, {
  instructions: newInstructions
});
```

**Uso:** Ejecutar después de modificar `assistant_prompt_with_nearby_v2.txt`

### Scripts de Testing

#### `test-final-sushiman.js`
**Propósito:** Verificar caso "sushiman castelldefels"

```javascript
fetch('/api/jobs/search?query=sushiman&location=castelldefels')
  .then(res => res.json())
  .then(data => {
    console.log('Resultados directos:', data.results.length);
    console.log('Related jobs results:', data.related_jobs_results?.length);
    console.log('Amplificación:', data.amplification_used?.type);
  });
```

**Resultado Esperado:**
```
Resultados directos: 0
Related jobs results: 10
Amplificación: nivel_2_nearby
```

#### `test-assistant-full.js`
**Propósito:** Test completo del flujo asistente + API

```javascript
// 1. Crear thread
// 2. Enviar mensaje "sushiman castelldefels"
// 3. Procesar tool calls (searchJobs)
// 4. Verificar respuesta final

// Verifica:
// - Dice "ofertas relacionadas" (no "ofertas de Sushiman") ✅
// - Cantidad de ofertas mostradas
// - Formato del mensaje
```

---

## Widget de Chat

### Archivo: `widget/embed.js`

**Características:**

- **Standalone:** Un solo archivo JavaScript, sin dependencias
- **Auto-contenido:** HTML + CSS + JS en un archivo
- **Responsive:** Desktop (380×600), Tablet (90vw×80vh), Mobile (fullscreen)
- **localStorage:** Persiste thread_id para continuar conversaciones

### Integración

```html
<!-- En cualquier sitio web -->
<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>

<!-- Listo! El widget aparece automáticamente -->
```

### Funcionalidades

**Botón Flotante:**
- Posición: Bottom-right (20px desktop, 16px mobile)
- Badge: Muestra "1" indicando mensaje nuevo
- Animación: Pulso sutil para llamar atención

**Ventana de Chat:**
- Header: Título, estado "En línea", botones (reset, cerrar)
- Messages: Auto-scroll, timestamps, avatares diferenciados
- Input: Textarea con Enter=enviar, Shift+Enter=nueva línea
- Footer: "Powered by Turijobs"

**Botón "Ver más ofertas":**
```javascript
// Detecta si el mensaje del asistente sugiere ver más
const hasMoreSuggestion = content.includes('muéstrame más') ||
                          content.includes('siguiente') ||
                          content.includes('ver más');

// Muestra botón quick reply
if (hasMoreSuggestion) {
  showQuickReplyButton('▶️ Ver más ofertas');
}
```

**Persistencia:**
```javascript
// Guardar thread_id en localStorage
localStorage.setItem('turijobs_thread_id', threadId);

// Recuperar al reabrir
const threadId = localStorage.getItem('turijobs_thread_id');
if (threadId) loadMessages(threadId);
```

---

## API Endpoints

### `/api/jobs/search`

**Método:** GET

**Parámetros:**
- `query` (string): Puesto o palabra clave (ej: "chef", "camarero")
- `location` (string): Ciudad o región (ej: "Barcelona", "Madrid")
- `limit` (number): Máximo resultados (default: 10, max: 100)
- `offset` (number): Para paginación (default: 0)

**Respuesta Exitosa:**
```json
{
  "success": true,
  "total_matches": 45,
  "returned_results": 10,
  "results": [{
    "id": "123",
    "titulo": "Camarero/a",
    "empresa": "Hotel Meliá",
    "ciudad": "Barcelona",
    "region": "Barcelona",
    "categoria": "Sala",
    "salario": "24,000 - 28,000 Anual/Bruto",
    "tipo_jornada": "Jornada completa",
    "url": "https://www.turijobs.com/oferta/123?utm_source=chatbot_ai...",
    "url_aplicar": "https://www.turijobs.com/oferta/123/aplicar?utm_source=...",
    "fecha_publicacion": "2025-01-15",
    "enriched": {
      "related_jobs": [{
        "job": "Mesero",
        "weight": 0.95,
        "area": "Sala",
        "available_offers": 32
      }],
      "nearby_cities": [{
        "city": "Hospitalet de Llobregat",
        "distance": 5,
        "country": "Spain",
        "available_offers": 12
      }]
    }
  }],
  "related_jobs_results": [],  // Solo si NIVEL 1.5, 2, o 2 NEARBY
  "amplification_used": null,  // Solo si NIVEL 1.5, 2, o 2 NEARBY
  "pagination": {
    "has_more": true,
    "remaining": 35
  }
}
```

**Respuesta con Amplificación (NIVEL 2 NEARBY):**
```json
{
  "success": true,
  "total_matches": 0,
  "returned_results": 10,
  "results": [],
  "related_jobs_results": [
    {
      "id": "456",
      "titulo": "Cocinero/a",
      "empresa": "Restaurante Barcelona",
      "ciudad": "Barcelona",
      ...
    }
  ],
  "amplification_used": {
    "type": "nivel_2_nearby",
    "original_query": "sushiman",
    "original_location": "Castelldefels",
    "related_job_used": "Cocinero",
    "nearby_city": "Barcelona",
    "distance_km": 20
  }
}
```

### `/api/jobs/refresh`

**Método:** GET

**Propósito:** Actualizar cache de ofertas

**Proceso:**
1. Descargar XML de turijobs.com
2. Parsear y normalizar
3. Enriquecer con related_jobs y nearby_cities
4. Compactar (eliminar descripcion)
5. Guardar en Vercel KV

**Respuesta:**
```json
{
  "success": true,
  "message": "Cache actualizado",
  "timestamp": "2025-11-01T10:30:00Z",
  "stats": {
    "total": 3024,
    "withRelatedJobs": 2890,
    "relatedJobsPercent": "95.6%",
    "withNearbyCities": 2572,
    "nearbyCitiesPercent": "85.1%"
  }
}
```

**Tiempo de ejecución:** ~12.2 segundos

### `/api/jobs/status`

**Método:** GET

**Propósito:** Verificar estado del cache

**Respuesta:**
```json
{
  "cached": true,
  "status": "success",
  "metadata": {
    "last_update": "2025-11-01T10:30:00Z",
    "total_jobs": 3024,
    "feed_url": "https://www.turijobs.com/turijobs.xml"
  },
  "cache_age": {
    "hours": 6,
    "is_expired": false
  }
}
```

### `/api/chat/create-thread`

**Método:** POST

**Propósito:** Crear nueva conversación con OpenAI

**Respuesta:**
```json
{
  "success": true,
  "thread_id": "thread_abc123xyz"
}
```

### `/api/chat/send-message`

**Método:** POST

**Body:**
```json
{
  "thread_id": "thread_abc123xyz",
  "message": "sushiman castelldefels"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "No encontré ofertas de \"sushiman\" en Castelldefels, pero encontré **10 ofertas relacionadas en Barcelona** (20 km):\n\n**1. Cocinero/a**\n..."
}
```

### `/api/chat/get-messages`

**Método:** GET

**Parámetros:**
- `thread_id` (string): ID del thread

**Respuesta:**
```json
{
  "success": true,
  "messages": [
    {
      "role": "assistant",
      "content": "¡Hola! 👋 Soy tu asistente...",
      "timestamp": "2025-11-01T10:00:00Z"
    },
    {
      "role": "user",
      "content": "sushiman castelldefels",
      "timestamp": "2025-11-01T10:01:00Z"
    }
  ]
}
```

---

## Performance y Optimizaciones

### Optimizaciones Aplicadas

#### 1. Índices Pre-calculados (O(n²) → O(n))

**Antes:**
```javascript
// Para cada oferta (3000)
//   Para cada related_job (20)
//     Filter en todas las ofertas (3000)
// = 3000 × 20 × 3000 = 180M comparaciones
```

**Después:**
```javascript
// Una vez: crear índices
const jobIndex = new Map();  // O(n)
offers.forEach(offer => {
  jobIndex.set(jobKey, (jobIndex.get(jobKey) || 0) + 1);
});

// Para cada oferta (3000)
//   Para cada related_job (20)
//     Lookup en jobIndex (O(1))
// = 3000 × 20 × 1 = 60K lookups
```

**Impacto:** Refresh de >5min → 12 segundos

#### 2. Cache Compacto (11.5MB → 3-4MB)

**Eliminado campo `descripcion`:**
- Ocupa ~70% del tamaño total
- No se usa en búsquedas (solo en página de detalle)
- Se puede obtener del feed XML en tiempo real si se necesita

**Impacto:** Cabe en Vercel KV (límite 10MB)

#### 3. Related Jobs Limit (5 → 20)

**Justificación:**
- Caso "Sushiman" está en posición 17 de related_jobs de "Cocinero"
- Con límite de 5, no se incluía
- Con límite de 20, se capturan más relaciones relevantes

**Filtrado:** Solo se incluyen puestos con `weight > 0.60`

### Métricas de Performance

| Operación | Tiempo | Optimización |
|-----------|--------|--------------|
| Refresh cache | 12.2s | Índices O(n) |
| Búsqueda simple | ~100ms | Cache KV |
| Búsqueda NIVEL 2 NEARBY | ~150ms | Cache KV + filtros |
| Load widget | ~50ms | Standalone JS |
| Paginación GPT-4 | 2-3s | Natural (asistente decide) |

---

## Estado Actual

### KPIs Funcionales (Noviembre 2025)

**Datos:**
- ✅ ~3,000 ofertas activas en cache
- ✅ 95.6% ofertas con related_jobs (2,890 de 3,024)
- ✅ 85.1% ofertas con nearby_cities (2,572 de 3,024)
- ✅ 13,903 denominaciones de puestos
- ✅ 43,854 ciudades con distancias

**Performance:**
- ✅ Refresh cache: 12.2 segundos
- ✅ Búsqueda simple: ~100ms
- ✅ Cache size: 3-4MB (fit in Vercel KV 10MB)
- ⚠️ Paginación: 2-3s (GPT-4 natural, podría mejorarse con cache de resultados)

**Funcionalidad:**
- ✅ NIVEL 1: Búsqueda directa
- ✅ NIVEL 1.5: Amplificación ligera
- ✅ NIVEL 0.5: MISMO puesto en ciudades cercanas ⭐ NUEVO (Nov 2025)
- ✅ NIVEL 2: Puestos relacionados (con condición !relatedJobsResults)
- ✅ NIVEL 2 NEARBY: Puestos relacionados + Ciudades cercanas
- ✅ Widget standalone JavaScript
- ✅ Mensajes UX mejorados ("ofertas relacionadas")

### Casos de Uso Validados

✅ **"bartender sitges"** ⭐ NUEVO (NIVEL 0.5)
- Resultado: 4 ofertas de "Bartender" en "Barcelona" (38km)
- Amplificación: nivel_0_5_nearby
- Tiempo: ~150ms
- Nota: Antes activaba NIVEL 2 (1 oferta de "Ayudante de Barra"), ahora más relevante

✅ **"barman sant cugat"** ⭐ NUEVO (NIVEL 0.5)
- Resultado: 4 ofertas de "Barman" en "Barcelona" (12km)
- Amplificación: nivel_0_5_nearby
- Tiempo: ~150ms
- Nota: Antes respondía "No encontré ofertas", ahora muestra resultados relevantes

✅ **"sushiman castelldefels"**
- Resultado: 10 ofertas de "Cocinero" en "Barcelona" (20km)
- Amplificación: nivel_2_nearby
- Tiempo: ~150ms
- Nota: NIVEL 0.5 busca "Sushiman" → 0 resultados, luego NIVEL 2 busca "Cocinero"

✅ **"camarero barcelona"**
- Resultado: 45 ofertas directas
- Amplificación: Ninguna (NIVEL 1)
- Tiempo: ~100ms

✅ **"chef ejecutivo madrid"**
- Resultado: 3 directas + 8 de "Jefe de Cocina"
- Amplificación: nivel_1_5
- Tiempo: ~120ms

### Archivos de Configuración

**Prompt del Asistente:**
- `assistant_prompt_with_nearby_v2.txt` (5,502 caracteres)

**Scripts de Fix Aplicados:**
- ✅ `fix-performance-with-indexes.js` (Optimización O(n²) → O(n))
- ✅ `fix-cache-size-limit.js` (11.5MB → 3-4MB)
- ✅ `fix-related-jobs-limit.js` (5 → 20 related jobs)
- ✅ `fix-prompt-final-clean.js` (Mensajes UX mejorados)
- ✅ `swap-nivel-0-5-and-2.js` ⭐ NUEVO (Reordenar niveles 0.5 y 2)
- ✅ `add-condition-to-nivel-2.js` ⭐ NUEVO (Condición !relatedJobsResults)

**Commits Recientes (Nov 2025):**
- `eab6412` - fix(nivel-2): Add !relatedJobsResults condition to prevent overwriting NIVEL 0.5 results
- `18fa9db` - fix: Swap NIVEL 0.5 and NIVEL 2 execution order for better specificity
- `e968c66` - fix(nivel-0.5): Use synonym system from parent scope
- `252279a` - fix(nivel-0.5): Use same query matching logic as regular search
- `47797d0` - fix(nivel-0.5): Use findCityInCoordinates for citiesWithOffers lookup
- `110be37` - Fix match parcial de ciudades en TODOS los niveles (0.5, 1.5, 2, dynamic map)
- `76e45b5` - Implementar NIVEL 0.5: buscar mismo puesto en ciudades cercanas cuando hay 0 resultados

**Data Files:**
- `data/job_weights.json` (puestos relacionados)
- `data/city_distances.json` (ciudades cercanas)
- `data/job_id_to_names.json` (sinónimos multiidioma)

**Widget:**
- `widget/embed.js` (standalone JavaScript)
- `widget/demo.html` (página de demo)

**API:**
- `api/jobs/search.js`
- `api/jobs/refresh.js`
- `api/jobs/status.js`
- `api/chat/*.js`

**Librería Core:**
- `lib/enrichOffers.js` (enriquecimiento optimizado)

---

## Próximos Pasos

### 1. Cache de Resultados de Búsqueda (Paginación Rápida)

**Objetivo:** Paginación instantánea (<500ms vs 2-3s actual)

**Implementación:**
```javascript
// Guardar resultados completos con search_id
await kv.set(`search:${searchId}`, {
  query,
  location,
  total: allResults.length,
  results: allResults,
  offset: 0
}, { ex: 900 });  // 15 min TTL

// getNextPage(search_id) → O(1) lookup + slice
```

**Beneficio:** Usuario no espera al decir "siguiente"

### 2. Analytics Básico

**Objetivo:** Entender comportamiento de usuarios

**Métricas:**
- Búsquedas más frecuentes
- Tasa de clics en ofertas
- Tiempo promedio de sesión
- Conversión (búsqueda → clic → aplicar)

### 3. Mejoras de UI/UX

**Objetivos:**
- Modo oscuro
- Accesibilidad (ARIA labels, teclado)
- Multi-idioma (interfaz en EN, FR, DE)

---

## Conclusión

El **Turijobs AI Chat Widget V2** es un sistema robusto, optimizado y escalable que maximiza resultados relevantes mediante:

- 🎯 **Búsqueda inteligente multinivel** (4 niveles de amplificación)
- ⚡ **Alta performance** (refresh en 12s, búsquedas <150ms)
- 🌍 **Cobertura global** (13,903 puestos, 43,854 ciudades)
- 💬 **Experiencia conversacional** (GPT-4o proactivo)

**Estado:** ✅ **Producción estable y optimizada**

**Deployment:** Vercel (auto-deploy desde GitHub)

---

**Documento preparado por:** Claude Code
**Fecha:** 1 de noviembre de 2025
**Versión:** 2.0
**Próxima revisión:** Enero 2026
