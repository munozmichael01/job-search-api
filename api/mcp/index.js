// api/mcp/index.js
// MCP Server compatible con Agent Builder - Versión corregida

export default async function handler(req, res) {
  const baseUrl = `https://${req.headers.host}`;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log para debug
  console.log('MCP Request:', {
    method: req.method,
    path: req.url,
    body: req.body
  });

  try {
    // Manejo de diferentes tipos de requests MCP
    if (req.method === 'POST') {
      const body = req.body || {};

      // Protocolo MCP standard
      if (body.jsonrpc === '2.0') {
        return handleJsonRpcRequest(req, res, body, baseUrl);
      }

      // Fallback para otros formatos
      if (body.method) {
        return handleMethodRequest(req, res, body, baseUrl);
      }
    }

    // GET request - devolver capabilities
    if (req.method === 'GET') {
      return res.status(200).json({
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'job-search-mcp',
          version: '1.0.0'
        },
        capabilities: {
          tools: {
            listChanged: false
          }
        }
      });
    }

    return res.status(400).json({
      error: 'Invalid request format'
    });

  } catch (error) {
    console.error('MCP Error:', error);
    return res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Handler para JSON-RPC 2.0
async function handleJsonRpcRequest(req, res, body, baseUrl) {
  const { method, params, id } = body;

  if (method === 'tools/list') {
    return res.status(200).json({
      jsonrpc: '2.0',
      id: id,
      result: {
        tools: getToolsList()
      }
    });
  }

  if (method === 'tools/call') {
    const toolName = params.name;
    const args = params.arguments || {};

    const result = await executeToolCall(toolName, args, baseUrl);

    return res.status(200).json({
      jsonrpc: '2.0',
      id: id,
      result: {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      }
    });
  }

  return res.status(400).json({
    jsonrpc: '2.0',
    id: id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  });
}

// Handler para requests sin JSON-RPC
async function handleMethodRequest(req, res, body, baseUrl) {
  const { method, params } = body;

  if (method === 'tools/list') {
    return res.status(200).json({
      tools: getToolsList()
    });
  }

  if (method === 'tools/call') {
    const toolName = params.name;
    const args = params.arguments || {};

    const result = await executeToolCall(toolName, args, baseUrl);

    return res.status(200).json({
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    });
  }

  return res.status(400).json({
    error: `Unknown method: ${method}`
  });
}

// Lista de herramientas disponibles
function getToolsList() {
  return [
    {
      name: 'check_cache_status',
      description: 'Verifica el estado del caché de ofertas: última actualización, cantidad de ofertas y si necesita actualizarse. Llama SIEMPRE a esta función al iniciar una búsqueda.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'refresh_jobs',
      description: 'Fuerza la actualización del caché descargando nuevas ofertas del feed XML. Úsalo cuando el caché esté desactualizado (más de 24 horas) o vacío.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'search_jobs',
      description: 'Busca ofertas de empleo en el caché con filtros opcionales. Siempre verifica primero que el caché esté actualizado con check_cache_status.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda: puesto de trabajo, empresa o palabra clave (ej: chef, camarero, Meliá)'
          },
          location: {
            type: 'string',
            description: 'Ciudad o región donde buscar (ej: Madrid, Barcelona, Valencia)'
          },
          category: {
            type: 'string',
            description: 'Categoría del puesto (ej: Cocina, Sala, Recepción, RRHH)'
          },
          limit: {
            type: 'string',
            description: 'Número máximo de resultados a devolver (default: 10)'
          }
        },
        required: ['query']
      }
    }
  ];
}

// Ejecutar llamada a herramienta
async function executeToolCall(toolName, args, baseUrl) {
  if (toolName === 'check_cache_status') {
    const response = await fetch(`${baseUrl}/api/jobs/status`);
    const data = await response.json();

    if (!data.cached) {
      return '❌ **Caché vacío**\n\nNo hay datos disponibles. Es necesario ejecutar refresh_jobs para inicializar.';
    }

    const cacheAge = data.cache_age || {};
    const metadata = data.metadata || {};

    if (cacheAge.is_expired) {
      return `⚠️ **Caché desactualizado**\n\nÚltima actualización: hace ${cacheAge.hours} horas\nTotal de ofertas: ${metadata.total_jobs}\n\n💡 Recomendación: Ejecuta refresh_jobs para obtener ofertas actualizadas.`;
    }

    return `✅ **Caché actualizado**\n\nÚltima actualización: hace ${cacheAge.hours} horas\nTotal de ofertas: ${metadata.total_jobs}\n\nLas ofertas están listas para búsqueda.`;
  }

  if (toolName === 'refresh_jobs') {
    const response = await fetch(`${baseUrl}/api/jobs/refresh`);
    const data = await response.json();

    if (data.success) {
      return `✅ **Caché actualizado exitosamente**\n\nOfertas descargadas: ${data.total_jobs}\nTimestamp: ${data.timestamp}\n\nYa puedes usar search_jobs para buscar ofertas actualizadas.`;
    }

    return `❌ **Error al actualizar caché**\n\nError: ${data.error}\n\nIntenta de nuevo en unos minutos.`;
  }

  if (toolName === 'search_jobs') {
    const params = new URLSearchParams();
    if (args.query) params.append('query', args.query);
    if (args.location) params.append('location', args.location);
    if (args.category) params.append('category', args.category);
    if (args.limit) params.append('limit', args.limit);

    const response = await fetch(`${baseUrl}/api/jobs/search?${params}`);
    const data = await response.json();

    if (!data.success) {
      return `❌ **Error en búsqueda**\n\n${data.message}\n\n${data.metadata?.error_message || ''}`;
    }

    const results = data.results || [];
    const totalMatches = data.total_matches || 0;

    if (!results.length) {
      return `🔍 No se encontraron ofertas\n\nBúsqueda: ${args.query}\n${args.location ? `Ubicación: ${args.location}\n` : ''}\n💡 Intenta:\n- Usar términos más generales\n- Revisar la ortografía\n- Buscar sin filtros de ubicación`;
    }

    let text = `✅ Encontré **${totalMatches}** ofertas relevantes\n📊 Mostrando: ${results.length} resultados\n\n`;

    results.slice(0, 5).forEach((job, i) => {
      text += `**${i + 1}. ${job.titulo}**\n`;
      text += `🏛️ ${job.empresa}\n`;
      text += `📍 ${job.ciudad}, ${job.region}\n`;
      text += `💼 ${job.categoria}\n`;
      text += `💰 ${job.salario}\n`;
      text += `⏰ ${job.tipo_jornada}\n\n`;
      text += `🔗 Ver oferta: ${job.url}\n`;
      text += `✅ Aplicar: ${job.url_aplicar}\n\n`;
      text += `---\n\n`;
    });

    if (totalMatches > results.length) {
      text += `\n📌 Hay ${totalMatches - results.length} ofertas más. Ajusta los filtros para ver más resultados.`;
    }

    return text;
  }

  throw new Error(`Herramienta desconocida: ${toolName}`);
}
