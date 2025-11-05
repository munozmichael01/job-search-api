# 🚨 URGENTE: Necesito Ver Los Logs de Vercel

**Problema:** El chat tarda **casi 1 minuto** en responder (no 8 segundos)

---

## 📋 Qué Necesito Que Me Compartas

Ve al dashboard de Vercel y copia los logs completos de UNA conversación del chat:

### Paso 1: Identificar el Endpoint Correcto

¿Qué endpoint usa el chat?
- `/api/chat/send-message` (sin streaming)
- `/api/chat/send-message-stream` (con streaming)

### Paso 2: Ir a Los Logs

1. Ve a: `https://vercel.com/[tu-proyecto]/deployments`
2. Click en el deployment actual (en Production)
3. Tab **"Functions"**
4. Click en **`/api/chat/send-message-stream`** (o el que uses)
5. Verás una lista de ejecuciones

### Paso 3: Encontrar Una Ejecución Reciente

6. Click en la ejecución MÁS RECIENTE (la que tardó ~1 minuto)
7. Copia/pega **TODOS** los logs que aparezcan

---

## 🔍 Qué Buscaré en Los Logs

### Caso 1: Timeouts
```
⏱️ Function timeout after 60s
❌ Error: FUNCTION_INVOCATION_TIMEOUT
```
→ La función se queda esperando algo que nunca llega

### Caso 2: Múltiples Llamadas a OpenAI
```
🔧 Ejecutando función: searchJobs
🔧 Ejecutando función: searchJobs  ← otra vez?
🔧 Ejecutando función: searchJobs  ← y otra?
```
→ El Assistant entra en loop

### Caso 3: Errores de OpenAI
```
❌ Error ejecutando searchJobs: Rate limit exceeded
❌ Retrying... (attempt 2/5)
```
→ Rate limiting o errores que causan reintentos

### Caso 4: Cold Start + Procesamiento Lento
```
[COLD START] Function initialization: 5s
💬 Enviando mensaje al thread: 10s
🏃 Run con streaming iniciado: 30s
```
→ Múltiples factores sumando latencia

---

## 🎯 Mientras Tanto: Hipótesis

### Hipótesis A: maxDuration = 300s Permite Que Se Cuelgue

Tu `vercel.json` tiene:
```json
"maxDuration": 300  // 5 minutos
```

Si la función se queda esperando algo, puede colgar hasta 5 minutos antes de timeout.

**Posible causa:**
- OpenAI Assistant API no responde
- Function calling queda esperando
- Stream no se cierra correctamente

---

### Hipótesis B: El Assistant Está Llamando checkCacheStatus + refreshJobs

Mira el prompt:
```
FLUJO OBLIGATORIO:
1. VERIFICAR CACHÉ:
   - Llama a checkCacheStatus SIEMPRE antes de buscar
   - Si caché vacío o desactualizado (>24h): llama a refreshJobs
```

**Si el Assistant sigue este flujo en CADA mensaje:**
```
Usuario: "busca chef"
    ↓
Assistant llama checkCacheStatus()  (~1s)
    ↓
Assistant ve caché > 24h (ejemplo)
    ↓
Assistant llama refreshJobs()  (~30-60s!!) ← AQUÍ ESTÁ EL PROBLEMA
    ↓
Assistant llama searchJobs()  (~1s)
    ↓
Assistant genera respuesta  (~2s)
    ↓
Total: 34-64 segundos
```

**refreshJobs()** toma 30-60 segundos porque:
- Descarga XML de Turijobs
- Procesa 2,052 ofertas
- Enriquece cada una con related_jobs y nearby_cities
- Guarda en KV

---

### Hipótesis C: Function Calling Loop

El Assistant puede entrar en loop si:
1. Llama searchJobs()
2. No le gusta el resultado
3. Llama searchJobs() de nuevo con otros params
4. Repite hasta timeout

---

## 🔧 Fixes Probables (Después de Ver Logs)

### Si es refreshJobs:

**Solución inmediata:**
```javascript
// En el prompt, cambiar:
FLUJO OBLIGATORIO:
1. ❌ NO llames a checkCacheStatus ni refreshJobs
2. ✅ Llama DIRECTAMENTE a searchJobs
3. La API ya tiene caché interno
```

**Beneficio:** Elimina 30-60s de latencia

---

### Si es loop de function calling:

**Solución:**
```javascript
// Limitar a 1 llamada por conversación
await openai.beta.threads.runs.create(thread_id, {
  assistant_id: ASSISTANT_ID,
  max_prompt_tokens: 1000,  // Limitar tokens
  max_completion_tokens: 500,  // Limitar respuesta
  stream: true
});
```

---

### Si es timeout de Vercel:

**Solución:** Reducir maxDuration a 30s
```json
"maxDuration": 30  // Si tarda más, algo está mal
```

Esto forzará un error rápido en lugar de colgar.

---

## 📊 Qué Esperar en Los Logs (Ejemplo Bueno)

```
09:30:00.100 [info] 💬 Enviando mensaje al thread: abc123
09:30:00.150 [info] 📝 Mensaje: busca chef en madrid
09:30:00.200 [info] 🏃 Run con streaming iniciado
09:30:00.500 [info] 🔧 Ejecutando función: searchJobs
09:30:00.550 [info] 📋 Argumentos: {"query":"chef","location":"madrid"}
09:30:00.750 [info] ✅ Función completada: searchJobs
09:30:01.500 [info] ✅ Run completado
DURACIÓN TOTAL: 1.4 segundos
```

---

## 📊 Qué Esperar en Los Logs (Ejemplo Malo)

```
09:30:00.100 [info] 💬 Enviando mensaje al thread: abc123
09:30:00.150 [info] 🏃 Run con streaming iniciado
09:30:01.200 [info] 🔧 Ejecutando función: checkCacheStatus
09:30:02.100 [info] 🔧 Ejecutando función: refreshJobs  ← PROBLEMA
09:30:02.150 [info] 📥 Descargando XML de Turijobs...
09:30:15.000 [info] 📦 Procesando 2052 ofertas...
09:30:45.000 [info] ✅ Refresh completado
09:30:46.000 [info] 🔧 Ejecutando función: searchJobs
09:30:47.000 [info] ✅ Run completado
DURACIÓN TOTAL: 47 segundos
```

---

## 🎯 Acción Inmediata

**Por favor comparte los logs de una ejecución completa del chat.**

Busca específicamente:
- Timestamp de inicio y fin
- Cuántas funciones se llaman
- Si aparece "refreshJobs"
- Errores o warnings

Con eso podré darte la solución exacta.

---

## 🚀 Solución Temporal (Si Es refreshJobs)

Mientras tanto, si quieres probar algo rápido:

**Desactivar checkCacheStatus y refreshJobs del Assistant:**

```javascript
// En api/assistant/create.js, ELIMINAR estas tools:
// - checkCacheStatus
// - refreshJobs

// Dejar SOLO searchJobs

// Y en el prompt, ELIMINAR:
FLUJO OBLIGATORIO:
1. ❌ BORRAR toda la sección de VERIFICAR CACHÉ
2. ✅ Ir directo a: "Usa searchJobs con los parámetros del usuario"
```

Esto debería reducir latencia a 2-5 segundos.

**¿Quieres que lo haga? O prefieres compartir los logs primero?**