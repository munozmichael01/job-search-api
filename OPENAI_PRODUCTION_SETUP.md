# 🚀 Configuración Production-Ready para OpenAI Agent Builder

Esta guía te muestra cómo configurar tu agente de Turijobs de forma **completamente serverless** sin necesidad de servidores locales.

---

## ✅ Arquitectura Production-Ready

```
┌──────────────────┐
│  OpenAI Agent    │  ← Usuario hace preguntas
│     Builder      │
└────────┬─────────┘
         │ HTTPS (OpenAPI/Actions)
         ↓
┌──────────────────┐
│   API Vercel     │  ← 100% Serverless en la nube
│   /api/jobs/*    │  ← Sin servidores locales
└────────┬─────────┘
         │ Fetch XML
         ↓
┌──────────────────┐
│  Turijobs Feed   │  ← Feed XML público
└──────────────────┘
```

**Ventajas:**
- ✅ 100% en la nube (sin necesidad de tu computadora)
- ✅ Escalable automáticamente
- ✅ Actualizaciones automáticas con Cron Jobs
- ✅ Disponible 24/7
- ✅ Sin mantenimiento de servidores

---

## 📦 Paso 1: Deploy en Vercel

### 1.1 Instalar Vercel CLI

```bash
npm install -g vercel
```

### 1.2 Deploy

```bash
vercel
```

Sigue las instrucciones. Al finalizar obtendrás una URL como:
```
https://tu-proyecto.vercel.app
```

### 1.3 Configurar Vercel KV (Base de datos)

1. Ve a tu [Dashboard de Vercel](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Storage** → **Create Database**
4. Selecciona **KV (Key-Value)**
5. Conéctalo a tu proyecto

---

## 🔧 Paso 2: Verificar que la API funciona

### 2.1 Probar el OpenAPI spec

Visita en tu navegador:
```
https://tu-proyecto.vercel.app/api/actions
```

Deberías ver un JSON con la especificación OpenAPI.

### 2.2 Inicializar el caché

Visita:
```
https://tu-proyecto.vercel.app/api/jobs/refresh
```

Deberías ver:
```json
{
  "success": true,
  "total_jobs": 1247,
  "timestamp": "2025-10-25T10:30:00.000Z",
  "message": "Ofertas actualizadas correctamente"
}
```

### 2.3 Verificar estado

```
https://tu-proyecto.vercel.app/api/jobs/status
```

### 2.4 Probar búsqueda

```
https://tu-proyecto.vercel.app/api/jobs/search?query=chef&location=madrid&limit=5
```

---

## 🤖 Paso 3: Configurar OpenAI Agent Builder

### 3.1 Crear un nuevo agente

1. Ve a [OpenAI Platform](https://platform.openai.com/)
2. Navega a **Agents** o **Assistants**
3. Click en **Create Agent** o **New Assistant**

### 3.2 Configurar información básica

- **Name**: `Asistente de Turijobs`
- **Model**: `gpt-4o` o `gpt-4-turbo`
- **Instructions** (System Prompt):

```
Eres un asistente especializado en búsqueda de empleo del sector turístico español.

Tienes acceso a ofertas de trabajo reales de Turijobs.com a través de 3 acciones:

1. **checkCacheStatus**: SIEMPRE llama a esta acción primero para verificar que las ofertas estén actualizadas.

2. **refreshJobs**: Usa esta acción si el caché está vacío o desactualizado (más de 24 horas).

3. **searchJobs**: Busca ofertas con parámetros opcionales:
   - query: puesto o palabra clave (ej: "chef", "recepcionista", "camarero")
   - location: ciudad o región (ej: "Madrid", "Barcelona", "Islas Baleares")
   - category: tipo de puesto (ej: "Cocina", "Sala", "Recepción")
   - limit: cantidad de resultados (default: 10, máx: 100)

**Flujo de trabajo recomendado:**
1. Al iniciar cualquier búsqueda, verificar estado con checkCacheStatus
2. Si el caché está desactualizado o vacío, ejecutar refreshJobs
3. Buscar ofertas con searchJobs según los criterios del usuario
4. Presentar los resultados de forma clara y profesional

**Formato de presentación:**
Cuando muestres ofertas, incluye:
- ✨ Título del puesto destacado
- 🏢 Nombre de la empresa
- 📍 Ubicación (ciudad y región)
- 💼 Categoría del puesto
- 💰 Salario (si está disponible)
- ⏰ Tipo de jornada
- 📝 Breve descripción
- 🔗 Enlace para ver detalles
- ✅ Enlace para aplicar

**Tono:** Profesional pero cercano, como un orientador laboral experto en el sector turístico.

Si el usuario pregunta por ofertas sin especificar bien los criterios, ayúdale a refinar su búsqueda haciendo preguntas sobre:
- Tipo de puesto que busca
- Ubicación preferida
- Experiencia previa
- Disponibilidad (jornada completa, parcial, etc.)
```

### 3.3 Agregar Actions (Custom Actions)

1. En la configuración del agente, busca **Actions** o **Add Action**
2. Click en **Import from URL** o **Add OpenAPI Schema**
3. Ingresa la URL:
   ```
   https://tu-proyecto.vercel.app/api/actions
   ```
4. Click en **Import** o **Fetch Schema**

OpenAI debería detectar automáticamente las 3 acciones:
- ✅ `checkCacheStatus` - Verificar estado del caché
- ✅ `refreshJobs` - Actualizar ofertas
- ✅ `searchJobs` - Buscar ofertas

### 3.4 Configurar Authentication (Opcional)

Si quieres agregar seguridad:
- **Authentication**: None (para empezar)
- Más adelante puedes agregar API Keys si lo necesitas

### 3.5 Guardar y activar

Click en **Save** o **Create Agent**

---

## 🧪 Paso 4: Probar el Agente

### Prueba 1: Búsqueda básica

```
Usuario: Hola, busco trabajo de chef en Madrid
```

El agente debería:
1. ✅ Llamar a `checkCacheStatus`
2. ✅ Llamar a `searchJobs` con `query="chef"` y `location="Madrid"`
3. ✅ Mostrar resultados formateados

### Prueba 2: Búsqueda con filtros

```
Usuario: ¿Qué ofertas hay de recepcionista en hoteles de Barcelona?
```

El agente debería buscar con `query="recepcionista"` y `location="Barcelona"`

### Prueba 3: Actualización de caché

```
Usuario: Actualiza las ofertas por favor
```

El agente debería:
1. ✅ Llamar a `refreshJobs`
2. ✅ Confirmar cuántas ofertas se descargaron

### Prueba 4: Búsqueda amplia

```
Usuario: Muéstrame las últimas 20 ofertas de trabajo en Islas Canarias
```

El agente debería usar `location="Canarias"` y `limit="20"`

---

## ⚙️ Paso 5: Configuración Avanzada (Opcional)

### 5.1 Agregar API Key para seguridad

1. Crea un archivo `.env` en tu proyecto:
```bash
API_SECRET_KEY=tu_clave_secreta_aqui
```

2. Modifica los endpoints para validar la key (si lo deseas)

3. En OpenAI Agent Builder:
   - **Authentication**: API Key
   - **Header Name**: `X-API-Key`
   - **API Key**: Tu clave secreta

### 5.2 Configurar límites de rate

En `vercel.json`:
```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10,
      "rateLimit": {
        "requests": 100,
        "period": "1m"
      }
    }
  }
}
```

### 5.3 Monitoreo y logs

En tu Dashboard de Vercel:
- Ve a **Analytics** para ver uso
- Ve a **Logs** para debugging
- Configura **Alertas** si hay errores

---

## 📊 Características Production-Ready

### ✅ Auto-scaling
Vercel escala automáticamente según la demanda. No necesitas configurar nada.

### ✅ Actualizaciones automáticas
El Cron Job en `vercel.json` actualiza las ofertas cada día a las 6 AM UTC:
```json
{
  "crons": [
    {
      "path": "/api/jobs/refresh",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### ✅ Caché inteligente
Las ofertas se cachean en Vercel KV por 48 horas para máxima velocidad.

### ✅ Manejo de errores
La API maneja errores gracefully y guarda metadata de errores.

---

## 🔍 Troubleshooting

### Problema: "Actions not working"

**Causa:** El OpenAPI spec no se importó correctamente.

**Solución:**
1. Verifica que `https://tu-proyecto.vercel.app/api/actions` responda
2. Copia manualmente el JSON de `/api/actions/openapi.json` y pégalo en OpenAI
3. Asegúrate que la URL del servidor apunte a tu dominio de Vercel

### Problema: "Caché vacío"

**Causa:** No se han descargado ofertas aún.

**Solución:**
```bash
curl https://tu-proyecto.vercel.app/api/jobs/refresh
```

### Problema: "No se encuentra el endpoint"

**Causa:** Deploy incompleto o rutas incorrectas.

**Solución:**
1. Verifica que todos los archivos estén en las rutas correctas:
   ```
   api/
   ├── actions/
   │   ├── index.js
   │   └── openapi.json
   └── jobs/
       ├── refresh.js
       ├── search.js
       └── status.js
   ```
2. Haz redeploy: `vercel --prod`

### Problema: "KV not configured"

**Causa:** Vercel KV no está conectado.

**Solución:**
1. Ve a Vercel Dashboard → Storage → Create KV Database
2. Conéctalo a tu proyecto
3. Redeploy

---

## 🎯 Ejemplo de Conversación

```
Usuario: Hola, busco trabajo de cocinero en Málaga

Agente: 
[Ejecuta checkCacheStatus]
[Ejecuta searchJobs(query="cocinero", location="Málaga", limit=10)]

¡Hola! He encontrado 8 ofertas de cocinero en Málaga. Aquí te muestro las más relevantes:

✨ **1. Cocinero/a de Restaurante Mediterráneo**
🏢 Restaurante El Pimpi
📍 Málaga, Andalucía
💼 Categoría: Cocina
💰 Salario: 1.600€ - 1.900€
⏰ Jornada completa

📝 Se busca cocinero con experiencia en cocina mediterránea...

🔗 **Ver oferta completa:** https://www.turijobs.com/oferta/...
✅ **Aplicar directamente:** https://www.turijobs.com/apply/...

──────────────────────────────────────────────────

✨ **2. Jefe de Cocina - Hotel 4 Estrellas**
🏢 Hotel Costa del Sol
📍 Torremolinos, Málaga
💼 Categoría: Cocina
💰 Salario: 2.200€ - 2.800€
⏰ Jornada completa

📝 Buscamos jefe de cocina con mínimo 5 años de experiencia...

🔗 **Ver oferta completa:** https://www.turijobs.com/oferta/...
✅ **Aplicar directamente:** https://www.turijobs.com/apply/...

──────────────────────────────────────────────────

📌 Hay 6 ofertas más de cocinero en Málaga. ¿Te gustaría verlas todas o filtrar por algo más específico?
```

---

## 📚 Recursos Adicionales

- **OpenAI Actions Docs**: https://platform.openai.com/docs/actions
- **OpenAPI Specification**: https://swagger.io/specification/
- **Vercel Docs**: https://vercel.com/docs
- **Vercel KV Docs**: https://vercel.com/docs/storage/vercel-kv

---

## 🎉 ¡Todo listo para producción!

Tu agente ahora:
- ✅ Funciona 24/7 sin necesidad de tu computadora
- ✅ Es 100% serverless y escalable
- ✅ Se actualiza automáticamente cada día
- ✅ Responde en lenguaje natural
- ✅ Busca entre miles de ofertas reales
- ✅ Es production-ready

**¡Sin servidores locales, sin complicaciones!** 🚀✨

