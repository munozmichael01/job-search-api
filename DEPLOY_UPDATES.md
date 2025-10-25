# 🚀 Guía de Deploy - Actualización de URLs y Búsquedas Regionales

**Fecha:** 25 de octubre de 2025  
**Commit:** `734b0e4`

---

## ✨ **Cambios Aplicados**

### 1. **URLs Limpias con UTM Tracking** ✅

**Problema:**
```
❌ https://www.turijobs.com/.../aplicar&cid=fgtsamples_fgtsamples_alljobs
```

**Solución:**
```
✅ https://www.turijobs.com/.../aplicar?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant
```

**Archivos modificados:**
- `api/jobs/refresh.js` - Limpia URLs al parsear el XML
- `api/jobs/search.js` - Simplificado (URLs ya vienen limpias)

### 2. **Búsquedas Regionales Mejoradas** 🗺️

**Problema:**
- Usuario: "recepcionista en el sur de España"
- Bot: "No encontré ofertas" (pero SÍ había en Sevilla)

**Solución:**
El Assistant ahora:
1. Busca SIN filtro de location cuando se menciona una región
2. Filtra mentalmente los resultados por ciudades relevantes
3. Muestra ofertas de: Sevilla, Málaga, Granada, Córdoba, etc.

**Archivo modificado:**
- `api/assistant/create.js` - Instrucciones mejoradas

---

## 📋 **Pasos para Aplicar en Producción**

### **Paso 1: Verificar que el código está en GitHub** ✅

```bash
# Ya está hecho - Commit 734b0e4
git log --oneline -1
```

**Salida esperada:**
```
734b0e4 Fix: Clean URLs at source with UTM params, improve regional search instructions
```

---

### **Paso 2: Esperar a que Vercel Despliegue Automáticamente** ⏳

1. Ve a: https://vercel.com/munozmichael01/job-search-api
2. Busca el deployment más reciente con commit `734b0e4`
3. Espera a que muestre: **"Ready"** ✅

---

### **Paso 3: Refrescar el Caché con URLs Limpias** 🔄

**Opción A: Via Navegador**

Abre en una pestaña nueva:
```
https://job-search-api-psi.vercel.app/api/jobs/refresh
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

**Opción B: Via Terminal**

```bash
curl https://job-search-api-psi.vercel.app/api/jobs/refresh
```

---

### **Paso 4: Verificar URLs Limpias** ✅

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=recepcionista&limit=1"
```

**Verifica en la respuesta:**
```json
{
  "results": [
    {
      "url": "https://www.turijobs.com/...?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant",
      "url_aplicar": "https://www.turijobs.com/.../aplicar?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant"
    }
  ]
}
```

✅ **No debe haber `&cid=` ni parámetros viejos**

---

### **Paso 5: Recrear el Assistant con Nuevas Instrucciones** 🤖

**Opción A: Via Navegador**

Abre en una pestaña nueva:
```
https://job-search-api-psi.vercel.app/api/assistant/create
```

**Respuesta esperada:**
```json
{
  "success": true,
  "assistant_id": "asst_...",
  "message": "Asistente creado/actualizado correctamente"
}
```

**Opción B: Via Terminal**

```bash
curl https://job-search-api-psi.vercel.app/api/assistant/create
```

**IMPORTANTE:**
- Copia el nuevo `assistant_id` de la respuesta
- Si es diferente al actual, actualízalo en Vercel:

```bash
# En Vercel Dashboard:
# Settings > Environment Variables
# OPENAI_ASSISTANT_ID = asst_NUEVO_ID
```

Si el ID es el mismo, no necesitas hacer nada (OpenAI lo actualiza automáticamente).

---

### **Paso 6: Probar el Chat** 🧪

#### **Test 1: URLs Limpias**

1. Abre: https://job-search-api-psi.vercel.app/
2. Inicia el chat
3. Pregunta: "busco recepcionista en Madrid"
4. Haz clic en "Ver oferta" o "Aplicar"
5. Verifica la URL en la barra del navegador:

```
✅ https://www.turijobs.com/...?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant
❌ https://www.turijobs.com/...&cid=fgtsamples...
```

#### **Test 2: Búsquedas Regionales**

**Prueba 1:**
```
Usuario: "recepcionista en el sur de españa"
Esperado: Debe mostrar ofertas de Sevilla, Málaga, Granada, etc.
```

**Prueba 2:**
```
Usuario: "chef en andalucía"
Esperado: Debe mostrar ofertas de ciudades andaluzas
```

**Prueba 3:**
```
Usuario: "camarero en la costa del sol"
Esperado: Debe mostrar ofertas de Málaga y alrededores
```

---

## 🎯 **Checklist Final**

- [ ] Código en GitHub (commit `734b0e4`)
- [ ] Vercel deployment exitoso
- [ ] Caché refrescado (`/api/jobs/refresh`)
- [ ] URLs verificadas (con `utm_*`, sin `&cid=`)
- [ ] Assistant recreado (`/api/assistant/create`)
- [ ] Test 1: URLs limpias en el chat ✅
- [ ] Test 2: Búsqueda regional (sur de España) ✅
- [ ] Test 3: Búsqueda regional (Andalucía) ✅

---

## 🐛 **Troubleshooting**

### Error: "URLs siguen con &cid="

**Causa:** El caché no se refrescó.

**Solución:**
```bash
curl https://job-search-api-psi.vercel.app/api/jobs/refresh
```

### Error: "Assistant no filtra por región"

**Causa:** El Assistant no se recreó.

**Solución:**
```bash
curl https://job-search-api-psi.vercel.app/api/assistant/create
```

### Error: "No encuentra ofertas en el sur"

**Causa:** El caché está desactualizado.

**Solución:**
1. Verifica el status: `/api/jobs/status`
2. Si `is_expired: true`, refresca: `/api/jobs/refresh`

---

## 📊 **Monitoreo Post-Deploy**

### **1. Verificar Tracking UTM**

En Google Analytics (o tu herramienta de tracking), verifica que lleguen eventos con:
- `utm_source=chatbot_ai`
- `utm_medium=chat_widget`
- `utm_campaign=job_search_assistant`

### **2. Verificar Logs del Assistant**

En OpenAI Dashboard:
1. Ve a: https://platform.openai.com/assistants
2. Selecciona tu Assistant
3. Revisa los "Runs" recientes
4. Verifica que las búsquedas regionales funcionen correctamente

---

## 🎉 **¡Listo!**

Todos los cambios están aplicados y listos para producción.

**Próximos pasos sugeridos:**
- Monitorear las búsquedas regionales en los logs
- Verificar las conversiones UTM en Analytics
- Ajustar las instrucciones del Assistant según feedback de usuarios

