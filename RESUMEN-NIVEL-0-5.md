# RESUMEN: Implementación de NIVEL 0.5

## Problema Reportado

Usuario buscó "barman sant cugat" y el sistema respondió:
```
No encontré ofertas de barman en Sant Cugat
```

Pero cuando pidió explícitamente Barcelona, mostró 4 ofertas de barman.

**Expectativa**: El sistema debió mostrar automáticamente las ofertas de Barcelona (12km de Sant Cugat).

---

## Root Cause Analysis

### ¿Por qué no se activó NIVEL 1.5 nearby?

NIVEL 1.5 tiene esta condición (línea 459):
```javascript
if (query && location && totalMatches > 0 && totalMatches < 10 && startOffset === 0 && !relatedJobsResults)
```

- Sant Cugat: `totalMatches = 0` (no hay ofertas)
- `totalMatches > 0` = **false** ❌
- NIVEL 1.5 NO se ejecuta

**NIVEL 1.5 está diseñado para COMPLETAR** (1-9 resultados → completar hasta 10).
NO maneja el caso de 0 resultados.

### ¿Por qué no se activó NIVEL 2 (puestos relacionados)?

NIVEL 2 busca en `dynamicCityDistances` (línea 340):
```javascript
let nearbyCitiesData = dynamicCityDistances[locationNormalized] || [];
```

**Problema**: `dynamicCityDistances` se construye SOLO con ciudades que tienen ofertas activas.

- Sant Cugat NO tiene ofertas → NO está en `dynamicCityDistances`
- `dynamicCityDistances["sant cugat"]` = `undefined`
- NIVEL 2 NO se activa (línea 349): "NIVEL 2 no se activará - respetando intención del usuario"

### Datos verificados

- ✅ Sant Cugat SÍ tiene coordenadas: `{ lat: 41.4732, lon: 2.0856 }`
- ✅ Barcelona SÍ tiene coordenadas: `{ lat: 41.3851, lon: 2.1734 }`
- ✅ Distancia: 12.23 km (muy dentro de los 50km)
- ✅ Barcelona tiene 4 ofertas de barman
- ❌ Sant Cugat NO tiene ofertas activas (por eso no está en dynamicCityDistances)

---

## Solución: NIVEL 0.5

Nuevo nivel de amplificación que se activa cuando:
1. `totalMatches === 0` (no hay resultados en la ciudad solicitada)
2. La ciudad tiene coordenadas en `city_coordinates.json`
3. Hay ciudades cercanas (<50km) que SÍ tienen ofertas del MISMO puesto

### Lógica implementada

```javascript
// api/jobs/search.js línea ~457
if (query && location && totalMatches === 0 && startOffset === 0 && !relatedJobsResults) {
  // 1. Cargar coordenadas de TODAS las ciudades (no solo las con ofertas)
  const cityCoordinates = loadCityCoordinates();

  // 2. Verificar si la ciudad solicitada tiene coordenadas
  if (cityCoordinates[locationNormalized]) {
    const requestedCityCoords = cityCoordinates[locationNormalized];

    // 3. Encontrar ciudades con ofertas dentro de 50km
    const nearbyCitiesWithOffers = [];

    // 4. Calcular distancias usando Haversine
    Object.keys(citiesWithOffers).forEach(city => {
      const distance = calculateDistance(...);
      if (distance <= 50) {
        nearbyCitiesWithOffers.push({ city, distance });
      }
    });

    // 5. Buscar el MISMO puesto (query) en ciudades cercanas
    // 6. Retornar con amplification_used.type = "nivel_0_5_nearby"
  }
}
```

### Diferencias clave

| Aspecto | NIVEL 1.5 nearby | NIVEL 0.5 nearby |
|---------|------------------|------------------|
| Condición | `totalMatches > 0 && < 10` | `totalMatches === 0` |
| Propósito | COMPLETAR hasta 10 | BUSCAR cuando no hay nada |
| Usa | `dynamicCityDistances` | `cityCoordinates.json` directamente |
| Limitación | Solo ciudades con ofertas | Todas las ciudades con coordenadas |

---

## Cambios Realizados

### 1. Backend: `api/jobs/search.js`

- ✅ Añadido NIVEL 0.5 después de NIVEL 2 (línea ~457)
- ✅ Usa `loadCityCoordinates()` para acceder a TODAS las ciudades
- ✅ Calcula distancias dinámicamente con `calculateDistance()`
- ✅ Retorna `amplification_used.type = "nivel_0_5_nearby"`

### 2. Prompt: `assistant_prompt_with_nearby_v2.txt`

- ✅ Añadida sección A0.5 con instrucciones para GPT
- ✅ Formato de respuesta específico:
  ```
  No encontré ofertas de [query] en [location], pero encontré
  X ofertas de [query] en [nearby_city] (Y km)
  ```
- ✅ Instrucciones de paginación con `related_offset`

### 3. Asistente OpenAI

- ✅ Actualizado con nuevas instrucciones de NIVEL 0.5
- ✅ Modelo actual: gpt-4o
- ✅ Assistant ID: asst_vfJs03e6YW2A0eCr9IrzhPBn

### 4. Scripts de ayuda

- `apply-nivel-0-5.js` - Script para aplicar el patch
- `NIVEL-0.5-PATCH.js` - Código del patch
- `test-nivel-0-5.js` - Script de prueba

---

## Resultado Esperado

### ANTES:
```
Usuario: barman sant cugat
Asistente: No encontré ofertas de barman en Sant Cugat.
```

### AHORA:
```
Usuario: barman sant cugat
Asistente: No encontré ofertas de barman en Sant Cugat, pero
encontré 4 ofertas de barman en Barcelona (12.2 km). Mostrando
las 4 primeras:

[Lista de 4 ofertas de barman en Barcelona]
```

---

## Estado del Deployment

**Commit**: 76e45b5
**Pushed**: ✅ Exitoso
**Vercel**: 🔄 En progreso...

### Cómo probar manualmente

1. Esperar a que Vercel complete el deployment (~2-3 minutos)
2. Abrir el chat en https://job-search-api-psi.vercel.app
3. Buscar: "barman sant cugat"
4. Verificar que muestre ofertas de Barcelona automáticamente

### Verificación técnica

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant%20cugat&limit=10"
```

Debería retornar:
```json
{
  "amplification_used": {
    "type": "nivel_0_5_nearby",
    "original_query": "barman",
    "original_location": "sant cugat",
    "nearby_city": "barcelona",
    "distance_km": 12.2,
    "total_nearby_found": 4
  },
  "related_jobs_results": [...]
}
```

---

## Pendientes

1. ⏳ **Esperar deployment de Vercel** - En progreso
2. ⏳ **Probar "barman sant cugat"** - Pendiente después del deployment
3. ⏳ **Verificar respuesta del asistente** - Pendiente
4. 📋 **Problema de threads duplicados** - Documentado en `PENDIENTE-THREADS-DUPLICADOS.md`
5. 📋 **TTL para localStorage** - Documentado en `widget-ttl-patch.txt`

---

## Notas

- **GPT-4o-mini NO funcionó**: No siguió las instrucciones complejas correctamente
- **Solución**: Usar GPT-4o (punto medio entre velocidad y precisión)
- **Rollback disponible**: `rollback-to-gpt4.js` si hay problemas

