import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// Ejecutar las funciones cuando el Assistant las llame
async function executeFunctionCall(functionName, functionArgs) {
  // Usar siempre la URL de producción
  const baseUrl = 'https://job-search-api-psi.vercel.app';

  console.log(`🔧 Ejecutando función: ${functionName}`);
  console.log(`📋 Argumentos:`, functionArgs);
  console.log(`🌐 Base URL: ${baseUrl}`);

  try {
    if (functionName === 'checkCacheStatus') {
      const response = await fetch(`${baseUrl}/api/jobs/status`);
      const data = await response.json();
      return JSON.stringify(data);
    }

    if (functionName === 'refreshJobs') {
      const response = await fetch(`${baseUrl}/api/jobs/refresh`);
      const data = await response.json();
      return JSON.stringify(data);
    }

    if (functionName === 'searchJobs') {
      const params = new URLSearchParams();
      if (functionArgs.query) params.append('query', functionArgs.query);
      if (functionArgs.location) params.append('location', functionArgs.location);
      if (functionArgs.category) params.append('category', functionArgs.category);
      if (functionArgs.limit) params.append('limit', functionArgs.limit);
      if (functionArgs.offset !== undefined) params.append('offset', functionArgs.offset);

      const response = await fetch(`${baseUrl}/api/jobs/search?${params.toString()}`);
      const data = await response.json();
      return JSON.stringify(data);
    }

    throw new Error(`Función desconocida: ${functionName}`);
  } catch (error) {
    console.error(`❌ Error ejecutando ${functionName}:`, error);
    return JSON.stringify({ 
      error: error.message,
      success: false 
    });
  }
}

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

  const { thread_id, message } = req.body;

  if (!thread_id || !message) {
    return res.status(400).json({ 
      error: 'Se requiere thread_id y message' 
    });
  }

  if (!ASSISTANT_ID) {
    return res.status(500).json({ 
      error: 'OPENAI_ASSISTANT_ID no configurado en variables de entorno' 
    });
  }

  try {
    console.log(`💬 Enviando mensaje al thread: ${thread_id}`);
    console.log(`📝 Mensaje: ${message}`);

    // 1. Agregar el mensaje del usuario al thread
    await openai.beta.threads.messages.create(thread_id, {
      role: 'user',
      content: message,
    });

    // 2. Ejecutar el Assistant
    const run = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: ASSISTANT_ID,
    });

    console.log(`🏃 Run iniciado: ${run.id}`);

    // 3. Esperar a que termine, manejando function calls
    let runStatus = await openai.beta.threads.runs.retrieve(thread_id, run.id);
    
    // Timeout de 120 segundos (Plan Pro soporta hasta 300s)
    const maxAttempts = 120;
    let attempts = 0;

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
      
      runStatus = await openai.beta.threads.runs.retrieve(thread_id, run.id);
      console.log(`📊 Status: ${runStatus.status}`);

      // Si el Assistant requiere ejecutar funciones
      if (runStatus.status === 'requires_action') {
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        
        console.log(`🔧 Se requieren ${toolCalls.length} llamadas a funciones`);

        // Ejecutar todas las funciones requeridas
        const toolOutputs = await Promise.all(
          toolCalls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            const output = await executeFunctionCall(functionName, functionArgs);
            
            return {
              tool_call_id: toolCall.id,
              output: output,
            };
          })
        );

        console.log(`✅ Funciones ejecutadas, enviando resultados...`);

        // Enviar los resultados de las funciones al Assistant
        await openai.beta.threads.runs.submitToolOutputs(thread_id, run.id, {
          tool_outputs: toolOutputs,
        });
      }

      if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
        throw new Error(`Run falló con status: ${runStatus.status}`);
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Timeout: El Assistant tardó demasiado en responder');
    }

    // 4. Obtener los mensajes (solo el último del assistant)
    const messages = await openai.beta.threads.messages.list(thread_id, {
      order: 'desc',
      limit: 1,
    });

    const lastMessage = messages.data[0];
    
    if (!lastMessage || lastMessage.role !== 'assistant') {
      throw new Error('No se recibió respuesta del Assistant');
    }

    // Extraer el texto de la respuesta
    const responseText = lastMessage.content
      .filter(content => content.type === 'text')
      .map(content => content.text.value)
      .join('\n');

    console.log(`✅ Respuesta obtenida: ${responseText.substring(0, 100)}...`);

    return res.status(200).json({
      success: true,
      message: responseText,
      thread_id: thread_id,
      run_id: run.id
    });

  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

