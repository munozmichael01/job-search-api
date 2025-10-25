import React from 'react';
import ChatWidget from '../components/ChatWidget.jsx';
import '../components/ChatWidget.css';
import './Demo.css';

export default function Demo() {
  return (
    <div className="demo-page">
      {/* Header */}
      <header className="demo-header">
        <div className="demo-container">
          <div className="demo-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
            </svg>
            <span>TuriEmpleos</span>
          </div>
          <nav className="demo-nav">
            <a href="/">Inicio</a>
            <a href="#ofertas">Ofertas</a>
            <a href="#empresas">Empresas</a>
            <a href="/html-demo" className="demo-btn-outline">Ver Demo HTML</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="demo-hero">
        <div className="demo-container">
          <div className="demo-hero-content">
            <h1 className="demo-hero-title">
              Encuentra tu próximo trabajo en <span>Turismo y Hostelería</span>
            </h1>
            <p className="demo-hero-subtitle">
              Miles de ofertas de chef, camarero, recepcionista y más. 
              Conectamos talento con las mejores empresas del sector.
            </p>
            <div className="demo-search-box">
              <input type="text" placeholder="¿Qué trabajo buscas?" />
              <input type="text" placeholder="¿Dónde?" />
              <button className="demo-btn-primary">Buscar</button>
            </div>
            <div className="demo-quick-links">
              <span>Popular:</span>
              <a href="#chef">Chef</a>
              <a href="#camarero">Camarero</a>
              <a href="#recepcionista">Recepcionista</a>
              <a href="#limpieza">Housekeeping</a>
            </div>
          </div>
          <div className="demo-hero-image">
            <div className="demo-hero-card">
              <div className="demo-hero-card-icon">💼</div>
              <h3>2,132</h3>
              <p>Ofertas activas</p>
            </div>
            <div className="demo-hero-card">
              <div className="demo-hero-card-icon">🏨</div>
              <h3>850+</h3>
              <p>Empresas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="demo-features">
        <div className="demo-container">
          <h2 className="demo-section-title">¿Por qué buscar aquí?</h2>
          <div className="demo-features-grid">
            <div className="demo-feature-card">
              <div className="demo-feature-icon">🤖</div>
              <h3>Asistente con IA</h3>
              <p>Nuestro chat inteligente te ayuda a encontrar el trabajo perfecto conversando en lenguaje natural.</p>
            </div>
            <div className="demo-feature-card">
              <div className="demo-feature-icon">⚡</div>
              <h3>Ofertas en tiempo real</h3>
              <p>Acceso directo a ofertas verificadas de empresas del sector turístico y hotelero.</p>
            </div>
            <div className="demo-feature-card">
              <div className="demo-feature-icon">🎯</div>
              <h3>Búsqueda inteligente</h3>
              <p>Encuentra ofertas por ubicación, categoría, salario y más. El asistente entiende sinónimos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="demo-cta">
        <div className="demo-container">
          <div className="demo-cta-content">
            <div className="demo-cta-icon">💬</div>
            <h2>Prueba el Chat Inteligente</h2>
            <p>Haz clic en el botón azul de la esquina inferior derecha y pregunta por ofertas de empleo.</p>
            <div className="demo-cta-example">
              <strong>Ejemplo:</strong> "Busco trabajo de chef en Madrid"
            </div>
          </div>
        </div>
      </section>

      {/* Demo Info */}
      <section className="demo-info">
        <div className="demo-container">
          <h2 className="demo-section-title">Integración del Widget</h2>
          <div className="demo-info-grid">
            <div className="demo-info-card">
              <h3>Para React (esta demo)</h3>
              <pre><code>{`import ChatWidget from './components/ChatWidget';
import './components/ChatWidget.css';

function App() {
  return (
    <>
      {/* Tu contenido */}
      <ChatWidget />
    </>
  );
}`}</code></pre>
            </div>
            <div className="demo-info-card">
              <h3>Para HTML/Webflow/WordPress</h3>
              <p>Copia este código en tu sitio:</p>
              <pre><code>{`<script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>`}</code></pre>
              <a href="/html-demo" className="demo-btn-primary">Ver Demo HTML completa →</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="demo-footer">
        <div className="demo-container">
          <p>© 2025 TuriEmpleos Demo - Widget de chat con IA para búsqueda de empleo</p>
          <div className="demo-footer-links">
            <a href="https://github.com">GitHub</a>
            <a href="/widget/README.md">Documentación</a>
            <a href="/api/actions">API</a>
          </div>
        </div>
      </footer>

      {/* Widget (siempre visible) */}
      <ChatWidget />
    </div>
  );
}

