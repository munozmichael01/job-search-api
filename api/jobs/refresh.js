import { XMLParser } from 'fast-xml-parser';
import { kv } from '@vercel/kv';

const XML_FEED_URL = "https://feed.turijobs.com/partner/files/774E13F3-9D57-4BD6-920D-3A79A70C6AA2/E9753D5A-0F05-4444-9210-9D02EB15C7D5";

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📥 Descargando ofertas del feed XML...');

    // Descargar XML con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos

    const response = await fetch(XML_FEED_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'JobSearchBot/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log(`📄 XML descargado: ${xmlText.length} caracteres`);

    // Parsear XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "_text",
      parseAttributeValue: true
    });

    const result = parser.parse(xmlText);

    // Extraer jobs (puede estar en result.jobs.job o result.job)
    let jobsArray = [];
    if (result.jobs && result.jobs.job) {
      jobsArray = Array.isArray(result.jobs.job) ? result.jobs.job : [result.jobs.job];
    } else if (result.job) {
      jobsArray = Array.isArray(result.job) ? result.job : [result.job];
    }

    console.log(`📊 Jobs encontrados en XML: ${jobsArray.length}`);

    // Normalizar datos
    const normalizedJobs = jobsArray.map(job => {
      // Función helper para extraer texto de nodos CDATA o normales
      const getText = (field) => {
        if (!field) return '';
        if (typeof field === 'string') return field;
        if (field._text) return field._text;
        if (field['#text']) return field['#text'];
        return String(field);
      };

      // Función para limpiar URLs y agregar UTM params
      const cleanAndAddUTM = (url) => {
        if (!url) return '';
        
        // Eliminar todo después de ? o &
        let cleanUrl = url.split('?')[0].split('&')[0];
        
        // Agregar UTM params
        const utmParams = new URLSearchParams({
          utm_source: 'chatbot_ai',
          utm_medium: 'chat_widget',
          utm_campaign: 'job_search_assistant'
        }).toString();
        
        return `${cleanUrl}?${utmParams}`;
      };

      return {
        id: getText(job.id),
        titulo: getText(job.title),
        empresa: getText(job.company),
        ciudad: getText(job.city),
        region: getText(job.region),
        pais_id: getText(job.idpais),
        categoria: getText(job.category),
        salario: getText(job.salary) || 'No especificado',
        tipo_jornada: getText(job.jobtype) || 'No especificado',
        descripcion: getText(job.content),
        url: cleanAndAddUTM(getText(job.url)),
        url_aplicar: cleanAndAddUTM(getText(job.url_apply)),
        fecha_publicacion: getText(job.publication),
        num_vacantes: getText(job.num_vacancies) || '1'
      };
    });

    // Crear estructura de caché
    const cacheData = {
      metadata: {
        last_update: new Date().toISOString(),
        total_jobs: normalizedJobs.length,
        status: 'success',
        feed_url: XML_FEED_URL
      },
      offers: normalizedJobs
    };

    // Guardar en Vercel KV (expira en 48 horas)
    await kv.set('job_offers_cache', cacheData, { ex: 172800 });

    console.log(`✅ ${normalizedJobs.length} ofertas almacenadas en caché`);

    return res.status(200).json({
      success: true,
      total_jobs: normalizedJobs.length,
      timestamp: cacheData.metadata.last_update,
      message: 'Ofertas actualizadas correctamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar ofertas:', error);

    // Guardar error en metadata
    try {
      const errorMetadata = {
        metadata: {
          last_update: new Date().toISOString(),
          total_jobs: 0,
          status: 'error',
          error_message: error.message,
          feed_url: XML_FEED_URL
        },
        offers: []
      };

      await kv.set('job_offers_cache', errorMetadata, { ex: 3600 });
    } catch (kvError) {
      console.error('Error guardando metadata de error:', kvError);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
