# 🤖 Agente de Ofertas de Turijobs

Sistema completo para crear un agente conversacional que recomienda ofertas de trabajo del sector turístico usando datos reales de Turijobs.com.

---

## 🏗️ Arquitectura

```
┌──────────────────┐
│  OpenAI Agent    │  ← Usuario hace preguntas
│     Builder      │
└────────┬─────────┘
         │ MCP Protocol (stdio)
         ↓
┌──────────────────┐
│  MCP Server      │  ← Servidor local (mcp-server.js)
│   (Local Node)   │
└────────┬─────────┘
         │ HTTP Requests
         ↓
┌──────────────────┐
│   API Vercel     │  ← API serverless en la nube
│   /api/jobs/*    │
└────────┬─────────┘
         │ Fetch XML
         ↓
┌──────────────────┐
│  Turijobs Feed   │  ← Feed XML con ofertas activas
│   (XML Público)  │
└──────────────────┘
```

---

## 📁 Estructura del Proyecto

```
job-search-api/
├── api/                           # API Serverless (Vercel)
│   ├── jobs/
│   │   ├── refresh.js            # Descarga y cachea ofertas del XML
│   │   ├── search.js             # Busca ofertas con filtros
│   │   └── status.js             # Verifica estado del caché
│   └── mcp/
│       └── index.js              # (Antiguo endpoint HTTP - ya no se usa)
│
├── mcp-server.js                 # ⭐ Servidor MCP local (nuevo)
├── package.json                  # Dependencias + script 'npm run mcp'
├── vercel.json                   # Configuración Vercel + Cron
│
├── README.md                     # Documentación de la API
├── OPENAI_AGENT_SETUP.md        # 📖 Guía de configuración (ver esto primero)
└── README_AGENTE.md             # Este archivo
```

---

## 🚀 Cómo funciona

### 1️⃣ **API en Vercel** (Backend Cloud)

La API descarga, procesa y cachea ofertas de Turijobs:

- **`/api/jobs/refresh`**: Descarga el XML de Turijobs, parsea las ofertas y las guarda en Vercel KV
- **`/api/jobs/search`**: Busca ofertas en el caché con filtros (query, location, category, limit)
- **`/api/jobs/status`**: Verifica si el caché está actualizado

**Ventajas:**
- ✅ Cron job diario (actualiza automáticamente a las 6 AM)
- ✅ Caché rápido con Vercel KV
- ✅ Serverless (escala automáticamente)

### 2️⃣ **Servidor MCP Local** (Puente con OpenAI)

El archivo `mcp-server.js` es un servidor que:
- Se ejecuta localmente en tu computadora
- Implementa el protocolo MCP (Model Context Protocol)
- Se comunica con OpenAI Agent Builder usando **stdio** (entrada/salida estándar)
- Hace peticiones HTTP a tu API en Vercel

**Herramientas que expone:**
1. `check_cache_status` → Verifica si hay ofertas cacheadas
2. `refresh_jobs` → Fuerza actualización del caché
3. `search_jobs` → Busca ofertas con filtros

### 3️⃣ **Agente en OpenAI** (Frontend Conversacional)

OpenAI Agent Builder:
- Recibe preguntas del usuario en lenguaje natural
- Decide qué herramientas llamar (check_cache_status, search_jobs, etc.)
- Formatea las respuestas de forma amigable

---

## ⚙️ Setup Rápido

### Paso 1: Deploy de la API

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configurar Vercel KV (después del primer deploy)
# Ve a tu dashboard de Vercel → Storage → Create KV Database
```

### Paso 2: Instalar dependencias locales

```bash
npm install
```

Esto instala:
- `@modelcontextprotocol/sdk` → Para el servidor MCP local
- `fast-xml-parser` → Para parsear el XML
- `@vercel/kv` → Para el caché en Vercel

### Paso 3: Configurar URL de la API

Edita `mcp-server.js` (línea 13) o crea un `.env`:

```bash
API_BASE_URL=https://tu-proyecto.vercel.app
```

### Paso 4: Probar el servidor MCP

```bash
npm run mcp
```

Deberías ver:
```
[MCP] Iniciando servidor Turijobs MCP...
[MCP] API Base URL: https://tu-proyecto.vercel.app
[MCP] Servidor conectado y listo
```

### Paso 5: Conectar con OpenAI Agent Builder

**Lee la guía completa:** [`OPENAI_AGENT_SETUP.md`](./OPENAI_AGENT_SETUP.md)

Resumen:
1. Ve a [OpenAI Agent Builder](https://platform.openai.com/agents)
2. Agrega un MCP Server con:
   - Command: `node` (o `npm`)
   - Args: ruta a `mcp-server.js` (o `run mcp`)
   - Environment: `API_BASE_URL=https://tu-proyecto.vercel.app`

---

## 💬 Ejemplos de Uso

### Conversación de ejemplo 1:

```
Usuario: "Hola, busco ofertas de chef en Barcelona"

Agente:
1. check_cache_status()     → ✅ Caché actualizado (2.3 horas)
2. search_jobs(query="chef", location="Barcelona", limit=50)

Respuesta:
"¡Hola! He encontrado 12 ofertas de chef en Barcelona:

1. **Chef de Partida - Cocina Mediterránea**
   🏢 Hotel Arts Barcelona
   📍 Barcelona, Cataluña
   💰 2.000€ - 2.500€
   ⏰ Jornada completa
   🔗 Ver: [enlace]
   ✅ Aplicar: [enlace]

..."
```

### Conversación de ejemplo 2:

```
Usuario: "¿Qué trabajo hay en hoteles de Málaga?"

Agente:
1. check_cache_status()     → ⚠️ Caché desactualizado (28 horas)
2. refresh_jobs()           → ✅ Actualizadas 1.543 ofertas
3. search_jobs(query="hotel", location="Málaga", limit=50)

Respuesta:
"Acabo de actualizar las ofertas. Encontré 18 puestos en hoteles de Málaga:

1. **Recepcionista de Hotel 5 Estrellas**
   🏢 Marriott Málaga
   📍 Málaga, Andalucía
   ..."
```

---

## 🔧 Mantenimiento

### Actualizar ofertas manualmente

```bash
# Desde el navegador
https://tu-proyecto.vercel.app/api/jobs/refresh

# Desde terminal
curl https://tu-proyecto.vercel.app/api/jobs/refresh
```

### Ver estado del caché

```bash
https://tu-proyecto.vercel.app/api/jobs/status
```

### Buscar ofertas directamente (sin agente)

```bash
https://tu-proyecto.vercel.app/api/jobs/search?query=chef&location=madrid&limit=10
```

---

## 🐛 Resolución de Problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| "Caché vacío" | No se han descargado ofertas | Visita `/api/jobs/refresh` |
| "API endpoint failed" | API no responde | Verifica que Vercel esté activo |
| "Cannot find module" | Falta SDK de MCP | Ejecuta `npm install` |
| Agente no ve herramientas | Ruta incorrecta | Verifica ruta absoluta a `mcp-server.js` |

---

## 📊 Datos de las Ofertas

Cada oferta incluye:

```json
{
  "id": "12345",
  "titulo": "Chef de Partida",
  "empresa": "Hotel Arts Barcelona",
  "ciudad": "Barcelona",
  "region": "Cataluña",
  "pais_id": "ES",
  "categoria": "Cocina",
  "salario": "2.000€ - 2.500€",
  "tipo_jornada": "Jornada completa",
  "descripcion": "...",
  "url": "https://www.turijobs.com/oferta/...",
  "url_aplicar": "https://www.turijobs.com/apply/...",
  "fecha_publicacion": "2025-10-20",
  "num_vacantes": "2"
}
```

---

## 🎯 Flujo Recomendado para el Agente

```
┌────────────────────────────────────┐
│  Usuario hace pregunta             │
└──────────────┬─────────────────────┘
               ↓
┌────────────────────────────────────┐
│  1. check_cache_status()           │
│     ¿Caché actualizado?            │
└──────────────┬─────────────────────┘
               ↓
        ┌──────┴──────┐
        │             │
        NO            SÍ
        │             │
        ↓             ↓
┌───────────────┐  ┌─────────────────┐
│ 2. refresh    │  │ 3. search_jobs()│
│    _jobs()    │  │    con filtros  │
└───────┬───────┘  └────────┬────────┘
        │                   │
        └──────────┬────────┘
                   ↓
        ┌────────────────────┐
        │ 4. Formatear       │
        │    respuesta       │
        └────────────────────┘
```

---

## 📚 Recursos

- **Documentación API**: [`README.md`](./README.md)
- **Guía de Setup**: [`OPENAI_AGENT_SETUP.md`](./OPENAI_AGENT_SETUP.md)
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Vercel Docs**: https://vercel.com/docs
- **OpenAI Agent Builder**: https://platform.openai.com/docs/agents

---

## 🎉 ¡Listo para usar!

Tu agente ya puede:
- ✅ Responder consultas en lenguaje natural
- ✅ Buscar entre miles de ofertas reales
- ✅ Filtrar por ubicación, categoría y palabras clave
- ✅ Actualizar automáticamente el catálogo
- ✅ Proporcionar enlaces directos para aplicar

**¡Pregúntale lo que quieras sobre trabajos en turismo!** 🌍✨

