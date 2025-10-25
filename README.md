# 🚀 Job Search API + Agente de Turijobs

API serverless para buscar ofertas de empleo del sector turístico de Turijobs.com + integración lista para OpenAI Agent Builder.

---

## 🎯 Dos formas de usar este proyecto

### 1️⃣ **API REST directa** (desarrolladores)
Usa los endpoints HTTP para integrar en tus aplicaciones.

### 2️⃣ **Agente Conversacional** (OpenAI Agent Builder) ⭐ **RECOMENDADO**
Crea un asistente de IA que responde preguntas en lenguaje natural.

👉 **[Ver guía de configuración del agente →](./OPENAI_PRODUCTION_SETUP.md)**

---

## 🏗️ Arquitectura

```
OpenAI Agent Builder (100% cloud, sin servidores locales)
         ↓
API Vercel (serverless) → Turijobs XML Feed
         ↓
Vercel KV (caché)
```

---

## 📡 Endpoints de la API

### `GET /api/jobs/status`
Verifica el estado del caché.

**Response:**
```json
{
  "cached": true,
  "status": "success",
  "metadata": { ... },
  "cache_age": { "hours": 2.5, "is_expired": false }
}
```

### `GET /api/jobs/refresh`
Actualiza el caché descargando el feed XML.

**Response:**
```json
{
  "success": true,
  "total_jobs": 1247,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### `GET /api/jobs/search`
Busca ofertas con filtros.

**Parámetros:**
- `query` - Término de búsqueda (título, empresa, descripción)
- `location` - Ciudad o región
- `category` - Categoría del puesto
- `limit` - Máximo de resultados (default: 10)

**Ejemplo:**
```
GET /api/jobs/search?query=chef&location=madrid&limit=5
```

**Response:**
```json
{
  "success": true,
  "total_matches": 23,
  "returned_results": 5,
  "results": [ ... ]
}
```

### `GET /api/actions`
Devuelve el OpenAPI schema para OpenAI Agent Builder.

---

## 🚀 Quick Start

### Paso 1: Deploy en Vercel

```bash
# Instalar CLI
npm install -g vercel

# Deploy
vercel

# Configurar Vercel KV
# Ve a Vercel Dashboard → Storage → Create KV Database
```

### Paso 2: Inicializar caché

Visita en tu navegador:
```
https://tu-proyecto.vercel.app/api/jobs/refresh
```

### Paso 3: Probar búsqueda

```
https://tu-proyecto.vercel.app/api/jobs/search?query=chef&location=madrid
```

---

## 🤖 Configurar Agente de IA (Production-Ready)

**👉 Lee la guía completa:** [OPENAI_PRODUCTION_SETUP.md](./OPENAI_PRODUCTION_SETUP.md)

### Resumen rápido:

1. **Deploy en Vercel** (paso anterior)
2. **Ir a OpenAI Platform** → Agents → Create Agent
3. **Agregar Action**:
   - Import from URL: `https://tu-proyecto.vercel.app/api/actions`
4. **Configurar System Prompt** (ver guía)
5. **¡Listo!** Tu agente puede responder preguntas sobre ofertas de Turijobs

**Características:**
- ✅ 100% serverless (sin servidor local)
- ✅ Disponible 24/7
- ✅ Actualizaciones automáticas cada día
- ✅ Responde en lenguaje natural
- ✅ Production-ready

---

## ⏰ Actualización automática

El Cron Job en `vercel.json` actualiza el caché cada día a las 6 AM UTC:

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

---

## 📁 Estructura del Proyecto

```
job-search-api/
├── api/
│   ├── actions/
│   │   ├── index.js              # ⭐ Endpoint OpenAPI
│   │   └── openapi.json          # ⭐ Schema para OpenAI
│   └── jobs/
│       ├── refresh.js            # Descarga y cachea ofertas
│       ├── search.js             # Busca con filtros
│       └── status.js             # Estado del caché
│
├── mcp-server.js                 # (Solo para Claude Desktop)
├── package.json
├── vercel.json
│
├── README.md                     # Este archivo
├── OPENAI_PRODUCTION_SETUP.md   # 📖 Guía principal
└── README_AGENTE.md             # Documentación técnica
```

---

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev

# Servidor disponible en http://localhost:3000
```

---

## 🐛 Troubleshooting

### "Caché vacío"
**Solución:** Visita `/api/jobs/refresh` para descargar ofertas

### "KV not configured"
**Solución:** Crea un Vercel KV en tu dashboard y conéctalo al proyecto

### "Actions not working en OpenAI"
**Solución:** Verifica que `/api/actions` devuelva el JSON correctamente

---

## 📚 Documentación

- **[OPENAI_PRODUCTION_SETUP.md](./OPENAI_PRODUCTION_SETUP.md)** - Configuración completa del agente ⭐
- **[README_AGENTE.md](./README_AGENTE.md)** - Detalles técnicos de la arquitectura
- **[OPENAI_AGENT_SETUP.md](./OPENAI_AGENT_SETUP.md)** - Setup con MCP local (alternativa)

---

## 🎉 Ejemplos de Uso

### Como API REST

```bash
curl "https://tu-proyecto.vercel.app/api/jobs/search?query=recepcionista&location=barcelona&limit=5"
```

### Como Agente Conversacional

```
Usuario: Hola, busco trabajo de chef en Madrid

Agente: ¡Hola! He encontrado 15 ofertas de chef en Madrid.
Aquí te muestro las más relevantes:

1. Chef de Partida - Restaurante Botín
   📍 Madrid Centro
   💰 2.000€ - 2.400€
   🔗 Ver oferta: [link]
   ...
```

---

## 📞 Soporte

- **Issues**: Abre un issue en GitHub
- **Documentación**: Lee las guías en `/docs`
- **Vercel**: https://vercel.com/docs

---

## 🔑 Requisitos

- Node.js 18+
- Cuenta de Vercel (gratuita)
- Vercel KV database (gratuita en tier Hobby)

---

**¡Listo para producción! 🚀** Sin servidores locales, sin complicaciones.
