import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';

const API_BASE_URL = 'https://job-search-api-psi.vercel.app';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Crear thread al abrir por primera vez
  useEffect(() => {
    if (isOpen && !threadId) {
      const savedThreadId = localStorage.getItem('turijobs_thread_id');
      
      if (savedThreadId) {
        setThreadId(savedThreadId);
        loadMessages(savedThreadId);
      } else {
        createThread();
      }
    }
  }, [isOpen, threadId]);

  const createThread = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/create-thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setThreadId(data.thread_id);
        localStorage.setItem('turijobs_thread_id', data.thread_id);
        
        // Mensaje de bienvenida
        setMessages([{
          role: 'assistant',
          content: '¡Hola! 👋 Soy tu asistente de búsqueda de empleo en el sector turístico.\n\nPuedo ayudarte a encontrar ofertas reales de Turijobs en:\n🍽️ Cocina - Chef, ayudante, cocinero\n🛎️ Sala - Camarero, barista, sommelier\n🏨 Recepción - Recepcionista, conserje\n🧹 Housekeeping - Gobernanta, limpieza\n📊 Gestión - Manager, RRHH\n\n¿Qué tipo de trabajo buscas y dónde?',
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const loadMessages = async (tid) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/get-messages?thread_id=${tid}`);
      const data = await response.json();
      
      if (data.success && data.messages.length > 0) {
        setMessages(data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })));
      } else {
        // Si no hay mensajes, mostrar bienvenida
        setMessages([{
          role: 'assistant',
          content: '¡Hola! 👋 Soy tu asistente de búsqueda de empleo en el sector turístico.\n\n¿Qué tipo de trabajo buscas?',
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !threadId) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          message: inputMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Lo siento, hubo un error. Por favor, intenta de nuevo.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    localStorage.removeItem('turijobs_thread_id');
    setThreadId(null);
    setMessages([]);
    createThread();
  };

  // Función para renderizar líneas con URLs como links
  const renderMessageLine = (line) => {
    // Regex para detectar URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = line.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="turijobs-link"
          >
            {part.includes('aplicar') ? '✅ Aplicar aquí' : '🔗 Ver oferta'}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="turijobs-chat-widget">
      {/* Botón flotante */}
      {!isOpen && (
        <button 
          className="turijobs-chat-button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat de empleos"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="turijobs-chat-badge">1</span>
        </button>
      )}

      {/* Ventana del chat */}
      {isOpen && (
        <div className="turijobs-chat-window">
          {/* Header */}
          <div className="turijobs-chat-header">
            <div className="turijobs-chat-header-content">
              <div className="turijobs-chat-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                </svg>
              </div>
              <div>
                <h3 className="turijobs-chat-title">Asistente Turijobs</h3>
                <p className="turijobs-chat-status">
                  <span className="turijobs-status-dot"></span>
                  En línea
                </p>
              </div>
            </div>
            <div className="turijobs-chat-actions">
              <button 
                onClick={resetChat}
                className="turijobs-icon-button"
                title="Nueva conversación"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="turijobs-icon-button"
                aria-label="Cerrar chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="turijobs-chat-messages">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`turijobs-message turijobs-message-${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="turijobs-message-avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                    </svg>
                  </div>
                )}
                <div className="turijobs-message-content">
                  <div className="turijobs-message-text">
                    {msg.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {renderMessageLine(line)}
                        {i < msg.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="turijobs-message-time">
                    {new Date(msg.timestamp).toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="turijobs-message turijobs-message-assistant">
                <div className="turijobs-message-avatar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                  </svg>
                </div>
                <div className="turijobs-message-content">
                  <div className="turijobs-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="turijobs-chat-input">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
              rows="1"
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="turijobs-send-button"
              aria-label="Enviar mensaje"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div className="turijobs-chat-footer">
            Powered by <strong>Turijobs</strong>
          </div>
        </div>
      )}
    </div>
  );
}

