/**
 * Turijobs Chat Widget - Versión Standalone para Webflow
 * Version: 1.0.0
 * 
 * Uso: <script src="https://job-search-api-psi.vercel.app/widget/embed.js"></script>
 */

(function() {
  'use strict';
  
  const API_BASE_URL = 'https://job-search-api-psi.vercel.app';
  
  // Crear estilos
  const styles = `
    .turijobs-chat-widget{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto',sans-serif}
    .turijobs-chat-button{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#0066cc 0%,#0052a3 100%);border:none;color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;transition:all .3s ease;position:relative}
    .turijobs-chat-button:hover{transform:scale(1.1);box-shadow:0 8px 24px rgba(0,0,0,.2)}
    .turijobs-chat-button svg{width:24px;height:24px}
    .turijobs-chat-badge{position:absolute;top:-4px;right:-4px;background:#ff6b35;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid #fff}
    .turijobs-chat-window{width:380px;height:600px;max-height:calc(100vh - 100px);background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;animation:slideUp .3s ease}
    @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .turijobs-chat-header{background:linear-gradient(135deg,#0066cc 0%,#0052a3 100%);color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between}
    .turijobs-chat-header-content{display:flex;align-items:center;gap:12px;flex:1}
    .turijobs-chat-avatar{width:40px;height:40px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .turijobs-chat-avatar svg{width:24px;height:24px}
    .turijobs-chat-title{font-size:16px;font-weight:600;margin:0}
    .turijobs-chat-status{font-size:13px;margin:4px 0 0 0;opacity:.9;display:flex;align-items:center;gap:6px}
    .turijobs-status-dot{width:8px;height:8px;background:#28a745;border-radius:50%;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    .turijobs-chat-actions{display:flex;gap:8px}
    .turijobs-icon-button{width:32px;height:32px;background:rgba(255,255,255,.2);border:none;border-radius:6px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
    .turijobs-icon-button:hover{background:rgba(255,255,255,.3)}
    .turijobs-icon-button svg{width:18px;height:18px}
    .turijobs-chat-messages{flex:1;overflow-y:auto;padding:16px;background:#f8f9fa}
    .turijobs-message{display:flex;gap:8px;margin-bottom:16px;animation:fadeIn .3s ease}
    @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .turijobs-message-assistant{justify-content:flex-start}
    .turijobs-message-user{justify-content:flex-end}
    .turijobs-message-avatar{width:32px;height:32px;background:#0066cc;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
    .turijobs-message-avatar svg{width:20px;height:20px}
    .turijobs-message-content{max-width:75%}
    .turijobs-message-user .turijobs-message-content{display:flex;flex-direction:column;align-items:flex-end}
    .turijobs-message-text{background:#fff;padding:12px 16px;border-radius:12px;color:#24292e;font-size:14px;line-height:1.5;box-shadow:0 1px 2px rgba(0,0,0,.1);word-wrap:break-word;white-space:pre-wrap}
    .turijobs-message-user .turijobs-message-text{background:#0066cc;color:#fff}
    .turijobs-message-time{font-size:11px;color:#6a737d;margin-top:4px;padding:0 4px}
    .turijobs-typing-indicator{display:flex;gap:4px;padding:12px 16px;background:#fff;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.1)}
    .turijobs-typing-indicator span{width:8px;height:8px;background:#6a737d;border-radius:50%;animation:typing 1.4s infinite}
    .turijobs-typing-indicator span:nth-child(2){animation-delay:.2s}
    .turijobs-typing-indicator span:nth-child(3){animation-delay:.4s}
    @keyframes typing{0%,60%,100%{transform:translateY(0);opacity:.7}30%{transform:translateY(-10px);opacity:1}}
    .turijobs-chat-input{display:flex;gap:8px;padding:12px 16px;background:#fff;border-top:1px solid #e1e4e8}
    .turijobs-chat-input textarea{flex:1;border:1px solid #e1e4e8;border-radius:20px;padding:10px 16px;font-size:14px;font-family:inherit;resize:none;outline:none;max-height:100px}
    .turijobs-chat-input textarea:focus{border-color:#0066cc}
    .turijobs-send-button{width:40px;height:40px;background:#0066cc;border:none;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
    .turijobs-send-button:hover:not(:disabled){background:#0052a3;transform:scale(1.05)}
    .turijobs-send-button:disabled{opacity:.5;cursor:not-allowed}
    .turijobs-send-button svg{width:20px;height:20px}
    .turijobs-chat-footer{padding:8px 16px;text-align:center;font-size:12px;color:#586069;background:#fff;border-top:1px solid #e1e4e8}
    .turijobs-chat-footer strong{color:#0066cc;font-weight:600}
    .turijobs-action-buttons{margin-top:8px;display:flex;gap:8px}
    .turijobs-action-button{background:#0066cc;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:14px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}
    .turijobs-action-button:hover{background:#0052a3;transform:scale(1.02)}
    @media (max-width:480px){
      .turijobs-chat-widget{bottom:16px;right:16px;left:auto}
      .turijobs-chat-window{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;border-radius:0!important}
      .turijobs-chat-messages{overflow-y:auto!important;-webkit-overflow-scrolling:touch;height:auto!important}
      .turijobs-chat-button{width:56px;height:56px}
    }
  `;
  
  // Inyectar estilos
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  // HTML del widget
  const widgetHTML = `
    <div class="turijobs-chat-widget" id="turijobs-widget">
      <button class="turijobs-chat-button" id="turijobs-open-btn" aria-label="Abrir chat de empleos">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="turijobs-chat-badge">1</span>
      </button>
    </div>
  `;
  
  // Agregar widget al body
  document.addEventListener('DOMContentLoaded', function() {
    const container = document.createElement('div');
    container.innerHTML = widgetHTML;
    document.body.appendChild(container.firstElementChild);
    
    initWidget();
  });
  
  // Inicializar widget
  function initWidget() {
    const widget = document.getElementById('turijobs-widget');
    const openBtn = document.getElementById('turijobs-open-btn');
    
    let isOpen = false;
    let threadId = localStorage.getItem('turijobs_thread_id');
    let messages = [];
    let isLoading = false;
    
    openBtn.addEventListener('click', () => {
      if (!isOpen) {
        openChat();
      }
    });
    
    function openChat() {
      isOpen = true;
      openBtn.style.display = 'none';
      
      const chatWindow = createChatWindow();
      widget.appendChild(chatWindow);
      
      if (!threadId) {
        createThread();
      } else {
        loadMessages();
      }
    }
    
    function closeChat() {
      isOpen = false;
      const chatWindow = document.querySelector('.turijobs-chat-window');
      if (chatWindow) {
        chatWindow.remove();
      }
      openBtn.style.display = 'flex';
    }
    
    function createChatWindow() {
      const chatWindow = document.createElement('div');
      chatWindow.className = 'turijobs-chat-window';
      chatWindow.innerHTML = `
        <div class="turijobs-chat-header">
          <div class="turijobs-chat-header-content">
            <div class="turijobs-chat-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
              </svg>
            </div>
            <div>
              <h3 class="turijobs-chat-title">Asistente Turijobs</h3>
              <p class="turijobs-chat-status">
                <span class="turijobs-status-dot"></span>
                En línea
              </p>
            </div>
          </div>
          <div class="turijobs-chat-actions">
            <button class="turijobs-icon-button" id="turijobs-reset-btn" title="Nueva conversación">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button class="turijobs-icon-button" id="turijobs-close-btn" aria-label="Cerrar chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="turijobs-chat-messages" id="turijobs-messages"></div>
        <div class="turijobs-chat-input">
          <textarea id="turijobs-input" placeholder="Escribe tu mensaje..." rows="1"></textarea>
          <button class="turijobs-send-button" id="turijobs-send-btn" aria-label="Enviar mensaje">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div class="turijobs-chat-footer">
          Powered by <strong>Turijobs</strong>
        </div>
      `;
      
      // Event listeners
      chatWindow.querySelector('#turijobs-close-btn').addEventListener('click', closeChat);
      chatWindow.querySelector('#turijobs-reset-btn').addEventListener('click', resetChat);
      chatWindow.querySelector('#turijobs-send-btn').addEventListener('click', sendMessage);
      chatWindow.querySelector('#turijobs-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      
      return chatWindow;
    }
    
    async function createThread() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/create-thread`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
          threadId = data.thread_id;
          localStorage.setItem('turijobs_thread_id', threadId);
          
          // Mensaje de bienvenida
          addMessage('assistant', '¡Hola! 👋 Soy tu asistente de búsqueda de empleo en el sector turístico.\n\nPuedo ayudarte a encontrar ofertas reales de Turijobs en:\n🍽️ Cocina - Chef, ayudante, cocinero\n🛎️ Sala - Camarero, barista, sommelier\n🏨 Recepción - Recepcionista, conserje\n🧹 Housekeeping - Gobernanta, limpieza\n📊 Gestión - Manager, RRHH\n\n¿Qué tipo de trabajo buscas y dónde?');
        }
      } catch (error) {
        console.error('Error creating thread:', error);
      }
    }
    
    async function loadMessages() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/get-messages?thread_id=${threadId}`);
        const data = await response.json();
        
        if (data.success && data.messages.length > 0) {
          data.messages.forEach(msg => {
            addMessage(msg.role, msg.content);
          });
        } else {
          addMessage('assistant', '¡Hola! 👋 ¿En qué puedo ayudarte hoy?');
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        addMessage('assistant', '¡Hola! 👋 ¿En qué puedo ayudarte hoy?');
      }
    }
    
    async function sendMessage() {
      const input = document.getElementById('turijobs-input');
      const message = input.value.trim();
      
      if (!message || isLoading || !threadId) return;
      
      addMessage('user', message);
      input.value = '';
      isLoading = true;
      
      showTypingIndicator();
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId, message })
        });
        
        const data = await response.json();
        
        hideTypingIndicator();
        
        if (data.success) {
          addMessage('assistant', data.message);
        } else {
          addMessage('assistant', '❌ Lo siento, hubo un error. Por favor, intenta de nuevo.');
        }
      } catch (error) {
        hideTypingIndicator();
        console.error('Error sending message:', error);
        addMessage('assistant', '❌ Lo siento, hubo un error de conexión.');
      } finally {
        isLoading = false;
      }
    }
    
    function addMessage(role, content) {
      const messagesContainer = document.getElementById('turijobs-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `turijobs-message turijobs-message-${role}`;
      
      const avatarHTML = role === 'assistant' ? `
        <div class="turijobs-message-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
          </svg>
        </div>
      ` : '';
      
      const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      // Detectar si el mensaje sugiere ver más
      // Buscar en versión sin formatear (case insensitive)
      const lowerContent = content.toLowerCase();
      const hasMoreSuggestion = role === 'assistant' && (
        lowerContent.includes('muéstrame más') ||
        lowerContent.includes('siguiente') ||
        lowerContent.includes('ver más') ||
        lowerContent.includes('ofertas adicionales') ||
        lowerContent.includes('hay más') ||
        lowerContent.includes('continuar')
      );
      
      const quickReplyButtons = hasMoreSuggestion ? `
        <div class="turijobs-action-buttons">
          <button class="turijobs-action-button" data-quick-reply="siguiente">
            ▶️ Ver más ofertas
          </button>
        </div>
      ` : '';
      
      messageDiv.innerHTML = `
        ${avatarHTML}
        <div class="turijobs-message-content">
          <div class="turijobs-message-text">${escapeHtml(content)}</div>
          ${quickReplyButtons}
          <div class="turijobs-message-time">${time}</div>
        </div>
      `;
      
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Event delegation para botones quick reply
      messagesContainer.querySelectorAll('[data-quick-reply]').forEach(btn => {
        if (!btn.hasAttribute('data-listener-added')) {
          btn.addEventListener('click', (e) => {
            const input = document.getElementById('turijobs-input');
            if (input) {
              input.value = e.target.getAttribute('data-quick-reply');
              document.getElementById('turijobs-send-btn')?.click();
            }
          });
          btn.setAttribute('data-listener-added', 'true');
        }
      });
    }
    
    function showTypingIndicator() {
      const messagesContainer = document.getElementById('turijobs-messages');
      const typingDiv = document.createElement('div');
      typingDiv.className = 'turijobs-message turijobs-message-assistant';
      typingDiv.id = 'turijobs-typing';
      typingDiv.innerHTML = `
        <div class="turijobs-message-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
          </svg>
        </div>
        <div class="turijobs-message-content">
          <div class="turijobs-typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      messagesContainer.appendChild(typingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function hideTypingIndicator() {
      const typing = document.getElementById('turijobs-typing');
      if (typing) typing.remove();
    }
    
    function resetChat() {
      localStorage.removeItem('turijobs_thread_id');
      threadId = null;
      messages = [];
      document.getElementById('turijobs-messages').innerHTML = '';
      createThread();
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML.replace(/\n/g, '<br>');
    }
  }
})();

