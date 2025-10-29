import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// Ejecutar las funciones cuando el Assistant las llame
async function executeFunctionCall(functionName, functionArgs) {
  const baseUrl = 'https://job-search-api-psi.vercel.app';

  console.log(`🔧 Ejecutando función: ${functionName}`);
  console.log(`📋 Argumentos:`, functionArgs);

  try {
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
    console.log(`💬 Enviando mensaje al thread (STREAMING): ${thread_id}`);
    console.log(`📝 Mensaje: ${message}`);

    // Configure SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 1. Agregar el mensaje del usuario al thread
    await openai.beta.threads.messages.create(thread_id, {
      role: 'user',
      content: message,
    });

    // 2. Crear run con streaming
    const stream = await openai.beta.threads.runs.create(thread_id, {
      assistant_id: ASSISTANT_ID,
      stream: true
    });

    console.log(`🏃 Run con streaming iniciado`);

    let accumulatedText = '';

    // 3. Procesar el stream
    for await (const event of stream) {
      // Enviar evento de status
      if (event.event === 'thread.run.created' || event.event === 'thread.run.in_progress') {
        res.write(`data: ${JSON.stringify({ type: 'status', content: 'thinking' })}\n\n`);
      }

      // Function calling - necesitamos manejarlo sin streaming
      if (event.event === 'thread.run.requires_action') {
        res.write(`data: ${JSON.stringify({ type: 'status', content: 'calling_function' })}\n\n`);

        const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;

        console.log(`🔧 Se requieren ${toolCalls.length} llamadas a funciones`);

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

        // Enviar los resultados - esto reiniciará el stream
        await openai.beta.threads.runs.submitToolOutputs(
          thread_id,
          event.data.id,
          { tool_outputs: toolOutputs }
        );

        res.write(`data: ${JSON.stringify({ type: 'status', content: 'processing_results' })}\n\n`);
      }

      // Contenido de texto
      if (event.event === 'thread.message.delta') {
        const delta = event.data.delta;
        if (delta.content && delta.content[0] && delta.content[0].text) {
          const chunk = delta.content[0].text.value;
          accumulatedText += chunk;

          // Enviar chunk al cliente
          res.write(`data: ${JSON.stringify({
            type: 'content',
            content: chunk,
            accumulated: accumulatedText
          })}\n\n`);
        }
      }

      // Run completado
      if (event.event === 'thread.run.completed') {
        console.log(`✅ Streaming completado`);
        res.write(`data: ${JSON.stringify({
          type: 'done',
          thread_id: thread_id,
          run_id: event.data.id,
          full_message: accumulatedText
        })}\n\n`);
        res.end();
        return;
      }

      // Errores
      if (event.event === 'thread.run.failed' || event.event === 'thread.run.cancelled' || event.event === 'thread.run.expired') {
        console.error(`❌ Run falló: ${event.event}`);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          content: `Run falló con status: ${event.event}`
        })}\n\n`);
        res.end();
        return;
      }
    }

  } catch (error) {
    console.error('❌ Error en streaming:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      content: error.message
    })}\n\n`);
    res.end();
  }
}
