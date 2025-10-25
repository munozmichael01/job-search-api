import React from 'react';
import './HtmlDemo.css';

export default function HtmlDemo() {
  const embedCode = `<!-- Turijobs Chat Widget -->
<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>`;

  const fullHtmlExample = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Sitio - Con Chat de Empleos</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #0066cc;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Mi Sitio Web</h1>
    <p>Este es mi contenido...</p>
  </div>
  
  <!-- Widget de chat - Agregar al final del body -->
  <script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>
</body>
</html>`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('¡Código copiado al portapapeles!');
  };

  return (
    <div className="html-demo-page">
      {/* Header */}
      <header className="html-demo-header">
        <div className="html-demo-container">
          <h1>🔌 Código HTML para Sitios Estáticos</h1>
          <a href="/" className="html-demo-back">← Volver a la demo React</a>
        </div>
      </header>

      {/* Content */}
      <div className="html-demo-container">
        <section className="html-demo-section">
          <h2>🚀 Código para copiar y pegar</h2>
          <p>Agrega este código <strong>al final del <code>&lt;body&gt;</code></strong> de tu sitio:</p>
          
          <div className="html-demo-code-block">
            <button 
              onClick={() => copyToClipboard(embedCode)}
              className="html-demo-copy-btn"
            >
              📋 Copiar
            </button>
            <pre><code>{embedCode}</code></pre>
          </div>

          <div className="html-demo-alert html-demo-alert-success">
            <strong>✅ ¡Eso es todo!</strong> El widget aparecerá automáticamente en la esquina inferior derecha.
          </div>
        </section>

        <section className="html-demo-section">
          <h2>📦 Dónde funciona</h2>
          <div className="html-demo-grid">
            <div className="html-demo-card">
              <div className="html-demo-card-icon">🌐</div>
              <h3>HTML Estático</h3>
              <p>Cualquier sitio HTML5</p>
            </div>
            <div className="html-demo-card">
              <div className="html-demo-card-icon">🎨</div>
              <h3>Webflow</h3>
              <p>Project Settings → Custom Code</p>
            </div>
            <div className="html-demo-card">
              <div className="html-demo-card-icon">📝</div>
              <h3>WordPress</h3>
              <p>Appearance → Theme Editor</p>
            </div>
            <div className="html-demo-card">
              <div className="html-demo-card-icon">🛍️</div>
              <h3>Shopify</h3>
              <p>Theme → Edit Code</p>
            </div>
            <div className="html-demo-card">
              <div className="html-demo-card-icon">⚡</div>
              <h3>Wix</h3>
              <p>Settings → Custom Code</p>
            </div>
            <div className="html-demo-card">
              <div className="html-demo-card-icon">🎯</div>
              <h3>Squarespace</h3>
              <p>Settings → Advanced → Code Injection</p>
            </div>
          </div>
        </section>

        <section className="html-demo-section">
          <h2>📄 Ejemplo HTML completo</h2>
          <p>Un ejemplo completo de cómo se vería en tu HTML:</p>
          
          <div className="html-demo-code-block">
            <button 
              onClick={() => copyToClipboard(fullHtmlExample)}
              className="html-demo-copy-btn"
            >
              📋 Copiar HTML completo
            </button>
            <pre><code>{fullHtmlExample}</code></pre>
          </div>
        </section>

        <section className="html-demo-section">
          <h2>🎨 Personalización (Opcional)</h2>
          <p>Si quieres cambiar los colores del widget, agrega esto en el <code>&lt;head&gt;</code>:</p>
          
          <div className="html-demo-code-block">
            <pre><code>{`<style>
  :root {
    --turijobs-primary: #tu-color-principal;
    --turijobs-secondary: #tu-color-secundario;
  }
</style>`}</code></pre>
          </div>
        </section>

        <section className="html-demo-section">
          <h2>🔧 Instrucciones por plataforma</h2>
          
          <div className="html-demo-instructions">
            <details>
              <summary><strong>🎨 Webflow</strong></summary>
              <ol>
                <li>Abre tu proyecto en Webflow</li>
                <li>Ve a <strong>Project Settings</strong> (⚙️)</li>
                <li>Selecciona <strong>Custom Code</strong></li>
                <li>En <strong>Footer Code</strong>, pega el código</li>
                <li>Guarda y publica</li>
              </ol>
            </details>

            <details>
              <summary><strong>📝 WordPress</strong></summary>
              <ol>
                <li>Ve a <strong>Appearance</strong> → <strong>Theme Editor</strong></li>
                <li>O usa un plugin como <strong>Insert Headers and Footers</strong></li>
                <li>Pega el código en el footer</li>
                <li>Guarda cambios</li>
              </ol>
            </details>

            <details>
              <summary><strong>🛍️ Shopify</strong></summary>
              <ol>
                <li>Ve a <strong>Online Store</strong> → <strong>Themes</strong></li>
                <li>Haz clic en <strong>Actions</strong> → <strong>Edit Code</strong></li>
                <li>Abre <code>theme.liquid</code></li>
                <li>Pega el código antes del cierre <code>&lt;/body&gt;</code></li>
                <li>Guarda</li>
              </ol>
            </details>

            <details>
              <summary><strong>⚡ Wix</strong></summary>
              <ol>
                <li>Ve a <strong>Settings</strong> en el dashboard</li>
                <li>Selecciona <strong>Custom Code</strong></li>
                <li>Haz clic en <strong>+ Add Custom Code</strong></li>
                <li>Pega el código, selecciona "Body - end"</li>
                <li>Aplica a todas las páginas</li>
              </ol>
            </details>

            <details>
              <summary><strong>🎯 Squarespace</strong></summary>
              <ol>
                <li>Ve a <strong>Settings</strong> → <strong>Advanced</strong></li>
                <li>Selecciona <strong>Code Injection</strong></li>
                <li>Pega el código en <strong>Footer</strong></li>
                <li>Guarda</li>
              </ol>
            </details>
          </div>
        </section>

        <section className="html-demo-section">
          <div className="html-demo-alert html-demo-alert-info">
            <h3>💡 Consejo</h3>
            <p>El widget aparecerá en todas las páginas donde agregues el código. Para excluir páginas específicas, consulta la documentación completa.</p>
          </div>
        </section>

        <section className="html-demo-section">
          <h2>🧪 Probar el widget</h2>
          <p>Una vez agregado el código, prueba con estas preguntas:</p>
          <ul className="html-demo-test-list">
            <li>💬 "Busco trabajo de chef en Madrid"</li>
            <li>💬 "¿Qué ofertas hay de camarero en Barcelona?"</li>
            <li>💬 "Muéstrame trabajos de recepcionista"</li>
            <li>💬 "Ofertas en hoteles de lujo"</li>
          </ul>
        </section>

        <section className="html-demo-section html-demo-cta">
          <h2>📚 ¿Necesitas ayuda?</h2>
          <p>Consulta la documentación completa o el código fuente:</p>
          <div className="html-demo-buttons">
            <a href="/widget/README.md" className="html-demo-btn">📖 Documentación</a>
            <a href="/widget/WEBFLOW.md" className="html-demo-btn">🎨 Guía Webflow</a>
            <a href="https://github.com" className="html-demo-btn">💻 GitHub</a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="html-demo-footer">
        <p>© 2025 Turijobs Widget - Listo para producción 🚀</p>
      </footer>
    </div>
  );
}

