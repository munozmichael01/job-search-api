import { kv } from '@vercel/kv';
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
        const normalized = names.map(n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
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
      console.log(`✅ Cargadas distancias para ${Object.keys(cityDistances).length} ciudades`);
    } catch (error) {
      console.error('⚠️  No se pudieron cargar distancias:', error.message);
      cityDistances = {};
    }
  }
  return cityDistances;
}

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function generateSearchHash(query, location, category) {
  const searchKey = `${query}|${location}|${category}`.toLowerCase();
  return crypto.createHash('md5').update(searchKey).digest('hex').substring(0, 12);
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
    const cacheKey = `search_results:${searchHash}`;

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
      console.log(`🔍 Cache miss - Filtrado en ${filterTime}ms - ${matchedIds.length} resultados`);
    } else {
      console.log(`⚡ Cache hit - ${matchedIds.length} resultados`);
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

    // ENRIQUECIMIENTO: Nearby Cities
    let nearbyCities = null;
    if (location && totalMatches < 10 && startOffset === 0) {
      try {
        const distances = loadCityDistances();

        // Buscar con capitalización estándar
        const locationFormatted = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
        const nearbyCitiesData = distances[locationFormatted];

        if (!nearbyCitiesData || !Array.isArray(nearbyCitiesData)) {
          console.log(`⚠️  No hay distancias para: ${locationFormatted}`);
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

          // Crear lista de ciudades cercanas con ofertas
          const nearbyCitiesWithJobs = [];

          for (const nearbyCity of nearbyCitiesData) {
            // Filtrar solo ciudades dentro de 50km
            if (nearbyCity.distance && nearbyCity.distance <= 50) {
              const jobs = citiesWithJobs[nearbyCity.city];
              if (jobs && jobs.length > 0) {
                nearbyCitiesWithJobs.push({
                  city_name: nearbyCity.city,
                  distance: `${Math.round(nearbyCity.distance)} km`,
                  distance_value: nearbyCity.distance,
                  results_count: jobs.length,
                  results: jobs.slice(0, 5)
                });
              }
            }
          }

          // Ya vienen ordenadas por distancia del archivo
          nearbyCities = nearbyCitiesWithJobs.slice(0, 3);

          if (nearbyCities.length > 0) {
            console.log(`🌆 Nearby cities: ${nearbyCities.map(c => `${c.city_name} (${c.distance})`).join(', ')}`);
          }
        }
      } catch (error) {
        console.error('⚠️  Error enriqueciendo nearby_cities:', error.message);
      }
    }

    // ENRIQUECIMIENTO: Related Jobs (NIVEL 1.5 y NIVEL 2)
    let relatedJobsResults = null;
    let amplificationUsed = null;

    // NIVEL 2: Si NO hay resultados, buscar en related_jobs
    if (query && totalMatches === 0 && startOffset === 0) {
      try {
        console.log(`🔍 NIVEL 2: Búsqueda de "${query}" retornó 0 resultados, buscando related_jobs...`);

        // Analizar las primeras 100 ofertas de la location (o todas si no hay location)
        const offersToAnalyze = cacheData.offers
          .filter(job => {
            if (location) {
              const city = normalizeText(job.ciudad || job.city || '');
              const region = normalizeText(job.region || '');
              return city.includes(locationLower) || region.includes(locationLower);
            }
            return true;
          })
          .slice(0, 100);

        // Buscar ofertas que tengan el query en sus related_jobs
        // Y colectar esas ofertas directamente (no el nombre del related_job)
        const offersWithRelatedJobs = [];

        offersToAnalyze.forEach(job => {
          if (job.enriched && job.enriched.related_jobs) {
            // Buscar si algún related_job coincide con el query
            const matchingRelatedJob = job.enriched.related_jobs.find(rel => {
              const relNormalized = normalizeText(rel.job);
              return (relNormalized.includes(normalizedQuery) || queryTerms.some(term => relNormalized.includes(term))) && rel.weight > 0.80;
            });

            if (matchingRelatedJob) {
              offersWithRelatedJobs.push({
                offer: job,
                relatedJobName: matchingRelatedJob.job,
                weight: matchingRelatedJob.weight
              });
            }
          }
        });

        // Si no encontró nada en la ubicación exacta, buscar en ciudades cercanas
        if (offersWithRelatedJobs.length === 0 && location) {
          console.log(`   No se encontraron related_jobs en "${location}", buscando en ciudades cercanas...`);

          // Cargar nearby cities
          loadCityDistances();

          // Buscar la key correcta (case-insensitive match)
          const locationKey = Object.keys(cityDistances).find(key =>
            normalizeText(key) === normalizeText(location)
          ) || location;

          const nearbyCitiesData = cityDistances[locationKey] || [];
          const nearbyCitiesWithin50km = nearbyCitiesData
            .filter(c => c.distance && c.distance <= 50)
            .slice(0, 5); // Top 5 ciudades cercanas

          if (nearbyCitiesWithin50km.length > 0) {
            console.log(`   Analizando ${nearbyCitiesWithin50km.length} ciudades cercanas...`);

            // Buscar en ciudades cercanas
            const offersInNearbyCities = cacheData.offers.filter(job => {
              const city = normalizeText(job.ciudad || job.city || '');
              return nearbyCitiesWithin50km.some(nc => normalizeText(nc.city).includes(city) || city.includes(normalizeText(nc.city)));
            }).slice(0, 200);

            offersInNearbyCities.forEach(job => {
              if (job.enriched && job.enriched.related_jobs) {
                const matchingRelatedJob = job.enriched.related_jobs.find(rel => {
                  const relNormalized = normalizeText(rel.job);
                  return (relNormalized.includes(normalizedQuery) || queryTerms.some(term => relNormalized.includes(term))) && rel.weight > 0.80;
                });

                if (matchingRelatedJob) {
                  offersWithRelatedJobs.push({
                    offer: job,
                    relatedJobName: matchingRelatedJob.job,
                    weight: matchingRelatedJob.weight,
                    nearbyCity: job.ciudad || job.city,
                    distance: nearbyCitiesWithin50km.find(nc =>
                      normalizeText(nc.city).includes(normalizeText(job.ciudad || job.city)) ||
                      normalizeText(job.ciudad || job.city).includes(normalizeText(nc.city))
                    )?.distance || null
                  });
                }
              }
            });

            if (offersWithRelatedJobs.length > 0) {
              console.log(`   ✅ Encontradas ${offersWithRelatedJobs.length} ofertas en ciudades cercanas`);
            }
          }
        }

        if (offersWithRelatedJobs.length > 0) {
          console.log(`   Encontradas ${offersWithRelatedJobs.length} ofertas que sugieren "${query}" como related_job`);

          // Ordenar por weight de la relación
          offersWithRelatedJobs.sort((a, b) => b.weight - a.weight);

          // Tomar hasta 10 ofertas
          relatedJobsResults = offersWithRelatedJobs.slice(0, Math.min(10, maxResults)).map(item => item.offer);

          // Determinar qué tipo de puesto se está sugiriendo
          const suggestedJobType = relatedJobsResults[0].titulo || relatedJobsResults[0].title;

          amplificationUsed = {
            type: offersWithRelatedJobs[0].nearbyCity ? 'nivel_2_nearby' : 'nivel_2',
            original_query: query,
            original_location: location,
            related_job_used: offersWithRelatedJobs[0].relatedJobName,
            suggested_job_type: suggestedJobType,
            weight: offersWithRelatedJobs[0].weight,
            total_related_found: offersWithRelatedJobs.length,
            ...(offersWithRelatedJobs[0].nearbyCity && {
              nearby_city: offersWithRelatedJobs[0].nearbyCity,
              distance_km: offersWithRelatedJobs[0].distance
            })
          };
          console.log(`   ✅ NIVEL 2: Retornando ${relatedJobsResults.length} ofertas (puestos relacionados con "${query}")`);
        }
      } catch (error) {
        console.error('⚠️  Error en NIVEL 2:', error.message);
      }
    }

    // NIVEL 1.5: Si hay pocos resultados (<10), ampliar con related_jobs
    if (query && totalMatches > 0 && totalMatches < 10 && startOffset === 0 && !relatedJobsResults) {
      try {
        console.log(`🔍 NIVEL 1.5: Solo ${totalMatches} resultados, ampliando con related_jobs...`);

        // Analizar related_jobs de los primeros 5 resultados
        const relatedJobsMap = new Map();

        results.slice(0, 5).forEach(job => {
          if (job.enriched && job.enriched.related_jobs) {
            job.enriched.related_jobs.forEach(rel => {
              if (rel.weight > 0.85 && rel.available_offers > 0) {
                const key = rel.job;
                if (!relatedJobsMap.has(key)) {
                  relatedJobsMap.set(key, { job: rel.job, weight: rel.weight, mentions: 0 });
                }
                relatedJobsMap.get(key).mentions++;
              }
            });
          }
        });

        // Ordenar por relevancia (weight * mentions)
        const candidateJobs = Array.from(relatedJobsMap.values())
          .map(item => ({ ...item, score: item.weight * item.mentions }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 2);

        if (candidateJobs.length > 0) {
          console.log(`   Encontrados ${candidateJobs.length} puestos relacionados`);

          // Buscar ofertas del puesto relacionado top
          const topRelatedJob = candidateJobs[0].job;
          const topRelatedNormalized = normalizeText(topRelatedJob);

          const relatedOffers = cacheData.offers.filter(job => {
            const title = normalizeText(job.titulo || job.title || '');
            const titleMatch = title.includes(topRelatedNormalized) || topRelatedNormalized.includes(title);

            if (!titleMatch) return false;

            // Aplicar filtros de location y category
            if (location) {
              const city = normalizeText(job.ciudad || job.city || '');
              const region = normalizeText(job.region || '');
              if (!city.includes(locationLower) && !region.includes(locationLower)) return false;
            }

            if (category) {
              const categoryField = normalizeText(job.categoria || job.category || '');
              if (!categoryField.includes(categoryLower)) return false;
            }

            return true;
          });

          if (relatedOffers.length > 0) {
            const neededToReach10 = 10 - totalMatches;
            relatedJobsResults = relatedOffers.slice(0, Math.min(neededToReach10, 7));
            amplificationUsed = {
              type: 'nivel_1_5',
              original_count: totalMatches,
              related_job_used: topRelatedJob,
              weight: candidateJobs[0].weight,
              added_count: relatedJobsResults.length
            };
            console.log(`   ✅ NIVEL 1.5: Agregando ${relatedJobsResults.length} ofertas de "${topRelatedJob}"`);
          }
        }
      } catch (error) {
        console.error('⚠️  Error en NIVEL 1.5:', error.message);
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
      ...(nearbyCities && nearbyCities.length > 0 && { nearby_cities: nearbyCities }),
      ...(relatedJobsResults && relatedJobsResults.length > 0 && {
        related_jobs_results: relatedJobsResults,
        amplification_used: amplificationUsed
      })
    });

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
