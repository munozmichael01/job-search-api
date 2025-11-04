# 🐌 Análisis de Lentitud del Chat

**Fecha:** 4 de noviembre de 2025
**Observación:** API responde rápido pero el chat es lento

---

## 🔍 Diagnóstico de Cuellos de Botella

### 1. **PROMPT GIGANTE** ⚠️ PROBLEMA PRINCIPAL

**Tamaño de las instrucciones:**
- **23,524 caracteres** (~5,900 tokens)
- **1,399 líneas** de código

**Impacto en latencia:**
- OpenAI cobra por tokens de entrada + salida
- Más tokens de entrada = más tiempo de procesamiento
- El modelo tiene que "leer" todo el prompt en cada mensaje

**Ejemplo del prompt:**
```javascript
instructions: `⚠️ REGLA ABSOLUTA: NUNCA INVENTES DATOS ⚠️

Eres un asistente de búsqueda de empleo...

FLUJO OBLIGATORIO:
1. VERIFICAR CACHÉ
2. BUSCAR OFERTAS
3. PRESENTAR RESULTADOS
4. ...

INSTRUCCIONES DETALLADAS:
- [664 líneas de instrucciones detalladas]
- Ejemplos de respuestas completas
- Casos edge
- Formateo
- etc.
`
```

**Por qué es lento:**
- GPT-4o tiene que procesar ~6,000 tokens ANTES de generar respuesta
- Tiempo de procesamiento: ~2-3 segundos solo para "leer" el prompt
- El 90% de esas instrucciones son ejemplos y casos edge que podrían estar en otro lugar

---

### 2. **Function Calling Secuencial**

**Flujo actual:**
```
Usuario: "busca chef en madrid"
    ↓
Chat envía mensaje al Assistant
    ↓
Assistant procesa ~6k tokens de instrucciones
    ↓
Assistant decide llamar searchJobs()
    ↓
Backend ejecuta searchJobs()
    ↓
API /jobs/search responde (rápido, ~200ms)
    ↓
Backend retorna resultado al Assistant
    ↓
Assistant procesa resultado (~6k tokens de nuevo)
    ↓
Assistant genera respuesta formateada
    ↓
Usuario recibe respuesta
```

**Latencia total estimada:**
- Procesar prompt inicial: ~2-3s
- Function call overhead: ~1-2s
- Procesar resultado: ~2-3s
- Generar respuesta: ~1-2s
- **TOTAL: 6-10 segundos** 😱

---

### 3. **Streaming Subóptimo**

**Problema:**
El streaming actual espera a que el Assistant complete TODO el proceso antes de empezar a mostrar texto.

**Código actual:**
```javascript
// send-message-stream.js
for await (const event of stream) {
  if (event.event === 'thread.message.delta') {
    const delta = event.data.delta.content?.[0]?.text?.value;
    if (delta) {
      res.write(`data: ${JSON.stringify({ type: 'text', content: delta })}\n\n`);
    }
  }
}
```

**Qué pasa en realidad:**
1. Usuario envía mensaje
2. Assistant piensa (silent, sin feedback)
3. Assistant llama función (silent)
4. API responde (silent)
5. **RECIÉN AHÍ** empieza a streamear la respuesta

El usuario ve una pantalla en blanco por 5-8 segundos.

---

## 📊 Comparación con API Directa

### API directa (tu observación: rápida)
```
curl /api/jobs/search?query=chef&location=madrid
→ Respuesta en ~200-500ms
```

### Chat (tu observación: lenta)
```
Usuario: "busca chef en madrid"
→ Respuesta empieza después de 6-10 segundos
```

**Diferencia:** El chat tiene **12-20x más latencia** que la API.

---

## 🎯 Soluciones Propuestas (Sin Implementar Aún)

### Solución 1: **Reducir el Prompt Drásticamente** ⭐ MAYOR IMPACTO

**Objetivo:** Reducir de 6,000 tokens a ~800-1,200 tokens (80% reducción)

**Estrategia:**
- Mover ejemplos detallados a documentación externa
- Usar instrucciones concisas tipo "bullet points"
- Eliminar casos edge redundantes
- Usar "few-shot examples" solo cuando sea crítico

**Prompt optimizado (ejemplo):**
```javascript
instructions: `Eres un asistente de búsqueda de empleo en Turijobs.

REGLAS:
- Solo muestra ofertas reales de searchJobs()
- Nunca inventes datos o URLs
- Usa formato: título, empresa, ciudad, salario, [Aplicar]

FLUJO:
1. Extrae: query (puesto) y location (ciudad) del mensaje
2. Llama searchJobs(query, location)
3. Presenta máximo 10 ofertas
4. Si 0 resultados: explica amplificación usada

FORMATO:
🔹 [Título] - [Empresa]
📍 [Ciudad] | 💰 [Salario]
[Aplicar](URL)
`
```

**Reducción:** 23,500 → ~1,500 caracteres (94% menos)
**Ahorro de tiempo:** ~2-3 segundos por mensaje

---

### Solución 2: **Streaming con Estado Intermedio**

**Problema:** Usuario no ve nada mientras el Assistant "piensa"

**Solución:** Mostrar estados intermedios

```javascript
// Mientras espera
res.write(`data: ${JSON.stringify({
  type: 'status',
  content: 'Buscando ofertas de chef en Madrid...'
})}\n\n`);

// Cuando llama función
res.write(`data: ${JSON.stringify({
  type: 'status',
  content: 'Consultando Turijobs...'
})}\n\n`);

// Cuando recibe resultados
res.write(`data: ${JSON.stringify({
  type: 'status',
  content: 'Encontré 15 ofertas, formateando...'
})}\n\n`);
```

**Percepción:** El usuario ve progreso en lugar de pantalla en blanco
**No acelera realmente, pero PARECE más rápido**

---

### Solución 3: **Cache de Prompts (OpenAI Feature)**

**Qué es:** OpenAI permite cachear el system prompt

**Beneficio:**
- Primera llamada: procesa 6,000 tokens
- Llamadas siguientes: reutiliza cache, solo procesa mensaje nuevo
- Ahorro: ~50% en latencia

**Requisito:**
- Prompt debe ser estable (no cambiar en cada request)
- Disponible en GPT-4 y GPT-4o

**Código:**
```javascript
await openai.beta.threads.runs.create(thread_id, {
  assistant_id: ASSISTANT_ID,
  // OpenAI cachea automáticamente si el prompt es el mismo
  stream: true
});
```

**Ya está implementado implícitamente** si usas el mismo ASSISTANT_ID.

---

### Solución 4: **Respuesta Anticipada (Parallelization)**

**Idea radical:** No usar Assistant, usar Chat Completion directamente

**Ventajas:**
- Sin function calling overhead
- Control total del flujo
- Puedes ejecutar searchJobs() mientras generas respuesta

**Código conceptual:**
```javascript
// 1. Parsear intent del usuario (regex simple)
const intent = parseUserIntent(message); // "chef", "madrid"

// 2. Llamar API en paralelo con OpenAI
const [searchResults, llmResponse] = await Promise.all([
  fetch(`/api/jobs/search?query=${intent.query}&location=${intent.location}`),
  openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Eres un asistente...' },
      { role: 'user', content: message }
    ],
    stream: true
  })
]);

// 3. Streamear respuesta mientras llegan resultados
```

**Ahorro:** ~2-4 segundos (elimina function calling overhead)

**Trade-off:** Más código custom, menos "magia" del Assistant

---

### Solución 5: **Cambiar a GPT-4o-mini**

**Modelo actual:** `gpt-4o`
**Alternativa:** `gpt-4o-mini`

**Beneficios:**
- 60% más rápido
- 80% más barato
- Suficiente para formatear ofertas

**Trade-off:**
- Menos "inteligente" en edge cases
- Pero para este caso de uso (formatear JSON) es suficiente

---

## 📈 Impacto Estimado de Cada Solución

| Solución | Ahorro de Tiempo | Dificultad | Prioridad |
|----------|------------------|------------|-----------|
| **1. Reducir prompt** | 2-3s (40%) | Fácil | 🔴 ALTA |
| **2. Streaming con estado** | 0s (percepción) | Fácil | 🟡 MEDIA |
| **3. Cache de prompts** | 1-2s (20%) | Gratis | 🟢 BAJA (ya activo) |
| **4. Sin Assistant** | 2-4s (50%) | Difícil | 🟡 MEDIA |
| **5. GPT-4o-mini** | 1-2s (20%) | Muy fácil | 🟡 MEDIA |

---

## 🎯 Recomendación de Implementación

### Fase 1: Quick Wins (1-2 horas)
1. ✅ **Reducir prompt a ~1,500 caracteres** (mayor impacto)
2. ✅ **Agregar estados intermedios** ("Buscando...", "Formateando...")
3. ✅ **Cambiar a gpt-4o-mini** (test A/B)

**Resultado esperado:** De 8s → 3-4s (50% más rápido)

---

### Fase 2: Optimización Avanzada (4-6 horas)
4. ⚠️ **Considerar eliminar Assistant API** y usar Chat Completions directamente
5. ⚠️ **Parsear intent con regex** en lugar de function calling

**Resultado esperado:** De 3-4s → 1-2s (otro 50% más rápido)

---

## 🧪 Cómo Medir el Impacto

### Antes de cambios:
```bash
# En el navegador, abrir DevTools → Network
# Enviar mensaje: "busca chef en madrid"
# Medir tiempo hasta primera palabra visible
```

### Después de cada cambio:
```bash
# Repetir mismo test
# Comparar tiempos
```

### Métricas a trackear:
- **Time to First Byte (TTFB):** Cuánto tarda en empezar a streamear
- **Time to First Token:** Cuánto tarda en mostrar primera palabra
- **Total Time:** Cuánto tarda en completar respuesta

---

## 💡 Otras Consideraciones

### ¿Por qué la API es rápida pero el chat lento?

**API directa:**
```
Request → Search logic → Return JSON
~200ms total
```

**Chat actual:**
```
Request → Parse message → Call OpenAI → Process 6k tokens →
Function call → API → Process result → Generate response → Stream
~8,000ms total
```

**40x diferencia** 😱

---

### ¿Vale la pena el Assistant API?

**Ventajas:**
- Threading built-in
- Function calling automático
- Contexto persistente

**Desventajas:**
- Overhead significativo (~3-5s)
- Menos control
- Más caro

**Para tu caso de uso:**
- El 90% de las queries son simples ("busca X en Y")
- No necesitas reasoning complejo
- La velocidad es crítica

**Conclusión:** Probablemente puedas eliminar el Assistant API y usar Chat Completions directamente con MUCHO mejor performance.

---

## 📋 Checklist para Decisión

Antes de implementar, considera:

- [ ] ¿Cuál es el percentil 95 de latencia aceptable? (2s? 5s? 10s?)
- [ ] ¿Los usuarios valoran velocidad sobre "inteligencia"?
- [ ] ¿Estás dispuesto a mantener código custom de parsing?
- [ ] ¿El presupuesto de OpenAI es un concern? (gpt-4o-mini = 80% ahorro)
- [ ] ¿Qué tan importante es el streaming vs respuesta completa?

---

**¿Quieres que implemente alguna de estas soluciones? Recomiendo empezar con Fase 1 (reducir prompt + estados intermedios) que tiene el mayor ROI.**
