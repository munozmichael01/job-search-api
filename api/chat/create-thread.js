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
    console.log('🆕 Creando nuevo thread...');

    // Crear un nuevo thread (conversación)
    const thread = await openai.beta.threads.create();

    console.log(`✅ Thread creado: ${thread.id}`);

    return res.status(200).json({
      success: true,
      thread_id: thread.id,
      message: 'Thread creado exitosamente. Guarda este ID para continuar la conversación.'
    });

  } catch (error) {
    console.error('❌ Error creando thread:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

