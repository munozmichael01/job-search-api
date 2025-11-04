# 🔍 Debug: NIVEL 0.5 No Se Activa

**Problema:** La búsqueda "barman sant cugat" retorna resultados vacíos sin activar NIVEL 0.5.

---

## 📊 Respuesta Actual

```json
{
  "results": [],
  "pagination": {"total_matches": 0},
  // ❌ NO hay amplification_used
  // ❌ NO hay related_jobs_results
}
```

---

## 🔍 Dónde Puede Estar Fallando

El código de NIVEL 0.5 tiene varios checkpoints con console.log. Necesitamos ver **los logs de Vercel** para saber dónde falla.

### Checkpoint 1: ¿Se entra en NIVEL 0.5?

**Log esperado (línea 383):**
```
🔍 NIVEL 0.5: No hay resultados en "sant cugat", buscando MISMO puesto en ciudades cercanas...
```

**Si NO aparece este log:**
- NIVEL 0.5 no se está ejecutando
- Posibles causas:
  - `query` es null/undefined
  - `location` es null/undefined
  - `totalMatches !== 0`
  - `startOffset !== 0`
  - `relatedJobsResults` ya tiene valor

---

### Checkpoint 2: ¿La ciudad está en valid_cities?

**Log esperado (línea 418 o 423):**
```
ℹ️ "sant cugat" no está en lista de ciudades válidas (0 ciudades), saltando NIVEL 0.5
```
**O:**
```
✅ "sant cugat" está en lista de ciudades válidas
```

**Si el log dice "(0 ciudades)":**
- `cacheData.metadata.valid_cities` está vacío
- Causa: El refresh NO guardó valid_cities en el cache
- Solución: Verificar `/api/jobs/refresh`

**Si el log dice "no está en lista de ciudades válidas":**
- La normalización ES/CA no está funcionando
- "sant cugat" no matchea "san cugat del valles"
- Solución: Revisar la función `normalizeSpanishCatalan`

---

### Checkpoint 3: ¿La ciudad tiene distancias en city_distances.json?

**Log esperado (línea 430 o siguiente):**
```
ℹ️ "sant cugat" no tiene distancias en city_distances.json, saltando NIVEL 0.5
```
**O:**
```
✅ Ciudad encontrada en city_distances: "Sant Cugat del Vallés"
```

**Si falla aquí:**
- `findCityInDistances` no está matcheando la ciudad
- Puede ser problema de normalización o de datos

---

## 🧪 Cómo Ver Los Logs

### Opción 1: Dashboard de Vercel (Recomendado)

1. Ve a: `https://vercel.com/[tu-proyecto]/deployments`
2. Click en el deployment actual (el que está en "Production")
3. Click en la tab **"Functions"**
4. Click en **`/api/jobs/search`**
5. Esto mostrará todos los logs de ejecución de esa función
6. Busca la ejecución más reciente (timestamp ~cuando hiciste el curl)
7. Copia/pega TODOS los logs que aparezcan

---

### Opción 2: CLI de Vercel

```bash
vercel logs job-search-api-psi.vercel.app --follow
```

Luego haz el curl de nuevo y verás los logs en tiempo real.

---

## 🔧 Soluciones Según El Log

### Si dice "(0 ciudades)":

El problema es que `valid_cities` no está en el cache. Necesitamos:

1. Verificar que el refresh guardó `valid_cities`
2. Hacer un nuevo refresh:
   ```bash
   curl https://job-search-api-psi.vercel.app/api/jobs/refresh
   ```
3. Verificar el cache:
   ```bash
   curl https://job-search-api-psi.vercel.app/api/jobs/status
   ```

---

### Si dice "no está en lista de ciudades válidas":

El problema es la normalización. Necesitamos:

1. Verificar que "San Cugat del Vallés" está en `valid_cities`
2. Mejorar la función `normalizeSpanishCatalan` para manejar este caso
3. Agregar logs adicionales para ver qué está pasando

---

### Si dice "no tiene distancias en city_distances.json":

El problema es el archivo de distancias. Necesitamos:

1. Verificar que "San Cugat del Vallés" existe en `data/city_distances.json`
2. Verificar que `findCityInDistances` está funcionando correctamente
3. Puede que necesitemos normalización adicional

---

## 📋 Acción Requerida

**Por favor, ve al dashboard de Vercel y copia/pega los logs de la función `/api/jobs/search` para la ejecución más reciente (cuando hiciste el curl de "barman sant cugat").**

Con esos logs sabremos exactamente en qué checkpoint falla y podremos arreglarlo.

---

## 🚨 Verificación Rápida: ¿valid_cities está en el cache?

Prueba este endpoint para ver el status del cache:

```bash
curl https://job-search-api-psi.vercel.app/api/jobs/status
```

**Busca en la respuesta:**
```json
{
  "metadata": {
    "valid_cities": [...]  // ¿Este campo existe? ¿Cuántas ciudades tiene?
  }
}
```

Si `valid_cities` no existe o está vacío, ese es el problema.
