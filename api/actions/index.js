import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function handler(req, res) {
  // CORS headers para permitir acceso desde OpenAI
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Leer el archivo OpenAPI
    const openapiPath = join(__dirname, 'openapi.json');
    const openapiContent = await readFile(openapiPath, 'utf-8');
    const openapiSpec = JSON.parse(openapiContent);

    // Reemplazar la URL del servidor con la URL actual
    const baseUrl = `https://${req.headers.host}`;
    openapiSpec.servers = [
      {
        url: baseUrl,
        description: 'Production Server'
      }
    ];

    return res.status(200).json(openapiSpec);

  } catch (error) {
    console.error('Error serving OpenAPI spec:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

