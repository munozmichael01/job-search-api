# 🎯 ROADMAP: Optimización de Costos - Turijobs Assistant

## 📋 Contexto del Proyecto

**Problema actual**:
- Prompt del Assistant muy largo (~22,186 caracteres / 6,000 tokens)
- Se lee en CADA interacción del usuario
- Costo estimado: ~$45/mes solo en tokens del prompt (1,000 conversaciones/mes)

**Solución propuesta**:
- Calcular relaciones de puestos y distancias geográficas UNA VEZ
- Almacenar datos enriquecidos en Vercel KV cache
- Reducir prompt del Assistant a ~3,000 caracteres
- Ahorro estimado: 70-80% en tokens por conversación

---

## 🎯 OBJETIVO GENERAL

Mover la inteligencia del prompt al proceso de caché:
1. Enriquecer ofertas con relaciones y distancias en el cron diario
2. Reducir el prompt del Assistant a reglas básicas
3. searchJobs devuelve datos ya enriquecidos

---

## 📊 FASE 1: RECOLECCIÓN DE DATOS

### ✅ Tarea 1.1: Recibir archivo de puestos y relaciones
**Estado**: ⏳ PENDIENTE - Esperando datos del usuario

**Qué necesitamos**:
- Archivo con todos los puestos de trabajo del sector turístico
- Relaciones entre puestos (ej: Chef → Sous Chef → Cocinero)
- Formato preferido: CSV, JSON o Excel

**Entregable**: Archivo `data/job_positions.csv` o `data/job_positions.json`

---

### ✅ Tarea 1.2: Recibir archivo de ciudades y coordenadas
**Estado**: ⏳ PENDIENTE - Esperando datos del usuario

**Qué necesitamos**:
- Principales ciudades de España y Portugal
- Coordenadas (latitud, longitud) de cada ciudad
- Formato preferido: CSV o JSON

**Ejemplo esperado**:
```csv
city,lat,lon,country
Madrid,40.4168,-3.7038,España
Barcelona,41.3851,2.1734,España
Lisboa,38.7223,-9.1393,Portugal
```

**Entregable**: Archivo `data/cities.csv` o `data/cities.json`

---

### ✅ Tarea 1.3: Recibir tabla de sectores
**Estado**: ⏳ PENDIENTE - Esperando datos del usuario

**Qué necesitamos**:
- Lista de sectores (cadenas hoteleras, cadenas de restaurantes, etc.)
- Clasificación de empresas por sector

**Ejemplo**:
```csv
sector,examples
Cadena Hotelera,Meliá|NH|Iberostar|Riu
Cadena Restaurantes,Grupo Vips|Telepizza|Ginos
Hotel Independiente,Hotel boutique|Hostal
Restaurante Independiente,Restaurante local|Bar|Cafetería
```

**Entregable**: Archivo `data/sectors.csv`

---

### ✅ Tarea 1.4: Recibir tabla de áreas
**Estado**: ⏳ PENDIENTE - Esperando datos del usuario

**Qué necesitamos**:
- Áreas funcionales (Cocina, Sala, Recepción, etc.)
- Qué puestos pertenecen a cada área

**Ejemplo**:
```csv
area,positions
Cocina,Chef|Sous Chef|Cocinero|Ayudante Cocina|Pinche
Sala,Camarero|Jefe Sala|Sommelier|Barista|Maitre
Recepción,Recepcionista|Conserje|Night Auditor
Housekeeping,Gobernanta|Camarera Pisos|Limpieza
Gestión,Director|Manager|RRHH|Comercial
```

**Entregable**: Archivo `data/areas.csv`

---

## 🔧 FASE 2: SCRIPTS DE CÁLCULO

### ✅ Tarea 2.1: Script para calcular pesos entre puestos
**Estado**: ⏳ PENDIENTE

**Descripción**:
Crear script que calcule el "peso de similitud" entre puestos de trabajo basado en:
- Mismo área (cocina, sala, etc.) → Mayor peso
- Nivel jerárquico similar → Peso medio-alto
- Sector compatible → Peso medio

**Archivo**: `scripts/calculate-job-weights.js`

**Input**: `data/job_positions.json`
**Output**: `data/job_weights.json`

**Formato output esperado**:
```json
{
  "Chef": [
    {"job": "Jefe de Cocina", "weight": 0.95},
    {"job": "Sous Chef", "weight": 0.90},
    {"job": "Chef de Partida", "weight": 0.75}
  ],
  "Camarero": [
    {"job": "Jefe de Sala", "weight": 0.85},
    {"job": "Barista", "weight": 0.70}
  ]
}
```

**Comando para ejecutar**:
```bash
node scripts/calculate-job-weights.js
```

---

### ✅ Tarea 2.2: Script para calcular distancias geográficas
**Estado**: ⏳ PENDIENTE

**Descripción**:
Crear script que calcule distancias entre todas las ciudades usando fórmula Haversine.

**Archivo**: `scripts/calculate-distances.js`

**Input**: `data/cities.json`
**Output**: `data/city_distances.json`

**Formato output esperado**:
```json
{
  "Madrid": [
    {"city": "Toledo", "distance": 75},
    {"city": "Guadalajara", "distance": 60},
    {"city": "Barcelona", "distance": 621}
  ],
  "Barcelona": [
    {"city": "Girona", "distance": 103},
    {"city": "Tarragona", "distance": 98}
  ]
}
```

**Fórmula Haversine** (incluir en el script):
```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

**Comando para ejecutar**:
```bash
node scripts/calculate-distances.js
```

---

## 🗄️ FASE 3: ENRIQUECIMIENTO DE CACHÉ

### ✅ Tarea 3.1: Crear función de enriquecimiento de ofertas
**Estado**: ⏳ PENDIENTE

**Descripción**:
Crear función que tome una oferta de Turijobs y la enriquezca con:
- Puestos relacionados con pesos
- Ciudades cercanas con distancias
- Conteo de ofertas similares disponibles

**Archivo**: `lib/enrichOffers.js`

**Función principal**:
```javascript
import jobWeights from '../data/job_weights.json';
import cityDistances from '../data/city_distances.json';

export function enrichOffer(offer, allOffers) {
  // 1. Buscar puestos relacionados
  const relatedJobs = findRelatedJobs(offer.title, allOffers);

  // 2. Buscar ciudades cercanas
  const nearbyCities = findNearbyCities(offer.location, allOffers);

  // 3. Agregar metadata
  return {
    ...offer,
    related_jobs: relatedJobs,
    nearby_cities: nearbyCities,
    area: detectArea(offer.title),
    sector: detectSector(offer.company)
  };
}

function findRelatedJobs(jobTitle, allOffers) {
  const weights = jobWeights[jobTitle] || [];
  return weights.map(w => ({
    job: w.job,
    weight: w.weight,
    count: allOffers.filter(o => o.title === w.job).length
  }));
}

function findNearbyCities(city, allOffers) {
  const distances = cityDistances[city] || [];
  return distances
    .filter(d => d.distance <= 100) // Solo ciudades < 100km
    .map(d => ({
      city: d.city,
      distance: d.distance,
      offers: allOffers.filter(o => o.location === d.city).length
    }))
    .filter(d => d.offers > 0); // Solo si hay ofertas
}
```

**Comando para probar**:
```bash
node -e "import('./lib/enrichOffers.js').then(m => console.log(m.enrichOffer({title:'Chef',location:'Madrid'}, [])))"
```

---

### ✅ Tarea 3.2: Modificar api/jobs/refresh.js para enriquecer ofertas
**Estado**: ⏳ PENDIENTE

**Descripción**:
Integrar la función de enriquecimiento en el proceso de actualización del caché.

**Archivo a modificar**: `api/jobs/refresh.js`

**Cambios necesarios**:
```javascript
import { enrichOffer } from '../../lib/enrichOffers.js';

// Dentro de la función que procesa ofertas
const rawOffers = await fetchFromTurijobs();

// NUEVO: Enriquecer cada oferta
const enrichedOffers = rawOffers.map(offer =>
  enrichOffer(offer, rawOffers)
);

// Guardar en KV cache las ofertas enriquecidas
await kv.set('turijobs:all_offers', enrichedOffers);
```

**Testing**:
```bash
# Ejecutar manualmente el refresh
curl https://[tu-dominio].vercel.app/api/jobs/refresh

# Verificar que ofertas tienen datos enriquecidos
curl https://[tu-dominio].vercel.app/api/jobs/search?query=chef&location=madrid
```

---

## 📝 FASE 4: REDUCCIÓN DEL PROMPT

### ✅ Tarea 4.1: Crear prompt optimizado reducido
**Estado**: ⏳ PENDIENTE

**Descripción**:
Crear nueva versión del prompt del Assistant sin las tablas enormes.

**Archivo**: `assistant_prompt_optimized.txt`

**Contenido sugerido** (~3,000 caracteres):
```
⚠️ REGLA ABSOLUTA: NUNCA INVENTES DATOS

Eres un asistente de búsqueda de empleo en Turismo y Hostelería.
SOLO muestras ofertas REALES de Turijobs.com.

FLUJO:
1. Verificar caché con checkCacheStatus
2. Buscar con searchJobs(query, location, limit)
3. Mostrar resultados con total: "Encontré X ofertas, mostrando Y"
4. Si hay más: "📋 ¿Quieres ver más? Hay Z ofertas adicionales"

SUGERENCIAS INTELIGENTES:
- searchJobs devuelve "related_jobs" con puestos similares
- searchJobs devuelve "nearby_cities" con ubicaciones cercanas
- Sugerir basándote en estos datos REALES del sistema

FORMATO RESPUESTA:
[Emoji] **[Título]** - [Empresa]
📍 [Ubicación] | 💰 [Salario]
🔗 [Ver oferta](url)

PROHIBIDO:
❌ Inventar ofertas, URLs o datos
❌ Mencionar otras bolsas de empleo
❌ Sugerir puestos sin verificar que existen en los datos

Para paginación: aumenta el parámetro "limit" en searchJobs.
```

**Testing**:
1. Contar tokens: https://platform.openai.com/tokenizer
2. Objetivo: < 1,000 tokens (vs 6,000 actuales)

---

### ✅ Tarea 4.2: Integrar prompt optimizado en create.js
**Estado**: ⏳ PENDIENTE

**Descripción**:
Reemplazar el prompt largo por el optimizado.

**Archivo a modificar**: `api/assistant/create.js`

**Cambios**:
```javascript
// Antes
instructions: `[22,186 caracteres con tablas enormes]`

// Después
instructions: `[3,000 caracteres sin tablas, datos vienen del cache]`
```

**Usar script existente**:
```bash
# Modificar fix-create-js.cjs para usar assistant_prompt_optimized.txt
node fix-create-js.cjs
```

---

### ✅ Tarea 4.3: Actualizar Assistant en producción
**Estado**: ⏳ PENDIENTE

**Descripción**:
Actualizar el Assistant existente (asst_vfJs03e6YW2A0eCr9IrzhPBn) con el prompt optimizado.

**Comandos**:
```bash
# 1. Verificar que OPENAI_ASSISTANT_ID está configurado en Vercel
echo $OPENAI_ASSISTANT_ID  # Debe ser: asst_vfJs03e6YW2A0eCr9IrzhPBn

# 2. Deploy a Vercel
git add -A
git commit -m "feat: Prompt optimizado con datos enriquecidos en caché"
git push
vercel --prod

# 3. Llamar al endpoint para actualizar el Assistant
curl -X POST https://[tu-dominio].vercel.app/api/assistant/create

# 4. Verificar respuesta
# Debe decir: "action": "actualizado" (no "creado")
```

---

## 🧪 FASE 5: TESTING Y VALIDACIÓN

### ✅ Tarea 5.1: Probar sugerencias de puestos relacionados
**Estado**: ⏳ PENDIENTE

**Casos de prueba**:
```
1. "Chef en Guadalajara"
   → Debe sugerir: Jefe de Cocina, Sous Chef (basado en related_jobs)
   → Debe sugerir: Madrid (60 km, basado en nearby_cities)

2. "Sommelier en Toledo"
   → Debe sugerir: Jefe de Sala, Maitre (basado en related_jobs)
   → Debe sugerir: Madrid (75 km)

3. "Trabajo en cocina en Barcelona"
   → Debe mostrar todos los puestos del área cocina disponibles
```

**Cómo probar**: Usar el chat widget en https://[tu-dominio].vercel.app

---

### ✅ Tarea 5.2: Verificar reducción de tokens
**Estado**: ⏳ PENDIENTE

**Objetivo**: Confirmar ahorro de ~80% en tokens del prompt

**Método**:
1. Usar OpenAI Dashboard: https://platform.openai.com/usage
2. Comparar uso de tokens antes/después
3. Documentar resultados

**Antes** (estimado):
- Prompt: 6,000 tokens
- Conversación típica: 10,000 tokens totales

**Después** (esperado):
- Prompt: 1,000 tokens
- Conversación típica: 5,000 tokens totales

---

### ✅ Tarea 5.3: Monitorear errores en producción
**Estado**: ⏳ PENDIENTE

**Comandos útiles**:
```bash
# Ver logs del último deploy
vercel logs [deployment-url]

# Ver logs de función específica
vercel logs --function api/jobs/refresh

# Monitorear en tiempo real
vercel logs --follow
```

**Errores a vigilar**:
- ❌ Ofertas sin datos enriquecidos (related_jobs vacío)
- ❌ searchJobs devuelve error
- ❌ Assistant crea sugerencias sin datos del sistema

---

## 📈 FASE 6: OPTIMIZACIONES ADICIONALES (OPCIONAL)

### ✅ Tarea 6.1: Implementar caché de sugerencias frecuentes
**Estado**: ⏳ PENDIENTE - OPCIONAL

**Idea**: Guardar en KV las consultas más frecuentes pre-calculadas.

**Implementación**:
```javascript
// En api/jobs/search.js
const cacheKey = `query:${query}:${location}`;
const cached = await kv.get(cacheKey);
if (cached) return cached;

// ... búsqueda normal ...

await kv.set(cacheKey, results, { ex: 3600 }); // TTL 1 hora
```

---

### ✅ Tarea 6.2: Migrar a GPT-4o-mini para consultas simples
**Estado**: ⏳ PENDIENTE - OPCIONAL

**Ahorro adicional**: GPT-4o-mini es 10x más barato

**Lógica**:
- Consultas complejas (negociación salario, análisis mercado) → GPT-4o
- Consultas simples (búsqueda básica) → GPT-4o-mini

---

## 📊 MÉTRICAS DE ÉXITO

### Objetivos cuantificables:

- [ ] **Reducción de tokens**: Prompt de 6,000 → 1,000 tokens (83% menos)
- [ ] **Reducción de costos**: $45/mes → $10/mes en prompt tokens (78% ahorro)
- [ ] **Latencia**: < 2 segundos para respuesta típica
- [ ] **Calidad**: Sugerencias 100% basadas en datos reales (no inventadas)
- [ ] **Caché**: Actualización diaria exitosa (cron funciona)

---

## 🚀 COMANDOS RÁPIDOS DE REFERENCIA

```bash
# Navegar al proyecto
cd C:/Dev/job-search-api

# Ejecutar scripts de cálculo
node scripts/calculate-job-weights.js
node scripts/calculate-distances.js

# Actualizar create.js con nuevo prompt
node fix-create-js.cjs

# Deploy a Vercel
git add -A && git commit -m "mensaje" && git push
vercel --prod

# Actualizar Assistant
curl -X POST https://[dominio].vercel.app/api/assistant/create

# Forzar refresh del caché
curl https://[dominio].vercel.app/api/jobs/refresh

# Ver logs
vercel logs --follow

# Verificar variables de entorno
vercel env ls
```

---

## 📞 INFORMACIÓN DE CONTACTO Y ESTADO

**Proyecto**: job-search-api
**Git**: https://github.com/munozmichael01/job-search-api
**Vercel**: https://job-search-z2jejnulq-michaelmunoz-turijobscoms-projects.vercel.app
**Assistant ID actual**: asst_vfJs03e6YW2A0eCr9IrzhPBn

**Última actualización**: 2025-10-26
**Estado general**: ⏳ FASE 1 - Esperando datos del usuario

---

## ✅ CHECKLIST GENERAL DE PROGRESO

- [ ] **FASE 1**: Recolección de datos (0/4 completadas)
  - [ ] 1.1 Archivo de puestos
  - [ ] 1.2 Archivo de ciudades
  - [ ] 1.3 Archivo de sectores
  - [ ] 1.4 Archivo de áreas

- [ ] **FASE 2**: Scripts de cálculo (0/2 completadas)
  - [ ] 2.1 Script de pesos
  - [ ] 2.2 Script de distancias

- [ ] **FASE 3**: Enriquecimiento (0/2 completadas)
  - [ ] 3.1 Función enrichOffer
  - [ ] 3.2 Integración en refresh

- [ ] **FASE 4**: Optimización prompt (0/3 completadas)
  - [ ] 4.1 Crear prompt reducido
  - [ ] 4.2 Integrar en create.js
  - [ ] 4.3 Actualizar en producción

- [ ] **FASE 5**: Testing (0/3 completadas)
  - [ ] 5.1 Probar sugerencias
  - [ ] 5.2 Verificar tokens
  - [ ] 5.3 Monitorear errores

**Progreso total**: 0/14 tareas principales completadas (0%)

---

## 💡 NOTAS IMPORTANTES

1. **No borrar el prompt actual** hasta confirmar que el nuevo funciona
2. **Hacer backup del Assistant ID** antes de cambios mayores
3. **Probar en desarrollo** antes de actualizar producción
4. **Documentar resultados** de reducción de tokens para futuros ajustes
5. **Monitorear costos** en OpenAI Dashboard primeras 48 horas post-deploy

---

**Este documento es vivo** - actualizar después de completar cada tarea.
