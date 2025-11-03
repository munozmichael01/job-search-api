# Explicación: nearby_cities vs enriched.nearby_cities

## 🎯 Concepto Clave: Son DOS cosas COMPLETAMENTE diferentes

---

## 1️⃣ `nearby_cities` - Ciudades Alternativas para la Búsqueda Actual

### ¿Qué es?
Ciudades cercanas que tienen ofertas **del mismo puesto que estás buscando AHORA**.

### ¿Cuándo aparece?
**SOLO cuando hay entre 1-9 resultados** en la ciudad buscada (NIVEL 1.5).

### ¿Dónde se calcula?
En `api/jobs/search.js` línea 305-370, **dinámicamente en cada request**.

### ¿Qué distancia usa?
**≤50km** (para mantener relevancia)

### ¿Para qué sirve?
Mostrar al usuario: *"También hay ofertas de este puesto en ciudades cercanas"*

---

### 📌 Ejemplo 1: Búsqueda con NIVEL 1.5

**Request:**
```
GET /api/jobs/search?query=recepcionista&location=viladecans
```

**Proceso:**
1. Busca "recepcionista" en Viladecans → **2 ofertas** (pocas)
2. Como son <10, busca ciudades cercanas con ofertas de RECEPCIONISTA
3. Encuentra Barcelona (8.4km) con 8 recepcionistas
4. Agrega hasta completar 10 ofertas totales

**Response:**
```json
{
  "results": [
    {"id": "1", "titulo": "Recepcionista Hotel", "ciudad": "Viladecans"},
    {"id": "2", "titulo": "Recepcionista Spa", "ciudad": "Viladecans"}
  ],
  "related_jobs_results": [
    {"id": "3", "titulo": "Recepcionista 4*", "ciudad": "Barcelona"},
    {"id": "4", "titulo": "Recepcionista Resort", "ciudad": "Barcelona"},
    // ... 6 más de Barcelona
  ],
  "nearby_cities": [
    {
      "city_name": "Barcelona",
      "distance": "8 km",
      "distance_value": 8.4,
      "results_count": 8,
      "results": [/* primeras 5 ofertas de Barcelona */]
    }
  ],
  "amplification_used": {
    "type": "nivel_1_5_nearby",
    "original_count": 2,
    "added_count": 8,
    "nearby_city": "Barcelona",
    "distance_km": 8.4
  }
}
```

**Interpretación:**
- `nearby_cities` te dice: *"Hey, Barcelona tiene 8 recepcionistas más"*
- Es ESPECÍFICO para esta búsqueda de "recepcionista en viladecans"
- Solo muestra ciudades con ofertas de RECEPCIONISTA (no chef, no camarero)

---

### 📌 Ejemplo 2: Búsqueda sin nearby_cities

**Request:**
```
GET /api/jobs/search?query=chef&location=barcelona
```

**Proceso:**
1. Busca "chef" en Barcelona → **15 ofertas** (suficientes)
2. Como son ≥10, NO calcula nearby_cities
3. Retorna solo las 10 primeras

**Response:**
```json
{
  "results": [
    {"id": "1", "titulo": "Chef Hotel 5*", "ciudad": "Barcelona"},
    {"id": "2", "titulo": "Sous Chef", "ciudad": "Barcelona"},
    // ... 8 más
  ],
  "nearby_cities": null,  // ❌ NO aparece (hay suficientes resultados)
  "pagination": {
    "total_matches": 15,
    "has_more": true
  }
}
```

---

## 2️⃣ `enriched.nearby_cities` - Contexto Geográfico de Cada Oferta

### ¿Qué es?
Ciudades cercanas a la ubicación de **ESA oferta específica** (no de tu búsqueda).

### ¿Cuándo aparece?
**SIEMPRE** en cada oferta (si la ciudad tiene vecinas).

### ¿Dónde se calcula?
En `lib/enrichOffers.js` línea 328-354, **durante el refresh diario**.

### ¿Qué distancia usa?
**≤100km** (más amplio, solo para contexto)

### ¿Para qué sirve?
Mostrar al usuario: *"Esta oferta está en X ciudad, cerca de Y y Z"*

---

### 📌 Ejemplo 3: enriched.nearby_cities en cada oferta

**Request:**
```
GET /api/jobs/search?query=chef&location=madrid
```

**Response:**
```json
{
  "results": [
    {
      "id": "123",
      "titulo": "Chef - Restaurante Michelin",
      "ciudad": "Madrid",
      "enriched": {
        "nearby_cities": [
          {"city": "Getafe", "distance": 12.7, "available_offers": 3},
          {"city": "Alcorcón", "distance": 13, "available_offers": 5},
          {"city": "Móstoles", "distance": 18, "available_offers": 2}
        ]
      }
    },
    {
      "id": "456",
      "titulo": "Chef - Hotel Barcelona",
      "ciudad": "Barcelona",
      "enriched": {
        "nearby_cities": [
          {"city": "Badalona", "distance": 9, "available_offers": 3},
          {"city": "El Prat", "distance": 8.9, "available_offers": 1},
          {"city": "Sant Just Desvern", "distance": 9, "available_offers": 1}
        ]
      }
    }
  ]
}
```

**Interpretación:**
- Cada oferta tiene SUS propias ciudades cercanas
- La oferta de Madrid muestra ciudades cerca de Madrid
- La oferta de Barcelona muestra ciudades cerca de Barcelona
- Es información de CONTEXTO, no afecta la búsqueda

---

## 🔍 Comparación Lado a Lado

| Aspecto | `nearby_cities` | `enriched.nearby_cities` |
|---------|-----------------|--------------------------|
| **Nivel** | En la respuesta raíz | Dentro de cada oferta |
| **Cantidad** | 1 array (para toda la búsqueda) | N arrays (uno por oferta) |
| **Cuándo aparece** | Solo si hay 1-9 resultados | Siempre (si hay vecinas) |
| **Qué muestra** | Ciudades con ofertas del MISMO puesto | Ciudades cerca de ESA oferta |
| **Distancia** | ≤50km | ≤100km |
| **Cuándo se calcula** | Dinámicamente en cada request | Durante el refresh diario |
| **Para qué sirve** | Ampliar resultados de búsqueda | Dar contexto geográfico |
| **Ejemplo** | "Barcelona tiene 8 recepcionistas más" | "Esta oferta está en Madrid, cerca de Getafe" |

---

## 🎯 ¿Dónde Entran los ≤50km?

### 1️⃣ En `nearby_cities` (NIVEL 1.5)
✅ Usa ≤50km para buscar ciudades alternativas

```javascript
// api/jobs/search.js línea ~346
if (nearbyCity.distance && nearbyCity.distance <= 50) {
  // Solo ciudades dentro de 50km
}
```

### 2️⃣ En NIVEL 0.5 (ciudades cercanas cuando 0 resultados)
✅ Usa ≤50km para buscar el mismo puesto en ciudades cercanas

```javascript
// api/jobs/search.js línea ~416
.filter(c => c.distance <= 50)
```

### 3️⃣ En `valid_cities` (generación durante refresh)
✅ Agrega ciudades ≤50km a la lista de válidas

```javascript
// api/jobs/refresh.js línea ~197
result.distances
  .filter(c => c.distance <= 50)
  .forEach(c => validCitiesSet.add(normalizeText(c.city)));
```

### 4️⃣ En `enriched.nearby_cities`
❌ Usa ≤100km (más amplio, solo contexto)

```javascript
// lib/enrichOffers.js línea ~336
.filter(city => city.distance <= 100)  // 100km, no 50km
```

---

## 💡 Caso de Uso Real: "recepcionista viladecans"

### Lo que ves en la respuesta:

```json
{
  "results": [
    {
      "id": "1",
      "titulo": "Recepcionista - Hotel Viladecans",
      "ciudad": "Viladecans",
      "enriched": {
        "nearby_cities": [
          // 🔵 CONTEXTO: Ciudades cerca de Viladecans
          {"city": "Barcelona", "distance": 8.4},
          {"city": "El Prat", "distance": 3.2}
        ]
      }
    },
    {
      "id": "2",
      "titulo": "Recepcionista - Spa Viladecans",
      "ciudad": "Viladecans",
      "enriched": {
        "nearby_cities": [
          // 🔵 CONTEXTO: Mismas ciudades (misma ubicación)
          {"city": "Barcelona", "distance": 8.4},
          {"city": "El Prat", "distance": 3.2}
        ]
      }
    }
  ],
  "related_jobs_results": [
    {
      "id": "3",
      "titulo": "Recepcionista - Hotel W Barcelona",
      "ciudad": "Barcelona",
      "enriched": {
        "nearby_cities": [
          // 🔵 CONTEXTO: Ciudades cerca de Barcelona (diferentes)
          {"city": "Badalona", "distance": 9},
          {"city": "Sant Just", "distance": 9}
        ]
      }
    }
  ],
  "nearby_cities": [
    // 🟢 BÚSQUEDA: Te informa que Barcelona tiene más recepcionistas
    {
      "city_name": "Barcelona",
      "distance": "8 km",
      "results_count": 8
    }
  ]
}
```

### ¿Qué significa cada uno?

**🟢 `nearby_cities` (raíz):**
- *"No solo hay 2 recepcionistas en Viladecans, también hay 8 en Barcelona"*
- **Uso:** El frontend puede mostrar un banner: *"Ver también 8 ofertas en Barcelona →"*
- **Relevante para:** La BÚSQUEDA actual

**🔵 `enriched.nearby_cities` (en cada oferta):**
- *"Esta oferta está en Viladecans, que está cerca de Barcelona y El Prat"*
- **Uso:** El frontend puede mostrar: *"Esta oferta está en Viladecans (cerca de Barcelona, El Prat)"*
- **Relevante para:** ESA oferta específica

---

## ✅ ¿Se Complementan?

**SÍ, pero para propósitos diferentes:**

### `nearby_cities` → Ayuda a AMPLIAR la búsqueda
- *"No encontraste suficiente aquí, mira en estas ciudades"*
- Acción: Click en "Ver ofertas en Barcelona"
- Resultado: Nueva búsqueda en Barcelona

### `enriched.nearby_cities` → Ayuda a ENTENDER la ubicación
- *"Esta oferta está en X, pero cerca de Y donde también vives"*
- Acción: Decidir si la distancia es aceptable
- Resultado: Aplicar o descartar

---

## 📝 Resumen

1. **`nearby_cities`** = *"Hay más ofertas de este puesto en estas ciudades"* (≤50km)
2. **`enriched.nearby_cities`** = *"Esta oferta está cerca de estas ciudades"* (≤100km)
3. **NO son redundantes** - sirven propósitos diferentes
4. **Ambos útiles** - uno para búsqueda, otro para contexto
5. **Los ≤50km** se usan en: NIVEL 0.5, NIVEL 1.5, valid_cities (NO en enriched)

---

**Pregunta de follow-up:** ¿Te gustaría que eliminemos también `enriched.nearby_cities` de la respuesta para reducir más el tamaño? O prefieres mantenerlo como contexto útil?
