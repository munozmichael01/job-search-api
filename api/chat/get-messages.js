import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { thread_id, limit = '20' } = req.query;

  if (!thread_id) {
    return res.status(400).json({ 
      error: 'Se requiere thread_id como parámetro' 
    });
  }

  try {
    console.log(`📜 Obteniendo mensajes del thread: ${thread_id}`);

    // Obtener mensajes del thread
    const messages = await openai.beta.threads.messages.list(thread_id, {
      order: 'asc', // Del más antiguo al más nuevo
      limit: parseInt(limit),
    });

    // Formatear mensajes
    const formattedMessages = messages.data.map(message => ({
      id: message.id,
      role: message.role,
      content: message.content
        .filter(content => content.type === 'text')
        .map(content => content.text.value)
        .join('\n'),
      created_at: message.created_at,
      timestamp: new Date(message.created_at * 1000).toISOString()
    }));

    console.log(`✅ ${formattedMessages.length} mensajes obtenidos`);

    return res.status(200).json({
      success: true,
      thread_id: thread_id,
      messages: formattedMessages,
      total: formattedMessages.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo mensajes:', error);
    
    // Si el thread no existe
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Thread no encontrado. Puede que haya expirado o no exista.'
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

