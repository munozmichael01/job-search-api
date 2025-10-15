# Job Search API

API serverless para búsqueda de ofertas de empleo del sector turístico.

## 🚀 Endpoints

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

## 📦 Deploy en Vercel

1. Instalar Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

## ⏰ Actualización automática

El Cron Job en `vercel.json` actualiza el caché cada día a las 6 AM UTC.

## 🔑 Configuración requerida

- Vercel KV debe estar habilitado en tu proyecto
- En Vercel Dashboard → Storage → Create KV Database
