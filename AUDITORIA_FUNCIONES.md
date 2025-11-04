# 🔍 Auditoría Completa de Funciones del Assistant

**Fecha:** 4 de noviembre de 2025
**Contexto:** Chat tarda ~60 segundos en responder

---

## ✅ Funciones DEFINIDAS en `tools`

**Archivo:** `api/assistant/create.js`

```javascript
tools: [
  {
    type: "function",
    function: {
      name: "searchJobs",  // ← ÚNICA función definida
      description: "Busca ofertas de trabajo...",
      parameters: { ... }
    }
  }
]
```

**Total funciones definidas:** 1
- ✅ `searchJobs`

---

## ✅ Funciones IMPLEMENTADAS en handlers

### En `api/chat/send-message.js`:
```javascript
async function executeFunctionCall(functionName, functionArgs) {
  if (functionName === 'searchJobs') {  // ← ÚNICA implementada
    // ... código para llamar /api/jobs/search
  }

  throw new Error(`Función desconocida: ${functionName}`);  // ← Error si llaman otra
}
```

### En `api/chat/send-message-stream.js`:
```javascript
async function executeFunctionCall(functionName, functionArgs) {
  if (functionName === 'searchJobs') {  // ← ÚNICA implementada
    // ... código para llamar /api/jobs/search
  }

  throw new Error(`Función desconocida: ${functionName}`);  // ← Error si llaman otra
}
```

**Total funciones implementadas:** 1
- ✅ `searchJobs`

---

## ❌ Funciones MENCIONADAS en el prompt (pero NO definidas ni implementadas)

**Archivo:** `api/assistant/create.js` - líneas 84-85 y 760-761

```javascript
instructions: `
...
FLUJO OBLIGATORIO:

1. VERIFICAR CACHÉ:
   - Llama a checkCacheStatus SIEMPRE antes de buscar  ← ❌ NO EXISTE
   - Si caché vacío o desactualizado (>24h): llama a refreshJobs  ← ❌ NO EXISTE
   - Informa: "Actualizando ofertas... ⏳"

2. BUSCAR OFERTAS:
   - Usa searchJobs con los parámetros del usuario  ← ✅ SÍ EXISTE
...
`
```

**Total funciones mencionadas pero NO definidas:** 2
- ❌ `checkCacheStatus` (mencionada 2 veces)
- ❌ `refreshJobs` (mencionada 2 veces)

---

## 🚨 PROBLEMA IDENTIFICADO

### El Assistant Está Confundido

El prompt le dice al Assistant:
> "Llama a checkCacheStatus SIEMPRE antes de buscar"

Pero cuando el Assistant intenta llamar `checkCacheStatus()`:

```
1. Assistant: "Voy a llamar checkCacheStatus()"
2. OpenAI: "❌ Error: Esta función no existe en tools"
3. Assistant: "¿Qué hago? El prompt dice que SIEMPRE la llame..."
```

**Posibles consecuencias:**

### Escenario A: El Assistant se queda esperando
```
Usuario: "busca chef en madrid"
    ↓
Assistant intenta: checkCacheStatus()
    ↓
OpenAI: Error (función no existe)
    ↓
Assistant espera... espera... espera... (timeout o retry)
    ↓
Después de 30-60s: Da up y llama searchJobs()
```

### Escenario B: El Assistant entra en loop
```
Usuario: "busca chef en madrid"
    ↓
Assistant intenta: checkCacheStatus()
    ↓
OpenAI: Error
    ↓
Assistant intenta otra estrategia: refreshJobs()
    ↓
OpenAI: Error
    ↓
Assistant intenta de nuevo: checkCacheStatus()
    ↓
Loop hasta timeout (60s)
```

### Escenario C: El Assistant ignora las instrucciones
```
Usuario: "busca chef en madrid"
    ↓
Assistant lee: "llama a checkCacheStatus SIEMPRE"
    ↓
Assistant ve: checkCacheStatus no existe en tools
    ↓
Assistant se confunde, genera error interno
    ↓
Tarda 30-60s en "recuperarse"
    ↓
Finalmente llama searchJobs()
```

---

## 📊 Comparación: Lo Que Debería Pasar vs Lo Que Pasa

### ✅ Flujo Correcto (si las instrucciones coincidieran con tools):
```
Usuario: "busca chef en madrid"
    ↓
Assistant: "Voy a llamar searchJobs('chef', 'madrid')"  (0.5s)
    ↓
API: Responde con resultados  (0.2s)
    ↓
Assistant: Formatea y presenta  (1s)
    ↓
TOTAL: ~2 segundos
```

### ❌ Flujo Actual (con funciones fantasma en el prompt):
```
Usuario: "busca chef en madrid"
    ↓
Assistant: "Voy a llamar checkCacheStatus() como dice el prompt"  (0.5s)
    ↓
OpenAI: "❌ Error: función no existe"  (5-10s de overhead)
    ↓
Assistant: "¿Y ahora qué? El prompt dice SIEMPRE..."  (20-30s confundido)
    ↓
Assistant: "Voy a intentar searchJobs() directamente"  (0.5s)
    ↓
API: Responde con resultados  (0.2s)
    ↓
Assistant: Formatea y presenta  (1s)
    ↓
TOTAL: ~60 segundos 😱
```

---

## ✅ SOLUCIÓN

### Opción 1: Eliminar Referencias a Funciones Fantasma (RECOMENDADO)

**Cambio en `api/assistant/create.js`:**

```javascript
// ANTES (líneas 84-86):
1. VERIFICAR CACHÉ:
   - Llama a checkCacheStatus SIEMPRE antes de buscar  ← ELIMINAR
   - Si caché vacío o desactualizado (>24h): llama a refreshJobs  ← ELIMINAR
   - Informa: "Actualizando ofertas... ⏳"

// DESPUÉS:
1. BUSCAR OFERTAS:
   - Llama searchJobs con los parámetros del usuario
   - La API ya tiene cache interno (no necesitas verificarlo)
```

**Repetir el cambio en líneas 760-762** (está duplicado)

**Beneficio:**
- Elimina la confusión del Assistant
- Ahorro esperado: 50-60 segundos
- Nueva latencia: 2-5 segundos

---

### Opción 2: Implementar las Funciones Faltantes (NO RECOMENDADO)

Podrías agregar `checkCacheStatus` y `refreshJobs` a:
1. Las `tools` del Assistant
2. Los handlers de `executeFunctionCall`

**Pero esto es MALA IDEA porque:**
- `refreshJobs` tarda 30-60 segundos (descarga XML, procesa 2052 ofertas)
- No tiene sentido llamarlo en cada mensaje del usuario
- La API ya tiene cache interno que se actualiza automáticamente

---

## 🧪 Cómo Confirmar Con Los Logs de Vercel

Cuando compartas los logs, buscaré estas líneas:

### Si mi hipótesis es correcta:
```
[timestamp] 💬 Enviando mensaje al thread: abc123
[timestamp] 🏃 Run con streaming iniciado
[timestamp] ⚠️ Assistant intentó llamar función no definida: checkCacheStatus
[timestamp] ❌ Error: función desconocida
[mucho tiempo sin logs...]
[timestamp + 60s] 🔧 Ejecutando función: searchJobs
[timestamp + 61s] ✅ Run completado
```

### Si hay otro problema:
```
[timestamp] 💬 Enviando mensaje al thread: abc123
[timestamp] 🏃 Run con streaming iniciado
[timestamp] 🔧 Ejecutando función: searchJobs
[timestamp + 60s] ⏱️ Timeout waiting for OpenAI response
```

---

## 📋 Resumen

| Función | Definida en `tools` | Implementada en handler | Mencionada en prompt | Status |
|---------|-------------------|----------------------|-------------------|--------|
| `searchJobs` | ✅ Sí | ✅ Sí | ✅ Sí | ✅ OK |
| `checkCacheStatus` | ❌ No | ❌ No | ⚠️ Sí (2 veces) | ❌ PROBLEMA |
| `refreshJobs` | ❌ No | ❌ No | ⚠️ Sí (2 veces) | ❌ PROBLEMA |

**Diagnóstico:** El prompt menciona funciones que no existen, causando confusión y latencia masiva.

**Fix:** Eliminar las referencias a `checkCacheStatus` y `refreshJobs` del prompt.

**Impacto esperado:** De 60s → 2-5s (95% más rápido)

---

**¿Quieres que haga el fix ahora, o prefieres ver los logs de Vercel primero para confirmar al 100%?**
