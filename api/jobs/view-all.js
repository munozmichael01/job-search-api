import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cacheData = await kv.get('job_offers_cache');

    if (!cacheData || !cacheData.offers) {
      return res.status(404).json({
        error: 'No hay datos en caché'
      });
    }

    const { show_enriched = 'true', limit = '10' } = req.query;
    const maxResults = parseInt(limit);
    const showEnriched = show_enriched === 'true';

    let offers = cacheData.offers;

    // Filtrar solo las que tienen datos enriquecidos si se solicita
    if (showEnriched) {
      offers = offers.filter(o => o.enriched);
    }

    // Limitar resultados
    const results = offers.slice(0, maxResults);

    // Estadísticas
    const stats = {
      total_offers: cacheData.offers.length,
      offers_with_related_jobs: cacheData.offers.filter(o => o.enriched?.related_jobs?.length > 0).length,
      offers_with_nearby_cities: cacheData.offers.filter(o => o.enriched?.nearby_cities?.length > 0).length,
      showing: results.length
    };

    return res.status(200).json({
      success: true,
      metadata: cacheData.metadata,
      statistics: stats,
      offers: results
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
