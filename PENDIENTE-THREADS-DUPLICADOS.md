# PROBLEMA: Threads Duplicados y Carga de Mensajes Viejos

## Problema 1: Threads Duplicados

**Síntoma**: Se crean 2 threads con timestamp idéntico al milisegundo (ej: 17:36:12.17)

**Causa Probable**:
- Script `embed.js` se ejecuta DOS VECES en paralelo
- Ambas ejecuciones llegan al check `if (!threadId && !isCreatingThread)` simultáneamente
- Ambas ven `isCreatingThread = false` antes de que cualquiera lo setee a `true`
- Ambas llaman a `createThread()` → 2 threads creados

**Por Qué el Guard No Funciona**:
```javascript
// widget/embed.js línea 11-16
if (window.TURIJOBS_WIDGET_LOADED) {
  console.warn('⚠️ Turijobs widget already loaded, skipping initialization');
  return;
}
window.TURIJOBS_WIDGET_LOADED = true;
```

Este guard existe pero ambas instancias ejecutan simultáneamente → ambas ven `undefined` antes de que se setee.

**Posibles Causas Root**:
1. **Webflow incluye el script dos veces** en HTML
2. **Evento DOMContentLoaded dispara dos veces** (raro pero posible)
3. **Usuario tiene dos pestañas abiertas** de la misma página
4. **Git/build process corre scripts en watch mode** y modifica archivos

**Soluciones Propuestas**:

### Opción 1: Debounce a nivel Global
```javascript
// Al inicio del archivo, antes de todo
if (window.TURIJOBS_INIT_LOCK) {
  console.log('⏳ Widget initialization already running...');
  return;
}
window.TURIJOBS_INIT_LOCK = true;

// Al final de initWidget()
setTimeout(() => { window.TURIJOBS_INIT_LOCK = false; }, 2000);
```

### Opción 2: Usar Mutex con Promise
```javascript
let initPromise = null;

document.addEventListener('DOMContentLoaded', async function() {
  if (initPromise) {
    console.log('⏳ Waiting for first initialization...');
    await initPromise;
    return;
  }

  initPromise = new Promise(resolve => {
    // ... inicialización ...
    resolve();
  });
});
```

### Opción 3: Single Instance Pattern
```javascript
window.TurijobsWidget = window.TurijobsWidget || (() => {
  // Todo el código del widget aquí
  // Solo se ejecuta una vez
})();
```

### Opción 4: Revisar HTML de Webflow
Verificar que el script solo se incluya UNA VEZ:
```html
<!-- ❌ INCORRECTO - Script incluido dos veces -->
<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>
<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>

<!-- ✅ CORRECTO - Script incluido una vez -->
<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>
```

---

## Problema 2: Carga de Mensajes Viejos (8 mensajes obtenidos)

**Síntoma**: Al abrir el chat después de horas/días, carga mensajes de sesiones antiguas

**Causa**:
```javascript
// widget/embed.js línea 110
let threadId = localStorage.getItem('turijobs_thread_id');
```

Esto carga el threadId SIN verificar cuándo fue creado. Entonces:
1. Usuario abre chat → crea thread_ABC, guarda en localStorage
2. Usuario cierra pestaña
3. **3 días después** → abre chat de nuevo
4. Sistema carga thread_ABC (viejo) → llama `loadMessages()`
5. OpenAI devuelve TODOS los mensajes viejos ("8 mensajes obtenidos")
6. **Gasto innecesario**: ~2000 tokens por sesión

**Solución: Implementar TTL (Time-To-Live)**

### Cambio 1: Guardar con Timestamp
```javascript
// widget/embed.js línea 252-254
// ANTES:
localStorage.setItem('turijobs_thread_id', threadId);

// DESPUÉS:
localStorage.setItem('turijobs_thread_data', JSON.stringify({
  threadId: threadId,
  timestamp: Date.now()
}));
```

### Cambio 2: Verificar TTL al Cargar
```javascript
// widget/embed.js línea 104-113
// ANTES:
let threadId = localStorage.getItem('turijobs_thread_id');

// DESPUÉS:
const TTL = 4 * 60 * 60 * 1000; // 4 horas
let threadId = null;

const threadData = localStorage.getItem('turijobs_thread_data');
if (threadData) {
  try {
    const parsed = JSON.parse(threadData);
    const age = Date.now() - parsed.timestamp;

    if (age < TTL) {
      threadId = parsed.threadId;
      console.log(`[Turijobs] Thread loaded (${Math.round(age / 1000 / 60)} min old)`);
    } else {
      console.log(`[Turijobs] Thread expired (${Math.round(age / 1000 / 60 / 60)} hours old), will create new`);
      localStorage.removeItem('turijobs_thread_data');
      localStorage.removeItem('turijobs_thread_id');
    }
  } catch (e) {
    console.error('[Turijobs] Error parsing thread data:', e);
    localStorage.removeItem('turijobs_thread_data');
    localStorage.removeItem('turijobs_thread_id');
  }
}
```

### Cambio 3: Limpiar al Reset
```javascript
// widget/embed.js línea 407-409
// ANTES:
function resetChat() {
  localStorage.removeItem('turijobs_thread_id');
  threadId = null;
  ...
}

// DESPUÉS:
function resetChat() {
  localStorage.removeItem('turijobs_thread_data');
  localStorage.removeItem('turijobs_thread_id'); // backward compatibility
  threadId = null;
  ...
}
```

**Beneficios**:
- ✅ No carga conversaciones antiguas (ahorra ~2000 tokens/sesión)
- ✅ Mejor UX (conversación fresca cada 4 horas)
- ✅ Mantiene backward compatibility (limpia ambos formatos)
- ✅ El usuario puede continuar conversación si es reciente (<4h)

**Archivo con los cambios completos**: `widget-ttl-patch.txt`

---

## Estado Actual

- **Problema 1 (Threads Duplicados)**: Identificado, soluciones propuestas, NO implementado
- **Problema 2 (Mensajes Viejos)**: Identificado, solución diseñada, NO implementado

## Siguiente Paso

Revisar primero el problema de NIVEL 1.5 nearby (Sant Cugat → Barcelona) antes de implementar estos cambios.
