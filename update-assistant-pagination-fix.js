import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;

async function updateAssistant() {
  try {
    console.log('🔧 Actualizando asistente con fix de paginación...\n');

    const promptPath = path.join(__dirname, 'assistant_prompt_with_nearby_v2.txt');
    const instructions = fs.readFileSync(promptPath, 'utf-8');

    const assistant = await openai.beta.assistants.update(assistantId, {
      instructions
    });

    console.log('✅ Asistente actualizado!');
    console.log('\n📋 CAMBIO CLAVE:');
    console.log('   GPT-4 ahora SIEMPRE indicará paginación cuando muestre');
    console.log('   MENOS ofertas que las recibidas del API,');
    console.log('   independientemente de pagination.has_more');
    console.log('\n💡 RESULTADO ESPERADO:');
    console.log('   - Recibe 10 ofertas → Muestra 3');
    console.log('   - Dice: "📋 Mostrando 3 de 10 ofertas. Dime \'siguiente\' para ver más."');
    console.log('   - Widget detecta "📋" y "siguiente" → Botón aparece ✅');
    console.log('\nAsistente:', assistant.id);
    console.log('Model:', assistant.model);
    console.log('Tools:', assistant.tools.map(t => t.type || t.function?.name).join(', '));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

updateAssistant();
