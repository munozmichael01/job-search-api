const fs = require('fs');
const path = require('path');

// Leer el prompt mejorado
const promptPath = path.join(__dirname, 'assistant_prompt_improved.txt');
const improvedPrompt = fs.readFileSync(promptPath, 'utf-8');

console.log('📖 Prompt cargado:', improvedPrompt.length, 'caracteres');

// Escapar caracteres especiales para template literal
const escapedPrompt = improvedPrompt
  .replace(/\\/g, '\\\\')   // Backslashes
  .replace(/`/g, '\\`')      // Backticks
  .replace(/\${/g, '\\${');  // Template literals

// Crear el contenido completo del archivo
const createJsContent = `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const existingAssistantId = process.env.OPENAI_ASSISTANT_ID;

    let assistant;
    let action;

    if (existingAssistantId) {
      console.log('🔄 Actualizando Assistant existente:', existingAssistantId);
      action = 'actualizado';

      assistant = await openai.beta.assistants.update(existingAssistantId, {
        name: "Turijobs Assistant",
        description: "Asistente para búsqueda de empleo en el sector turístico español con ofertas reales de Turijobs.com",
        model: "gpt-4o",
        instructions: \`${escapedPrompt}\`,
        tools: [
          {
            type: "function",
            function: {
              name: "searchJobs",
              description: "Busca ofertas de trabajo en el sector turístico español usando la API de Turijobs.com",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Término de búsqueda (puesto, keywords). Ejemplos: 'chef', 'recepcionista', 'camarero'"
                  },
                  location: {
                    type: "string",
                    description: "Localización (ciudad o región). Ejemplos: 'Madrid', 'Barcelona', 'Costa del Sol'"
                  },
                  limit: {
                    type: "number",
                    description: "Número máximo de resultados a devolver (default: 10, max: 50)"
                  }
                },
                required: ["query"]
              }
            }
          }
        ],
        temperature: 0.7,
        top_p: 1.0
      });

    } else {
      console.log('🆕 Creando nuevo Assistant');
      action = 'creado';

      assistant = await openai.beta.assistants.create({
        name: "Turijobs Assistant",
        description: "Asistente para búsqueda de empleo en el sector turístico español con ofertas reales de Turijobs.com",
        model: "gpt-4o",
        instructions: \`${escapedPrompt}\`,
        tools: [
          {
            type: "function",
            function: {
              name: "searchJobs",
              description: "Busca ofertas de trabajo en el sector turístico español usando la API de Turijobs.com",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Término de búsqueda (puesto, keywords). Ejemplos: 'chef', 'recepcionista', 'camarero'"
                  },
                  location: {
                    type: "string",
                    description: "Localización (ciudad o región). Ejemplos: 'Madrid', 'Barcelona', 'Costa del Sol'"
                  },
                  limit: {
                    type: "number",
                    description: "Número máximo de resultados a devolver (default: 10, max: 50)"
                  }
                },
                required: ["query"]
              }
            }
          }
        ],
        temperature: 0.7,
        top_p: 1.0
      });
    }

    return res.status(200).json({
      success: true,
      action: action,
      assistant: {
        id: assistant.id,
        name: assistant.name,
        model: assistant.model,
        created_at: assistant.created_at
      }
    });

  } catch (error) {
    console.error('Error con Assistant:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
`;

// Escribir el archivo
const outputPath = path.join(__dirname, 'api/assistant/create.js');
fs.writeFileSync(outputPath, createJsContent, 'utf-8');

console.log('✅ Archivo create.js actualizado correctamente');
console.log('📁 Ubicación:', outputPath);
console.log('📏 Tamaño total:', createJsContent.length, 'caracteres');
console.log('');
console.log('🔍 Verificando...');
const written = fs.readFileSync(outputPath, 'utf-8');
console.log('✓ Archivo legible');
console.log('✓ Tamaño verificado:', written.length, 'caracteres');
console.log('');
console.log('✅ LISTO: Ahora create.js actualizará el Assistant existente en lugar de crear uno nuevo');
