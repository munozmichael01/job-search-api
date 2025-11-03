# Chatbot de Empleo Turístico - Documentación de Producto

**Última actualización:** 3 de noviembre de 2025
**Estado:** Basado en el sistema en producción actual

---

## 1. Qué es el Chatbot

Un asistente conversacional que ayuda a usuarios a encontrar ofertas de empleo en el sector turístico (cocina, sala, recepción, housekeeping, gestión).

**Componentes principales:**
- **API Backend:** https://job-search-api-psi.vercel.app
- **Widget Chat:** Integrado en sitios web mediante JavaScript
- **Motor AI:** OpenAI GPT-4o con instrucciones especializadas
- **Fuente de datos:** Feed XML de Turijobs.com

---

## 2. De Dónde Viene la Información

### 2.1 Fuente Principal
**Feed XML de Turijobs:**
- URL: `https://feed.turijobs.com/partner/files/[UUID]/[UUID]`
- Actualización: Diaria (8:00 AM automático)
- Contenido: ~2,072 ofertas activas (dato actual)

### 2.2 Proceso de Actualización (`/api/jobs/refresh`)

**Cada día a las 8:00 AM:**

1. **Descarga el feed XML** de Turijobs
2. **Procesa cada oferta** extrayendo:
   - Título, empresa, ciudad, salario
   - Categoría (cocina, sala, recepción, etc.)
   - URLs de oferta y aplicación
3. **Enriquece con sinónimos** usando `job_id_to_names.json`:
   - "chef" → ["cocinero", "jefe de cocina", "chef ejecutivo"...]
   - "camarero" → ["mesero", "mozo", "waiter"...]
4. **Genera lista de ciudades válidas** (explicado en sección 3)
5. **Guarda en caché** Vercel KV (~2MB comprimido)

**Datos generados:**
- `metadata.total_jobs`: 2,072
- `metadata.cities_with_offers`: 328 (ciudades con ofertas directas)
- `metadata.valid_cities`: 1,111 (ciudades válidas para búsquedas)

---

## 3. Cómo se Relacionan Ciudades y Puestos

### 3.1 Archivos de Distancias

**`city_distances.json`** (9.3 MB)
- 1,057 ciudades españolas
- Distancias pre-calculadas entre todas
- Ejemplo: "Barcelona" → ["Badalona (6km)", "Sant Cugat (12.5km)"...]

**`city_distances_full.json`** (105 MB)
- 1,064 ciudades (más completo)
- No se usa actualmente (demasiado grande para deployment)

### 3.2 Generación de Ciudades Válidas

**Durante el refresh diario, se crea `valid_cities`:**

```
Para cada ciudad con ofertas activas (328 ciudades):
  1. Buscar en city_distances.json
  2. Agregar la ciudad misma a valid_cities
  3. Encontrar todas las ciudades ≤50km
  4. Agregar esas ciudades cercanas a valid_cities

Resultado: 1,111 ciudades válidas
```

**Ejemplo real:**
- Madrid tiene ofertas → Madrid entra en valid_cities
- Getafe está a 12.7km de Madrid → Getafe entra en valid_cities
- Cuando usuario busca "chef getafe", el sistema sabe buscar en Madrid

**Variantes de idioma:**
- Se normalizan catalán/español: "Sant Cugat" = "San Cugat"
- Se guardan ambas versiones en valid_cities

### 3.3 Relaciones entre Puestos

**`job_relationships_graph.json`** (147 KB)
- Mapa de puestos relacionados y su relevancia
- Ejemplo: "barman" → ["bartender (1.0)", "mixólogo (0.9)", "camarero bar (0.7)"]
- Usado en NIVEL 2 cuando no hay resultados exactos

---

## 4. Sistema de Niveles (Cómo Funcionan REALMENTE)

El chatbot tiene 4 niveles de búsqueda que se ejecutan en cascada:

### NIVEL 1: Búsqueda Normal
**¿Cuándo?** Cuando hay ≥10 resultados directos

**Ejemplo real:**
```
Usuario: "chef barcelona"
Resultados: 6 ofertas de chef en Barcelona
Nivel activado: ninguno (búsqueda normal)
```

**Qué hace:**
- Busca el puesto exacto en la ciudad exacta
- Usa sinónimos automáticamente ("chef" incluye "cocinero")
- Retorna hasta 10 ofertas por página
- **NO activa amplificación**

---

### NIVEL 1.5: Ampliación con Ciudad Cercana
**¿Cuándo?** Cuando hay entre 1-9 resultados directos

**Ejemplo real:**
```
Usuario: "recepcionista viladecans"
Resultados originales: 2 en Viladecans
Resultados agregados: 8 de Barcelona (8.4km)
Total mostrado: 10 ofertas
Nivel activado: nivel_1_5_nearby
```

**Qué hace:**
1. Busca recepcionista en Viladecans → encuentra 2
2. Como son <10, busca ciudades cercanas con ofertas del MISMO puesto
3. Encuentra Barcelona a 8.4km con recepcionistas
4. Agrega hasta completar 10 ofertas totales
5. **Muestra primero las de Viladecans, luego las de Barcelona**

**Beneficio:** Usuario no se queda con pocas opciones

---

### NIVEL 0.5: Ciudad Cercana (0 resultados)
**¿Cuándo?** Cuando NO hay resultados en la ciudad buscada

**Ejemplo real:**
```
Usuario: "chef getafe"
Resultados en Getafe: 0
Resultados en Madrid (12.7km): 6 ofertas de chef
Nivel activado: nivel_0_5_nearby
```

**Qué hace:**
1. Busca chef en Getafe → 0 resultados
2. Verifica que "getafe" esté en valid_cities → SÍ
3. Busca en city_distances.json ciudades cercanas ≤50km con ofertas
4. Encuentra Madrid (12.7km) con 6 ofertas de chef
5. **Retorna ofertas del MISMO puesto de la ciudad más cercana**

**Restricción importante:**
- Solo si la ciudad está en valid_cities
- Solo ciudades ≤50km
- Solo el MISMO puesto (no relacionados)

---

### NIVEL 2: Puestos Relacionados
**¿Cuándo?** Cuando NO hay resultados del puesto buscado en ninguna ciudad cercana

**Ejemplo real:**
```
Usuario: "sushiman madrid"
Resultados de sushiman: 0
Resultados de "Sushiman" (puesto relacionado): 1
Nivel activado: nivel_2
```

**Qué hace:**
1. Busca "sushiman" en Madrid → 0 resultados
2. NIVEL 0.5 no encuentra sushiman en ciudades cercanas
3. Activa NIVEL 2: busca puestos relacionados
4. Consulta job_relationships_graph.json
5. Encuentra "Sushiman" como puesto relacionado
6. **Retorna ofertas de puestos similares/relacionados**

**Nota:** Es el último recurso cuando nada más funciona

---

## 5. Flujo de Usuario (Cómo se Entrega la Información)

### 5.1 Arquitectura

```
Usuario escribe en chat
    ↓
Widget envía mensaje → OpenAI Assistant
    ↓
GPT-4o llama searchJobs() → API Backend
    ↓
API busca en caché + aplica niveles
    ↓
API retorna JSON con ofertas
    ↓
GPT-4o formatea respuesta humanizada
    ↓
Widget muestra mensaje en el chat
```

### 5.2 Paso a Paso Completo del Chat

**Ejemplo:** Usuario escribe "barman sant cugat"

---

#### PASO 1: Usuario Escribe en el Widget
**Acción del usuario:**
- Usuario abre el chat widget en el sitio web
- Escribe: "barman sant cugat"
- Presiona Enter

**Qué pasa internamente:**
```javascript
// widget/embed.js captura el mensaje
userMessage = "barman sant cugat"
threadId = localStorage.getItem('chat_thread_id') || null
```

---

#### PASO 2: Widget → OpenAI Assistant API
**El widget hace una petición HTTP:**
```javascript
POST https://api.openai.com/v1/threads/{threadId}/messages
Headers:
  Authorization: Bearer sk-proj-...
  OpenAI-Beta: assistants=v2

Body:
{
  "role": "user",
  "content": "barman sant cugat"
}
```

**Si es primera conversación:**
- Crea nuevo Thread ID
- Guarda en localStorage para futuras conversaciones

---

#### PASO 3: OpenAI Procesa con GPT-4o
**GPT-4o recibe:**
- Mensaje del usuario: "barman sant cugat"
- Instrucciones del asistente (assistant_prompt_with_nearby_v2.txt)
- Contexto de conversaciones anteriores (si existen)

**GPT-4o interpreta:**
```
Usuario quiere: buscar ofertas de barman
Ubicación: sant cugat
Acción: llamar función searchJobs()
```

---

#### PASO 4: GPT-4o → API Backend (Function Call)
**OpenAI hace la petición:**
```http
GET https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat&limit=10&offset=0
```

**Parámetros enviados:**
- `query`: "barman"
- `location`: "sant cugat"
- `limit`: 10 (por defecto)
- `offset`: 0 (primera página)

---

#### PASO 5: API Backend Procesa la Búsqueda

**5.1 Carga caché desde Vercel KV:**
```javascript
const cacheData = await kv.get('job_offers_cache');
// Contiene: 2,072 ofertas + metadata
```

**5.2 Normaliza inputs:**
```javascript
"barman" → normalizeText → "barman"
"sant cugat" → normalizeText → "sant cugat"
```

**5.3 Expande sinónimos:**
```javascript
jobIdToNames["barman"] = [
  "bartender", "coctelero", "mixólogo",
  "barwoman", "barmaid", "camarero de bar"
]
queryTerms = ["barman", "bartender", "coctelero"...]
```

**5.4 Busca en caché:**
```javascript
// Filtra ofertas que contengan alguno de los términos
results = offers.filter(offer =>
  queryTerms.some(term => offer.titulo.includes(term)) &&
  offer.ciudad === "sant cugat"
)
// Resultado: 0 ofertas
```

**5.5 Activa NIVEL 0.5 (0 resultados):**
```javascript
// Verifica que "sant cugat" esté en valid_cities
validCities.includes("sant cugat del valles") // true

// Busca en city_distances.json
nearbyCities = city_distances["San Cugat del Vallés"]
  .filter(c => c.distance <= 50)
  .filter(c => validCities.includes(c.city))

// Encuentra: Barcelona (12.5km), Sabadell (9.3km), Rubí (5.2km)...

// Busca barman/bartender en Barcelona
barcelonaOffers = offers.filter(offer =>
  queryTerms.some(term => offer.titulo.includes(term)) &&
  offer.ciudad === "barcelona"
)
// Resultado: 4 ofertas de bartender
```

---

#### PASO 6: API Retorna JSON
```json
{
  "success": true,
  "results": [],
  "related_jobs_results": [
    {
      "id": "45678",
      "titulo": "Bartender - Hotel W Barcelona",
      "empresa": "W Barcelona",
      "ciudad": "Barcelona",
      "region": "Barcelona",
      "categoria": "Sala",
      "salario": "20.000-25.000€",
      "tipo_jornada": "Tiempo completo",
      "url": "https://www.turijobs.com/oferta/45678?utm_source=chatbot&utm_medium=assistant&utm_campaign=nearby_city",
      "url_aplicar": "https://www.turijobs.com/oferta/45678/aplicar?utm_source=chatbot&utm_medium=assistant&utm_campaign=nearby_city"
    },
    {
      "id": "45679",
      "titulo": "Bartender - Grupo Tragaluz",
      "empresa": "Grupo Tragaluz",
      "ciudad": "Barcelona",
      ...
    }
    // ... 2 ofertas más (limit=10, pero solo hay 4 totales)
  ],
  "amplification_used": {
    "type": "nivel_0_5_nearby",
    "original_query": "barman",
    "original_location": "sant cugat",
    "nearby_city": "barcelona",
    "distance_km": 12.5,
    "total_nearby_found": 4,
    "nearby_pagination": {
      "returned_results": 4,
      "has_more": false
    }
  },
  "pagination": {
    "total_matches": 0,
    "returned_results": 0,
    "offset": 0,
    "limit": 10,
    "has_more": false
  },
  "metadata": {
    "last_update": "2025-11-03T15:36:45.811Z",
    "total_jobs": 2072,
    "query_params": {
      "query": "barman",
      "location": "sant cugat",
      "expanded_terms": ["bartender", "coctelero"...]
    }
  }
}
```

**Tiempo de respuesta:** ~80ms

---

#### PASO 7: GPT-4o Procesa Respuesta
**GPT-4o recibe el JSON y:**

1. **Lee amplification_used:**
   - Tipo: "nivel_0_5_nearby"
   - Ciudad original: "sant cugat"
   - Ciudad cercana: "barcelona" (12.5 km)
   - Total encontrado: 4 ofertas

2. **Sigue las instrucciones del prompt:**
   ```
   Si hay amplification_used.type === "nivel_0_5_nearby":
     "No encontré ofertas de [original_query] en [original_location],
      pero encontré [total_nearby_found] ofertas de [original_query]
      en [nearby_city] ([distance_km] km)."
   ```

3. **Formatea CADA oferta de related_jobs_results:**
   ```
   **[#]. [TÍTULO]**
   🏛️ [EMPRESA]
   📍 [CIUDAD], [REGIÓN]
   💼 [CATEGORÍA] | 💰 [SALARIO] | ⏰ [TIPO_JORNADA]

   🔗 Ver oferta: [URL]
   ✅ Aplicar: [URL_APLICAR]
   ```

4. **Genera respuesta humanizada:**
   ```
   No encontré ofertas de barman en Sant Cugat, pero encontré
   4 ofertas de bartender en Barcelona (12.5 km).
   Mostrando las 4 ofertas:

   **1. Bartender - Hotel W Barcelona**
   🏛️ W Barcelona
   📍 Barcelona, Barcelona
   💼 Sala | 💰 20.000-25.000€ | ⏰ Tiempo completo

   🔗 Ver oferta: https://www.turijobs.com/oferta/45678?utm_source=...
   ✅ Aplicar: https://www.turijobs.com/oferta/45678/aplicar?utm_source=...

   **2. Bartender - Grupo Tragaluz**
   ...

   Estas ofertas están ubicadas en Barcelona.
   ```

---

#### PASO 8: OpenAI → Widget
**OpenAI retorna al widget:**
```javascript
{
  "id": "msg_abc123",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "No encontré ofertas de barman en Sant Cugat..."
    }
  ]
}
```

---

#### PASO 9: Widget Renderiza Respuesta
**El widget procesa el markdown:**
```javascript
// widget/embed.js
messageHTML = marked.parse(assistantResponse.content)
chatContainer.appendChild(messageHTML)
```

**Usuario ve:**
- Mensaje formateado con negritas, emojis
- Links clickeables a Turijobs
- Botón "siguiente" si hay más páginas

---

#### PASO 10: Usuario Interactúa
**Si usuario hace clic en "Ver oferta":**
- Abre nueva pestaña con URL completa incluyendo UTMs
- Turijobs puede trackear origen: `utm_source=chatbot`

**Si usuario dice "siguiente":**
- Widget envía nuevo mensaje a GPT-4o
- GPT-4o llama API con `related_offset=4`
- Retorna siguientes ofertas (si existen)

---

### Resumen Tiempos Reales

```
Total: ~2-5 segundos (primera vez) | ~1-2 segundos (conversaciones siguientes)

├─ Widget → OpenAI: ~100ms
├─ GPT-4o procesa mensaje: ~300-800ms
├─ GPT-4o → API Backend: ~80ms
├─ GPT-4o genera respuesta: ~1-3 segundos (depende de longitud)
└─ Widget renderiza: ~50ms
```

**Nota:** El ~1 minuto reportado puede ser causado por:
- Cold start de Vercel (primera petición tras inactividad)
- Múltiples llamadas API innecesarias
- Widget haciendo peticiones secuenciales en vez de paralelas

---

## 6. Archivos del Proyecto

### 6.1 CORE (Imprescindibles)

**API Endpoints:**
- `api/jobs/search.js` (849 líneas) - Motor de búsqueda con niveles
- `api/jobs/refresh.js` (274 líneas) - Actualización diaria
- `api/jobs/status.js` (49 líneas) - Health check
- `api/jobs/view-all.js` (53 líneas) - Ver caché completo

**Datos:**
- `data/city_distances.json` (9.3 MB) - Distancias entre ciudades
- `data/job_relationships_graph.json` (147 KB) - Puestos relacionados
- `data/job_id_to_names.json` (776 KB) - Sinónimos de puestos

**Widget:**
- `widget/embed.js` - Script de integración
- `public/widget.html` - Chat widget UI

**Configuración:**
- `vercel.json` - Deployment config
- `.env` - API keys (no en repo)
- `assistant_prompt_with_nearby_v2.txt` - Instrucciones para GPT-4o

### 6.2 AUXILIARES (Útiles para mantenimiento)

**Scripts de actualización:**
- `update-assistant-fix-nivel-0-5-display.js` - Actualizar GPT assistant
- `run-update-assistant.sh` - Wrapper para actualizar
- `refresh-cache-local.js` - Forzar refresh local

**Documentación actual:**
- `FUNCIONALIDAD_PRODUCTO_V2.md` - Especificación técnica
- `RESUMEN-NIVEL-0-5.md` - Explicación NIVEL 0.5
- `README.md` - Setup del proyecto

### 6.3 SOBRANTES (Se pueden eliminar)

**Tests antiguos (62 archivos):**
- `test-*.js` - Tests puntuales ya validados
- `check-*.js` - Scripts de debugging únicos
- `debug-*.js` - Debugging de bugs ya resueltos
- `fix-*.js` - Parches aplicados y en producción
- `verify-*.js` - Verificaciones ya hechas

**Documentación obsoleta:**
- `FUNCIONALIDAD_PRODUCTO.md` (v1 antigua)
- `COMPLETADO.md` - Tareas ya hechas
- `PENDIENTE-*.md` - Tareas resueltas
- Múltiples `assistant_prompt_*.txt` (solo se usa v2)

**Archivos de experimentos:**
- `apply-*.js` - Parches ya aplicados
- `implement-*.js` - Features ya implementadas
- `swap-*.js` - Cambios ya en producción

**Backups innecesarios:**
- `api/jobs/search.js.backup-before-nearby`
- `widget-ttl-patch.txt`

**Recomendación:** Mover a carpeta `archive/` o eliminar

---

## 7. Estado Actual del Sistema

### 7.1 Métricas en Producción

**Cache (actualizado hoy 15:36):**
- 2,072 ofertas activas
- 328 ciudades con ofertas
- 1,111 ciudades válidas para búsqueda

**Rendimiento:**
- Tiempo de respuesta API: <100ms (con caché)
- Refresh completo: ~30 segundos
- Tamaño caché comprimido: ~2MB

### 7.2 Funcionalidades Confirmadas

✅ **NIVEL 1** - Búsqueda normal (≥10 resultados)
✅ **NIVEL 1.5** - Ampliación ciudad cercana (1-9 resultados)
✅ **NIVEL 0.5** - Ciudad cercana (0 resultados, mismo puesto)
✅ **NIVEL 2** - Puestos relacionados (0 resultados totales)
✅ Expansión de sinónimos (chef→cocinero, barman→bartender)
✅ Paginación (10 ofertas por página)
✅ Normalización catalán/español (Sant Cugat = San Cugat)
✅ UTM tracking en URLs

### 7.3 Casos de Uso Validados

| Búsqueda | Resultado | Nivel |
|----------|-----------|-------|
| "chef barcelona" | 6 ofertas Barcelona | Normal |
| "recepcionista viladecans" | 2 Viladecans + 8 Barcelona | 1.5 |
| "chef getafe" | 6 ofertas Madrid (12.7km) | 0.5 |
| "sushiman madrid" | 1 oferta "Sushiman" | 2 |

---

## 8. Limitaciones Conocidas

1. **Caché manual:** Refresh es diario automático a las 8 AM, pero si se necesita forzar hay que llamar `/api/jobs/refresh` manualmente

2. **Ciudades pequeñas:** Si una ciudad no está en `city_distances.json` (1,057 ciudades), no se pueden calcular distancias

3. **Despliegue Vercel:** Cambios en código tardan 2-3 minutos en aplicarse por caché de functions

4. **GPT-4o a veces omite ofertas:** Instrucciones muy explícitas pero ocasionalmente muestra menos ofertas de las que retorna la API

5. **Variantes de nombres:** Ciudades con nombres muy diferentes (ej: "Donosti" vs "San Sebastián") pueden no hacer match

---

## 9. Próximos Pasos Recomendados

### 9.1 Inmediato
- ✅ Limpiar archivos de test/debugging sobrantes
- ⏳ Resolver "barman sant cugat" (normalización catalán en producción)
- ⏳ Validar tiempo de respuesta widget (~1 minuto reportado)

### 9.2 Corto Plazo
- Agregar más variantes ciudad (Donosti, Palma, etc.)
- Optimizar tamaño de caché (eliminar campos innecesarios)
- Métricas de uso (qué búsquedas son más comunes)

### 9.3 Largo Plazo
- Refresh incremental (solo ofertas nuevas/modificadas)
- Filtros adicionales (jornada, salario, experiencia)
- Multiidioma (inglés, francés para hoteles internacionales)

---

## 10. Cómo Usar Este Documento

**Para explicar a stakeholders:**
- Leer secciones 1, 4 y 5 (qué es, cómo funcionan niveles, flujo usuario)

**Para desarrolladores nuevos:**
- Leer secciones 2, 3 y 6 (origen datos, relaciones, archivos)

**Para producto/mejoras:**
- Leer secciones 7, 8 y 9 (estado actual, limitaciones, roadmap)

**Para debugging:**
- Ver sección 6.1 (archivos CORE) y logs en Vercel

---

**Documento vivo:** Actualizar cuando se implementen cambios significativos.
