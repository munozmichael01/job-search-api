# Instrucciones para Claude Code - Job Search API

## 📋 Objetivo
Crear una API serverless en Vercel que descargue, cachee y permita buscar ofertas de empleo desde un feed XML.

## 📁 Ruta de trabajo
Trabaja en esta ruta: `[USUARIO: INSERTA TU RUTA AQUÍ]`

Ejemplo: `/Users/tuusuario/projects/job-search-api` o `C:\Users\tuusuario\projects\job-search-api`

---

## 🏗️ Estructura del proyecto a crear

```
job-search-api/
├── api/
│   └── jobs/
│       ├── refresh.js
│       ├── search.js
│       └── status.js
├── package.json
├── vercel.json
├── .gitignore
└── README.md
```

---

## 📝 Archivos a crear

### 1. `package.json`

```json
{
  "name": "job-search-api",
  "version": "1.0.0",
  "description": "API serverless para búsqueda de ofertas de empleo",
  "type": "module",
  "scripts": {
    "dev": "vercel dev"
  },
  "dependencies": {
    "@vercel/kv": "^1.0.1",
    "fast-xml-parser": "^4.3.5"
  },
  "devDependencies": {
    "vercel": "^33.0.0"
  }
}
```

---

### 2. `api/jobs/refresh.js`

Este endpoint descarga el XML, lo parsea y lo guarda en Vercel KV.

```javascript
import { XMLParser } from 'fast-xml-parser';
import { kv } from '@vercel/kv';

const XML_FEED_URL = "https://feed.turijobs.com/partner/files/774E13F3-9D57-4BD6-920D-3A79A70C6AA2/E9753D5A-0F05-4444-9210-9D02EB15C7D5";

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📥 Descargando ofertas del feed XML...');
    
    // Descargar XML con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
    
    const response = await fetch(XML_FEED_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'JobSearchBot/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    console.log(`📄 XML descargado: ${xmlText.length} caracteres`);
    
    // Parsear XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "_text",
      parseAttributeValue: true
    });
    
    const result = parser.parse(xmlText);
    
    // Extraer jobs (puede estar en result.jobs.job o result.job)
    let jobsArray = [];
    if (result.jobs && result.jobs.job) {
      jobsArray = Array.isArray(result.jobs.job) ? result.jobs.job : [result.jobs.job];
    } else if (result.job) {
      jobsArray = Array.isArray(result.job) ? result.job : [result.job];
    }
    
    console.log(`📊 Jobs encontrados en XML: ${jobsArray.length}`);
    
    // Normalizar datos
    const normalizedJobs = jobsArray.map(job => {
      // Función helper para extraer texto de nodos CDATA o normales
      const getText = (field) => {
        if (!field) return '';
        if (typeof field === 'string') return field;
        if (field._text) return field._text;
        if (field['#text']) return field['#text'];
        return String(field);
      };
      
      return {
        id: getText(job.id),
        titulo: getText(job.title),
        empresa: getText(job.company),
        ciudad: getText(job.city),
        region: getText(job.region),
        pais_id: getText(job.idpais),
        categoria: getText(job.category),
        salario: getText(job.salary) || 'No especificado',
        tipo_jornada: getText(job.jobtype) || 'No especificado',
        descripcion: getText(job.content),
        url: getText(job.url),
        url_aplicar: getText(job.url_apply),
        fecha_publicacion: getText(job.publication),
        num_vacantes: getText(job.num_vacancies) || '1'
      };
    });
    
    // Crear estructura de caché
    const cacheData = {
      metadata: {
        last_update: new Date().toISOString(),
        total_jobs: normalizedJobs.length,
        status: 'success',
        feed_url: XML_FEED_URL
      },
      offers: normalizedJobs
    };
    
    // Guardar en Vercel KV (expira en 48 horas)
    await kv.set('job_offers_cache', cacheData, { ex: 172800 });
    
    console.log(`✅ ${normalizedJobs.length} ofertas almacenadas en caché`);
    
    return res.status(200).json({
      success: true,
      total_jobs: normalizedJobs.length,
      timestamp: cacheData.metadata.last_update,
      message: 'Ofertas actualizadas correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error al actualizar ofertas:', error);
    
    // Guardar error en metadata
    try {
      const errorMetadata = {
        metadata: {
          last_update: new Date().toISOString(),
          total_jobs: 0,
          status: 'error',
          error_message: error.message,
          feed_url: XML_FEED_URL
        },
        offers: []
      };
      
      await kv.set('job_offers_cache', errorMetadata, { ex: 3600 });
    } catch (kvError) {
      console.error('Error guardando metadata de error:', kvError);
    }
    
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

### 3. `api/jobs/search.js`

Este endpoint busca ofertas en el caché con filtros.

```javascript
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Leer del caché
    const cacheData = await kv.get('job_offers_cache');
    
    if (!cacheData || !cacheData.offers) {
      return res.status(404).json({ 
        error: 'cache_empty',
        message: 'No hay datos en caché. Llama primero a /api/jobs/refresh',
        metadata: cacheData?.metadata || null
      });
    }
    
    // Verificar si el caché está en estado de error
    if (cacheData.metadata.status === 'error') {
      return res.status(503).json({
        error: 'cache_error',
        message: 'El último intento de actualización falló',
        metadata: cacheData.metadata
      });
    }
    
    // Extraer parámetros de búsqueda
    const { 
      query = '', 
      location = '', 
      category = '', 
      limit = '10' 
    } = req.query;
    
    const queryLower = query.toLowerCase();
    const locationLower = location.toLowerCase();
    const categoryLower = category.toLowerCase();
    const maxResults = parseInt(limit) || 10;
    
    // Filtrar ofertas
    let results = cacheData.offers.filter(job => {
      // Filtro por query (busca en título, descripción y empresa)
      const queryMatch = !query || 
        job.titulo.toLowerCase().includes(queryLower) ||
        job.descripcion.toLowerCase().includes(queryLower) ||
        job.empresa.toLowerCase().includes(queryLower);
      
      // Filtro por ubicación (busca en ciudad y región)
      const locationMatch = !location ||
        job.ciudad.toLowerCase().includes(locationLower) ||
        job.region.toLowerCase().includes(locationLower);
      
      // Filtro por categoría
      const categoryMatch = !category ||
        job.categoria.toLowerCase().includes(categoryLower);
      
      return queryMatch && locationMatch && categoryMatch;
    });
    
    // Limitar resultados
    const totalMatches = results.length;
    results = results.slice(0, maxResults);
    
    // Calcular edad del caché
    const lastUpdate = new Date(cacheData.metadata.last_update);
    const now = new Date();
    const ageMinutes = Math.round((now - lastUpdate) / (1000 * 60));
    
    return res.status(200).json({
      success: true,
      metadata: {
        ...cacheData.metadata,
        cache_age_minutes: ageMinutes,
        query_params: { query, location, category, limit: maxResults }
      },
      total_matches: totalMatches,
      returned_results: results.length,
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
```

---

### 4. `api/jobs/status.js`

Este endpoint verifica el estado del caché.

```javascript
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Leer del caché
    const cacheData = await kv.get('job_offers_cache');
    
    if (!cacheData) {
      return res.status(200).json({
        cached: false,
        status: 'empty',
        message: 'No hay datos en caché. Ejecuta /api/jobs/refresh para inicializar.',
        metadata: null
      });
    }
    
    // Calcular edad del caché
    const lastUpdate = new Date(cacheData.metadata.last_update);
    const now = new Date();
    const ageMinutes = Math.round((now - lastUpdate) / (1000 * 60));
    const ageHours = Math.round((ageMinutes / 60) * 10) / 10;
    const isExpired = ageHours > 24;
    
    return res.status(200).json({
      cached: true,
      status: cacheData.metadata.status,
      metadata: cacheData.metadata,
      cache_age: {
        minutes: ageMinutes,
        hours: ageHours,
        is_expired: isExpired
      },
      recommendation: isExpired 
        ? 'El caché tiene más de 24 horas. Considera ejecutar /api/jobs/refresh'
        : 'El caché está actualizado'
    });
    
  } catch (error) {
    console.error('❌ Error verificando status:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}
```

---

### 5. `vercel.json`

Configuración de Vercel, incluyendo el Cron Job.

```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "crons": [
    {
      "path": "/api/jobs/refresh",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Nota:** El cron `0 6 * * *` ejecuta la actualización cada día a las 6:00 AM UTC.

---

### 6. `.gitignore`

```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Vercel
.vercel

# Environment
.env
.env.local
.env.production.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

---

### 7. `README.md`

```markdown
# Job Search API

API serverless para búsqueda de ofertas de empleo del sector turístico.

## 🚀 Endpoints

### `GET /api/jobs/status`
Verifica el estado del caché.

**Response:**
\`\`\`json
{
  "cached": true,
  "status": "success",
  "metadata": { ... },
  "cache_age": { "hours": 2.5, "is_expired": false }
}
\`\`\`

### `GET /api/jobs/refresh`
Actualiza el caché descargando el feed XML.

**Response:**
\`\`\`json
{
  "success": true,
  "total_jobs": 1247,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
\`\`\`

### `GET /api/jobs/search`
Busca ofertas con filtros.

**Parámetros:**
- `query` - Término de búsqueda (título, empresa, descripción)
- `location` - Ciudad o región
- `category` - Categoría del puesto
- `limit` - Máximo de resultados (default: 10)

**Ejemplo:**
\`\`\`
GET /api/jobs/search?query=chef&location=madrid&limit=5
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "total_matches": 23,
  "returned_results": 5,
  "results": [ ... ]
}
\`\`\`

## 📦 Deploy en Vercel

1. Instalar Vercel CLI:
\`\`\`bash
npm install -g vercel
\`\`\`

2. Deploy:
\`\`\`bash
vercel
\`\`\`

## ⏰ Actualización automática

El Cron Job en `vercel.json` actualiza el caché cada día a las 6 AM UTC.

## 🔑 Configuración requerida

- Vercel KV debe estar habilitado en tu proyecto
- En Vercel Dashboard → Storage → Create KV Database
```

---

## ✅ Tareas a completar

1. **Crear estructura de carpetas:**
   - Carpeta raíz: `job-search-api`
   - Subcarpeta: `api/jobs/`

2. **Crear todos los archivos listados arriba** con el contenido exacto

3. **Verificar que la estructura final sea:**
   ```
   job-search-api/
   ├── api/
   │   └── jobs/
   │       ├── refresh.js
   │       ├── search.js
   │       └── status.js
   ├── package.json
   ├── vercel.json
   ├── .gitignore
   └── README.md
   ```

4. **No instalar dependencias aún** - Vercel lo hará automáticamente en el deploy

5. **Confirmar al usuario** que todos los archivos están creados y listos para deploy

---

## 📝 Notas importantes

- La URL del feed XML está hardcodeada en `refresh.js`
- El caché expira en 48 horas por seguridad
- El Cron Job se ejecuta a las 6 AM UTC diariamente
- Vercel KV se debe crear manualmente en el dashboard después del primer deploy

---

## 🎯 Resultado esperado

Al finalizar, el usuario tendrá:
- ✅ Proyecto completo listo para deploy
- ✅ Código testeado y funcional
- ✅ Configuración de Vercel lista
- ✅ README con documentación clara
