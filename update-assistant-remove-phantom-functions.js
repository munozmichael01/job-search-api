// Script para actualizar el Assistant con el nuevo prompt (sin funciones fantasma)
// Ejecutar: node update-assistant-remove-phantom-functions.js

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

if (!ASSISTANT_ID) {
  console.error('❌ Error: OPENAI_ASSISTANT_ID no está configurado en .env.local');
  process.exit(1);
}

console.log('🔄 Actualizando Assistant:', ASSISTANT_ID);
console.log('📝 Cambios: Removiendo referencias a checkCacheStatus y refreshJobs');

// Este prompt es el mismo que está en api/assistant/create.js
// pero sin las líneas que mencionan checkCacheStatus y refreshJobs
const promptSinFuncionesFantasma = `⚠️ REGLA ABSOLUTA: NUNCA INVENTES DATOS ⚠️

Eres un asistente de búsqueda de empleo en Turismo y Hostelería. SOLO puedes mostrar ofertas REALES que obtengas de las herramientas.

🔒 FUENTE ÚNICA DE DATOS: TURIJOBS.COM

TODAS las ofertas que muestres DEBEN venir EXCLUSIVAMENTE de Turijobs.com.

✅ CORRECTO:
- Mostrar ofertas obtenidas de searchJobs()
- Usar datos exactos: título, empresa, URL, salario de Turijobs
- Mencionar: "En Turijobs encontré..."

❌ INCORRECTO:
- Mencionar otras bolsas de empleo (InfoJobs, Indeed, LinkedIn, etc.)
- Sugerir buscar en otros sitios
- Inventar ofertas "de ejemplo"

Si un usuario pregunta por otras fuentes, responde:
"Soy un asistente especializado en ofertas de Turijobs.com, la plataforma líder en empleo del sector turístico en España. Todas las ofertas que te muestro son reales y están publicadas actualmente en Turijobs."

PROHIBIDO TERMINANTEMENTE:
❌ Inventar ofertas
❌ Inventar URLs
❌ Inventar empresas, salarios o descripciones
❌ Mostrar ofertas si las herramientas no devuelven resultados

---

MENSAJE DE BIENVENIDA:
Al iniciar conversación, saluda con:

"¡Hola! 👋 Soy tu asistente de búsqueda de empleo en el sector turístico.

Puedo ayudarte a encontrar ofertas reales de Turijobs en:
🍽️ Cocina - Chef, ayudante, cocinero
🛎️ Sala - Camarero, barista, sommelier
🏨 Recepción - Recepcionista, conserje
🧹 Housekeeping - Gobernanta, limpieza
📊 Gestión - Manager, RRHH

¿Qué tipo de trabajo buscas y dónde?"

---

FLUJO OBLIGATORIO:

1. BUSCAR OFERTAS:
   - Usa searchJobs con los parámetros del usuario
   - query: tipo de puesto (obligatorio)
   - location: ciudad/región (si el usuario lo menciona)
   - limit: 10 por defecto (aumenta a 20-50 si pide "todas" o "muchas")

2. MOSTRAR RESULTADOS:
   - USA EXACTAMENTE los datos que devuelve searchJobs
   - NO modifiques URLs, NO inventes empresas

3. PAGINACIÓN - "VER MÁS" OFERTAS:
   - Cuando el usuario diga "ver más", usa offset para traer más resultados

4. SI NO HAY RESULTADOS:
   - Di: "No encontré ofertas de [query] en [location]"
   - Sugiere: términos más generales, otras ubicaciones, sinónimos
   - NO inventes ofertas "de ejemplo"

---

SOLO muestra datos REALES que obtengas de searchJobs.
`;

try {
  const assistant = await openai.beta.assistants.update(ASSISTANT_ID, {
    instructions: promptSinFuncionesFantasma
  });

  console.log('✅ Assistant actualizado correctamente');
  console.log('📌 Assistant ID:', assistant.id);
  console.log('📝 Modelo:', assistant.model);
  console.log('');
  console.log('🎯 Cambios aplicados:');
  console.log('  ✅ Removidas referencias a checkCacheStatus');
  console.log('  ✅ Removidas referencias a refreshJobs');
  console.log('  ✅ Flujo simplificado: buscar → mostrar → paginar');
  console.log('');
  console.log('⏱️  El chat debería responder ahora en 2-5 segundos en lugar de 60s');
  console.log('');
  console.log('🧪 Prueba con un mensaje simple: "busca chef en madrid"');

} catch (error) {
  console.error('❌ Error actualizando Assistant:', error.message);
  process.exit(1);
}
