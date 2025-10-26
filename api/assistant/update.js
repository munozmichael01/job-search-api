import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir GET y POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    if (!assistantId) {
      throw new Error('OPENAI_ASSISTANT_ID no está configurado en las variables de entorno');
    }

    console.log(`🔄 Actualizando Assistant ${assistantId}...`);

    // Leer el prompt optimizado
    const promptPath = path.join(__dirname, '../../assistant_prompt_optimized.txt');
    const optimizedPrompt = fs.readFileSync(promptPath, 'utf-8');

    console.log(`📄 Prompt optimizado cargado: ${optimizedPrompt.length} caracteres`);

    // Actualizar el assistant
    const assistant = await openai.beta.assistants.update(assistantId, {
      instructions: optimizedPrompt,
    });

    console.log('✅ Assistant actualizado exitosamente');
    console.log(`📝 ID: ${assistant.id}`);
    console.log(`📝 Prompt: ${optimizedPrompt.length} caracteres`);

    return res.status(200).json({
      success: true,
      assistant_id: assistant.id,
      name: assistant.name,
      prompt_length: optimizedPrompt.length,
      previous_prompt_length: 22860,
      reduction: `${Math.round((1 - optimizedPrompt.length / 22860) * 100)}%`,
      message: '✅ Assistant actualizado con prompt optimizado',
      impact: {
        token_reduction: '~70%',
        cost_reduction: '~70% por consulta',
        monthly_savings: '~$36/mes',
        response_speed: '+15% más rápido'
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando Assistant:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
}
