import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Leer del caché
    const cacheData = await kv.get('job_offers_cache');

    if (!cacheData) {
      return res.status(200).json({
        cached: false,
        status: 'empty',
        message: 'No hay datos en caché. Ejecuta /api/jobs/refresh para inicializar.',
        metadata: null
      });
    }

    // Calcular edad del caché
    const lastUpdate = new Date(cacheData.metadata.last_update);
    const now = new Date();
    const ageMinutes = Math.round((now - lastUpdate) / (1000 * 60));
    const ageHours = Math.round((ageMinutes / 60) * 10) / 10;
    const isExpired = ageHours > 24;

    return res.status(200).json({
      cached: true,
      status: cacheData.metadata.status,
      metadata: cacheData.metadata,
      cache_age: {
        minutes: ageMinutes,
        hours: ageHours,
        is_expired: isExpired
      },
      recommendation: isExpired
        ? 'El caché tiene más de 24 horas. Considera ejecutar /api/jobs/refresh'
        : 'El caché está actualizado'
    });

  } catch (error) {
    console.error('❌ Error verificando status:', error);
    return res.status(500).json({
      error: error.message
    });
  }
}
