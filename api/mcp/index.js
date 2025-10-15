// api/mcp/index.js
// Endpoint MCP compatible con Agent Builder

export default async function handler(req, res) {
  // La URL base se obtiene automáticamente de Vercel
  const baseUrl = `https://${req.headers.host}`;

  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Información del servidor MCP
  if (req.method === 'GET') {
    return res.status(200).json({
      name: 'job-search-mcp',
      version: '1.0.0',
      description: 'MCP Server para búsqueda de empleos',
      protocol_version: '2024-11-05',
      capabilities: {
        tools: {}
      },
      tools: [
        {
          name: 'check_cache_status',
          description: 'Verifica el estado del caché de ofertas: última actualización, cantidad de ofertas y si necesita actualizarse.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'refresh_jobs',
          description: 'Actualiza el caché descargando nuevas ofertas del feed XML.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'search_jobs',
          description: 'Busca ofertas de empleo con filtros opcionales.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Término de búsqueda: puesto, empresa o palabra clave'
              },
              location: {
                type: 'string',
                description: 'Ciudad o región'
              },
              category: {
                type: 'string',
                description: 'Categoría del puesto'
              },
              limit: {
                type: 'string',
                description: 'Número máximo de resultados'
              }
            },
            required: ['query']
          }
        }
      ]
    });
  }

  // POST - Ejecutar herramientas
  if (req.method === 'POST') {
    try {
      const { method, params } = req.body;

      // Listar herramientas disponibles
      if (method === 'tools/list') {
        return res.status(200).json({
          tools: [
            {
              name: 'check_cache_status',
              description: 'Verifica el estado del caché de ofertas',
              inputSchema: { type: 'object', properties: {}, required: [] }
            },
            {
              name: 'refresh_jobs',
              description: 'Actualiza el caché',
              inputSchema: { type: 'object', properties: {}, required: [] }
            },
            {
              name: 'search_jobs',
              description: 'Busca ofertas',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  location: { type: 'string' },
                  category: { type: 'string' },
                  limit: { type: 'string' }
                },
                required: ['query']
              }
            }
          ]
        });
      }

      // Ejecutar herramienta
      if (method === 'tools/call') {
        const toolName = params.name;
        const args = params.arguments || {};
        let result;

        if (toolName === 'check_cache_status') {
          const response = await fetch(`${baseUrl}/api/jobs/status`);
          const data = await response.json();

          if (!data.cached) {
            result = '❌ **Caché vacío**\n\nNo hay datos. Ejecuta refresh_jobs primero.';
          } else {
            const cacheAge = data.cache_age || {};
            const metadata = data.metadata || {};

            if (cacheAge.is_expired) {
              result = `⚠️ **Caché desactualizado**\n\nÚltima actualización: hace ${cacheAge.hours} horas\nTotal: ${metadata.total_jobs} ofertas\n\nRecomendación: Ejecuta refresh_jobs.`;
            } else {
              result = `✅ **Caché actualizado**\n\nÚltima actualización: hace ${cacheAge.hours} horas\nTotal: ${metadata.total_jobs} ofertas\n\nListo para búsqueda.`;
            }
          }
        }
        else if (toolName === 'refresh_jobs') {
          const response = await fetch(`${baseUrl}/api/jobs/refresh`);
          const data = await response.json();

          if (data.success) {
            result = `✅ **Caché actualizado**\n\nOfertas descargadas: ${data.total_jobs}\nTimestamp: ${data.timestamp}\n\nYa puedes buscar ofertas.`;
          } else {
            result = `❌ Error al actualizar: ${data.error}`;
          }
        }
        else if (toolName === 'search_jobs') {
          const params = new URLSearchParams();
          if (args.query) params.append('query', args.query);
          if (args.location) params.append('location', args.location);
          if (args.category) params.append('category', args.category);
          if (args.limit) params.append('limit', args.limit);

          const response = await fetch(`${baseUrl}/api/jobs/search?${params}`);
          const data = await response.json();

          if (!data.success) {
            result = `❌ Error: ${data.message || 'Error en búsqueda'}`;
          } else {
            const results = data.results || [];
            const totalMatches = data.total_matches || 0;

            if (results.length === 0) {
              result = `🔍 No se encontraron ofertas\n\nBúsqueda: ${args.query}\n${args.location ? `Ubicación: ${args.location}\n` : ''}\nIntenta términos más generales.`;
            } else {
              result = `✅ Encontré **${totalMatches}** ofertas\n\n`;

              results.slice(0, 5).forEach((job, i) => {
                result += `**${i + 1}. ${job.titulo}**\n`;
                result += `🏛️ ${job.empresa}\n`;
                result += `📍 ${job.ciudad}, ${job.region}\n`;
                result += `💼 ${job.categoria}\n`;
                result += `💰 ${job.salario}\n\n`;
                result += `🔗 ${job.url}\n`;
                result += `✅ Aplicar: ${job.url_aplicar}\n\n`;
                result += `---\n\n`;
              });
            }
          }
        }
        else {
          return res.status(400).json({ error: `Herramienta desconocida: ${toolName}` });
        }

        return res.status(200).json({
          content: [{ type: 'text', text: result }]
        });
      }

      return res.status(400).json({ error: 'Método desconocido' });

    } catch (error) {
      console.error('Error en MCP:', error);
      return res.status(500).json({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
