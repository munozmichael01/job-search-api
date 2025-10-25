# 🤖 Configuración para OpenAI Agent Builder

Esta guía te ayudará a configurar el agente de Turijobs con OpenAI Agent Builder.

## 📋 Prerrequisitos

1. ✅ Tu API debe estar desplegada en Vercel
2. ✅ El Vercel KV debe estar configurado
3. ✅ Node.js instalado localmente (v18 o superior)

---

## 🚀 Paso 1: Instalar dependencias

```bash
npm install
```

Esto instalará el SDK de MCP (`@modelcontextprotocol/sdk`) y las demás dependencias.

---

## 🔧 Paso 2: Configurar la URL de tu API

Edita el archivo `mcp-server.js` y cambia la línea:

```javascript
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
```

Por tu URL de Vercel:

```javascript
const API_BASE_URL = process.env.API_BASE_URL || 'https://tu-proyecto.vercel.app';
```

**O mejor aún**, crea un archivo `.env`:

```bash
API_BASE_URL=https://tu-proyecto.vercel.app
```

---

## 🧪 Paso 3: Probar el servidor MCP localmente

Ejecuta:

```bash
npm run mcp
```

Deberías ver:

```
[MCP] Iniciando servidor Turijobs MCP...
[MCP] API Base URL: https://tu-proyecto.vercel.app
[MCP] Servidor conectado y listo
```

Si ves esto, ¡tu servidor MCP está funcionando! Presiona `Ctrl+C` para detenerlo.

---

## 🤝 Paso 4: Conectar con OpenAI Agent Builder

### Opción A: Usando el Ejecutable Local

1. Ve a [OpenAI Agent Builder](https://platform.openai.com/agents)
2. Crea un nuevo agente o edita uno existente
3. En la sección **"Add MCP Server"** o **"Integrations"**:
   - **Server Type**: Local/Custom MCP Server
   - **Command**: `node`
   - **Args**: Ruta completa a tu `mcp-server.js`
     - Windows: `C:\Dev\job-search-api\mcp-server.js`
     - Mac/Linux: `/Users/tuusuario/job-search-api/mcp-server.js`
   - **Environment Variables**:
     ```
     API_BASE_URL=https://tu-proyecto.vercel.app
     ```

### Opción B: Usando npm script

1. En OpenAI Agent Builder:
   - **Command**: `npm`
   - **Args**: `run mcp`
   - **Working Directory**: Ruta completa a `C:\Dev\job-search-api`
   - **Environment Variables**:
     ```
     API_BASE_URL=https://tu-proyecto.vercel.app
     ```

---

## 📝 Paso 5: Configurar el System Prompt del Agente

En OpenAI Agent Builder, configura el **System Prompt** de tu agente:

```
Eres un asistente especializado en búsqueda de empleo en el sector turístico español.

Tienes acceso a ofertas de trabajo reales de Turijobs.com a través de 3 herramientas:

1. **check_cache_status**: SIEMPRE llama a esta herramienta primero para verificar que las ofertas estén actualizadas.

2. **refresh_jobs**: Usa esta herramienta si el caché está vacío o desactualizado (más de 24 horas).

3. **search_jobs**: Busca ofertas con filtros:
   - query: puesto o palabra clave (ej: "chef", "recepcionista", "camarero")
   - location: ciudad o región (ej: "Madrid", "Barcelona", "Islas Baleares")
   - category: tipo de puesto (ej: "Cocina", "Sala", "Recepción")
   - limit: cantidad de resultados (default: 50)

**Flujo recomendado:**
1. Verificar estado del caché con check_cache_status
2. Si está desactualizado o vacío, ejecutar refresh_jobs
3. Buscar ofertas con search_jobs según la consulta del usuario
4. Presentar los resultados de forma clara y natural

**Tono:** Profesional pero cercano, como un orientador laboral experto en turismo.

Cuando presentes ofertas, destaca:
- Título del puesto
- Empresa
- Ubicación
- Salario (si está disponible)
- Enlaces para ver más detalles y aplicar
```

---

## ✅ Paso 6: Probar el Agente

Prueba con estas preguntas:

1. **"Hola, ¿qué ofertas de chef hay en Madrid?"**
   - El agente debería: verificar caché → buscar → mostrar resultados

2. **"Busco trabajo de recepcionista en hoteles de Barcelona"**
   - El agente aplicará filtros de query y location

3. **"¿Qué ofertas hay en Islas Canarias?"**
   - Búsqueda por ubicación

4. **"Actualiza las ofertas"**
   - El agente ejecutará refresh_jobs

---

## 🐛 Troubleshooting

### Error: "Cannot find module @modelcontextprotocol/sdk"

**Solución:**
```bash
npm install
```

### Error: "API endpoint failed"

**Causa:** Tu API de Vercel no está respondiendo.

**Solución:**
1. Verifica que tu API esté desplegada: visita `https://tu-proyecto.vercel.app/api/jobs/status`
2. Verifica que la variable `API_BASE_URL` esté correctamente configurada

### Error: "Caché vacío"

**Causa:** No se han descargado ofertas aún.

**Solución:**
1. Ve a `https://tu-proyecto.vercel.app/api/jobs/refresh` en tu navegador
2. O dile al agente: "Actualiza las ofertas"

### El agente no encuentra las herramientas

**Causa:** El servidor MCP no se está ejecutando correctamente.

**Solución:**
1. Prueba ejecutar `npm run mcp` manualmente y verifica que no haya errores
2. Verifica que la ruta completa al archivo `mcp-server.js` sea correcta
3. En Windows, usa rutas absolutas con `\` o `/`: `C:/Dev/job-search-api/mcp-server.js`

---

## 🎯 Herramientas disponibles para el agente

| Herramienta | Descripción | Parámetros |
|-------------|-------------|------------|
| `check_cache_status` | Verifica estado del caché | Ninguno |
| `refresh_jobs` | Actualiza ofertas desde XML | Ninguno |
| `search_jobs` | Busca ofertas con filtros | query, location, category, limit |

---

## 📞 Soporte

Si tienes problemas:

1. **Verifica logs del servidor MCP**: Cuando ejecutas `npm run mcp`, aparecen logs en stderr
2. **Prueba la API directamente**: Visita los endpoints en tu navegador
3. **Verifica la configuración**: Asegúrate que `API_BASE_URL` apunte a tu Vercel app

---

## 🎉 ¡Listo!

Tu agente ya puede:
- ✅ Consultar ofertas de trabajo reales de Turijobs
- ✅ Filtrar por ubicación, categoría y palabras clave
- ✅ Actualizar el catálogo de ofertas
- ✅ Responder en lenguaje natural

**Ejemplo de conversación:**

```
Usuario: Hola, busco trabajo de cocinero en Madrid

Agente: 
[llama a check_cache_status]
[llama a search_jobs con query="cocinero" y location="Madrid"]

¡Hola! He encontrado 15 ofertas de cocinero en Madrid. Aquí te muestro las más relevantes:

1. **Cocinero/a - Especialidad Italiana**
   🏢 Restaurante Da Vinci
   📍 Madrid Centro
   💰 Salario: 1.800€ - 2.200€
   🔗 Ver oferta: [enlace]
   ✅ Aplicar: [enlace]

...
```

