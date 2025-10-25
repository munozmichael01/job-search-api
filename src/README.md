# 🚀 Turijobs Chat Widget - Demo React

Aplicación React de demostración para el Chat Widget de Turijobs con IA.

## 📁 Estructura del Proyecto

```
job-search-api/
├── api/                      # Backend (Vercel Functions)
│   ├── jobs/                # Endpoints de ofertas
│   ├── chat/                # Endpoints del asistente
│   └── assistant/           # Configuración OpenAI
├── src/                     # Frontend React
│   ├── components/          # Componentes reutilizables
│   │   ├── ChatWidget.jsx  # Widget del chat
│   │   └── ChatWidget.css  # Estilos del widget
│   ├── pages/              # Páginas
│   │   ├── Demo.jsx        # Home page
│   │   ├── Demo.css        # Estilos home
│   │   ├── HtmlDemo.jsx    # Página código HTML
│   │   └── HtmlDemo.css    # Estilos HTML demo
│   ├── App.js              # Router principal
│   ├── index.js            # Entry point
│   └── index.css           # Estilos globales
├── public/                  # Archivos públicos
└── widget/                  # Widget standalone (HTML)
```

## 🛠️ Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Crear archivo .env.local con:
# OPENAI_API_KEY=tu-api-key
# OPENAI_ASSISTANT_ID=tu-assistant-id
```

## 🚀 Desarrollo

### Opción 1: Solo Frontend (React)

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000)

### Opción 2: Frontend + Backend (Vercel Dev)

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)
El backend estará en [http://localhost:3000/api](http://localhost:3000/api)

## 📦 Build para Producción

```bash
# Build del React app
npm run build:react

# El build estará en la carpeta /build
```

## 🌐 Deployment en Vercel

```bash
# Deploy manual
vercel --prod

# O configura auto-deploy desde GitHub
```

## 📄 Páginas

### Home (`/`)
- Hero con búsqueda
- Features del widget
- CTA para probar el chat
- Ejemplos de integración
- **Widget funcional en esquina inferior derecha**

### HTML Demo (`/html-demo`)
- Código listo para copiar
- Instrucciones por plataforma (Webflow, WordPress, etc.)
- Ejemplo HTML completo
- Guía de personalización

## 🎨 Integración del Widget

### En React (este proyecto):

```jsx
import ChatWidget from './components/ChatWidget';
import './components/ChatWidget.css';

function App() {
  return (
    <>
      <YourContent />
      <ChatWidget />
    </>
  );
}
```

### En HTML/Webflow/WordPress:

```html
<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>
```

## 🧪 Testing

Prueba el widget con:
- "Busco trabajo de chef en Madrid"
- "¿Qué ofertas hay de camarero en Barcelona?"
- "Muéstrame trabajos de recepcionista"

## 📚 Documentación Adicional

- [Widget Standalone](../widget/README.md)
- [Guía Webflow](../widget/WEBFLOW.md)
- [Setup OpenAI Assistant](../ASSISTANT_SETUP.md)
- [Configuración API](../README.md)

## 🎨 Colores del Theme

```css
--turijobs-primary: #0066cc;      /* Azul profesional */
--turijobs-secondary: #ff6b35;    /* Naranja turismo */
--turijobs-success: #28a745;      /* Verde éxito */
```

## 🔧 Scripts Disponibles

- `npm start` - Inicia dev server de React
- `npm run build:react` - Build de producción
- `npm run dev` - Vercel dev (backend + frontend)
- `npm test` - Run tests (si los hay)

## 📱 Responsive

La aplicación es completamente responsive:
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px

El widget se adapta automáticamente:
- Desktop: Ventana flotante 380x600px
- Mobile: Pantalla completa

## 🚀 Próximos Pasos

1. **Ejecuta** `npm install`
2. **Inicia** con `npm start`
3. **Abre** http://localhost:3000
4. **Prueba** el chat en la esquina inferior derecha
5. **Visita** `/html-demo` para el código HTML

---

**¿Dudas?** Consulta la [documentación completa](../README.md) o abre un issue.

