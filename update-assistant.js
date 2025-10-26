import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function updateAssistant() {
  try {
    // Leer el prompt mejorado
    const promptPath = path.join(__dirname, 'assistant_prompt_improved.txt');
    const improvedPrompt = fs.readFileSync(promptPath, 'utf-8');

    console.log('📖 Prompt mejorado cargado desde:', promptPath);
    console.log('📏 Tamaño del prompt:', improvedPrompt.length, 'caracteres');
    console.log('');

    // Obtener ASSISTANT_ID de las variables de entorno
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    if (!assistantId) {
      console.error('❌ ERROR: Variable OPENAI_ASSISTANT_ID no encontrada');
      console.log('');
      console.log('Por favor, configura la variable de entorno:');
      console.log('Windows (PowerShell):');
      console.log('  $env:OPENAI_ASSISTANT_ID="asst_..."');
      console.log('');
      console.log('Windows (CMD):');
      console.log('  set OPENAI_ASSISTANT_ID=asst_...');
      console.log('');
      console.log('Linux/Mac:');
      console.log('  export OPENAI_ASSISTANT_ID="asst_..."');
      process.exit(1);
    }

    console.log('🤖 Actualizando Assistant ID:', assistantId);
    console.log('');

    // Actualizar el Assistant existente
    const assistant = await openai.beta.assistants.update(assistantId, {
      instructions: improvedPrompt,
      // Mantener el resto de configuraciones
      name: "Turijobs Assistant",
      description: "Asistente para búsqueda de empleo en el sector turístico español con ofertas reales de Turijobs.com",
      model: "gpt-4o",
      temperature: 0.7,
      top_p: 1.0
    });

    console.log('✅ Assistant actualizado exitosamente!');
    console.log('');
    console.log('📋 Detalles:');
    console.log('  ID:', assistant.id);
    console.log('  Nombre:', assistant.name);
    console.log('  Modelo:', assistant.model);
    console.log('  Instrucciones:', improvedPrompt.length, 'caracteres');
    console.log('');
    console.log('🎯 Mejoras aplicadas:');
    console.log('  ✅ Fuente exclusiva: Turijobs.com');
    console.log('  ✅ Jerarquías de puestos con pesos (0.30-1.00)');
    console.log('  ✅ Tabla de distancias geográficas');
    console.log('  ✅ Búsqueda por sector completo');
    console.log('  ✅ Reglas dinámicas de aprendizaje');
    console.log('');
    console.log('🧪 Próximo paso: Probar el Assistant con casos de prueba');
    console.log('');
    console.log('Casos sugeridos:');
    console.log('  1. "Chef en Guadalajara" → Debe sugerir Madrid (60 km)');
    console.log('  2. "Sommelier en Toledo" → Debe sugerir Jefe de Sala (peso 0.90)');
    console.log('  3. "Trabajo en cocina en Barcelona" → Debe mostrar todos los puestos del sector');
    console.log('');

  } catch (error) {
    console.error('❌ Error actualizando Assistant:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateAssistant();
