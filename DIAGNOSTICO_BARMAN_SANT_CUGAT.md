# Diagnóstico: "barman barcelona" / "barman sant cugat" no responde correctamente

**Fecha:** 3 de noviembre de 2025
**Problema reportado:** La búsqueda "barman barcelona" / "barman sant cugat" no está respondiendo con puestos de trabajo relacionados y ciudades cercanas

---

## ✅ Verificaciones Realizadas

### 1. Sinónimos (job_id_to_names.json)

**Estado: ✅ CORRECTO**

- "barman" está en el archivo bajo el **ID 657: Bartender**
- Total de sinónimos: **50 términos**
- Incluye: bartender, coctelero, mixólogo, barwoman, barmaid, camarero de bar, mixologist, etc.
- **La expansión de sinónimos funciona correctamente**

```javascript
// Cuando se busca "barman", el sistema busca:
queryTerms = [
  'bartender', 'coctelero', 'mixologo', 'barman', 'barmaid',
  'camarero de bar', 'mixologist', 'cocktail designer', ...
  // + 42 términos más
]
```

---

### 2. Relaciones de Puestos (job_weights.json)

**Estado: ✅ CORRECTO**

- "Bartender" tiene **9 puestos relacionados** en job_weights.json
- Relaciones con weight > 0.80:
  - Gerente de Bar (0.95)
  - Gerente de Coctelería (0.95)
  - Barista (0.94)
  - Sommelier (0.9)

**NOTA:** job_relationships_graph.json NO se usa. El sistema usa job_weights.json para NIVEL 2.

---

### 3. Distancias de Ciudades (city_distances.json)

**Estado: ✅ CORRECTO**

- "Sant Cugat" se encuentra como **"San Cugat del Vallés"**
- La normalización español/catalán funciona correctamente:
  - "sant cugat" → normaliza → "san cugat" → encuentra → "San Cugat del Vallés"
- Ciudades cercanas ≤50km: **72 ciudades**
- Barcelona está a **12.5 km** de Sant Cugat ✅

**Top 10 ciudades cercanas a Sant Cugat:**
1. Rubí (5.2 km)
2. Ripollet (7 km)
3. Molíns de Rey (8.1 km)
4. Castellbisbal (8.4 km)
5. Pallejá (8.6 km)
6. Moncada (9 km)
7. San Andrés de la Barca (9.1 km)
8. Sabadell (9.3 km)
9. Sant Just Desvern (9.3 km)
10. San Felíu de Llobregat (9.8 km)
11. **Barcelona (12.5 km)** ✅

---

### 4. Lógica de Búsqueda (api/jobs/search.js)

**Estado: ✅ CORRECTO**

La lógica de niveles está bien implementada:

- **NIVEL 1**: Búsqueda normal (≥10 resultados)
- **NIVEL 1.5**: Ampliación con ciudad cercana (1-9 resultados)
- **NIVEL 0.5**: Ciudad cercana mismo puesto (0 resultados)
- **NIVEL 2**: Puestos relacionados misma ciudad
- **NIVEL 2 NEARBY**: Puestos relacionados + ciudad cercana

**Flujo esperado para "barman sant cugat":**

```
1. Buscar "barman"/"bartender"/"coctelero" en Sant Cugat
   └─> Probablemente 0 resultados (ciudad pequeña)

2. NIVEL 0.5 se activa:
   └─> Buscar MISMO puesto en ciudades cercanas
   └─> Buscar en: Barcelona (12.5km), Sabadell (9.3km), Rubí (5.2km)...
   └─> DEBERÍA encontrar ofertas de bartender en Barcelona

3. Si NIVEL 0.5 no encuentra nada:
   └─> NIVEL 2 se activa
   └─> Buscar puestos relacionados (Barista, Gerente de Bar, Sommelier)
   └─> Primero en Sant Cugat, luego en ciudades cercanas
```

---

### 5. Proceso de Enriquecimiento (lib/enrichOffers.js)

**Estado: ✅ CORRECTO**

- El enriquecimiento se ejecuta en `api/jobs/refresh.js` (línea 163)
- Agrega el campo `enriched.related_jobs` a cada oferta
- Usa `job_weights.json` (NO `job_relationships_graph.json`)

---

### 6. Prompt del Asistente (assistant_prompt_with_nearby_v2.txt)

**Estado: ✅ CORRECTO**

El prompt tiene instrucciones claras para:
- Mostrar TODAS las ofertas recibidas (no omitir)
- Manejar NIVEL 0.5 (líneas 184-215)
- Manejar NIVEL 2 NEARBY (líneas 174-182)
- Explicar que las ofertas vienen de ciudades cercanas

---

## 🔍 Posibles Causas del Problema

Dado que **todos los archivos de configuración están correctos**, el problema debe estar en **UNO de estos 3 lugares**:

### 1. ❓ Las ofertas en caché NO tienen el campo "enriched.related_jobs"

**Síntoma:** NIVEL 2 no funciona porque busca en `job.enriched.related_jobs`

**Causa posible:**
- El último refresh no ejecutó `enrichOffers()`
- Hubo un error durante el enriquecimiento
- El caché se guardó antes del enriquecimiento

**Solución:**
```bash
# Forzar refresh del cache
curl https://job-search-api-psi.vercel.app/api/jobs/refresh

# Verificar logs para confirmar:
# "✨ Enriqueciendo ofertas con datos inteligentes..."
# "✅ X ofertas enriquecidas en Xms"
```

---

### 2. ❓ No hay ofertas reales de bartender/barman/coctelero en Barcelona

**Síntoma:** NIVEL 0.5 busca pero no encuentra nada

**Causa posible:**
- El feed XML de Turijobs no tiene ofertas de bartender actualmente
- Las ofertas tienen títulos diferentes ("Camarero - Bar", "Empleado de Sala")
- Los títulos no contienen ninguno de los 50 sinónimos

**Solución:**
```bash
# Verificar ofertas en Barcelona
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=bartender&location=barcelona&limit=50"

# Si no hay resultados, probar variantes:
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=camarero&location=barcelona&limit=50"
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=sala&location=barcelona&limit=50"
```

---

### 3. ❓ El prompt del asistente no muestra los resultados correctamente

**Síntoma:** La API retorna resultados pero GPT-4o no los muestra

**Causa posible:**
- GPT-4o está omitiendo ofertas (a pesar del prompt explícito)
- GPT-4o no está siguiendo las instrucciones de NIVEL 0.5
- El JSON de respuesta está malformado

**Solución:**
```javascript
// Revisar logs en Vercel para ver qué retorna la API
// Verificar que amplification_used tenga:
{
  "amplification_used": {
    "type": "nivel_0_5_nearby",
    "nearby_city": "barcelona",
    "distance_km": 12.5,
    "total_nearby_found": X
  }
}
```

---

## 📋 Plan de Acción Recomendado

### PASO 1: Forzar refresh del caché

```bash
curl https://job-search-api-psi.vercel.app/api/jobs/refresh
```

**Verificar en logs:**
- ✅ "✨ Enriqueciendo ofertas con datos inteligentes..."
- ✅ "✅ 2072 ofertas enriquecidas en Xms"
- ✅ "📈 X ofertas con puestos relacionados"

---

### PASO 2: Probar búsqueda directa con la API

```bash
# Test 1: Bartender en Barcelona (debería funcionar)
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=bartender&location=barcelona"

# Test 2: Barman en Sant Cugat (debería activar NIVEL 0.5)
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat"

# Test 3: Ver estructura de una oferta
curl "https://job-search-api-psi.vercel.app/api/jobs/view-all?limit=1" | jq '.offers[0].enriched'
```

**Verificar:**
- ✅ Las ofertas tienen el campo `enriched.related_jobs`
- ✅ NIVEL 0.5 se activa y retorna ofertas de Barcelona
- ✅ El JSON incluye `amplification_used`

---

### PASO 3: Probar con el chatbot real

```
Usuario: "barman sant cugat"
```

**Verificar respuesta esperada:**
```
No encontré ofertas de "barman" en Sant Cugat, pero encontré
X ofertas de bartender en Barcelona (12.5 km). Mostrando las X primeras:

**1. Bartender - Hotel W Barcelona**
🏛️ W Barcelona
📍 Barcelona, Barcelona
💼 Sala | 💰 20.000-25.000€ | ⏰ Tiempo completo

🔗 Ver oferta: [URL]
✅ Aplicar: [URL_APLICAR]

[... resto de ofertas ...]

Estas ofertas están ubicadas en Barcelona.
```

Si el asistente NO muestra las ofertas:
- Revisar logs de OpenAI para ver qué recibió GPT-4o
- Verificar que el prompt esté actualizado en producción
- Revisar si GPT-4o está llamando correctamente a `searchJobs()`

---

## 🎯 Diagnóstico Final

**Conclusión: Los archivos de configuración están 100% correctos**

✅ Sinónimos: 50 términos para "barman"
✅ Relaciones: 9 puestos relacionados para "Bartender"
✅ Ciudades: Barcelona a 12.5 km de Sant Cugat
✅ Lógica: NIVEL 0.5 y NIVEL 2 implementados correctamente
✅ Prompt: Instrucciones claras para manejar amplificación

**El problema está en la EJECUCIÓN, no en la CONFIGURACIÓN:**

1. **Más probable:** El caché no tiene el campo `enriched.related_jobs` → Ejecutar refresh
2. **Segundo:** No hay ofertas reales de bartender en Barcelona → Verificar con API
3. **Menos probable:** GPT-4o no sigue instrucciones → Revisar logs

---

## 🛠️ Scripts de Diagnóstico Creados

He creado 2 scripts para facilitar el debugging:

1. **`diagnose-barman-sant-cugat.js`**
   - Verifica sinónimos, relaciones y distancias
   - Confirma que todos los archivos están correctos

2. **`test-search-logic.js`**
   - Simula la lógica de normalización de search.js
   - Verifica que "sant cugat" → "San Cugat del Vallés"

**Ejecutar:**
```bash
node diagnose-barman-sant-cugat.js
node test-search-logic.js
```

---

## 📞 Siguiente Paso Inmediato

**Ejecutar refresh y verificar:**

```bash
# 1. Forzar refresh
curl https://job-search-api-psi.vercel.app/api/jobs/refresh

# 2. Verificar que funciona
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat"

# 3. Si retorna ofertas, probar con el chatbot
# 4. Si NO retorna ofertas, revisar el feed XML de Turijobs
```

Si después del refresh sigue sin funcionar, el problema es que **no hay ofertas reales** de bartender/barman en el feed de Turijobs.
