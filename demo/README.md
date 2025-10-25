# 🎨 Demo del Chat Widget

Este directorio contiene dos demos completas del widget de chat:

## 📦 Archivos

- **`App.jsx`** - Router principal
- **`Demo.jsx`** - Demo React con diseño tipo sitio de empleos
- **`Demo.css`** - Estilos de la demo React
- **`HtmlDemo.jsx`** - Página con código HTML listo para copiar
- **`HtmlDemo.css`** - Estilos de la página HTML

## 🚀 Cómo usar

### En tu proyecto React existente:

```bash
# 1. Copia los archivos
cp -r demo/* tu-proyecto/src/

# 2. Instala react-router-dom si no lo tienes
npm install react-router-dom

# 3. Usa el App.jsx como referencia o importa los componentes
```

### Crear un nuevo proyecto React de demo:

```bash
# 1. Crear proyecto
npx create-react-app turijobs-demo
cd turijobs-demo

# 2. Instalar dependencias
npm install react-router-dom

# 3. Copiar archivos
cp -r demo/* src/
cp -r widget/ src/

# 4. Actualizar src/index.js
# Importar App desde ./demo/App

# 5. Ejecutar
npm start
```

## 🎯 Rutas de la demo:

- `/` - Demo React con diseño completo
- `/html-demo` - Código HTML listo para copiar

## 🎨 Características:

### Demo React (`/`):
- ✅ Diseño inspirado en sitios de empleo
- ✅ Widget integrado y funcionando
- ✅ Responsive
- ✅ Secciones: Hero, Features, CTA
- ✅ Ejemplos de código

### Demo HTML (`/html-demo`):
- ✅ Código listo para copiar
- ✅ Instrucciones por plataforma (Webflow, WordPress, etc.)
- ✅ Ejemplos completos
- ✅ Botón de copiar al portapapeles

## 📝 Personalización:

Puedes modificar los colores en `Demo.css`:

```css
/* Cambiar color primario */
.demo-hero {
  background: linear-gradient(135deg, #TU-COLOR 0%, #TU-COLOR-OSCURO 100%);
}

/* Cambiar color de acento */
.demo-btn-primary {
  background: #TU-COLOR-ACENTO;
}
```

## 🐛 Troubleshooting:

### Error: Module not found 'react-router-dom'
```bash
npm install react-router-dom
```

### Error: ChatWidget not found
Asegúrate de que la carpeta `widget/` esté en `src/widget/`

### El widget no aparece
Verifica que `ChatWidget.css` esté importado en `Demo.jsx`

---

¡Listo para usar! 🚀

