import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const embedPath = path.join(__dirname, 'widget', 'embed.js');

console.log('🔧 FIX: Widget scroll en mobile y botón "siguiente"\n');

let content = fs.readFileSync(embedPath, 'utf-8');

// FIX 1: Agregar CSS para botones de acción (falta en el archivo)
const insertAfter = '.turijobs-chat-footer strong{color:#0066cc;font-weight:600}';
const actionButtonsCSS = `
    .turijobs-action-buttons{margin-top:8px;display:flex;gap:8px}
    .turijobs-action-button{background:#0066cc;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:14px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}
    .turijobs-action-button:hover{background:#0052a3;transform:scale(1.02)}`;

if (!content.includes('.turijobs-action-buttons')) {
  content = content.replace(insertAfter, insertAfter + actionButtonsCSS);
  console.log('✅ FIX 1: CSS de botones de acción agregado');
} else {
  console.log('⚠️  FIX 1: CSS ya existe');
}

// FIX 2: Mejorar scroll en mobile - asegurar que el contenedor de mensajes tenga overflow correcto
const oldMobileCSS = `@media (max-width:480px){
      .turijobs-chat-widget{bottom:16px;right:16px;left:auto}
      .turijobs-chat-window{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;border-radius:0!important}
      .turijobs-chat-button{width:56px;height:56px}
    }`;

const newMobileCSS = `@media (max-width:480px){
      .turijobs-chat-widget{bottom:16px;right:16px;left:auto}
      .turijobs-chat-window{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;border-radius:0!important}
      .turijobs-chat-messages{overflow-y:auto!important;-webkit-overflow-scrolling:touch;height:auto!important}
      .turijobs-chat-button{width:56px;height:56px}
    }`;

if (content.includes('@media (max-width:480px)')) {
  content = content.replace(oldMobileCSS, newMobileCSS);
  console.log('✅ FIX 2: Scroll en mobile mejorado (-webkit-overflow-scrolling:touch)');
} else {
  console.log('⚠️  FIX 2: Media query no encontrada');
}

// FIX 3: Mejorar detección de "siguiente" - buscar en versión sin HTML
const oldDetection = `      // Detectar si el mensaje sugiere ver más
      const hasMoreSuggestion = role === 'assistant' && (
        content.includes('muéstrame más') ||
        content.includes('siguiente') ||
        content.includes('ver más') ||
        content.includes('ofertas adicionales')
      );`;

const newDetection = `      // Detectar si el mensaje sugiere ver más
      // Buscar en versión sin formatear (case insensitive)
      const lowerContent = content.toLowerCase();
      const hasMoreSuggestion = role === 'assistant' && (
        lowerContent.includes('muéstrame más') ||
        lowerContent.includes('siguiente') ||
        lowerContent.includes('ver más') ||
        lowerContent.includes('ofertas adicionales') ||
        lowerContent.includes('hay más') ||
        lowerContent.includes('continuar')
      );`;

if (content.includes("content.includes('muéstrame más')")) {
  content = content.replace(oldDetection, newDetection);
  console.log('✅ FIX 3: Detección de "siguiente" mejorada (case insensitive + más palabras)');
} else {
  console.log('⚠️  FIX 3: Código de detección no encontrado');
}

// FIX 4: Agregar handler para el botón (falta el event listener)
const oldQuickReply = `      const quickReplyButtons = hasMoreSuggestion ? \`
        <div class="turijobs-action-buttons">
          <button class="turijobs-action-button" onclick="this.closest('.turijobs-chat-widget').dispatchEvent(new CustomEvent('quick-reply', {detail: 'siguiente'}))">
            ▶️ Ver más ofertas
          </button>
        </div>
      \` : '';`;

const newQuickReply = `      const quickReplyButtons = hasMoreSuggestion ? \`
        <div class="turijobs-action-buttons">
          <button class="turijobs-action-button" data-quick-reply="siguiente">
            ▶️ Ver más ofertas
          </button>
        </div>
      \` : '';`;

if (content.includes('onclick="this.closest')) {
  content = content.replace(oldQuickReply, newQuickReply);
  console.log('✅ FIX 4: Botón usa data-attribute en lugar de onclick inline');
} else {
  console.log('⚠️  FIX 4: Código del botón no encontrado');
}

// FIX 5: Agregar event delegation para quick reply buttons
const addMessageFunction = content.indexOf('function addMessage(role, content) {');
if (addMessageFunction > -1) {
  // Buscar el final de la función addMessage
  const afterAddMessage = content.indexOf('messagesContainer.scrollTop = messagesContainer.scrollHeight;', addMessageFunction) + 'messagesContainer.scrollTop = messagesContainer.scrollHeight;'.length;

  const eventDelegationCode = `

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
      });`;

  content = content.slice(0, afterAddMessage) + eventDelegationCode + content.slice(afterAddMessage);
  console.log('✅ FIX 5: Event delegation para botones quick reply agregado');
}

fs.writeFileSync(embedPath, content, 'utf-8');

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ FIXES APLICADOS!\n');
console.log('CAMBIOS:');
console.log('  1. CSS de botones de acción agregado');
console.log('  2. Scroll en mobile mejorado (touch scrolling)');
console.log('  3. Detección de "siguiente" mejorada');
console.log('  4. Botón usa data-attribute + event listener');
console.log('  5. Event delegation implementado\n');
console.log('PRÓXIMO: Deploy y probar en mobile');
