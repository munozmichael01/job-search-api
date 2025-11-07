import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer .env manualmente
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          process.env[key.trim()] = value;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error leyendo .env:', error.message);
    process.exit(1);
  }
}

loadEnv();

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY no encontrada en .env');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = 'asst_vfJs03e6YW2A0eCr9IrzhPBn';

async function updateAssistant() {
  try {
    console.log('📝 Leyendo prompt actualizado...');

    const promptPath = path.join(__dirname, 'assistant_prompt_new_architecture.txt');
    const instructions = fs.readFileSync(promptPath, 'utf-8');

    console.log(`📏 Tamaño del prompt: ${instructions.length} caracteres`);

    console.log('\n🔄 Actualizando asistente en OpenAI...');

    const updatedAssistant = await openai.beta.assistants.update(
      ASSISTANT_ID,
      {
        instructions: instructions,
        model: 'gpt-4o', // Mantener el mismo modelo
      }
    );

    console.log('\n✅ Asistente actualizado exitosamente!');
    console.log(`📋 ID: ${updatedAssistant.id}`);
    console.log(`🤖 Modelo: ${updatedAssistant.model}`);
    console.log(`📝 Instrucciones: ${updatedAssistant.instructions.length} caracteres`);

    console.log('\n🎯 Cambios aplicados:');
    console.log('  - Nueva arquitectura: 4 niveles en lugar de 5');
    console.log('  - NIVEL 1+ unificado (0-9 resultados, ≤100km)');
    console.log('  - NIVEL 2 activado con show_related=true o auto si 0 resultados');
    console.log('  - NIVEL 2 NEARBY automático (≤100km)');
    console.log('  - Botón de trabajos relacionados con available_related_jobs');
    console.log('  - Todos los resultados ordenados por distancia');

  } catch (error) {
    console.error('❌ Error actualizando asistente:', error);
    process.exit(1);
  }
}

updateAssistant();
