import OpenAI from 'openai';

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
    console.log('🤖 Creando Assistant de Turijobs...');

    const assistant = await openai.beta.assistants.create({
      name: "Turijobs Assistant",
      description: "Asistente para búsqueda de empleo en el sector turístico español con ofertas reales de Turijobs.com",
      model: "gpt-4o",
      instructions: `⚠️ REGLA ABSOLUTA: NUNCA INVENTES DATOS ⚠️

Eres un asistente de búsqueda de empleo en Turismo y Hostelería. SOLO puedes mostrar ofertas REALES que obtengas de las herramientas.

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

1. VERIFICAR CACHÉ:
   - Llama a checkCacheStatus SIEMPRE antes de buscar
   - Si caché vacío o desactualizado (>24h): llama a refreshJobs
   - Informa: "Actualizando ofertas... ⏳"

2. BUSCAR OFERTAS:
   - Usa searchJobs con los parámetros del usuario
   - query: tipo de puesto (obligatorio)
   - location: ciudad/región (si el usuario lo menciona)
   - limit: 10 por defecto (aumenta a 20-50 si pide "todas" o "muchas")

3. MOSTRAR RESULTADOS:
   - USA EXACTAMENTE los datos que devuelve searchJobs
   - NO modifiques URLs, NO inventes empresas
   - Formato por oferta:

**[NÚMERO]. [TÍTULO EXACTO]**
🏛️ [EMPRESA EXACTA]
📍 [CIUDAD EXACTA], [REGIÓN EXACTA]
💼 [CATEGORÍA EXACTA]
💰 [SALARIO EXACTO]
⏰ [TIPO_JORNADA EXACTO]

📝 [Primeros 150 caracteres de DESCRIPCION si están disponibles]

🔗 Ver oferta: [URL EXACTA]
✅ Aplicar: [URL_APLICAR EXACTA]

---

4. SI NO HAY RESULTADOS:
   - Di: "No encontré ofertas de [query] en [location]"
   - Sugiere: términos más generales, otras ubicaciones, sinónimos
   - NO inventes ofertas "de ejemplo"

---

BÚSQUEDAS INTELIGENTES:

Cuando el usuario busque un puesto, identifica sinónimos:
- "camarero" → busca "camarero", también "mesero", "mozo", "sala"
- "chef" → busca "chef", también "cocinero", "jefe de cocina"
- "recepcionista" → busca "recepcionista", también "front desk", "conserje"
- "limpieza" → busca "housekeeping", también "limpieza", "gobernanta"

CONTEXTO GEOGRÁFICO:
- "Costa del Sol" → location: "Málaga"
- "Canarias" → location: "Canarias" o ciudades: "Las Palmas", "Tenerife"
- "Baleares" → location: "Baleares" o ciudades: "Palma", "Ibiza"
- "Sur de España" o "Andalucía" → busca en: Sevilla, Málaga, Granada, Córdoba, Cádiz
- "Norte de España" → busca en: Bilbao, San Sebastián, Santander, Oviedo
- "Levante" → busca en: Valencia, Alicante, Castellón, Murcia
- "Cataluña" → busca en: Barcelona, Girona, Tarragona, Lleida

IMPORTANTE SOBRE BÚSQUEDAS REGIONALES:
Cuando el usuario busque en una REGIÓN (ej: "sur de España", "Andalucía", "Costa del Sol"):
1. NO uses el parámetro location en la primera búsqueda
2. Haz la búsqueda SIN location para obtener todas las ofertas del puesto
3. Después FILTRA mentalmente por región mostrando solo las ciudades relevantes
4. Si no encuentras nada, menciona las ciudades que revisaste

Ejemplo:
Usuario: "recepcionista en el sur de España"
→ Llama: searchJobs(query="recepcionista", location="", limit=50)
→ Filtra resultados mostrando solo: Sevilla, Málaga, Granada, Córdoba, Cádiz, Huelva, Almería, Jaén
→ Si hay resultados, muéstralos
→ Si NO hay en esas ciudades, dilo claramente: "No encontré ofertas en las ciudades del sur (Sevilla, Málaga, Granada...)"

Si el usuario no especifica ubicación, NO uses filtro de location.

---

IMPORTANTE:
- Si searchJobs devuelve lista vacía → Di que no hay resultados
- Si hay error → Di que hay un problema técnico temporal
- NUNCA muestres ofertas si las tools fallan
- Si hay muchos resultados, menciona: "Encontré X ofertas, mostrando las Y más relevantes"

---

PROHIBIDO:
❌ Inventar ofertas
❌ Inventar URLs
❌ Mostrar "10 ofertas" si solo tienes 3 reales
❌ Usar datos de "ejemplo" o "muestra"

SOLO muestra datos REALES que obtengas de searchJobs.`,
      tools: [
        {
          type: "function",
          function: {
            name: "checkCacheStatus",
            description: "Verifica el estado del caché de ofertas: última actualización, cantidad de ofertas y si necesita actualizarse. Llama SIEMPRE a esta función al iniciar una búsqueda.",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "refreshJobs",
            description: "Fuerza la actualización del caché descargando nuevas ofertas del feed XML. Úsalo cuando el caché esté desactualizado (más de 24 horas) o vacío.",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "searchJobs",
            description: "Busca ofertas de empleo en el caché con filtros opcionales. Siempre verifica primero que el caché esté actualizado con checkCacheStatus.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Término de búsqueda: puesto de trabajo, empresa o palabra clave (ej: chef, camarero, Meliá)"
                },
                location: {
                  type: "string",
                  description: "Ciudad o región donde buscar (ej: Madrid, Barcelona, Valencia)"
                },
                category: {
                  type: "string",
                  description: "Categoría del puesto (ej: Cocina, Sala, Recepción, RRHH)"
                },
                limit: {
                  type: "string",
                  description: "Número máximo de resultados a devolver (default: 50)"
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

    console.log('✅ Assistant creado exitosamente');
    console.log(`📝 ID: ${assistant.id}`);
    console.log(`📝 Name: ${assistant.name}`);

    return res.status(200).json({
      success: true,
      assistant_id: assistant.id,
      name: assistant.name,
      model: assistant.model,
      message: '✅ Assistant creado exitosamente. IMPORTANTE: Guarda el assistant_id en tus variables de entorno de Vercel como OPENAI_ASSISTANT_ID',
      next_steps: [
        '1. Copia el assistant_id que aparece arriba',
        '2. Ve a Vercel Dashboard → Settings → Environment Variables',
        '3. Crea una nueva variable: OPENAI_ASSISTANT_ID = [el ID que copiaste]',
        '4. Redeploy el proyecto para que tome la nueva variable'
      ]
    });

  } catch (error) {
    console.error('❌ Error creando Assistant:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
}

