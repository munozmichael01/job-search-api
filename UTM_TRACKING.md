# 📊 UTM Parameters - Turijobs Chat Widget

## 🎯 Configuración Actual

Todas las URLs de ofertas se transforman automáticamente para incluir parámetros UTM de seguimiento:

### Parámetros UTM Aplicados

```
utm_source=chatbot_ai
utm_medium=chat_widget
utm_campaign=job_search_assistant
```

### Ejemplo de Transformación

**URL Original:**
```
https://www.turijobs.com/es-es/oferta-trabajo/madrid/chef-de-partie/310025?cid=fgtsamples_fgtsamples_alljobs
```

**URL Transformada:**
```
https://www.turijobs.com/es-es/oferta-trabajo/madrid/chef-de-partie/310025?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant
```

---

## 🔧 Implementación

### Dónde se aplica
- **Endpoint**: `/api/jobs/search`
- **Campos modificados**:
  - `url` (Ver oferta)
  - `url_aplicar` (Aplicar)

### Código
```javascript
const utmParams = new URLSearchParams({
  utm_source: 'chatbot_ai',
  utm_medium: 'chat_widget',
  utm_campaign: 'job_search_assistant'
}).toString();

// Limpiar parámetros existentes y agregar UTMs
url: `${job.url.split('?')[0]}?${utmParams}`
url_aplicar: `${job.url_aplicar.split('?')[0].replace(/&cid=.*$/, '')}?${utmParams}`
```

---

## 📈 Tracking en Google Analytics

Con estos parámetros, en GA4 podrás ver:

### 1. **Tráfico por Fuente**
- **Fuente (Source)**: `chatbot_ai`
- **Medio (Medium)**: `chat_widget`
- **Campaña (Campaign)**: `job_search_assistant`

### 2. **Reportes Disponibles**
- Acquisition → Traffic acquisition → `chatbot_ai / chat_widget`
- Engagement → Conversions → Filtrar por campaña `job_search_assistant`
- Explorar → Custom report con dimensiones UTM

### 3. **Métricas a Medir**
- Usuarios desde el chat widget
- Sesiones iniciadas desde el chatbot
- Conversiones (aplicaciones completadas)
- Tiempo en página de ofertas
- Bounce rate por fuente

---

## 🎨 Personalización de UTMs

### Por Cliente/Implementación

Si quieres diferentes UTMs por cliente:

```javascript
// En api/jobs/search.js, línea ~110
const utmParams = new URLSearchParams({
  utm_source: req.headers['x-client-id'] || 'chatbot_ai',
  utm_medium: 'chat_widget',
  utm_campaign: 'job_search_assistant',
  utm_content: query || 'general_search'  // Término de búsqueda
}).toString();
```

### Por Tipo de Búsqueda

```javascript
const utmParams = new URLSearchParams({
  utm_source: 'chatbot_ai',
  utm_medium: 'chat_widget',
  utm_campaign: category || 'job_search_assistant',  // Categoría como campaña
  utm_content: location || 'all_locations'  // Ubicación como contenido
}).toString();
```

### Por Acción (Ver vs Aplicar)

```javascript
// Para "Ver oferta"
url: `${job.url.split('?')[0]}?${new URLSearchParams({
  ...baseUTM,
  utm_content: 'view_offer'
}).toString()}`

// Para "Aplicar"
url_aplicar: `${job.url_aplicar.split('?')[0]}?${new URLSearchParams({
  ...baseUTM,
  utm_content: 'apply_button'
}).toString()}`
```

---

## 🔍 Validación

### Probar en desarrollo

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef&limit=1" | jq '.results[0].url'
```

Deberías ver:
```
"https://www.turijobs.com/es-es/oferta-trabajo/madrid/chef/310025?utm_source=chatbot_ai&utm_medium=chat_widget&utm_campaign=job_search_assistant"
```

### Probar en el chat

1. Pregunta: "Busco trabajo de chef"
2. Haz click en "🔗 Ver oferta"
3. Inspecciona la URL en el navegador
4. Debería contener los parámetros UTM

---

## 📊 Dashboard Sugerido (GA4)

### Custom Report Configuration

**Dimensiones:**
- First user source
- First user medium
- First user campaign
- Page path

**Métricas:**
- Users
- Sessions
- Conversions
- Average engagement time

**Filtros:**
- First user source = `chatbot_ai`

---

## 🎯 Recomendaciones

### UTMs Sugeridos por Caso de Uso

#### 1. **Widget Embebido en Sitio Principal**
```
utm_source=turijobs_main
utm_medium=chat_widget
utm_campaign=homepage_assistant
```

#### 2. **Widget en Landing Page Específica**
```
utm_source=landing_page
utm_medium=chat_widget
utm_campaign=landing_chef_positions
```

#### 3. **Widget en Blog/Contenido**
```
utm_source=blog_article
utm_medium=chat_widget
utm_campaign=content_engagement
```

#### 4. **Widget en Webflow/Sitio Externo**
```
utm_source=partner_site
utm_medium=embedded_widget
utm_campaign=partner_integration
```

---

## 🔧 Variables de Entorno (Opcional)

Si quieres configurar UTMs dinámicamente:

```env
# En Vercel
UTM_SOURCE=chatbot_ai
UTM_MEDIUM=chat_widget
UTM_CAMPAIGN=job_search_assistant
```

Luego en el código:
```javascript
const utmParams = new URLSearchParams({
  utm_source: process.env.UTM_SOURCE || 'chatbot_ai',
  utm_medium: process.env.UTM_MEDIUM || 'chat_widget',
  utm_campaign: process.env.UTM_CAMPAIGN || 'job_search_assistant'
}).toString();
```

---

**Última actualización**: 25 Oct 2025
**UTMs activos**: ✅ `chatbot_ai / chat_widget / job_search_assistant`

