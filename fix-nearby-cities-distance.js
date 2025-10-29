import fs from 'fs';

const searchJsContent = `import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let jobSynonyms = null;
let cityCoordinates = null;

function loadSynonyms() {
  if (!jobSynonyms) {
    try {
      const synonymsPath = path.join(__dirname, '../../data/job_id_to_names.json');
      const jobIdToNames = JSON.parse(fs.readFileSync(synonymsPath, 'utf-8'));
      jobSynonyms = {};
      for (const jobId in jobIdToNames) {
        const names = jobIdToNames[jobId];
        const normalized = names.map(n => n.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''));
        normalized.forEach(name => { jobSynonyms[name] = normalized; });
      }
    } catch (error) { jobSynonyms = {}; }
  }
  return jobSynonyms;
}

function loadCityCoordinates() {
  if (!cityCoordinates) {
    try {
      const coordsPath = path.join(__dirname, '../../data/city_coordinates.json');
      cityCoordinates = JSON.parse(fs.readFileSync(coordsPath, 'utf-8'));
    } catch (error) {
      console.error('⚠️  No se pudieron cargar coordenadas de ciudades');
      cityCoordinates = {};
    }
  }
  return cityCoordinates;
}

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
}

function generateSearchHash(query, location, category) {
  const searchKey = \`\${query}|\${location}|\${category}\`.toLowerCase();
  return crypto.createHash('md5').update(searchKey).digest('hex').substring(0, 12);
}

// Calcular distancia entre dos puntos (fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cacheData = await kv.get('job_offers_cache');

    if (!cacheData || !cacheData.offers) {
      return res.status(404).json({
        error: 'cache_empty',
        message: 'No hay datos en caché',
        metadata: cacheData?.metadata || null
      });
    }

    if (cacheData.metadata.status === 'error') {
      return res.status(503).json({
        error: 'cache_error',
        message: 'El último intento de actualización falló',
        metadata: cacheData.metadata
      });
    }

    const { query = '', location = '', category = '', limit = '10', offset = '0' } = req.query;
    const maxResults = parseInt(limit) || 10;
    const startOffset = parseInt(offset) || 0;

    const synonyms = loadSynonyms();
    const normalizedQuery = normalizeText(query);
    const queryTerms = normalizedQuery ? (synonyms[normalizedQuery] || [normalizedQuery]) : [];

    const locationLower = normalizeText(location);
    const categoryLower = normalizeText(category);

    const searchHash = generateSearchHash(query, location, category);
    const cacheKey = \`search_results:\${searchHash}\`;

    let matchedIds = await kv.get(cacheKey);

    if (!matchedIds) {
      const startTime = Date.now();

      const filteredOffers = cacheData.offers.filter(job => {
        const title = normalizeText(job.titulo || job.title || '');
        const description = normalizeText(job.descripcion || job.description || '');
        const company = normalizeText(job.empresa || job.company || '');

        const queryMatch = !query || queryTerms.some(term =>
          title.includes(term) || description.includes(term) || company.includes(term)
        );

        const city = normalizeText(job.ciudad || job.city || '');
        const region = normalizeText(job.region || '');

        const locationMatch = !location || city.includes(locationLower) || region.includes(locationLower);

        const categoryField = normalizeText(job.categoria || job.category || '');
        const categoryMatch = !category || categoryField.includes(categoryLower);

        return queryMatch && locationMatch && categoryMatch;
      });

      matchedIds = filteredOffers.map(job => job.id || job.guid);

      await kv.set(cacheKey, matchedIds, { ex: 300 });

      const filterTime = Date.now() - startTime;
      console.log(\`🔍 Cache miss - Filtrado en \${filterTime}ms - \${matchedIds.length} resultados\`);
    } else {
      console.log(\`⚡ Cache hit - \${matchedIds.length} resultados\`);
    }

    const totalMatches = matchedIds.length;
    const paginatedIds = matchedIds.slice(startOffset, startOffset + maxResults);

    const results = paginatedIds
      .map(id => cacheData.offers.find(job => (job.id || job.guid) === id))
      .filter(job => job !== undefined);

    const lastUpdate = new Date(cacheData.metadata.last_updated);
    const now = new Date();
    const ageMinutes = Math.round((now - lastUpdate) / (1000 * 60));

    const hasMore = startOffset + maxResults < totalMatches;
    const remainingResults = hasMore ? totalMatches - (startOffset + maxResults) : 0;

    // ENRIQUECIMIENTO: Nearby Cities con DISTANCIA REAL
    let nearbyCities = null;
    if (location && totalMatches < 10 && startOffset === 0) {
      try {
        const coords = loadCityCoordinates();
        const originCoords = coords[locationLower];

        if (!originCoords) {
          console.log(\`⚠️  No hay coordenadas para: \${location}\`);
        } else {
          const citiesWithDistance = new Map();

          cacheData.offers.forEach(job => {
            const city = normalizeText(job.ciudad || job.city || '');
            if (city && city !== locationLower && coords[city]) {
              const distance = calculateDistance(
                originCoords.lat, originCoords.lon,
                coords[city].lat, coords[city].lon
              );

              // Solo ciudades dentro de 50km
              if (distance <= 50) {
                if (!citiesWithDistance.has(city)) {
                  citiesWithDistance.set(city, { distance, jobs: [] });
                }

                const title = normalizeText(job.titulo || job.title || '');
                const description = normalizeText(job.descripcion || job.description || '');
                const company = normalizeText(job.empresa || job.company || '');
                const queryMatch = !query || queryTerms.some(term =>
                  title.includes(term) || description.includes(term) || company.includes(term)
                );

                const categoryField = normalizeText(job.categoria || job.category || '');
                const categoryMatch = !category || categoryField.includes(categoryLower);

                if (queryMatch && categoryMatch) {
                  citiesWithDistance.get(city).jobs.push(job);
                }
              }
            }
          });

          // Ordenar por DISTANCIA, no por número de ofertas
          nearbyCities = Array.from(citiesWithDistance.entries())
            .filter(([city, data]) => data.jobs.length > 0)
            .sort((a, b) => a[1].distance - b[1].distance) // Ordenar por distancia
            .slice(0, 3)
            .map(([city, data]) => ({
              city_name: city.charAt(0).toUpperCase() + city.slice(1),
              distance: \`\${Math.round(data.distance)} km\`,
              results_count: data.jobs.length,
              results: data.jobs.slice(0, 5)
            }));

          if (nearbyCities.length > 0) {
            console.log(\`🌆 Nearby cities: \${nearbyCities.map(c => \`\${c.city_name} (\${c.distance})\`).join(', ')}\`);
          }
        }
      } catch (error) {
        console.error('⚠️  Error enriqueciendo nearby_cities:', error.message);
      }
    }

    return res.status(200).json({
      success: true,
      metadata: {
        ...cacheData.metadata,
        cache_age_minutes: ageMinutes,
        query_params: {
          query,
          location,
          category,
          limit: maxResults,
          offset: startOffset,
          expanded_terms: queryTerms.length > 1 ? queryTerms : undefined
        }
      },
      pagination: {
        total_matches: totalMatches,
        returned_results: results.length,
        offset: startOffset,
        limit: maxResults,
        has_more: hasMore,
        remaining: remainingResults,
        next_offset: hasMore ? startOffset + maxResults : null
      },
      results: results,
      ...(nearbyCities && nearbyCities.length > 0 && { nearby_cities: nearbyCities })
    });

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
`;

fs.writeFileSync('./api/jobs/search.js', searchJsContent);
console.log('✅ search.js actualizado con cálculo de distancia REAL');
console.log('   - Usa fórmula de Haversine para calcular km reales');
console.log('   - Filtra solo ciudades dentro de 50km');
console.log('   - Ordena por distancia, NO por número de ofertas');
