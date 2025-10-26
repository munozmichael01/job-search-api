import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Leer del caché
    const cacheData = await kv.get('job_offers_cache');

    if (!cacheData || !cacheData.offers) {
      return res.status(404).json({
        error: 'cache_empty',
        message: 'No hay datos en caché. Llama primero a /api/jobs/refresh',
        metadata: cacheData?.metadata || null
      });
    }

    // Verificar si el caché está en estado de error
    if (cacheData.metadata.status === 'error') {
      return res.status(503).json({
        error: 'cache_error',
        message: 'El último intento de actualización falló',
        metadata: cacheData.metadata
      });
    }

    // Extraer parámetros de búsqueda
    const {
      query = '',
      location = '',
      category = '',
      limit = '10'
    } = req.query;

    const queryLower = query.toLowerCase();
    const locationLower = location.toLowerCase();
    const categoryLower = category.toLowerCase();
    const maxResults = parseInt(limit) || 10;

    // Filtrar ofertas (soportar campos en español e inglés)
    let results = cacheData.offers.filter(job => {
      // Filtro por query (busca en título, descripción y empresa)
      const title = (job.titulo || job.title || '').toLowerCase();
      const description = (job.descripcion || job.description || '').toLowerCase();
      const company = (job.empresa || job.company || '').toLowerCase();

      const queryMatch = !query ||
        title.includes(queryLower) ||
        description.includes(queryLower) ||
        company.includes(queryLower);

      // Filtro por ubicación (busca en ciudad y región)
      const city = (job.ciudad || job.city || '').toLowerCase();
      const region = (job.region || '').toLowerCase();

      const locationMatch = !location ||
        city.includes(locationLower) ||
        region.includes(locationLower);

      // Filtro por categoría
      const category = (job.categoria || job.category || '').toLowerCase();
      const categoryMatch = !category ||
        category.includes(categoryLower);

      return queryMatch && locationMatch && categoryMatch;
    });

    // Limitar resultados
    const totalMatches = results.length;
    results = results.slice(0, maxResults);

    // Calcular edad del caché
    const lastUpdate = new Date(cacheData.metadata.last_updated);
    const now = new Date();
    const ageMinutes = Math.round((now - lastUpdate) / (1000 * 60));

    return res.status(200).json({
      success: true,
      metadata: {
        ...cacheData.metadata,
        cache_age_minutes: ageMinutes,
        query_params: { query, location, category, limit: maxResults }
      },
      total_matches: totalMatches,
      returned_results: results.length,
      results: results
    });

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
