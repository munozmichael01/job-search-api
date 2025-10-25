#!/usr/bin/env node

/**
 * MCP Server Local para Turijobs
 * Compatible con OpenAI Agent Builder y Claude Desktop
 * Usa stdio como transporte según el protocolo MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// URL de tu API en Vercel (cambiar después del deploy)
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Crear servidor MCP
const server = new Server(
  {
    name: 'turijobs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Lista de herramientas disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'check_cache_status',
        description: 'Verifica el estado del caché de ofertas de Turijobs: última actualización, cantidad de ofertas y si necesita actualizarse. SIEMPRE llama a esta función primero antes de buscar ofertas.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'refresh_jobs',
        description: 'Fuerza la actualización del caché descargando nuevas ofertas del feed XML de Turijobs. Úsalo cuando el caché esté desactualizado (más de 24 horas) o vacío.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'search_jobs',
        description: 'Busca ofertas de empleo de Turijobs en el caché con filtros opcionales. Devuelve ofertas reales del sector turístico con información completa (título, empresa, ubicación, salario, tipo de jornada, descripción y enlaces para aplicar). Siempre verifica primero que el caché esté actualizado con check_cache_status.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Término de búsqueda: puesto de trabajo, empresa o palabra clave. Ejemplos: "chef", "camarero", "recepcionista", "Meliá", "cocinero", "gerente hotel"'
            },
            location: {
              type: 'string',
              description: 'Ciudad o región donde buscar. Ejemplos: "Madrid", "Barcelona", "Valencia", "Málaga", "Islas Baleares", "Canarias"'
            },
            category: {
              type: 'string',
              description: 'Categoría del puesto. Ejemplos: "Cocina", "Sala", "Recepción", "Dirección", "RRHH", "Mantenimiento"'
            },
            limit: {
              type: 'string',
              description: 'Número máximo de resultados a devolver. Por defecto: 50. Rango recomendado: 5-100'
            }
          },
          required: ['query'],
          additionalProperties: false
        }
      }
    ]
  };
});

// Ejecutar herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    console.error(`[MCP] Ejecutando tool: ${name}`, args);

    if (name === 'check_cache_status') {
      const response = await fetch(`${API_BASE_URL}/api/jobs/status`);
      
      if (!response.ok) {
        throw new Error(`Status endpoint falló con código ${response.status}`);
      }

      const data = await response.json();

      if (!data.cached) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ **Caché vacío**\n\nNo hay datos disponibles. Es necesario ejecutar refresh_jobs primero para descargar las ofertas de Turijobs.'
            }
          ]
        };
      }

      const cacheAge = data.cache_age || {};
      const metadata = data.metadata || {};

      if (cacheAge.is_expired) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ **Caché desactualizado**\n\nÚltima actualización: hace ${cacheAge.hours} horas\nTotal de ofertas: ${metadata.total_jobs}\n\n💡 Recomendación: Ejecuta refresh_jobs para obtener las ofertas más recientes de Turijobs.`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Caché actualizado**\n\nÚltima actualización: hace ${cacheAge.hours} horas\nTotal de ofertas de Turijobs: ${metadata.total_jobs}\n\nLas ofertas están listas para búsqueda.`
          }
        ]
      };
    }

    if (name === 'refresh_jobs') {
      const response = await fetch(`${API_BASE_URL}/api/jobs/refresh`);
      
      if (!response.ok) {
        throw new Error(`Refresh endpoint falló con código ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ **Ofertas de Turijobs actualizadas**\n\nOfertas descargadas del feed XML: ${data.total_jobs}\nTimestamp: ${data.timestamp}\n\n✨ Ya puedes buscar entre todas las ofertas activas del sector turístico usando search_jobs.`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error al actualizar ofertas**\n\nError: ${data.error}\n\nPor favor, intenta de nuevo en unos minutos.`
          }
        ]
      };
    }

    if (name === 'search_jobs') {
      const params = new URLSearchParams();
      if (args.query) params.append('query', args.query);
      if (args.location) params.append('location', args.location);
      if (args.category) params.append('category', args.category);
      params.append('limit', args.limit || '50');

      const url = `${API_BASE_URL}/api/jobs/search?${params.toString()}`;
      console.error(`[MCP] Buscando en: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Search endpoint falló con código ${response.status}`);
      }

      const data = await response.json();
      console.error(`[MCP] Resultados: ${data.total_matches} coincidencias, mostrando ${data.returned_results}`);

      if (!data.success) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Error en búsqueda**\n\n${data.message}\n\n${data.metadata?.error_message || ''}`
            }
          ]
        };
      }

      const results = data.results || [];
      const totalMatches = data.total_matches || 0;

      if (!results.length) {
        let searchInfo = `Búsqueda: "${args.query}"`;
        if (args.location) searchInfo += `\nUbicación: ${args.location}`;
        if (args.category) searchInfo += `\nCategoría: ${args.category}`;

        return {
          content: [
            {
              type: 'text',
              text: `🔍 **No se encontraron ofertas**\n\n${searchInfo}\n\n💡 Sugerencias:\n- Usa términos más generales (ej: "cocina" en vez de "chef de cocina internacional")\n- Revisa la ortografía\n- Busca sin filtros de ubicación o categoría\n- Intenta con sinónimos (ej: "camarero" o "mesero")`
            }
          ]
        };
      }

      // Formatear resultados con datos reales del XML
      let text = `✨ **Encontré ${totalMatches} ofertas de Turijobs**\n📊 Mostrando: ${results.length} resultado${results.length > 1 ? 's' : ''}\n\n`;

      results.forEach((job, i) => {
        text += `**${i + 1}. ${job.titulo}**\n`;
        text += `🏢 Empresa: ${job.empresa}\n`;
        text += `📍 Ubicación: ${job.ciudad}${job.region ? `, ${job.region}` : ''}\n`;
        text += `💼 Categoría: ${job.categoria}\n`;
        
        if (job.salario && job.salario !== 'No especificado') {
          text += `💰 Salario: ${job.salario}\n`;
        }
        
        if (job.tipo_jornada && job.tipo_jornada !== 'No especificado') {
          text += `⏰ Tipo de jornada: ${job.tipo_jornada}\n`;
        }

        if (job.num_vacantes && job.num_vacantes !== '1') {
          text += `👥 Vacantes: ${job.num_vacantes}\n`;
        }

        // Descripción resumida (primeros 200 caracteres)
        if (job.descripcion) {
          const desc = job.descripcion.substring(0, 200).trim();
          text += `\n📝 ${desc}${job.descripcion.length > 200 ? '...' : ''}\n`;
        }

        text += `\n🔗 **Ver oferta completa:** ${job.url}\n`;
        if (job.url_aplicar) {
          text += `✅ **Aplicar directamente:** ${job.url_aplicar}\n`;
        }
        text += `\n${'─'.repeat(50)}\n\n`;
      });

      if (totalMatches > results.length) {
        text += `\n📌 **Hay ${totalMatches - results.length} ofertas más** que coinciden con tu búsqueda. Puedes ajustar los filtros o aumentar el límite para ver más resultados.`;
      }

      return {
        content: [
          {
            type: 'text',
            text: text
          }
        ]
      };
    }

    throw new Error(`Herramienta desconocida: ${name}`);

  } catch (error) {
    console.error(`[MCP] Error en ${name}:`, error);
    
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error técnico**\n\nNo se pudo ejecutar ${name}: ${error.message}\n\nVerifica que la API esté disponible en ${API_BASE_URL}`
        }
      ],
      isError: true
    };
  }
});

// Iniciar servidor con stdio transport
async function main() {
  const transport = new StdioServerTransport();
  console.error('[MCP] Iniciando servidor Turijobs MCP...');
  console.error(`[MCP] API Base URL: ${API_BASE_URL}`);
  
  await server.connect(transport);
  console.error('[MCP] Servidor conectado y listo');
}

main().catch((error) => {
  console.error('[MCP] Error fatal:', error);
  process.exit(1);
});

