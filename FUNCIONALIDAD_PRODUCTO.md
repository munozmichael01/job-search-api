# Turijobs AI Chat Widget - Documento Funcional de Producto

**Versión:** 1.0
**Fecha:** 27 de enero de 2025
**Deployment Actual:** 5ycm2h4Jc (Vercel)

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Sistema de Datos Enriquecidos](#sistema-de-datos-enriquecidos)
4. [Interacción del Chat Widget](#interacción-del-chat-widget)
5. [Flujo de Búsqueda y Resultados](#flujo-de-búsqueda-y-resultados)
6. [Funcionalidades Implementadas](#funcionalidades-implementadas)
7. [Funcionalidades Pendientes](#funcionalidades-pendientes)
8. [Recomendaciones Futuras](#recomendaciones-futuras)

---

## Resumen Ejecutivo

El **Turijobs AI Chat Widget** es un asistente conversacional alimentado por GPT-4o que permite a los usuarios buscar ofertas de empleo del sector turístico mediante lenguaje natural. El sistema descarga, cachea y enriquece ofertas de Turijobs.com, proporcionando recomendaciones inteligentes basadas en:

- **Puestos relacionados:** 13,903 denominaciones de puestos en múltiples idiomas
- **Ciudades cercanas:** Distancias geográficas entre 43,854 ciudades
- **Sinónimos multiidioma:** Búsqueda expandida (ej: "mesero" → "camarero", "waiter" → "camarero")

**Estado Actual:**
- ✅ 2,078 ofertas activas en caché
- ✅ 85.7% de ofertas con puestos relacionados
- ✅ 27% de ofertas con ciudades cercanas
- ✅ Widget React funcional en producción
- ✅ Búsqueda con expansión de sinónimos
- ✅ Asistente proactivo (no pregunta, muestra resultados automáticamente)

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO (Web/Mobile)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              React Chat Widget (Frontend)                    │
│  - ChatWidget.jsx (componente principal)                     │
│  - ChatWidget.css (estilos responsive)                       │
│  - Demo.jsx (landing page)                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Vercel Serverless)                  │
│  - /api/chat/create-thread                                   │
│  - /api/chat/send-message                                    │
│  - /api/chat/get-messages                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         OpenAI Assistants API (GPT-4o)                       │
│  - Assistant ID: asst_vfJs03e6YW2A0eCr9IrzhPBn              │
│  - Prompt optimizado: 9,657 caracteres                       │
│  - Function calling: checkCacheStatus, refreshJobs,          │
│    searchJobs                                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Job Search Engine (Backend)                     │
│  - /api/jobs/status (verificar caché)                        │
│  - /api/jobs/refresh (actualizar ofertas)                    │
│  - /api/jobs/search (buscar con filtros)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vercel KV (Redis)                           │
│  - Cache de ofertas (TTL: 48 horas)                          │
│  - Ofertas enriquecidas con related_jobs y nearby_cities     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Turijobs.com XML Feed                           │
│  - Feed URL: turijobs.com/turijobs.xml                      │
│  - Actualización: on-demand (cuando caché expira)            │
└─────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

- **Frontend:** React 18, CSS Modules
- **Backend:** Next.js API Routes (Vercel Serverless)
- **IA:** OpenAI GPT-4o con Assistants API
- **Cache:** Vercel KV (Redis compatible)
- **Deployment:** Vercel (auto-deploy desde GitHub)
- **Data Processing:** Node.js para enriquecimiento de datos

---

## Sistema de Datos Enriquecidos

### 1. Puestos Relacionados (job_weights.json)

**Objetivo:** Ampliar resultados de búsqueda sugiriendo puestos similares cuando hay pocos resultados o ninguno.

**Estructura de Datos:**

```json
{
  "Chef": [
    { "job": "Jefe de Cocina", "weight": 0.95, "area": "Cocina" },
    { "job": "Sous Chef", "weight": 0.90, "area": "Cocina" },
    { "job": "Chef de Partie", "weight": 0.85, "area": "Cocina" }
  ]
}
```

**Cálculo de Pesos:**

Los pesos (0.60 - 1.00) representan el nivel de similitud entre puestos:

- **0.90 - 1.00:** Puestos equivalentes (mismo nivel jerárquico)
  - Ejemplo: "Chef" ↔ "Jefe de Cocina" (0.95)

- **0.70 - 0.89:** Puestos relacionados (misma área, diferente nivel)
  - Ejemplo: "Chef" → "Sous Chef" (0.90)
  - Ejemplo: "Chef" → "Cocinero" (0.75)

- **0.60 - 0.69:** Puestos del mismo sector (menor similitud)
  - Ejemplo: "Chef" → "Ayudante de Cocina" (0.65)

**Cobertura:**
- 13,903 denominaciones de puestos
- 85.7% de ofertas tienen puestos relacionados (1,701 de 1,985)

**Uso en el Sistema:**

1. Si búsqueda exacta devuelve **<10 resultados** → Amplía automáticamente con puestos relacionados de peso >0.80
2. Si **no hay resultados** → Muestra sugerencias de puestos relacionados y busca automáticamente los más relevantes

**Ejemplo Real:**

```
Usuario: "chef ejecutivo madrid"
Resultados directos: 3 ofertas

Sistema automáticamente amplía con:
- Jefe de Cocina (peso 0.95): +5 ofertas
- Sous Chef (peso 0.90): +8 ofertas

Total mostrado: 16 ofertas relevantes
```

---

### 2. Ciudades Cercanas (city_distances.json)

**Objetivo:** Cuando no hay ofertas en una ciudad específica, sugerir automáticamente ciudades cercanas con ofertas disponibles.

**Estructura de Datos:**

```json
{
  "Barcelona": [
    { "city": "Hospitalet de Llobregat", "distance": 5, "country": "Spain" },
    { "city": "Badalona", "distance": 10, "country": "Spain" },
    { "city": "Santa Coloma de Gramenet", "distance": 12, "country": "Spain" },
    { "city": "Sant Cugat del Vallès", "distance": 15, "country": "Spain" }
  ]
}
```

**Cálculo de Distancias:**

- Utilizamos la fórmula de **Haversine** para calcular distancia geodésica entre coordenadas
- Base de datos: worldcities.csv (43,854 ciudades con lat/lon)
- Solo incluimos ciudades a **≤100 km** de distancia
- Ordenadas por proximidad (más cercanas primero)

**Cobertura:**
- 43,854 ciudades en la base de datos
- 27% de ofertas tienen ciudades cercanas enriquecidas (536 de 1,985)

**Criterios de Sugerencia:**

- **0-50 km:** "muy cerca", "a solo X km"
- **51-100 km:** "en la zona", "cerca"
- **>100 km:** No se sugiere (a menos que no haya otras opciones)

**Uso en el Sistema:**

1. Usuario busca en Ciudad A → **Sin resultados**
2. Sistema consulta `city_distances.json` → Encuentra Ciudad B a 15 km con 45 ofertas
3. Sistema **automáticamente busca y muestra** ofertas de Ciudad B
4. Mensaje: "No encontré ofertas en Sant Cugat, pero encontré 45 ofertas en Barcelona (a solo 15 km):"

**Ejemplo Real:**

```
Usuario: "camarero sant cugat"
Resultado directo: 0 ofertas

Sistema automáticamente busca en ciudades cercanas:
1. Barcelona (15 km): 45 ofertas ✅ MUESTRA AUTOMÁTICAMENTE
2. Hospitalet (20 km): 8 ofertas
3. Sabadell (12 km): 3 ofertas
```

---

### 3. Sinónimos Multiidioma (job_id_to_names.json)

**Objetivo:** Permitir búsquedas en cualquier idioma y expandir búsquedas para maximizar resultados.

**Estructura de Datos:**

```json
{
  "10": [
    "Camarero",
    "Camarera",
    "Mesero",
    "Mesera",
    "Waiter",
    "Waitress",
    "Serveur",
    "Serveuse",
    "Cameriere",
    "Cameriera"
  ]
}
```

**Normalización de Texto:**

- Conversión a minúsculas
- Eliminación de acentos: "camarero" = "camaréro"
- Trim de espacios

**Uso en el Sistema:**

Cuando el usuario busca "mesero", el sistema automáticamente busca también:
- camarero
- camarera
- waiter
- waitress
- serveur
- cameriere

**Cobertura:**
- 13,903 denominaciones diferentes
- 8+ idiomas soportados (español, inglés, francés, italiano, alemán, portugués, catalán, euskera)

---

## Interacción del Chat Widget

### Diseño Responsive

**Desktop (>768px):**
- Widget flotante en esquina inferior derecha
- Tamaño: 380px × 600px
- Botón circular con badge de notificación

**Tablet (480px - 768px):**
- Widget: 90vw × 80vh
- Posicionamiento adaptativo

**Mobile (<480px):**
- Botón: Abajo a la derecha (bottom: 16px, right: 16px)
- Chat abierto: Fullscreen (100vw × 100vh)
- Sin scroll horizontal en la página

### Componentes del Chat

**1. Header:**
- Logo de Turijobs
- Título: "Asistente Turijobs"
- Estado: "En línea" (indicador verde pulsante)
- Botones: Reiniciar conversación + Cerrar

**2. Área de Mensajes:**
- Avatar del asistente (icono de maleta)
- Burbujas de chat diferenciadas (usuario: azul, asistente: blanco)
- Timestamps en formato 24h
- Auto-scroll al último mensaje
- Indicador de escritura (3 puntos animados)

**3. Botones de Acción:**
- **"Ver oferta"** (🔗): Abre URL de la oferta en nueva pestaña
- **"Aplicar aquí"** (✅): Abre URL de aplicación directa
- **"Ver más ofertas"** (▶️): Aparece automáticamente cuando hay más resultados

**4. Input de Texto:**
- Textarea multi-línea con auto-resize
- Placeholder: "Escribe tu mensaje..."
- Botón enviar (icono de avión de papel)
- Enter: Enviar, Shift+Enter: Nueva línea
- Se deshabilita mientras el asistente responde

**5. Footer:**
- "Powered by Turijobs"

### Estados del Chat

**Estado 1: Carga Inicial**
```
[Avatar] Asistente: "Creando conversación..."
```

**Estado 2: Mensaje de Bienvenida**
```
¡Hola! 👋 Soy tu asistente de búsqueda de empleo en el sector turístico.

Puedo ayudarte a encontrar ofertas reales de Turijobs en:
🍽️ Cocina - Chef, ayudante, cocinero
🛎️ Sala - Camarero, barista, sommelier
🏨 Recepción - Recepcionista, conserje
🧹 Housekeeping - Gobernanta, limpieza
📊 Gestión - Manager, RRHH

¿Qué tipo de trabajo buscas y dónde?
```

**Estado 3: Procesando Búsqueda**
```
[Avatar] Asistente: [3 puntos animados]
```

**Estado 4: Mostrando Resultados**
```
Encontré 45 ofertas de camarero en Barcelona. Mostrando 10:

1. Camarero/a - Hotel 5*
🏛️ Meliá Hotels International
📍 Barcelona, Barcelona
💼 Sala
💰 24,000 - 28,000.00 Anual/Bruto
⏰ Jornada completa
📅 Publicada: 2025-01-15
🔗 Ver oferta | ➡️ Aplicar ahora

[... 9 ofertas más ...]

📋 Hay 35 ofertas adicionales disponibles
¿Quieres ver más? Dime 'muéstrame más' o 'siguiente' para continuar.

[Botón: ▶️ Ver más ofertas]
```

### Persistencia de Conversación

- Cada conversación tiene un `thread_id` único
- Se guarda en `localStorage` del navegador
- Al reabrir el chat, se recuperan todos los mensajes anteriores
- Botón "Nueva conversación" para reiniciar desde cero

---

## Flujo de Búsqueda y Resultados

### Paso 1: Verificación de Caché

**Función:** `checkCacheStatus()`

El asistente SIEMPRE verifica el estado del caché antes de buscar:

```javascript
{
  "cached": true,
  "status": "success",
  "metadata": {
    "last_update": "2025-01-27T09:30:00Z",
    "total_jobs": 2078
  },
  "cache_age": {
    "hours": 12,
    "is_expired": false
  }
}
```

**Decisiones:**
- Si `is_expired: true` (>24h) → Llama a `refreshJobs()`
- Si `cached: false` → Llama a `refreshJobs()`
- Si `status: error` → Informa al usuario

### Paso 2: Actualización de Ofertas (si necesario)

**Función:** `refreshJobs()`

```
1. Descarga XML de turijobs.com/turijobs.xml
2. Parsea XML a JSON
3. Limpia y valida datos
4. Enriquece cada oferta con:
   - related_jobs (desde job_weights.json)
   - nearby_cities (desde city_distances.json)
5. Guarda en Vercel KV con TTL de 48 horas
6. Retorna resumen: total de ofertas, timestamp
```

**Tiempo estimado:** 5-10 segundos

### Paso 3: Búsqueda de Ofertas

**Función:** `searchJobs(query, location, category, limit)`

**Parámetros:**
- `query`: Puesto, empresa o palabra clave (ej: "chef", "camarero", "Meliá")
- `location`: Ciudad o región (ej: "Madrid", "Barcelona", "Islas Baleares")
- `category`: Categoría del puesto (ej: "Cocina", "Sala", "Recepción")
- `limit`: Número máximo de resultados (por defecto: 10, máx: 100)

**Expansión de Sinónimos:**

Si el usuario busca "mesero":
```
Términos expandidos: ["mesero", "mesera", "camarero", "camarera", "waiter", "waitress"]
```

El sistema busca en:
- Título de la oferta
- Descripción
- Nombre de la empresa

**Respuesta:**

```json
{
  "success": true,
  "total_matches": 45,
  "returned_results": 10,
  "results": [
    {
      "id": "12345",
      "titulo": "Chef de Partie",
      "empresa": "Meliá Hotels International",
      "ciudad": "Madrid",
      "region": "Madrid",
      "categoria": "Cocina",
      "salario": "28000 - 32000.00 Anual/Bruto",
      "tipo_jornada": "Jornada completa",
      "url": "https://www.turijobs.com/oferta/12345",
      "url_aplicar": "https://www.turijobs.com/aplicar/12345",
      "fecha_publicacion": "2025-01-15",
      "enriched": {
        "related_jobs": [
          {"job": "Jefe de Cocina", "weight": 0.95, "available_offers": 12},
          {"job": "Sous Chef", "weight": 0.90, "available_offers": 18}
        ],
        "nearby_cities": [
          {"city": "Alcalá de Henares", "distance": 35, "available_offers": 5},
          {"city": "Getafe", "distance": 15, "available_offers": 8}
        ]
      }
    }
  ]
}
```

### Paso 4: Estrategia de Búsqueda Multinivel

El asistente sigue una estrategia automática para maximizar resultados:

**NIVEL 1: Búsqueda Exacta**
```
searchJobs(query="chef", location="Madrid", limit=30)
```

**NIVEL 1.5: Ampliar con Puestos Relacionados (si <10 resultados)**
```
Si solo hay 5 ofertas de "Chef":
→ Busca "Jefe de Cocina" (weight: 0.95): +8 ofertas
→ Busca "Sous Chef" (weight: 0.90): +12 ofertas
Total: 25 ofertas combinadas
```

**NIVEL 2: Puestos Relacionados (si 0 resultados)**
```
Si no hay "Chef Ejecutivo" en Madrid:
→ Automáticamente busca "Jefe de Cocina" (peso: 0.95)
→ Mensaje: "No encontré Chef Ejecutivo, pero encontré 12 ofertas de Jefe de Cocina (puesto equivalente):"
```

**NIVEL 3: Ciudades Cercanas (si aún 0 resultados)**
```
Si no hay "Camarero" en Sant Cugat:
→ Consulta nearby_cities de Sant Cugat
→ Encuentra Barcelona (15 km) con 45 ofertas
→ Automáticamente busca en Barcelona
→ Mensaje: "No encontré en Sant Cugat, pero encontré 45 ofertas en Barcelona (a solo 15 km):"
```

**NIVEL 4: Región/Provincia (si NIVEL 3 falla)**
```
Si no hay nearby_cities disponibles:
→ Busca sin filtro de location
→ Agrupa por región
```

**NIVEL 5: Nacional (última opción)**
```
searchJobs(query="waiter", location="", limit=50)
→ Agrupa por comunidades autónomas
```

### Paso 5: Presentación de Resultados

**Formato de Oferta:**

```
**1. Chef de Partie - Hotel 5***
🏛️ Meliá Hotels International
📍 Madrid, Madrid
💼 Cocina
💰 28,000 - 32,000.00 Anual/Bruto
⏰ Jornada completa
📅 Publicada: 2025-01-15
🔗 Ver oferta | ➡️ Aplicar ahora
```

**Mensaje Inicial:**
```
"Encontré 45 ofertas de chef en Madrid. Mostrando 10:"
```

**Mensaje Final (si hay más resultados):**
```
📋 Hay 35 ofertas adicionales disponibles
¿Quieres ver más? Dime 'muéstrame más' o 'siguiente' para continuar.

[Botón: ▶️ Ver más ofertas]
```

### Paso 6: Paginación (Actual - Sin Cache)

**Comportamiento Actual:**

Cuando el usuario hace clic en "Ver más ofertas" o escribe "siguiente":

1. El asistente vuelve a llamar a `searchJobs()` con los **mismos parámetros**
2. Se **re-parsea todo el XML** desde caché
3. Se **re-filtran todos los resultados**
4. Se devuelven las **siguientes 10 ofertas**
5. **Tiempo:** 2-3 segundos (igual que búsqueda inicial)

**Limitación Identificada:**

⚠️ **No hay memoria de estado entre páginas** → El asistente no recuerda qué ofertas ya mostró, por lo que podría repetir algunas ofertas al paginar.

---

## Funcionalidades Implementadas

### ✅ Frontend (React Widget)

- [x] **Chat Widget responsive** (Desktop, Tablet, Mobile)
- [x] **Diseño mobile-first** con fullscreen en pantallas pequeñas
- [x] **Botón flotante** posicionado correctamente (bottom-right en mobile)
- [x] **Sin scroll horizontal** en mobile
- [x] **Botones de acción** para cada oferta:
  - 🔗 "Ver oferta" (abre en nueva pestaña)
  - ✅ "Aplicar ahora" (abre formulario de aplicación)
- [x] **Botón "Ver más ofertas"** (▶️) que aparece automáticamente cuando hay más resultados
- [x] **Persistencia de conversación** (localStorage)
- [x] **Indicador de escritura** (3 puntos animados)
- [x] **Auto-scroll** al último mensaje
- [x] **Timestamps** en mensajes
- [x] **Formato Markdown** en mensajes (negritas, enlaces)
- [x] **Botón "Nueva conversación"** para reiniciar

### ✅ Backend (API)

- [x] **Cache de ofertas en Vercel KV** (Redis)
  - TTL: 48 horas
  - Auto-actualización cuando expira
- [x] **Descarga y parseo de XML** desde Turijobs.com
- [x] **Enriquecimiento de datos** con:
  - Puestos relacionados (job_weights.json)
  - Ciudades cercanas (city_distances.json)
- [x] **Búsqueda con expansión de sinónimos** (13,903 denominaciones)
- [x] **Normalización de texto** (sin acentos, minúsculas)
- [x] **API Routes:**
  - `/api/jobs/status` - Verificar estado del caché
  - `/api/jobs/refresh` - Actualizar ofertas
  - `/api/jobs/search` - Buscar con filtros
  - `/api/chat/create-thread` - Crear conversación
  - `/api/chat/send-message` - Enviar mensaje
  - `/api/chat/get-messages` - Recuperar historial

### ✅ Asistente IA (GPT-4o)

- [x] **Prompt optimizado** (9,657 caracteres, reducción del 58%)
- [x] **Function calling** con 3 funciones:
  - checkCacheStatus()
  - refreshJobs()
  - searchJobs()
- [x] **Comportamiento proactivo** - No pregunta, muestra resultados automáticamente
- [x] **Estrategia multinivel** de búsqueda (5 niveles)
- [x] **Mensaje de bienvenida** personalizado
- [x] **Límite por defecto:** 10 ofertas por búsqueda
- [x] **Indicación de total** de ofertas disponibles
- [x] **Sugerencias automáticas** de puestos relacionados
- [x] **Búsqueda automática** en ciudades cercanas cuando no hay resultados

### ✅ Datos Enriquecidos

- [x] **13,903 sinónimos de puestos** en 8+ idiomas
- [x] **43,854 ciudades** con coordenadas geográficas
- [x] **Cálculo de distancias** con fórmula Haversine
- [x] **Pesos de similitud** entre puestos (0.60 - 1.00)
- [x] **Cobertura:**
  - 85.7% ofertas con puestos relacionados
  - 27% ofertas con ciudades cercanas

### ✅ UX/UI

- [x] **Diseño visual** inspirado en sector turístico
- [x] **Colores corporativos:**
  - Primario: Azul (#0066cc)
  - Secundario: Naranja (#ff6b35)
- [x] **Iconos intuitivos** (emojis para categorías)
- [x] **Animaciones suaves** (fade in, slide up)
- [x] **Estados de carga** claros
- [x] **Mensajes de error** informativos
- [x] **Links externos** con rel="noopener noreferrer"

---

## Funcionalidades Pendientes

### 🔲 Paginación con Cache (Alta Prioridad)

**Problema Actual:**
- Al hacer clic en "Ver más", el sistema vuelve a parsear todo el XML
- Tiempo: 2-3 segundos por página (mismo que búsqueda inicial)
- No hay garantía de no repetir ofertas

**Solución Propuesta:**

1. **Modificar `searchJobs()`** para devolver un `search_id` único
2. **Guardar resultados completos** en KV con key `search:{search_id}`
   - TTL: 15 minutos (suficiente para sesión de usuario)
   - Incluye: query, location, total_matches, all_results, current_offset
3. **Crear endpoint `getNextPage(search_id)`** que:
   - Recupera resultados del cache (instantáneo)
   - Devuelve siguiente página (offset + limit)
   - Actualiza offset en el cache
4. **Actualizar Assistant** para usar `getNextPage()` en vez de `searchJobs()` cuando usuario pide "siguiente"

**Beneficio Esperado:**
- ✅ Paginación instantánea (<500ms vs 2-3s)
- ✅ Sin repetición de ofertas
- ✅ Mejor experiencia de usuario

**Estimación:** 4 horas de desarrollo + testing

**Estado:** Implementación inicial intentada pero revertida por errores en producción. Requiere debugging y re-implementación cuidadosa.

### 🔲 Mejorar Cobertura de Ciudades Cercanas

**Problema Actual:**
- Solo 27% de ofertas tienen ciudades cercanas (536 de 1,985)
- Muchas ciudades pequeñas no están en worldcities.csv

**Solución:**
- Agregar más ciudades españolas y portuguesas manualmente
- Usar API de geocoding (Google Maps, OpenStreetMap) para ciudades faltantes
- Objetivo: 50%+ de cobertura

**Estimación:** 2 horas

### 🔲 Filtros Avanzados

- [ ] Filtro por salario mínimo/máximo
- [ ] Filtro por tipo de jornada (completa, parcial, temporal)
- [ ] Filtro por fecha de publicación (últimos 7 días, 30 días)
- [ ] Ordenar por: relevancia, fecha, salario

**Estimación:** 6 horas

### 🔲 Analytics Básico

- [ ] Dashboard de métricas de uso
- [ ] Búsquedas más frecuentes
- [ ] Tasa de clics en ofertas
- [ ] Tiempo promedio de sesión

**Estimación:** 8 horas

### 🔲 Mejoras de IA

- [ ] Entender experiencia del usuario ("3 años en recepción")
- [ ] Filtrar por nivel de experiencia requerido
- [ ] Sugerencias basadas en historial de búsquedas
- [ ] Resumen de ofertas con bullet points

**Estimación:** 10 horas

---

## Recomendaciones Futuras

### 1. Optimización de Performance

**Cache Inteligente:**
- Implementar cache de búsquedas frecuentes (ej: "camarero barcelona")
- TTL corto (5 min) para evitar datos obsoletos
- Invalidación cuando se actualiza el feed XML

**Lazy Loading:**
- Cargar ofertas en bloques de 10 (actualmente se cargan todas en memoria)
- Virtualized list para listas muy largas

**CDN:**
- Servir archivos estáticos (job_weights.json, city_distances.json) desde CDN
- Reducir latencia de carga inicial

### 2. Mejoras de Datos

**Enriquecimiento Adicional:**
- **Salario promedio por puesto/ciudad:** Calcular promedios para informar al usuario
- **Demanda del puesto:** Indicar si un puesto está en alta demanda
- **Empresa verificada:** Badge para empresas con buena reputación
- **Nivel de inglés requerido:** Extraer de descripciones

**Validación de Datos:**
- Detectar y corregir errores en el XML (ciudades mal escritas, categorías inconsistentes)
- Normalizar formato de salarios
- Estandarizar tipos de jornada

### 3. UX/UI Avanzado

**Modo Oscuro:**
- Tema dark mode para reducir fatiga visual

**Accesibilidad:**
- ARIA labels completos
- Navegación por teclado
- Alto contraste para usuarios con baja visión
- Screen reader compatible

**Multi-idioma:**
- Interface en inglés, francés, alemán
- Búsquedas en cualquier idioma (ya soportado en backend)

### 4. Monetización

**Plan Freemium:**
- **Gratis:** 10 búsquedas/día, 10 ofertas por búsqueda
- **Premium:** Búsquedas ilimitadas, filtros avanzados, alertas

**Para Empresas:**
- Widget white-label para que empresas lo integren en su web
- Analytics de candidatos
- Publicar ofertas directamente desde el chat

### 5. Escalabilidad

**Arquitectura:**
- Migrar a microservicios si el tráfico crece >10k usuarios/día
- Queue system (Bull/BullMQ) para procesar actualizaciones de XML en background
- Múltiples workers para paralelizar enriquecimiento de datos

**Monitoring:**
- Sentry para error tracking
- Datadog/New Relic para APM
- Alertas automáticas cuando API/cache falla

---

## Métricas de Éxito

### KPIs Actuales

**Funcionalidad:**
- ✅ 2,078 ofertas activas
- ✅ 85.7% ofertas con puestos relacionados
- ✅ 27% ofertas con ciudades cercanas
- ✅ 13,903 sinónimos de puestos
- ✅ 43,854 ciudades en base de datos

**Performance:**
- ✅ Primera búsqueda: 2-3 segundos
- ⚠️ Paginación: 2-3 segundos (mejorable a <500ms)
- ✅ Caché actualizado cada 24-48 horas

**UX:**
- ✅ Widget responsive (desktop, tablet, mobile)
- ✅ Sin scroll horizontal en mobile
- ✅ Botón "Ver más" automático
- ✅ Persistencia de conversación

### KPIs Objetivo (3-6 meses)

**Engagement:**
- [ ] 1,000+ usuarios únicos/mes
- [ ] 50% tasa de retorno (usuarios que vuelven)
- [ ] 3+ búsquedas promedio por sesión
- [ ] 15% CTR en ofertas (clics en "Ver oferta")

**Performance:**
- [ ] Paginación <500ms (con cache implementado)
- [ ] 99.9% uptime
- [ ] <200ms tiempo de respuesta del chat

**Datos:**
- [ ] 3,000+ ofertas activas
- [ ] 95% ofertas con puestos relacionados
- [ ] 50% ofertas con ciudades cercanas

---

## Conclusión

El **Turijobs AI Chat Widget** es una solución robusta y escalable para búsqueda de empleo conversacional en el sector turístico. Con **13,903 sinónimos de puestos** y **43,854 ciudades** en su base de datos, ofrece una experiencia de búsqueda inteligente que maximiza resultados relevantes.

**Fortalezas:**
- 🚀 Búsqueda multiidioma con expansión de sinónimos
- 🤖 Asistente proactivo (no pregunta, muestra resultados)
- 🗺️ Sugerencias automáticas de ciudades cercanas
- 📱 Widget responsive optimizado para mobile
- ⚡ Cache de 48 horas para respuestas rápidas

**Próximos Pasos:**
1. **Implementar paginación con cache** (alta prioridad) → Reducir tiempo de "Ver más" de 2-3s a <500ms
2. **Mejorar cobertura de ciudades cercanas** → Objetivo: 50% de ofertas
3. **Analytics básico** → Entender comportamiento de usuarios
4. **Filtros avanzados** → Permitir búsqueda por salario, fecha, jornada

**Estado Actual:** ✅ **Producción estable** (Deployment: 5ycm2h4Jc)

---

**Documento preparado por:** Claude AI
**Fecha:** 27 de enero de 2025
**Versión:** 1.0
