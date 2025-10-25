# 🎯 Cómo embeber el widget en Webflow

Guía paso a paso para agregar el chat de Turijobs en tu sitio Webflow.

---

## 📝 Instrucciones para Webflow

### Paso 1: Acceder al Custom Code

1. Abre tu proyecto en Webflow
2. Ve a **Project Settings** (⚙️ arriba a la derecha)
3. En el menú lateral, selecciona **Custom Code**

### Paso 2: Agregar el script

En la sección **Footer Code**, pega este código:

```html
<!-- Turijobs Chat Widget -->
<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>
```

### Paso 3: Guardar y Publicar

1. Haz clic en **Save Changes**
2. Publica tu sitio (botón **Publish** arriba a la derecha)

---

## ✅ ¡Listo!

El widget aparecerá automáticamente en todas las páginas de tu sitio en la esquina inferior derecha.

---

## 🎨 Personalización Avanzada (Opcional)

### Cambiar colores

Si quieres personalizar los colores del widget, agrega este CSS en el **Head Code**:

```html
<style>
  /* Personalizar color primario */
  .turijobs-chat-button,
  .turijobs-chat-header,
  .turijobs-message-user .turijobs-message-text,
  .turijobs-send-button {
    background: #TU-COLOR !important;
  }
  
  /* Ejemplo con verde: */
  /* background: #28a745 !important; */
</style>
```

### Ocultar en páginas específicas

Si no quieres que aparezca en ciertas páginas, agrega este código en el **Page Settings → Custom Code** de esa página específica:

```html
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var widget = document.getElementById('turijobs-widget');
    if (widget) widget.style.display = 'none';
  });
</script>
```

---

## 📱 Responsive

El widget es completamente responsive:
- **Desktop**: Ventana flotante de 380x600px
- **Móvil**: Se adapta a pantalla completa

---

## 🐛 Troubleshooting

### El widget no aparece

1. **Verifica que publicaste el sitio** después de agregar el código
2. **Limpia el caché** de tu navegador (Ctrl + Shift + R)
3. **Verifica la consola** del navegador (F12) por errores

### El widget aparece pero no responde

1. Espera 10-30 segundos (el asistente puede tardar)
2. Verifica tu conexión a internet
3. Abre la consola (F12) y busca errores

### Quiero mover el widget a la izquierda

Agrega este CSS en el **Head Code**:

```html
<style>
  .turijobs-chat-widget {
    right: auto !important;
    left: 20px !important;
  }
</style>
```

---

## 🎯 Prueba de funcionamiento

1. Abre tu sitio publicado
2. Verás un botón flotante azul en la esquina inferior derecha
3. Haz clic en el botón
4. Prueba con: **"Busco trabajo de chef en Madrid"**
5. El asistente buscará ofertas reales de Turijobs.com

---

## 📊 Analytics (Opcional)

Para rastrear el uso del chat, agrega este código después del script del widget:

```html
<script>
  // Google Analytics
  window.addEventListener('message', function(e) {
    if (e.data.type === 'turijobs-message-sent') {
      gtag('event', 'chat_message', {
        'event_category': 'Turijobs Widget',
        'event_label': 'Message Sent'
      });
    }
  });
</script>
```

---

## 🔗 Recursos

- **Documentación API**: https://job-search-api-psi.vercel.app/api/actions
- **Soporte**: [tu-email]

---

## 🎉 ¡Eso es todo!

Tu widget de chat debería estar funcionando en tu sitio Webflow. Los visitantes podrán buscar ofertas de empleo conversando con el asistente de IA.

---

*Última actualización: 25 Octubre 2025*

