# ✅ Checklist de Deployment - Inteligencia Contextual

**Fecha:** 25 de octubre de 2025  
**Commits:** `734b0e4`, `36d3a92`, `7727dc0`

---

## 🎯 **Cambios Aplicados**

### **1. URLs Limpias con UTM Tracking** ✅
- ✅ Limpieza de URLs en el origen (`api/jobs/refresh.js`)
- ✅ Eliminación de parámetros `&cid=`
- ✅ Adición de UTM params estándar
- ✅ Fix de paréntesis al final de URLs

### **2. Auto-scroll Mejorado** ✅
- ✅ Scroll al inicio del último mensaje (no todo el chat)
- ✅ Usuario ve el comienzo de la respuesta del bot

### **3. Inteligencia Contextual Avanzada** 🆕
- ✅ Sistema de búsqueda multinivel (4 niveles)
- ✅ Base de datos geográfica España + Portugal completa
- ✅ Interpretación de regiones ("sur de España", "cerca de...", etc.)
- ✅ Sugerencias de puestos similares
- ✅ Expansión progresiva de búsquedas

---

## 📋 **Pasos para Activar en Producción**

### **Paso 1: Verificar Deployment Automático en Vercel** ⏳

1. Ve a: https://vercel.com/munozmichael01/job-search-api
2. Busca el deployment más reciente (commit `7727dc0`)
3. Espera a que el status sea: **"Ready"** ✅

**Tiempo estimado:** 2-3 minutos

---

### **Paso 2: Refrescar el Caché con URLs Limpias** 🔄

**¿Por qué?** Para que todas las URLs se guarden con los nuevos UTM params.

**Cómo:**

**Opción A - Navegador:**
```
https://job-search-api-psi.vercel.app/api/jobs/refresh
```

**Opción B - Terminal:**
```bash
curl https://job-search-api-psi.vercel.app/api/jobs/refresh
```

**Respuesta esperada:**
```json
{
  "success": true,
  "total_jobs": 2132,
  "timestamp": "2025-10-25T...",
  "message": "Ofertas actualizadas correctamente"
}
```

---

### **Paso 3: Recrear el Assistant con Nueva Inteligencia** 🤖

**¿Por qué?** Para activar el sistema de búsqueda contextual multinivel.

**Cómo:**

**Opción A - Navegador:**
```
https://job-search-api-psi.vercel.app/api/assistant/create
```

**Opción B - Terminal:**
```bash
curl https://job-search-api-psi.vercel.app/api/assistant/create
```

**Respuesta esperada:**
```json
{
  "success": true,
  "assistant_id": "asst_...",
  "message": "Asistente creado/actualizado correctamente",
  "instructions_length": 4500
}
```

**IMPORTANTE:**
- Si el `assistant_id` cambió, actualízalo en Vercel:
  - Settings > Environment Variables
  - `OPENAI_ASSISTANT_ID = asst_NUEVO_ID`
- Si es el mismo ID, no hace falta hacer nada (OpenAI lo actualiza automáticamente)

---

### **Paso 4: Probar el Sistema Completo** 🧪

#### **Test 1: URLs Limpias** ✅

```
1. Abre: https://job-search-api-psi.vercel.app/
2. Pregunta: "busco recepcionista en Madrid"
3. Haz clic en "Ver oferta" o "Aplicar"
4. Verifica la URL del navegador:
```

**✅ Correcto:**
```
https://www.turijobs.com/...?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant
```

**❌ Incorrecto:**
```
https://www.turijobs.com/...&cid=fgtsamples_fgtsamples_alljobs
```

---

#### **Test 2: Búsqueda Regional** 🗺️

**Pregunta 1:**
```
"recepcionista en el sur de españa"
```

**Resultado esperado:**
```
✅ Debe mostrar ofertas de: Sevilla, Málaga, Granada, Córdoba, Cádiz...
✅ NO debe decir "No encontré ofertas"
✅ Debe explicar las ciudades donde buscó
```

---

**Pregunta 2:**
```
"chef cerca de la costa"
```

**Resultado esperado:**
```
✅ Debe mostrar ofertas de ciudades costeras: Barcelona, Valencia, Málaga, Cádiz...
✅ Debe agrupar por zonas costeras si es posible
```

---

**Pregunta 3:**
```
"camarero en las islas"
```

**Resultado esperado:**
```
✅ Debe entender "islas" = Baleares + Canarias
✅ Debe mostrar ofertas de: Palma, Ibiza, Las Palmas, Tenerife...
```

---

#### **Test 2.5: Búsquedas Genéricas (Sin Puesto Específico)** 🆕

**Pregunta 1:**
```
"restaurantes en la costa dorada"
```

**Resultado esperado:**
```
✅ Debe buscar TODAS las ofertas (query="", no filtrar por puesto)
✅ Debe filtrar por Costa Dorada: Tarragona, Salou, Cambrils
✅ Debe mostrar ofertas de: cocina, sala, recepción, etc.
✅ Debe decir: "Encontré X ofertas en restaurantes de la Costa Dorada"
```

---

**Pregunta 2:**
```
"empleos en Tarragona"
```

**Resultado esperado:**
```
✅ Debe buscar TODAS las ofertas (query="")
✅ Debe usar location="Tarragona"
✅ Debe mostrar diversas categorías: cocina, sala, recepción, housekeeping...
✅ Debe decir: "Hay X ofertas en Tarragona en diferentes áreas"
```

---

**Pregunta 3:**
```
"cuáles son las ciudades con más ofertas?"
```

**Resultado esperado:**
```
✅ Debe buscar TODAS las ofertas (query="", location="", limit=100)
✅ Debe agrupar y contar por ciudad
✅ Debe mostrar: "Top 10 ciudades con más ofertas:"
  1. Madrid (150 ofertas)
  2. Barcelona (120 ofertas)
  3. Valencia (80 ofertas)
  ...
✅ NO debe decir: "No tengo la capacidad de proporcionar..."
```

---

**Pregunta 4:**
```
"hoteles en Mallorca"
```

**Resultado esperado:**
```
✅ Debe buscar TODAS las ofertas (query="")
✅ Debe usar location="Mallorca" o "Palma"
✅ Debe filtrar empresas con "hotel" en el nombre
✅ Debe mostrar ofertas variadas de hoteles
```

---

#### **Test 3: Búsqueda Sin Resultados (Debe Sugerir Alternativas)** 💡

**Pregunta:**
```
"sommelier en Teruel"
```

**Resultado esperado:**
```
✅ "No encontré sommeliers en Teruel..."
✅ "Sin embargo, encontré X ofertas de camarero/sala en Teruel"
✅ O: "Hay X ofertas de sommelier en Zaragoza (a Y km)"
✅ Debe ofrecer alternativas, NO solo decir "no hay"
```

---

**Pregunta 2:**
```
"chef en Soria"
```

**Resultado esperado:**
```
✅ Nivel 1: Busca "chef" en Soria
✅ Nivel 2: Busca "cocinero" en Soria
✅ Nivel 3: Busca en Castilla y León (Valladolid, Burgos...)
✅ Nivel 4: Sugiere "ayudante de cocina" si no hay chef/cocinero
✅ Debe explicar el proceso: "Busqué chef en Soria, luego amplié a..."
```

---

#### **Test 4: Auto-scroll** 📜

**Cómo probar:**
```
1. Haz una pregunta que genere una respuesta larga (ej: "chef en Madrid")
2. Observa cuando aparezca la respuesta del bot
3. Verifica que veas el INICIO de la respuesta (título, empresa, ubicación)
4. NO debes estar viendo el final (botones de links)
```

**✅ Correcto:** Ves el título de la primera oferta sin hacer scroll.

**❌ Incorrecto:** Ves los botones de "Ver oferta" y tienes que hacer scroll hacia arriba.

---

## 📊 **Checklist de Verificación**

### **Backend:**
- [ ] Vercel deployment exitoso (commit `7727dc0`)
- [ ] Caché refrescado (`/api/jobs/refresh`)
- [ ] URLs verificadas con UTM params (sin `&cid=`)
- [ ] Assistant recreado (`/api/assistant/create`)

### **Frontend:**
- [ ] Auto-scroll funciona (va al inicio del último mensaje)
- [ ] Títulos en negrita sin asteriscos
- [ ] URLs como botones, no texto plano

### **Inteligencia del Assistant:**
- [ ] Búsquedas regionales funcionan ("sur de España")
- [ ] Búsquedas de proximidad funcionan ("cerca de Barcelona")
- [ ] Sugerencias de alternativas cuando no hay resultados
- [ ] Expansión progresiva (sinónimos → región → puestos similares)

---

## 🐛 **Troubleshooting**

### **Error: URLs siguen con `&cid=`**

**Causa:** El caché no se refrescó después del deployment.

**Solución:**
```bash
curl https://job-search-api-psi.vercel.app/api/jobs/refresh
```

---

### **Error: Assistant no entiende "sur de España"**

**Causa:** El Assistant no se recreó con las nuevas instrucciones.

**Solución:**
```bash
curl https://job-search-api-psi.vercel.app/api/assistant/create
```

Verifica que el `assistant_id` en la respuesta sea el mismo que tienes en Vercel env vars.

---

### **Error: Assistant dice "No encontré ofertas" pero SÍ hay**

**Causa 1:** El caché está vacío o desactualizado.

**Solución:**
```bash
# Verificar status
curl https://job-search-api-psi.vercel.app/api/jobs/status

# Si is_expired: true
curl https://job-search-api-psi.vercel.app/api/jobs/refresh
```

**Causa 2:** El Assistant no tiene la nueva inteligencia.

**Solución:**
```bash
curl https://job-search-api-psi.vercel.app/api/assistant/create
```

---

### **Error: Auto-scroll no funciona**

**Causa:** La app React no se reconstruyó en Vercel.

**Solución:**
1. Ve a Vercel Dashboard
2. Redeploy manualmente el proyecto
3. O espera a que el webhook de GitHub lo haga automáticamente

---

## 📖 **Documentación Creada**

1. **`DEPLOY_UPDATES.md`** - Guía de deployment para URLs y búsquedas regionales
2. **`ASSISTANT_INTELLIGENCE.md`** - Explicación completa del sistema de inteligencia contextual
3. **`DEPLOYMENT_CHECKLIST.md`** (este archivo) - Checklist paso a paso

---

## 🎉 **¿Todo Listo?**

Una vez completados todos los pasos:

### **Monitoreo Continuo:**

1. **Google Analytics / UTM Tracking:**
   - Verifica que lleguen eventos con `utm_source=chatbot_ai`
   - Monitorea conversiones desde el chatbot

2. **OpenAI Dashboard:**
   - Revisa los "Runs" del Assistant
   - Verifica que las búsquedas multinivel se ejecuten correctamente
   - Checa si hay errores de Function calling

3. **Logs de Vercel:**
   - Monitorea el uso de `/api/jobs/search`
   - Verifica que no haya timeouts en `/api/chat/send-message`

---

## 📞 **Próximos Pasos Sugeridos**

1. **Feedback de Usuarios:**
   - Recopila feedback sobre la calidad de las búsquedas
   - Identifica casos donde el Assistant no sugiere alternativas adecuadas

2. **Ajustes Finos:**
   - Agregar más sinónimos según los puestos más buscados
   - Ampliar la base de datos geográfica con más ciudades pequeñas
   - Ajustar el umbral de "pocas ofertas" (<3) según necesidad

3. **Métricas:**
   - % de búsquedas que encuentran resultados en Nivel 1 vs Nivel 2-4
   - Ciudades/regiones más buscadas
   - Puestos con menos coincidencias (para mejorar sinónimos)

---

**✨ El sistema está listo para producción. ¡Buena suerte con el deployment!**

