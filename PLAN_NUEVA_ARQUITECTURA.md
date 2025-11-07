# Plan: Nueva Arquitectura Simplificada de Niveles

## Objetivo
Simplificar de 5 niveles a 4 niveles, eliminando fallback automático y usando botón para trabajos relacionados.

---

## Arquitectura Nueva

### NIVEL 1: Búsqueda local exacta
**Trigger:** Siempre (primera búsqueda)
**Busca:** Mismo trabajo en ubicación exacta
**Distancia:** 0km
**Resultado:**
- `≥10 ofertas` → Mostrar solo esas, FIN
- `1-9 ofertas` → Activar **NIVEL 1+ automático**, combinar
- `0 ofertas` → Activar **NIVEL 1+ automático**

### NIVEL 1+: Mismo trabajo en ciudades cercanas (UNIFICADO)
**Trigger:** Cuando NIVEL 1 < 10
**Busca:** Mismo trabajo en ciudades cercanas
**Distancia:** ≤100km (fusiona antiguo 0.5 y 1.5)
**Combina con:** NIVEL 1 (si había resultados)
**Resultado:**
- `NIVEL1 + NIVEL1+ ≥ 10` → Mostrar solo esos, FIN
- `NIVEL1 + NIVEL1+ < 10` → Mostrar esos + metadata `available_related` con botón

### NIVEL 2: Trabajos relacionados en misma ubicación
**Trigger:** Usuario hace click en "ver relacionadas" O NIVEL 1+ = 0
**Busca:** Trabajos relacionados (weight > 0.80) en ubicación original
**Distancia:** 0km
**Parámetro:** `show_related=true` (nuevo)
**Resultado:**
- `≥10 ofertas` → Mostrar solo esas, FIN
- `<10 ofertas` → Activar **NIVEL 2 NEARBY automático**, combinar

### NIVEL 2 NEARBY: Trabajos relacionados en ciudades cercanas
**Trigger:** Cuando NIVEL 2 < 10
**Busca:** Trabajos relacionados en ciudades cercanas
**Distancia:** ≤100km
**Combina con:** NIVEL 2
**Resultado:** Mostrar todo lo disponible

---

## Cambios en el Backend

### 1. Parámetros nuevos
- `show_related` (boolean): Forzar activación de NIVEL 2

### 2. Eliminar código
- ❌ Fallback automático desde NIVEL 0.5 (líneas 582-768)
- ❌ NIVEL 1.5 separado (unificar con NIVEL 0.5 → NIVEL 1+)

### 3. Modificar NIVEL 1.5
**Antes:** Activaba cuando había 1-9 resultados, buscaba ≤50km
**Después:**
- Renombrar a NIVEL 1+
- Cambiar distancia a ≤100km
- Activar cuando hay 0-9 resultados

### 4. Nueva metadata cuando NIVEL 1+ < 10
```javascript
available_related_jobs: {
  count: X,           // Cuántas ofertas relacionadas hay
  job_name: "string", // Nombre del trabajo relacionado
  location: "string"  // Dónde están (misma ubicación o nearby)
}
```

### 5. NIVEL 2 con `show_related=true`
- Detectar parámetro `show_related`
- Si true, saltar directo a búsqueda de relacionados
- Aplicar NIVEL 2 + NIVEL 2 NEARBY si necesario

---

## Estructura de respuesta

### Caso: NIVEL 1 + NIVEL 1+ ≥ 10
```json
{
  "results": [10 ofertas combinadas],
  "amplification_used": {
    "type": "nivel_1_nearby",  // Nuevo nombre
    "original_count": 3,
    "nearby_count": 7,
    "nearby_city": "Barcelona",
    "distance_km": 15.6
  },
  "pagination": { "total_matches": 10, "has_more": false }
}
```

### Caso: NIVEL 1 + NIVEL 1+ < 10 (con relacionadas disponibles)
```json
{
  "results": [6 ofertas],
  "amplification_used": {
    "type": "nivel_1_nearby",
    "original_count": 0,
    "nearby_count": 6,
    "nearby_city": "Barcelona",
    "distance_km": 15.6
  },
  "available_related_jobs": {  // NUEVO
    "count": 5,
    "job_name": "Botones",
    "location": "Barcelona",
    "distance_km": 15.6
  },
  "pagination": { "total_matches": 6, "has_more": false }
}
```

### Caso: NIVEL 2 + NIVEL 2 NEARBY
```json
{
  "related_jobs_results": [8 ofertas relacionadas],
  "amplification_used": {
    "type": "nivel_2_nearby",
    "original_count": 3,
    "nearby_count": 5,
    "related_job_used": "Camarero",
    "weight": 0.92,
    "nearby_city": "Barcelona",
    "distance_km": 15.6
  },
  "related_pagination": { "total_matches": 8, "has_more": false }
}
```

---

## Cambios en el Prompt del Asistente

### Nuevo flujo de mensajes

**NIVEL 1 + NIVEL 1+ < 10 con relacionadas:**
```
No encontré "botones" en Viladecans, pero encontré 6 ofertas en Barcelona (15.6 km):

[Oferta 1]
...
[Oferta 6]

💡 También encontramos 5 ofertas relacionadas de Botones.
   ¿Quieres verlas? (Responde "sí" o "ver relacionadas")
```

**Usuario responde "sí" → Nueva búsqueda:**
```javascript
searchJobs(query="botones", location="viladecans", show_related=true)
```

**Respuesta NIVEL 2:**
```
Aquí tienes las 5 ofertas relacionadas de Botones en Barcelona:

[Oferta 1]
...
[Oferta 5]
```

---

## Tests necesarios

1. **NIVEL 1 ≥ 10**: "camarero barcelona" → Solo NIVEL 1
2. **NIVEL 1 + NIVEL 1+ ≥ 10**: "recepcionista viladecans" → Combina ambos
3. **NIVEL 1+ < 10 + botón**: "botones viladecans" → 6 ofertas + botón
4. **NIVEL 2 activado**: "show_related=true" → Ofertas relacionadas
5. **NIVEL 2 NEARBY**: "sommelier tarragona" → Relacionadas en ciudades cercanas

---

## Ventajas de esta arquitectura

✅ Código más simple (~200 líneas menos)
✅ Menos niveles (4 en lugar de 5)
✅ Paginación más simple (cada grupo se pagina independiente)
✅ Usuario controla cuándo ver relacionadas
✅ Mejor UX (no mezcla job titles sin avisar)
✅ Más fácil de mantener y debuggear
