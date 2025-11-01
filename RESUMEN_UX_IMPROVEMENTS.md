# Resumen: Mejoras de UX del Asistente

## Fecha
2025-11-01

## Problemas Identificados

Basado en tu feedback después de probar "sushiman castelldefels":

### Problema 1: Mensaje Incorrecto ❌➡️✅ **RESUELTO**
**Antes:** "pero encontré 10 ofertas de Sushiman..."
**Problema:** Decía "ofertas de Sushiman" cuando en realidad son ofertas de "Cocinero"
**Después:** "pero encontré 10 ofertas relacionadas en Barcelona..."
**Mejora:** Ahora dice "ofertas relacionadas" y explica que pueden incluir responsabilidades del puesto buscado

### Problema 2: Paginación Innecesaria ⚠️ **LIMITACIÓN DE GPT-4**
**Observado:** El asistente mostraba 3 ofertas, luego 4, luego 3 (total 10 en 3 mensajes)
**Esperado:** Mostrar las 10 ofertas de una vez
**Status:** A pesar de múltiples intentos de reforzar las instrucciones, GPT-4 sigue limitando a ~3 ofertas por respuesta

---

## Cambios Aplicados al Prompt

### ✅ Cambio 1: Mensaje más preciso
**Archivo:** `assistant_prompt_with_nearby_v2.txt`

```diff
- "No encontré ofertas de [original_query] en [original_location], pero encontré **[X] ofertas de [related_job_used] en [nearby_city]**"
+ "No encontré ofertas de [original_query] en [original_location], pero encontré **[X] ofertas relacionadas en [nearby_city]**"
```

**Beneficio:**
- Más honesto: no dice "ofertas de Sushiman" cuando son "ofertas de Cocinero"
- Agrega explicación: "Estas ofertas pueden incluir responsabilidades de [query] aunque el título sea diferente"

### ⚠️ Cambio 2: Instrucciones anti-paginación
**Archivo:** `assistant_prompt_with_nearby_v2.txt` (líneas 112-117)

```txt
🚨 REGLA ABSOLUTA: Cuando recibas related_jobs_results, MUESTRA TODAS las ofertas que recibiste.
   - Si hay 10 ofertas en related_jobs_results, muestra LAS 10 en un solo mensaje
   - NO limites a 3, 5 o "las primeras"
   - NO uses paginación con "siguiente"
   - Lista TODAS completas desde el inicio
```

**Resultado:** Mejora parcial, pero GPT-4 sigue auto-limitando a ~3 ofertas por mensaje

---

## Pruebas Realizadas

### Test de "sushiman castelldefels"
```bash
node test-assistant-full.js
```

**Resultados:**
- ✅ API retorna 10 ofertas de Cocinero de Barcelona (NIVEL 2 + NEARBY funciona)
- ✅ Mensaje dice "ofertas relacionadas" (no "ofertas de Sushiman")
- ✅ Explica que pueden incluir responsabilidades del puesto buscado
- ⚠️ Muestra solo 3 ofertas en lugar de 10

**Ejemplo de respuesta:**
```
No encontré ofertas de "sushiman" en Castelldefels, pero encontré **10 ofertas
relacionadas en Barcelona** (20 km):

**1. Cocinero/a Incorporación inmediata - Barcelona**
[...]

**2. Cocinero/a**
[...]

**3. Cocinero/a Turno noche - Sustitución Enfermedad**
[...]

Estas ofertas pueden incluir responsabilidades de "sushiman" aunque el título
del puesto sea diferente.
```

---

## Intentos de Solución de Paginación

### Intento 1: Instrucción simple
```txt
⚡ MUESTRA TODAS LAS OFERTAS de related_jobs_results (NO pagines)
```
**Resultado:** Sin cambio, muestra 3

### Intento 2: Instrucción imperativa
```txt
⚠️ IMPERATIVO: Si related_jobs_results tiene 10 ofertas, DEBES mostrar las 10.
NO te detengas en 3 ofertas.
```
**Resultado:** Sin cambio, muestra 3

### Intento 3: Regla absoluta al inicio de sección
```txt
🚨 REGLA ABSOLUTA: Cuando recibas related_jobs_results, MUESTRA TODAS...
```
**Resultado:** Sin cambio, muestra 3

### Intento 4: Iteración explícita
```txt
[Para CADA oferta en related_jobs_results (índices 0 a N-1), mostrar...]
```
**Resultado:** Roto - muestra 0 ofertas (revertido)

---

## Análisis: ¿Por qué GPT-4 Limita a 3 Ofertas?

### Comportamiento Inherente del Modelo
GPT-4 está entrenado para:
1. **Ser conciso:** Evitar respuestas muy largas que abrumen al usuario
2. **Resumir listas:** Mostrar algunos ejemplos representativos en lugar de listas completas
3. **Sugerir paginación:** Cuando hay muchos resultados, ofrecer "ver más" es considerado buena UX por el modelo

### Evidencia
- Múltiples instrucciones explícitas y reforzadas no cambian el comportamiento
- El modelo sigue limitando a ~3 ofertas incluso con "REGLA ABSOLUTA" y "IMPERATIVO"
- Pruebas directas con OpenAI API (sin widget) confirman que es comportamiento del asistente, no del frontend

---

## Soluciones Alternativas Propuestas

### Opción A: Ajustar límite del backend
**Cambio:** Reducir `slice(0, 20)` a `slice(0, 5)` en `lib/enrichOffers.js:308`
**Efecto:** El API retornaría max 5 ofertas relacionadas en lugar de 20
**Pro:** GPT-4 podría mostrar 3-5 ofertas (casi todas)
**Contra:** Reduce amplitud de resultados

### Opción B: Modificar función searchJobs para paginar
**Cambio:** Agregar lógica de auto-paginación en el backend
**Efecto:** El asistente recibiría solo 3-5 ofertas por request
**Pro:** Alineado con comportamiento natural de GPT-4
**Contra:** Requiere cambios en API y lógica de función

### Opción C: Aceptar el comportamiento actual
**Cambio:** Ninguno
**Efecto:** Usuario dice "siguiente" para ver más (paginación interactiva)
**Pro:** Simple, sin cambios técnicos
**Contra:** No cumple con requisito de "mostrar todas de una vez"

### Opción D: Usar GPT-4 Turbo con max_tokens mayor
**Cambio:** Configurar assistant con mayor límite de tokens de salida
**Efecto:** Permitiría respuestas más largas
**Pro:** Podría resolver el problema
**Contra:** Requiere verificar si ya está configurado, puede aumentar costos

---

## Recomendación

**Opción A: Ajustar límite del backend a 5-7 ofertas relacionadas**

**Razón:**
1. Balance entre amplitud y completitud de respuesta
2. GPT-4 probablemente mostrará 3-5 de 5-7 ofertas (>70% vs actual 30%)
3. Mantiene la funcionalidad NIVEL 2 + NEARBY
4. Cambio mínimo: una línea de código

**Implementación:**
```javascript
// lib/enrichOffers.js:308
- .slice(0, 20)
+ .slice(0, 6)  // GPT-4 mostrará ~3-5 de 6 (mayoría)
```

---

## Estado Actual

### ✅ Completado
- [x] Mensaje corregido: "ofertas relacionadas" en lugar de "ofertas de [puesto]"
- [x] Explicación clara: "pueden incluir responsabilidades de [query]"
- [x] Instrucciones reforzadas en el prompt
- [x] Asistente actualizado en OpenAI
- [x] Tests documentados

### ⚠️ Pendiente
- [ ] Decidir solución para paginación (Opciones A-D)
- [ ] Implementar solución elegida
- [ ] Probar con casos reales: sushiman castelldefels, sommelier sitges
- [ ] Commit y deploy de cambios finales

---

## Archivos Modificados

- `assistant_prompt_with_nearby_v2.txt` - Prompt actualizado
- `fix-assistant-ux-v2.js` - Script para aplicar cambios de UX
- `fix-pagination-v3.js` - Script para reforzar anti-paginación
- `update-assistant-prompt.js` - Script para actualizar asistente en OpenAI
- `test-assistant-full.js` - Test completo con verificación de UX

---

## Próximos Pasos

1. **Decidir:** ¿Cuál opción prefieres para la paginación? (A, B, C, o D)
2. **Implementar:** Aplicar la solución elegida
3. **Probar:** Verificar con casos reales
4. **Commit:** Guardar cambios en git
5. **Deploy:** Subir a producción

¿Cuál opción prefieres para solucionar el tema de paginación?
