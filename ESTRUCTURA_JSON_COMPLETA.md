# 📋 Estructura JSON Completa de la API

**Endpoint:** `/api/jobs/search`
**Versión:** 2025-11-04
**Total ofertas:** 2052

---

## 🎯 Ejemplo Real: NIVEL 0.5 (barman sant cugat)

```json
{
  "success": true,

  // ═══════════════════════════════════════
  // METADATA: Información del cache y feed
  // ═══════════════════════════════════════
  "metadata": {
    "last_update": "2025-11-04T08:00:43.401Z",
    "total_jobs": 2052,
    "status": "success",
    "feed_url": "https://feed.turijobs.com/partner/files/...",
    "cities_with_offers": 323,
    "cache_age_minutes": null,

    // Parámetros de la búsqueda (con sinónimos expandidos)
    "query_params": {
      "query": "barman",
      "location": "sant cugat",
      "category": "",
      "limit": 10,
      "offset": 0,

      // 🔍 SINÓNIMOS: Todos los términos que se buscan
      "expanded_terms": [
        "bartender",
        "coctelero",
        "coctelero/a",
        "barwoman",
        "mixologo/a",
        "mixologo",
        "barman",
        "barmaid",
        "camarero de bar",
        "camarera de bar",
        "mesero de bar",
        "mesera de bar",
        "mixologa",
        "cantinero",
        "cantinera",
        "mixologist",
        "cocktail designer",
        "drinksmith",
        "bar mixologist",
        "barkeeper",
        "bar staff",
        "drink server",
        "bar server"
        // ... (50 sinónimos totales para "barman")
      ]
    }
  },

  // ═══════════════════════════════════════
  // PAGINACIÓN: Resultados originales (en este caso vacío)
  // ═══════════════════════════════════════
  "pagination": {
    "total_matches": 0,           // 0 resultados en Sant Cugat
    "returned_results": 0,
    "offset": 0,
    "limit": 10,
    "has_more": false,
    "remaining": 0,
    "next_offset": null
  },

  // ═══════════════════════════════════════
  // RESULTS: Ofertas de la búsqueda original
  // ═══════════════════════════════════════
  "results": [],  // Vacío porque no hay resultados en Sant Cugat

  // ═══════════════════════════════════════
  // RELATED_JOBS_RESULTS: Ofertas de amplificación
  // (En NIVEL 0.5: mismo puesto en ciudades cercanas)
  // ═══════════════════════════════════════
  "related_jobs_results": [
    {
      // ─────────────────────────────────
      // Información básica de la oferta
      // ─────────────────────────────────
      "id": "311134",
      "titulo": "Bartender Hotel 5* - (Barcelona)",
      "empresa": "METT Barcelona",
      "ciudad": "Barcelona",
      "region": "Barcelona, Barcelona",
      "pais_id": "40",  // España
      "categoria": "Sala",
      "salario": "No especificado",
      "tipo_jornada": "Jornada completa, Turno Rotativo",

      // URLs para ver y aplicar
      "url": "https://www.turijobs.com/es-es/oferta-trabajo/barcelona/bartender-hotel-5/311134?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "url_aplicar": "https://www.turijobs.com/es-es/oferta/barcelona/bartender-hotel-5/311134/aplicar?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",

      "fecha_publicacion": "29/09/2025 16:15:37",
      "num_vacantes": "1",

      // ─────────────────────────────────
      // ENRICHED: Datos enriquecidos
      // ─────────────────────────────────
      "enriched": {

        // 🔗 TRABAJOS RELACIONADOS (del puesto actual)
        // Calculados usando job_weights.json
        "related_jobs": [
          {
            "job": "Gerente de Bar",
            "weight": 0.95,              // Similaridad: 95%
            "area": "Sala",
            "available_offers": 0        // Ofertas disponibles actualmente
          },
          {
            "job": "Gerente de Coctelería",
            "weight": 0.95,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Barista",
            "weight": 0.94,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Sommelier",
            "weight": 0.9,
            "area": "Sala",
            "available_offers": 1        // ✅ Hay 1 oferta de Sommelier
          },
          {
            "job": "Gerente de Restaurante",
            "weight": 0.63,              // Menos relacionado
            "area": "Dirección",
            "available_offers": 0
          }
        ],

        // 🌍 CIUDADES CERCANAS (a la ubicación de esta oferta)
        // Calculadas desde city_distances.json (≤100km)
        "nearby_cities": [
          {
            "city": "El Prat de Llobregat",
            "distance": 8.9,             // km desde Barcelona
            "country": "Spain",
            "available_offers": 1        // Ofertas disponibles en esa ciudad
          },
          {
            "city": "Badalona",
            "distance": 9,
            "country": "Spain",
            "available_offers": 3
          }
        ]
      }
    },

    // Segunda oferta...
    {
      "id": "312051",
      "titulo": "Bartender en Pulitzer Hotels Barcelona",
      "empresa": "Pulitzer Hoteles",
      "ciudad": "Barcelona",
      "region": "Barcelona, Barcelona",
      "pais_id": "40",
      "categoria": "Sala",
      "salario": "No especificado",
      "tipo_jornada": "Jornada completa, 40h semanales",
      "url": "https://www.turijobs.com/es-es/oferta-trabajo/barcelona/bartender-en-pulitzer-hotels-barcelona/312051?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "url_aplicar": "https://www.turijobs.com/es-es/oferta/barcelona/bartender-en-pulitzer-hotels-barcelona/312051/aplicar?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "fecha_publicacion": "13/10/2025 15:44:12",
      "num_vacantes": "1",
      "enriched": {
        "related_jobs": [
          {
            "job": "Gerente de Bar",
            "weight": 0.95,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Gerente de Coctelería",
            "weight": 0.95,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Barista",
            "weight": 0.94,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Sommelier",
            "weight": 0.9,
            "area": "Sala",
            "available_offers": 1
          },
          {
            "job": "Gerente de Restaurante",
            "weight": 0.63,
            "area": "Dirección",
            "available_offers": 0
          }
        ],
        "nearby_cities": [
          {
            "city": "El Prat de Llobregat",
            "distance": 8.9,
            "country": "Spain",
            "available_offers": 1
          },
          {
            "city": "Badalona",
            "distance": 9,
            "country": "Spain",
            "available_offers": 3
          }
        ]
      }
    },

    // Tercera oferta...
    {
      "id": "312594",
      "titulo": "Bartender - Torre Melina A Gran Melià Hotel",
      "empresa": "Meliá Hotels International",
      "ciudad": "Barcelona",
      "region": "Barcelona, Barcelona",
      "pais_id": "40",
      "categoria": "Sala",
      "salario": "No especificado",
      "tipo_jornada": "No especificado",
      "url": "https://www.turijobs.com/es-es/oferta-trabajo/barcelona/bartender-torre-melina-a-gran-melia-hotel/312594?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "url_aplicar": "https://www.turijobs.com/es-es/oferta/barcelona/bartender-torre-melina-a-gran-melia-hotel/312594/aplicar?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "fecha_publicacion": "27/10/2025 13:59:04",
      "num_vacantes": "1",
      "enriched": {
        "related_jobs": [
          {
            "job": "Gerente de Bar",
            "weight": 0.95,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Gerente de Coctelería",
            "weight": 0.95,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Barista",
            "weight": 0.94,
            "area": "Sala",
            "available_offers": 0
          },
          {
            "job": "Sommelier",
            "weight": 0.9,
            "area": "Sala",
            "available_offers": 1
          },
          {
            "job": "Gerente de Restaurante",
            "weight": 0.63,
            "area": "Dirección",
            "available_offers": 0
          }
        ],
        "nearby_cities": [
          {
            "city": "El Prat de Llobregat",
            "distance": 8.9,
            "country": "Spain",
            "available_offers": 1
          },
          {
            "city": "Badalona",
            "distance": 9,
            "country": "Spain",
            "available_offers": 3
          }
        ]
      }
    },

    // Cuarta oferta...
    {
      "id": "313495",
      "titulo": "Coctelero/a con Experiencia en Bar en Eixample",
      "empresa": "Playtime Music, S.L.",
      "ciudad": "Barcelona",
      "region": "Barcelona, Barcelona",
      "pais_id": "40",
      "categoria": "Sala",
      "salario": "No especificado",
      "tipo_jornada": "Media jornada",
      "url": "https://www.turijobs.com/es-es/oferta-trabajo/barcelona/empleado-cocteleroa-con-experiencia-en-bar-en-eixample/313495?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "url_aplicar": "https://www.turijobs.com/es-es/oferta/barcelona/empleado-cocteleroa-con-experiencia-en-bar-en-eixample/313495/aplicar?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "fecha_publicacion": "29/10/2025 9:07:19",
      "num_vacantes": "1",
      "enriched": {
        // Este trabajo tiene diferentes relacionados porque es "Coctelero"
        // que tiene relación con entretenimiento
        "related_jobs": [
          {
            "job": "Bailarín de Discoteca",
            "weight": 0.96,
            "area": "Animación, Entretenimiento y Ocio",
            "available_offers": 0
          },
          {
            "job": "Animador Fitness",
            "weight": 0.96,
            "area": "Animación, Entretenimiento y Ocio",
            "available_offers": 0
          },
          {
            "job": "Músico/a",
            "weight": 0.95,
            "area": "Animación, Entretenimiento y Ocio",
            "available_offers": 0
          },
          {
            "job": "Cantante de club nocturno",
            "weight": 0.95,
            "area": "Animación, Entretenimiento y Ocio",
            "available_offers": 0
          },
          {
            "job": "Animador de Eventos",
            "weight": 0.95,
            "area": "Animación, Entretenimiento y Ocio",
            "available_offers": 0
          },
          {
            "job": "Coordinador de Entretenimiento",
            "weight": 0.9,
            "area": "Animación, Entretenimiento y Ocio",
            "available_offers": 0
          },
          {
            "job": "Gerente de Entretenimiento",
            "weight": 0.9,
            "area": "Animación, Entretenimiento y Ocio",
            "available_offers": 0
          },
          {
            "job": "Técnico de Sonido e Iluminación",
            "weight": 0.65,
            "area": "Eventos",
            "available_offers": 0
          },
          {
            "job": "Técnico de Escenario",
            "weight": 0.65,
            "area": "Eventos",
            "available_offers": 0
          }
        ],
        "nearby_cities": [
          {
            "city": "El Prat de Llobregat",
            "distance": 8.9,
            "country": "Spain",
            "available_offers": 1
          },
          {
            "city": "Badalona",
            "distance": 9,
            "country": "Spain",
            "available_offers": 3
          }
        ]
      }
    }
  ],

  // ═══════════════════════════════════════
  // AMPLIFICATION_USED: Info sobre qué amplificación se usó
  // ═══════════════════════════════════════
  "amplification_used": {
    "type": "nivel_0_5_nearby",        // Tipo de amplificación
    "original_query": "barman",         // Query original del usuario
    "original_location": "sant cugat",  // Ubicación original
    "nearby_city": "Barcelona",         // Ciudad de donde vienen los resultados
    "distance_km": 12.5,                // Distancia en kilómetros
    "total_nearby_found": 4,            // Total de ofertas encontradas

    // Paginación de los resultados amplificados
    "nearby_pagination": {
      "total_matches": 4,
      "returned_results": 4,
      "offset": 0,
      "limit": 10,
      "has_more": false,
      "remaining": 0,
      "next_offset": null
    }
  }
}
```

---

## 📊 Explicación de las Secciones

### 1. `metadata`
- **Qué es:** Información del sistema y cache
- **Incluye:**
  - Fecha del último refresh
  - Total de ofertas en el sistema (2052)
  - Ciudades con ofertas (323)
  - Parámetros de la búsqueda
  - **IMPORTANTE:** Sinónimos expandidos (50 términos para "barman")

---

### 2. `pagination` + `results`
- **Qué es:** Resultados DIRECTOS de la búsqueda original
- **En este caso:** Vacío porque no hay ofertas de barman en Sant Cugat
- **En NIVEL 1:** Aquí vendrían las 10+ ofertas directas

---

### 3. `related_jobs_results`
- **Qué es:** Ofertas de AMPLIFICACIÓN
- **Contenido varía según nivel:**
  - **NIVEL 0.5:** MISMO puesto en ciudades cercanas (este ejemplo)
  - **NIVEL 1.5:** Más ofertas del MISMO puesto para complementar
  - **NIVEL 2:** Trabajos RELACIONADOS en la misma ciudad
  - **NIVEL 2 NEARBY:** Trabajos RELACIONADOS en ciudades cercanas

---

### 4. `enriched` (dentro de cada oferta)

#### 4.1. `enriched.related_jobs`
- **Qué es:** Trabajos relacionados **CON ESE PUESTO específico**
- **Fuente:** Calculado desde `job_weights.json`
- **Criterio:** Similaridad (weight) de 0.0 a 1.0
- **Incluye:** Solo los top 19 trabajos más relacionados
- **Uso:** Para sugerir "¿Te interesan también estos puestos?"

**Ejemplo:**
- Para "Bartender" (weight 1.0):
  - Gerente de Bar: 0.95 (muy similar)
  - Barista: 0.94 (similar)
  - Sommelier: 0.90 (relacionado)
  - Gerente de Restaurante: 0.63 (algo relacionado)

#### 4.2. `enriched.nearby_cities`
- **Qué es:** Ciudades cercanas **A LA UBICACIÓN DE ESA OFERTA**
- **Fuente:** Calculado desde `city_distances.json`
- **Criterio:** ≤100km (más amplio que el criterio de búsqueda)
- **Incluye:** Solo ciudades que tienen ofertas actualmente
- **Uso:** Mostrar "También hay ofertas en..."

**Ejemplo:**
- Para Barcelona:
  - El Prat de Llobregat: 8.9km, 1 oferta
  - Badalona: 9km, 3 ofertas

---

### 5. `amplification_used`
- **Qué es:** Metadata sobre QUÉ amplificación se ejecutó
- **Solo aparece cuando:** Hubo amplificación (NIVEL 0.5, 1.5, 2, 2 NEARBY)
- **No aparece cuando:** NIVEL 1 (suficientes resultados directos)

**Campos:**
- `type`: Tipo de amplificación
- `original_query`: Lo que buscó el usuario
- `original_location`: Dónde buscó el usuario
- `nearby_city`: De qué ciudad vienen los resultados (si aplica)
- `distance_km`: Distancia a esa ciudad (si aplica)
- `nearby_pagination`: Paginación de resultados amplificados

---

## 🔍 Diferencias Clave

### `enriched.related_jobs` vs `related_jobs_results`

| Concepto | `enriched.related_jobs` | `related_jobs_results` |
|----------|------------------------|------------------------|
| **Ubicación** | Dentro de cada oferta | Raíz de la respuesta |
| **Qué es** | Trabajos relacionados con ESE puesto | Ofertas completas de amplificación |
| **Contenido** | Solo nombres y weights | Ofertas completas con todos los datos |
| **Cuándo aparece** | Siempre (en cada oferta) | Solo cuando hay amplificación |
| **Uso** | Sugerencias de carrera | Resultados alternativos |

### `enriched.nearby_cities` vs `amplification_used.nearby_city`

| Concepto | `enriched.nearby_cities` | `amplification_used.nearby_city` |
|----------|-------------------------|--------------------------------|
| **Ubicación** | Dentro de cada oferta | Raíz de la respuesta |
| **Qué es** | Ciudades cerca de DONDE ESTÁ la oferta | Ciudad de DONDE VIENEN los resultados |
| **Distancia** | ≤100km | ≤50km |
| **Lista** | Array de ciudades | String (una sola ciudad) |
| **Uso** | Info contextual de la oferta | Info sobre la amplificación |

---

## 🎯 Ejemplo Comparativo: NIVEL 2

Para ver cómo cambia la estructura con trabajos relacionados:

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef+molecular&location=barcelona"
```

**En este caso:**
- `results`: [] (vacío)
- `related_jobs_results`: [Ofertas de Chef, Sous Chef, Chef de Partie]
- `amplification_used.type`: "nivel_2_related"
- Los `enriched.related_jobs` serían diferentes (relacionados con Chef)

---

## 📝 Campos Opcionales

Algunos campos pueden no aparecer:

- `salario`: Puede ser "No especificado"
- `tipo_jornada`: Puede ser "No especificado"
- `enriched.related_jobs`: Puede estar vacío `[]` si no hay relacionados
- `enriched.nearby_cities`: Puede estar vacío `[]` si no hay ciudades cercanas
- `amplification_used`: Solo aparece si hubo amplificación

---

## 🚀 Para Obtener Este JSON

```bash
# Ejemplo completo
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat" | jq '.' > ejemplo-completo.json

# Solo ver estructura
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat" | jq 'keys'

# Solo ver una oferta
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat" | jq '.related_jobs_results[0]'

# Solo ver trabajos relacionados
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat" | jq '.related_jobs_results[0].enriched.related_jobs'

# Solo ver ciudades cercanas
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat" | jq '.related_jobs_results[0].enriched.nearby_cities'
```