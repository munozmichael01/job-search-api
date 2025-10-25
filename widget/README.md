# 🤖 Turijobs Chat Widget - Guía de Integración

Widget de chat embebible para búsqueda de empleo del sector turístico con IA.

---

## 📋 Características

- ✅ **Búsqueda inteligente** - IA que entiende sinónimos y contexto
- ✅ **Datos reales** - Ofertas actualizadas de Turijobs.com
- ✅ **Multi-usuario** - Conversaciones aisladas por usuario
- ✅ **Persistente** - Las conversaciones se guardan automáticamente
- ✅ **Responsive** - Funciona en móvil y desktop
- ✅ **Fácil integración** - 2 líneas de código
- ✅ **Personalizable** - Colores del sector turístico

---

## 🚀 Opción 1: Integración en React

### Instalación

```bash
npm install react react-dom
```

### Uso

```jsx
import ChatWidget from './widget/ChatWidget';
import './widget/ChatWidget.css';

function App() {
  return (
    <div>
      {/* Tu contenido */}
      <ChatWidget />
    </div>
  );
}
```

---

## 🌐 Opción 2: Integración en cualquier web (HTML)

### Paso 1: Agregar al final del `<body>`

```html
<!-- CSS del widget -->
<link rel="stylesheet" href="https://job-search-api-psi.vercel.app/widget/turijobs-chat.css">

<!-- Script del widget -->
<script src="https://job-search-api-psi.vercel.app/widget/turijobs-chat.js"></script>
```

### Paso 2: ¡Listo!

El widget aparecerá automáticamente en la esquina inferior derecha.

---

## ⚙️ Configuración Avanzada (Opcional)

### Personalizar colores

```html
<style>
  :root {
    --turijobs-primary: #tu-color-principal;
    --turijobs-secondary: #tu-color-secundario;
  }
</style>
```

### Cambiar posición

```html
<style>
  .turijobs-chat-widget {
    bottom: 20px;
    right: 20px; /* Cambiar a left: 20px para izquierda */
  }
</style>
```

### Ocultar en ciertas páginas

```javascript
// Ocultar el widget en páginas específicas
if (window.location.pathname === '/admin') {
  document.querySelector('.turijobs-chat-widget').style.display = 'none';
}
```

---

## 📱 Responsive

El widget es completamente responsive:

- **Desktop**: Ventana flotante de 380x600px
- **Tablet**: Se adapta al tamaño de pantalla
- **Móvil**: Ocupa pantalla completa al abrirse

---

## 🎨 Diseño

### Colores

- **Primario**: `#0066cc` (Azul turístico)
- **Secundario**: `#ff6b35` (Naranja acento)
- **Éxito**: `#28a745` (Verde)

### Tipografía

- **Font**: System fonts (-apple-system, Segoe UI, Roboto)
- **Tamaños**: 12px - 16px

---

## 💬 Funcionalidades del Chat

### 1. Búsqueda inteligente

```
Usuario: "Busco trabajo de chef en Madrid"
→ Busca: chef, cocinero, jefe de cocina
→ Filtra por: Madrid
```

### 2. Sinónimos automáticos

- "camarero" → mesero, mozo, sala
- "chef" → cocinero, jefe de cocina
- "recepcionista" → front desk, conserje
- "limpieza" → housekeeping, gobernanta

### 3. Filtros geográficos

- "Costa del Sol" → Málaga
- "Canarias" → Tenerife, Gran Canaria
- "Baleares" → Mallorca, Ibiza

---

## 🔧 Para Desarrolladores

### Estructura del proyecto

```
widget/
├── ChatWidget.jsx      # Componente React principal
├── ChatWidget.css      # Estilos del widget
├── demo.html           # Página de demostración
└── README.md           # Esta guía
```

### API Endpoints usados

```
POST /api/chat/create-thread   → Crear conversación
POST /api/chat/send-message    → Enviar mensaje
GET  /api/chat/get-messages    → Obtener historial
```

### LocalStorage

El widget guarda el `thread_id` en:
```javascript
localStorage.getItem('turijobs_thread_id')
```

Para resetear la conversación:
```javascript
localStorage.removeItem('turijobs_thread_id');
```

---

## 🐛 Troubleshooting

### El widget no aparece

1. Verifica que los scripts estén cargando:
```javascript
console.log('Scripts:', document.querySelectorAll('script[src*="turijobs"]'));
```

2. Verifica la consola por errores de CORS o carga

### Las conversaciones no se guardan

1. Verifica que localStorage esté habilitado
2. Verifica que el navegador no esté en modo privado

### El chat tarda en responder

Es normal, el Assistant puede tardar 10-30 segundos en:
1. Verificar el caché
2. Buscar ofertas
3. Formatear respuesta

---

## 📊 Métricas y Monitoreo

### Ver logs en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Logs** o **Analytics**

### Métricas importantes

- Threads creados por día
- Mensajes enviados
- Tiempo promedio de respuesta
- Errores de API

---

## 🔐 Seguridad

- ✅ **API Key oculta** - Nunca expuesta al cliente
- ✅ **CORS configurado** - Solo dominios permitidos
- ✅ **Rate limiting** - Límites por IP
- ✅ **Sin datos sensibles** - No guardamos info personal

---

## 📞 Soporte

- **Issues**: GitHub Issues
- **Email**: [tu-email]
- **Documentación API**: `/api/actions`

---

## 🎉 Ejemplos de Uso

### Sitio corporativo

```html
<!-- En tu página principal -->
<body>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
  
  <!-- Widget al final -->
  <link rel="stylesheet" href="https://job-search-api-psi.vercel.app/widget/turijobs-chat.css">
  <script src="https://job-search-api-psi.vercel.app/widget/turijobs-chat.js"></script>
</body>
```

### WordPress

```php
// functions.php
function add_turijobs_widget() {
  ?>
  <link rel="stylesheet" href="https://job-search-api-psi.vercel.app/widget/turijobs-chat.css">
  <script src="https://job-search-api-psi.vercel.app/widget/turijobs-chat.js"></script>
  <?php
}
add_action('wp_footer', 'add_turijobs_widget');
```

### Next.js

```jsx
// _app.js o layout.js
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <link rel="stylesheet" href="https://job-search-api-psi.vercel.app/widget/turijobs-chat.css" />
      <Script src="https://job-search-api-psi.vercel.app/widget/turijobs-chat.js" />
    </>
  );
}
```

---

¡Listo! Tu widget de chat ya está funcionando. 🚀

