import fs from 'fs';

const searchJsContent = `import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let jobSynonyms = null;
let cityDistances = null;

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

function loadCityDistances() {
  if (!cityDistances) {
    try {
      const distancesPath = path.join(__dirname, '../../data/city_distances.json');
      cityDistances = JSON.parse(fs.readFileSync(distancesPath, 'utf-8'));
      console.log(\`✅ Cargadas distancias para \${Object.keys(cityDistances).length} ciudades\`);
    } catch (error) {
      console.error('⚠️  No se pudieron cargar distancias de ciudades:', error.message);
      cityDistances = {};
    }
  }
  return cityDistances;
}

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
}

function generateSearchHash(query, location, category) {
  const searchKey = \`\${query}|\${location}|\${category}\`.toLowerCase();
  return crypto.createHash('md5').update(searchKey).digest('hex').substring(0, 12);
}

// Capitalizar primera letra (para coincidir con el formato del archivo)
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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

    // ENRIQUECIMIENTO: Nearby Cities usando city_distances.json
    let nearbyCities = null;
    if (location && totalMatches < 10 && startOffset === 0) {
      try {
        const distances = loadCityDistances();

        // Intentar con capitalización (el archivo usa "Barcelona" no "barcelona")
        const locationCapitalized = capitalize(locationLower);
        const distancesFromCity = distances[locationCapitalized];

        if (!distancesFromCity) {
          console.log(\`⚠️  No hay distancias para: \${locationCapitalized}\`);
        } else {
          // Agrupar ofertas por ciudad
          const citiesWithJobs = {};

          cacheData.offers.forEach(job => {
            const city = job.ciudad || job.city || '';
            const cityNormalized = normalizeText(city);

            if (cityNormalized && cityNormalized !== locationLower) {
              const title = normalizeText(job.titulo || job.title || '');
              const description = normalizeText(job.descripcion || job.description || '');
              const company = normalizeText(job.empresa || job.company || '');
              const queryMatch = !query || queryTerms.some(term =>
                title.includes(term) || description.includes(term) || company.includes(term)
              );

              const categoryField = normalizeText(job.categoria || job.category || '');
              const categoryMatch = !category || categoryField.includes(categoryLower);

              if (queryMatch && categoryMatch) {
                if (!citiesWithJobs[city]) {
                  citiesWithJobs[city] = [];
                }
                citiesWithJobs[city].push(job);
              }
            }
          });

          // Filtrar solo ciudades dentro de 50km y que tengan distancia conocida
          const nearbyCitiesData = [];

          for (const city in citiesWithJobs) {
            const distance = distancesFromCity[city];
            if (distance && distance <= 50) {
              nearbyCitiesData.push({
                city_name: city,
                distance: \`\${Math.round(distance)} km\`,
                distance_value: distance,
                results_count: citiesWithJobs[city].length,
                results: citiesWithJobs[city].slice(0, 5)
              });
            }
          }

          // Ordenar por distancia
          nearbyCities = nearbyCitiesData
            .sort((a, b) => a.distance_value - b.distance_value)
            .slice(0, 3);

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
console.log('✅ search.js actualizado para usar city_distances.json existente');
console.log('   - Usa distancias PRE-CALCULADAS (no calcula nada)');
console.log('   - Filtra ciudades dentro de 50km');
console.log('   - Ordena por distancia real');
