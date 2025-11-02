import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const assistantId = process.env.OPENAI_ASSISTANT_ID;

const instructions = fs.readFileSync('assistant_prompt_with_nearby_v2.txt', 'utf-8');

const assistant = await openai.beta.assistants.update(assistantId, {
  instructions
});

console.log('✅ Asistente actualizado con PAGINACIÓN DE RELATED_JOBS\n');
console.log('🔧 CAMBIOS:');
console.log('  1. Usa amplification_used.related_pagination.has_more');
console.log('  2. Muestra mensaje de paginación cuando hay más');
console.log('  3. Usa related_offset (no offset) para paginar related_jobs');
console.log('  4. Mensaje más claro: Estas ofertas son de [puesto]\n');
console.log('🎯 RESULTADO ESPERADO:');
console.log('  Query: recepcionista sitges');
console.log('  - Encontré 35 ofertas relacionadas en Barcelona');
console.log('  - Mostrando las 10 primeras');
console.log('  - [10 ofertas con formato completo]');
console.log('  - Estas ofertas son de Recepcionista de Hotel');
console.log('  - 📋 Hay 25 ofertas más. Dime siguiente para continuar');
console.log('  - Botón siguiente aparece ✅\n');
console.log('Asistente:', assistant.id);
