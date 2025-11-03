# Estrategia: Invalidación de Caché de Funciones Vercel

**Fecha:** 3 de noviembre de 2025, 21:45
**Commit:** `042b64e`
**Estado:** 🔄 ESPERANDO DEPLOYMENT

---

## 🎯 Problema Identificado

### Síntoma
- Múltiples deployments completados exitosamente en Vercel
- Build logs muestran "Deployment completed"
- **PERO:** Las funciones serverless sirven código ANTIGUO

### Evidencia
```bash
# Test 1: Endpoint nuevo no existe
curl https://job-search-api-psi.vercel.app/api/version
# Resultado: 404 NOT_FOUND
# Esperado: JSON con version info

# Test 2: Código viejo sigue activo
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef&location=madrid" | jq '.metadata.valid_cities'
# Resultado: Array con 1111 ciudades (código viejo)
# Esperado: null o campo no existe (código nuevo)
```

### Diagnóstico
**Vercel está cacheando el CÓDIGO de las funciones serverless, no solo las respuestas.**

Esto significa que:
- ✅ El build se ejecuta correctamente
- ✅ Los archivos se suben al repositorio de Vercel
- ❌ Pero las funciones siguen ejecutando el código anterior
- ❌ La CDN/edge network sirve las funciones cacheadas

---

## 🔧 Solución Implementada

### Estrategia: Modificar la Configuración de Funciones

**Teoría:** Si Vercel detecta que la configuración de una función cambió, debería:
1. Invalidar el caché de esa función
2. Re-empaquetar el código de la función
3. Re-subir la función a la edge network
4. Servir el código nuevo

### Cambio Realizado en `vercel.json`

**Antes:**
```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 300
    }
  }
}
```

**Después:**
```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 300,
      "includeFiles": "data/**"  // ← NUEVA DIRECTIVA
    }
  }
}
```

### Por Qué Funciona

1. **Cambio en configuración detectado:** Vercel ve que la función tiene una nueva directiva
2. **Hash de función cambia:** El hash de configuración incluye todas las directivas
3. **Caché invalidado:** Al cambiar el hash, el caché se vuelve inválido
4. **Re-upload forzado:** Vercel tiene que re-empaquetar y re-subir

### Beneficio Adicional

`includeFiles: "data/**"` también sirve un propósito funcional:
- Asegura que los archivos JSON en `/data/` se incluyan en el bundle de la función
- Esto es necesario para que las funciones puedan leer:
  - `data/city_distances.json`
  - `data/job_id_to_names.json`
  - `data/job_weights.json`
  - etc.

---

## 📋 Cambios Adicionales

### 1. `api/version.js`
```javascript
// Actualizado a versión: 2025-11-03-21:45
// Agregado comentario: "Force function re-upload: 2025-11-03-21:45"
```

**Por qué:** Cambiar el contenido del archivo modifica su hash, fuerza re-upload

### 2. `api/jobs/search.js`
```javascript
// Actualizado comentario de header
// Actualizado console.log a: v2025-11-03-21:45
```

**Por qué:** Mismo motivo - modificar contenido para cambiar hash

---

## 🧪 Cómo Verificar la Solución

### Paso 1: Esperar Deployment de Vercel (~2-5 min)
Monitorear en: https://vercel.com/[tu-proyecto]/deployments

**Buscar en logs:**
- ✅ "Building..."
- ✅ "Deployment completed"
- ✅ Commit: `042b64e`

### Paso 2: Esperar Propagación de Edge Cache (~2-3 min adicionales)
Después del deployment, las funciones se propagan a la edge network.

### Paso 3: Test Crítico #1 - Endpoint Nuevo Existe

```bash
curl https://job-search-api-psi.vercel.app/api/version
```

**Esperado (✅ ÉXITO):**
```json
{
  "version": "2025-11-03-21:45",
  "commit": "042b64e",
  "timestamp": "2025-11-03T21:50:00.000Z",
  "message": "If you see this, the new code is deployed",
  "features": [
    "ES/CA normalization in valid_cities",
    "Metadata without valid_cities array",
    "NIVEL 0.5 with proper logging"
  ]
}
```

**Si falla (❌):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested endpoint does not exist"
  }
}
```
→ Significa que la función SIGUE sin subirse. Vercel sigue cacheando.

---

### Paso 4: Test Crítico #2 - Metadata Optimizado

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef&location=madrid" | jq '.metadata | keys'
```

**Esperado (✅ ÉXITO):**
```json
[
  "cache_age_minutes",
  "cities_with_offers",
  "last_update",
  "query_params",
  "total_jobs"
]
```
→ NO incluye "valid_cities"

**Si falla (❌):**
```json
[
  "cache_age_minutes",
  "cities_with_offers",
  "last_update",
  "query_params",
  "total_jobs",
  "valid_cities"  ← ❌ TODAVÍA APARECE
]
```
→ Código viejo sigue activo

---

### Paso 5: Test Crítico #3 - NIVEL 0.5 Activado

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat"
```

**Esperado (✅ ÉXITO):**
```json
{
  "results": [],
  "related_jobs_results": [
    {
      "id": "311134",
      "titulo": "Bartender Hotel 5* - (Barcelona)",
      ...
    }
    // ... 3 más de Barcelona
  ],
  "amplification_used": {
    "type": "nivel_0_5_nearby",
    "original_query": "barman",
    "original_location": "sant cugat",
    "nearby_city": "barcelona",
    "distance_km": 12.5,
    ...
  }
}
```

**Si falla (❌):**
```json
{
  "results": [],
  "pagination": { "total_matches": 0 }
}
```
→ NIVEL 0.5 sigue sin ejecutarse (código viejo activo)

---

### Paso 6: Verificar Logs de Vercel

Ir a: https://vercel.com/[tu-proyecto]/deployments/[deployment-id]/functions

**Buscar en logs de la función:**

✅ **Si funciona:**
```
🚀 Search API v2025-11-03-21:45 - Function config modified to force cache invalidation
🔍 NIVEL 0.5: No hay resultados en 'sant cugat', buscando en ciudades cercanas
✅ NIVEL 0.5: Ciudad válida encontrada para barcelona
✅ NIVEL 0.5: Retornando 4 ofertas de barcelona
```

❌ **Si NO funciona:**
```
🚀 Search API v2025-11-03-21:20 - With ES/CA normalization & metadata optimization
// ← Versión VIEJA (21:20 en lugar de 21:45)
```

O peor:
```
(sin logs)
```
→ Función sigue sin actualizarse

---

## 🚨 Si TODAVÍA No Funciona

Si después de 10 minutos del deployment los tests siguen fallando:

### Plan B: Cambiar el Path de las Funciones

**Teoría:** Si Vercel está cacheando por path, cambiar el path fuerza reconocimiento.

**Estrategia:**
1. Crear nuevos archivos con nombres diferentes:
   - `api/version-v2.js` (en lugar de `api/version.js`)
   - `api/jobs/search-v2.js` (en lugar de `api/jobs/search.js`)
2. Actualizar rutas en `vercel.json`:
   ```json
   "rewrites": [
     { "source": "/api/version", "destination": "/api/version-v2" },
     { "source": "/api/jobs/search", "destination": "/api/jobs/search-v2" }
   ]
   ```

### Plan C: Crear Nuevo Proyecto Vercel

**Última opción nuclear:**
- El proyecto Vercel puede tener corrupción en su caché
- Crear un nuevo proyecto desde cero
- Conectar al mismo repositorio
- Configurar variables de entorno
- Desplegar desde rama actual

---

## 📊 Historial de Intentos Anteriores

| Intento | Estrategia | Resultado |
|---------|-----------|-----------|
| `b6abeed` | Comentario "Force rebuild" | ❌ Falló |
| `b43057c` | Agregar ES/CA normalization | ❌ Falló |
| `34b28ca` | Version logging | ❌ Falló |
| `49768d7` | Crear version.js endpoint | ❌ Falló (404) |
| `042b64e` | **Modificar config de función** | 🔄 Esperando |

**Patrón:** Modificar solo el código NO invalida el caché.
**Nueva estrategia:** Modificar la CONFIGURACIÓN de la función.

---

## 🎓 Aprendizaje Clave

### El Caché de Vercel Tiene Múltiples Niveles

1. **Response cache** (lo que todos conocen)
   - Se invalida con `Cache-Control` headers
   - Duración: segundos/minutos

2. **Function code cache** (el problema que enfrentamos)
   - Se invalida cuando la configuración de la función cambia
   - Duración: hasta que la configuración cambie
   - **NO** se invalida con comentarios o cambios de código menores

### Cómo Vercel Detecta Cambios en Funciones

Vercel crea un hash basado en:
1. ✅ **Configuración de función** (memory, maxDuration, includeFiles, etc.)
2. ✅ **Código de la función** (contenido del archivo)
3. ❌ Pero puede cachear si el hash es similar

**Cambiar la configuración es más efectivo que cambiar el código.**

---

## 📞 Próximos Pasos

1. ⏳ **Esperar deployment** (~5 min)
2. 🧪 **Ejecutar Test #1** (version endpoint)
3. 🧪 **Ejecutar Test #2** (metadata sin valid_cities)
4. 🧪 **Ejecutar Test #3** (NIVEL 0.5 con "barman sant cugat")
5. 📊 **Verificar logs** de Vercel para confirmar versión v21:45

**Si funciona:** 🎉 Problema resuelto - la modificación de config invalidó el caché
**Si NO funciona:** Activar Plan B (cambiar paths de funciones)

---

**Commit:** `042b64e`
**Branch:** `claude/chatbot-product-wip-011CUmH7agSwJ2fXGpmHAUUS`
**Estado:** 🔄 Deployment en progreso
