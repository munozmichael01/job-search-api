# 🔄 Actualización de Ofertas - Turijobs API

## ⏰ Configuración Actual

### Cron Jobs de Vercel
- **Frecuencia**: 2 veces al día
- **Horarios**: 
  - 🌅 **6:00 AM UTC** (8:00 AM España)
  - 🌆 **6:00 PM UTC** (8:00 PM España)
- **Endpoint**: `/api/jobs/refresh`
- **Cron Expression**: `0 6,18 * * *`

### Estrategia de Caché

#### ✅ **Entre Actualizaciones (6 AM - 6 PM y 6 PM - 6 AM)**
- El asistente usa el caché de Vercel KV
- No se hacen llamadas al feed XML de Turijobs
- Respuesta instantánea
- Edad del caché visible con `checkCacheStatus`

#### 🔄 **Durante Actualización (6 AM y 6 PM)**
- Vercel ejecuta automáticamente `/api/jobs/refresh`
- Descarga el feed XML completo
- Parsea ~2,000+ ofertas
- Actualiza Vercel KV
- Marca timestamp de última actualización

#### ⚠️ **Si el Caché Expira**
El asistente verifica la edad del caché antes de cada búsqueda:
- Si edad < 24 horas → Usa caché
- Si edad > 24 horas → Llama a `refreshJobs` automáticamente

---

## 📊 Endpoints Relacionados

### 1. **Status del Caché**
```bash
GET /api/jobs/status
```

Respuesta:
```json
{
  "cached": true,
  "status": "success",
  "metadata": {
    "last_update": "2025-10-25T06:00:00.000Z",
    "total_jobs": 2132
  },
  "cache_age": {
    "hours": 4,
    "is_expired": false
  },
  "recommendation": "El caché está actualizado"
}
```

### 2. **Refresh Manual**
```bash
GET /api/jobs/refresh
```

Respuesta:
```json
{
  "success": true,
  "total_jobs": 2132,
  "timestamp": "2025-10-25T14:30:00.000Z",
  "message": "Ofertas actualizadas correctamente"
}
```

### 3. **Búsqueda (usa caché)**
```bash
GET /api/jobs/search?query=chef&location=madrid&limit=10
```

---

## 🛠️ Modificar Horarios

### Cambiar a 3 veces al día:
```json
{
  "crons": [
    {
      "path": "/api/jobs/refresh",
      "schedule": "0 6,12,18 * * *"
    }
  ]
}
```

### Cambiar a cada 6 horas:
```json
{
  "crons": [
    {
      "path": "/api/jobs/refresh",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Solo una vez al día (6 AM):
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

## 🔍 Verificar Cron Jobs en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto: `job-search-api-psi`
3. Ve a **Settings** → **Cron Jobs**
4. Verás: `0 6,18 * * *` → `/api/jobs/refresh`

---

## 📈 Monitoreo

### Ver logs de actualización:
```bash
vercel logs --since 1d | grep refresh
```

### Forzar actualización manual:
```bash
curl https://job-search-api-psi.vercel.app/api/jobs/refresh
```

---

## ⚡ Performance

- **Caché hit**: ~50ms
- **Refresh (actualización completa)**: ~5-10s
- **TTL recomendado**: 12 horas (se actualiza cada 12h)
- **Storage**: ~2MB en Vercel KV (2,000+ ofertas)

---

## 🎯 Flujo del Asistente

```
Usuario pregunta por ofertas
        ↓
checkCacheStatus()
        ↓
    ¿Caché válido?
    ├─ SÍ → searchJobs() → Respuesta
    └─ NO → refreshJobs() → searchJobs() → Respuesta
```

---

**Última actualización**: 25 Oct 2025
**Horarios**: 6 AM y 6 PM UTC (8 AM y 8 PM España)

