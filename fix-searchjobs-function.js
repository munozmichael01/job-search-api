import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;
const instructions = fs.readFileSync('assistant_prompt_with_nearby_v2.txt', 'utf-8');

// Actualizar asistente con NUEVA definición de searchJobs que incluye related_offset
const assistant = await openai.beta.assistants.update(assistantId, {
  instructions,
  tools: [
    {
      type: 'function',
      function: {
        name: 'searchJobs',
        description: 'Busca ofertas de empleo en el sector turístico',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Término de búsqueda (puesto). Ejemplos: "chef", "camarero", "recepcionista"'
            },
            location: {
              type: 'string',
              description: 'Ciudad o región. Ejemplos: "Madrid", "Barcelona", "Costa del Sol"'
            },
            limit: {
              type: 'number',
              description: 'Número máximo de resultados (default: 10)'
            },
            offset: {
              type: 'number',
              description: 'Desplazamiento para paginación de resultados normales (default: 0). Usa pagination.next_offset del resultado anterior.'
            },
            related_offset: {
              type: 'number',
              description: 'Desplazamiento para paginación de related_jobs_results (default: 0). Usa amplification_used.nearby_pagination.next_offset o amplification_used.related_pagination.next_offset del resultado anterior. IMPORTANTE: Solo usa este parámetro cuando pagines NIVEL 1.5 nearby o NIVEL 2.'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'checkCacheStatus',
        description: 'Verificar estado del caché de ofertas (NO llamar, innecesario)',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }
  ]
});

console.log('✅ Asistente actualizado con parámetro related_offset\n');
console.log('🔧 CAMBIOS:');
console.log('  1. Agregado parámetro related_offset a searchJobs');
console.log('  2. offset: para paginar results[] (resultados normales)');
console.log('  3. related_offset: para paginar related_jobs_results[] (NIVEL 1.5/2)');
console.log('\n🎯 AHORA EL ASISTENTE PUEDE:');
console.log('  - Usar offset para resultados normales');
console.log('  - Usar related_offset para ofertas cercanas/relacionadas');
console.log('  - El backend recibirá el parámetro correcto');
console.log('\nAsistente:', assistant.id);
