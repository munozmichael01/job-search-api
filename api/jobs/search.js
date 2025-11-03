// Force rebuild: 2025-11-03 21:45 - Modified vercel.json function config to force re-upload
// Strategy: Changed function configuration to invalidate Vercel's function cache
import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let jobSynonyms = null;
let cityDistances = null;
let cityCoordinates = null;
let cityDistancesFull = null; // city_distances.json (1,057 ciudades, ≤150km)
let dynamicCityDistances = null; // Mapa dinámico basado en ofertas activas

function loadCityCoordinates() {
  if (!cityCoordinates) {
    try {
      const coordsPath = path.join(__dirname, '../../data/city_coordinates.json');
      cityCoordinates = JSON.parse(fs.readFileSync(coordsPath, 'utf-8'));
      console.log(`✅ Cargadas coordenadas para ${Object.keys(cityCoordinates).length} ciudades`);
    } catch (error) {
      console.error('⚠️  No se pudieron cargar coordenadas:', error.message);
      cityCoordinates = {};
    }
  }
  return cityCoordinates;
}

function loadCityDistancesFull() {
  if (!cityDistancesFull) {
    try {
      const distancesPath = path.join(__dirname, '../../data/city_distances.json');
      cityDistancesFull = JSON.parse(fs.readFileSync(distancesPath, 'utf-8'));
      console.log(`✅ Cargadas distancias para ${Object.keys(cityDistancesFull).length} ciudades`);
    } catch (error) {
      console.error('⚠️  No se pudieron cargar city_distances.json:', error.message);
      cityDistancesFull = {};
    }
  }
  return cityDistancesFull;
}

// Buscar ciudad en mapa de coordenadas con match exacto o parcial
function findCityInCoordinates(cityName, coordinatesMap) {
  const normalized = normalizeText(cityName);

  // 1. Intenta match exacto
  if (coordinatesMap[normalized]) {
    return { coords: coordinatesMap[normalized], matchedName: normalized };
  }

  // 2. Intenta match parcial (A contiene B o B contiene A)
  const partialMatch = Object.keys(coordinatesMap).find(key =>
    key.includes(normalized) || normalized.includes(key)
  );

  if (partialMatch) {
    return { coords: coordinatesMap[partialMatch], matchedName: partialMatch };
  }

  return null; // No encontrado
}

// Buscar ciudad en city_distances_full.json con match exacto o parcial
function findCityInDistances(cityName, distancesMap) {
  const normalized = normalizeText(cityName);

  // Helper: normalizar variantes español/catalán
  function normalizeSpanishCatalan(text) {
    return text
      .replace(/\bsant\b/g, 'san') // Sant → San
      .replace(/\bsan\b/g, 'san')   // Consistencia
      .replace(/\bdel\b/g, 'del')   // Del estándar
      .replace(/\bde\b/g, 'de')     // De estándar
      .replace(/valles/g, 'valles') // Vallès/Vallés → valles
      .trim();
  }

  const normalizedVariant = normalizeSpanishCatalan(normalized);

  // 1. Intenta match exacto (case insensitive)
  for (const key in distancesMap) {
    const keyNorm = normalizeText(key);
    if (keyNorm === normalized || normalizeSpanishCatalan(keyNorm) === normalizedVariant) {
      return { distances: distancesMap[key], matchedName: key };
    }
  }

  // 2. Intenta match parcial (A contiene B o B contiene A)
  const partialMatch = Object.keys(distancesMap).find(key => {
    const keyNorm = normalizeText(key);
    const keyVariant = normalizeSpanishCatalan(keyNorm);

    return (
      keyNorm.includes(normalized) ||
      normalized.includes(keyNorm) ||
      keyVariant.includes(normalizedVariant) ||
      normalizedVariant.includes(keyVariant)
    );
  });

  if (partialMatch) {
    return { distances: distancesMap[partialMatch], matchedName: partialMatch };
  }

  return null; // No encontrado
}

// Calcular distancia entre dos puntos usando fórmula de Haversine
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Construir mapa dinámico de ciudades cercanas basado en ofertas activas
function buildDynamicCityDistances(offers) {
  const coords = loadCityCoordinates();
  const cityMap = {};

  // Extraer ciudades únicas con ofertas
  const citiesWithOffers = new Set();
  offers.forEach(offer => {
    const city = normalizeText(offer.ciudad || offer.city || '');
    if (city) citiesWithOffers.add(city);
  });

  console.log(`🌍 Construyendo mapa dinámico para ${citiesWithOffers.size} ciudades con ofertas`);

  // Para cada ciudad con ofertas, encontrar ciudades cercanas (también con ofertas)
  citiesWithOffers.forEach(city1 => {
    const cityResult = findCityInCoordinates(city1, coords);
    if (!cityResult) return; // Skip si no tiene coordenadas
    const coords1 = cityResult.coords;

    const nearbyCities = [];
    citiesWithOffers.forEach(city2 => {
      if (city1 === city2) return; // Skip misma ciudad

      const coords2 = coords[city2];
      if (!coords2) return; // Skip si no tiene coordenadas

      const distance = calculateDistance(
        coords1.lat, coords1.lon,
        coords2.lat, coords2.lon
      );

      if (distance <= 50) { // Solo ciudades dentro de 50km
        nearbyCities.push({ city: city2, distance: Math.round(distance * 10) / 10 });
      }
    });

    // Ordenar por distancia
    nearbyCities.sort((a, b) => a.distance - b.distance);
    cityMap[city1] = nearbyCities;
  });

  const totalPairs = Object.values(cityMap).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`✅ Mapa dinámico construido: ${Object.keys(cityMap).length} ciudades, ${totalPairs} conexiones`);

  return cityMap;
}

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
  console.log('🚀 Search API v2025-11-03-21:45 - Function config modified to force cache invalidation');

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

    // Construir mapa dinámico de ciudades cercanas si no existe
    if (!dynamicCityDistances) {
      console.log('🌍 Construyendo mapa dinámico de ciudades cercanas...');
      dynamicCityDistances = buildDynamicCityDistances(cacheData.offers);
    }

    if (cacheData.metadata.status === 'error') {
      return res.status(503).json({
        error: 'cache_error',
        message: 'El último intento de actualización falló',
        metadata: cacheData.metadata
      });
    }

    const { query = '', location = '', category = '', limit = '10', offset = '0', related_offset = '0' } = req.query;
    const maxResults = parseInt(limit) || 10;
    const startOffset = parseInt(offset) || 0;
    const relatedOffset = parseInt(related_offset) || 0;

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

    // ENRIQUECIMIENTO: Nearby Cities (usa mapa dinámico)
    let nearbyCities = null;
    if (location && totalMatches < 10 && startOffset === 0) {
      try {
        const locationNormalized = normalizeText(location);
        const nearbyCitiesData = dynamicCityDistances[locationNormalized];

        if (!nearbyCitiesData || !Array.isArray(nearbyCitiesData)) {
          console.log(`ℹ️  No hay ciudades cercanas en mapa dinámico para: ${location}`);
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

    // NIVEL 0.5: Si NO hay resultados, buscar MISMO puesto en ciudades cercanas
    if (query && location && totalMatches === 0 && startOffset === 0 && !relatedJobsResults) {
      try {
        console.log(`🔍 NIVEL 0.5: No hay resultados en "${location}", buscando MISMO puesto en ciudades cercanas...`);

        const queryNormalized = normalizeText(query);
        const locationNormalized = normalizeText(location);

        // Verificar si la ciudad está en la lista de ciudades válidas del cache
        const validCities = cacheData.metadata.valid_cities || [];

        // Helper: normalizar variantes español/catalán (igual que en findCityInDistances)
        function normalizeSpanishCatalan(text) {
          return text
            .replace(/\bsant\b/g, 'san') // Sant → San
            .replace(/\bsan\b/g, 'san')   // Consistencia
            .replace(/\bdel\b/g, 'del')   // Del estándar
            .replace(/\bde\b/g, 'de')     // De estándar
            .replace(/valles/g, 'valles') // Vallès/Vallés → valles
            .trim();
        }

        const locationVariant = normalizeSpanishCatalan(locationNormalized);

        // Buscar match exacto o parcial en valid_cities (con normalización ES/CA)
        const cityInValidList = validCities.find(city => {
          const cityVariant = normalizeSpanishCatalan(city);
          return (
            city === locationNormalized || // Match exacto original
            cityVariant === locationVariant || // Match exacto con normalización ES/CA
            city.includes(locationNormalized) || // Match parcial original
            cityVariant.includes(locationVariant) || // Match parcial ES/CA
            locationNormalized.includes(city) ||
            locationVariant.includes(cityVariant)
          );
        });

        if (!cityInValidList) {
          console.log(`   ℹ️  "${location}" no está en lista de ciudades válidas (${validCities.length} ciudades), saltando NIVEL 0.5`);
        } else {
          if (cityInValidList !== locationNormalized) {
            console.log(`   ✅ Match parcial en valid_cities: "${location}" → "${cityInValidList}"`);
          }
          console.log(`   ✅ "${location}" está en lista de ciudades válidas`);

          // Cargar city_distances.json para obtener ciudades cercanas
          const cityDistancesFull = loadCityDistancesFull();
          const cityResult = findCityInDistances(location, cityDistancesFull);

          if (!cityResult) {
            console.log(`   ℹ️  "${location}" no tiene distancias en city_distances.json, saltando NIVEL 0.5`);
          } else {
            const matchedCityName = cityResult.matchedName;
            if (normalizeText(matchedCityName) !== locationNormalized) {
              console.log(`   ✅ Match parcial: "${location}" → "${matchedCityName}"`);
            }

            // Obtener ciudades cercanas ≤50km que tengan ofertas activas
            const nearbyCitiesWithOffers = cityResult.distances
              .filter(c => c.distance <= 50)
              .map(c => ({
                city: normalizeText(c.city),
                distance: c.distance,
                originalName: c.city
              }))
              // Filtrar solo ciudades que tienen ofertas activas (están en valid_cities)
              .filter(c => validCities.includes(c.city));

            // Ordenar ya están ordenadas por distancia en el archivo
            nearbyCitiesWithOffers.sort((a, b) => a.distance - b.distance);

          if (nearbyCitiesWithOffers.length > 0) {
            console.log(`   Encontradas ${nearbyCitiesWithOffers.length} ciudades cercanas con ofertas`);
            console.log(`   Top 3: ${nearbyCitiesWithOffers.slice(0, 3).map(c => `${c.city} (${c.distance}km)`).join(', ')}`);

            // Buscar MISMO puesto (query) en ciudades cercanas
            const offersInNearbyCities = [];

            // queryTerms ya está definido al inicio del handler con todos los sinónimos (línea 188)
            // Reutilizamos queryTerms para que "barman" encuentre "bartender" y viceversa

            nearbyCitiesWithOffers.slice(0, 10).forEach(nearbyCity => {
              const nearbyCityNormalized = nearbyCity.city; // Ya normalizado

              cacheData.offers.forEach(job => {
                // Match del query (mismo método que el search regular)
                const title = normalizeText(job.titulo || job.title || '');
                const description = normalizeText(job.descripcion || job.description || '');
                const company = normalizeText(job.empresa || job.company || '');

                const titleMatch = queryTerms.some(term =>
                  title.includes(term) || description.includes(term) || company.includes(term)
                );
                if (!titleMatch) return;

                // Match de ciudad cercana (comparar normalizado)
                const city = normalizeText(job.ciudad || job.city || '');
                const region = normalizeText(job.region || '');
                const cityMatch = city.includes(nearbyCityNormalized) ||
                                region.includes(nearbyCityNormalized) ||
                                nearbyCityNormalized.includes(city);
                if (!cityMatch) return;

                offersInNearbyCities.push({
                  ...job,
                  _nearbyCity: nearbyCity.originalName, // Mantener capitalización original
                  _distance: nearbyCity.distance
                });
              });
            });

            if (offersInNearbyCities.length > 0) {
              console.log(`   ✅ NIVEL 0.5: Encontradas ${offersInNearbyCities.length} ofertas de "${query}" en ciudades cercanas`);

              // Agrupar por ciudad para mostrar la más relevante
              const offersByCity = {};
              offersInNearbyCities.forEach(offer => {
                const city = offer._nearbyCity;
                if (!offersByCity[city]) offersByCity[city] = [];
                offersByCity[city].push(offer);
              });

              const mostCommonCity = Object.keys(offersByCity).reduce((a, b) =>
                offersByCity[a].length > offersByCity[b].length ? a : b
              );
              const mostCommonDistance = offersInNearbyCities.find(o => o._nearbyCity === mostCommonCity)?._distance;

              // Aplicar paginación
              const totalNearbyMatches = offersInNearbyCities.length;
              const nearbyHasMore = relatedOffset + maxResults < totalNearbyMatches;
              const nearbyRemaining = nearbyHasMore ? totalNearbyMatches - (relatedOffset + maxResults) : 0;

              relatedJobsResults = offersInNearbyCities
                .slice(relatedOffset, relatedOffset + maxResults)
                .map(offer => {
                  const { _nearbyCity, _distance, ...cleanOffer } = offer;
                  return cleanOffer;
                });

              amplificationUsed = {
                type: 'nivel_0_5_nearby',
                original_query: query,
                original_location: location,
                nearby_city: mostCommonCity,
                distance_km: mostCommonDistance,
                total_nearby_found: totalNearbyMatches,
                nearby_pagination: {
                  total_matches: totalNearbyMatches,
                  returned_results: relatedJobsResults.length,
                  offset: relatedOffset,
                  limit: maxResults,
                  has_more: nearbyHasMore,
                  remaining: nearbyRemaining,
                  next_offset: nearbyHasMore ? relatedOffset + maxResults : null
                }
              };

              console.log(`   ✅ NIVEL 0.5: Retornando ${relatedJobsResults.length} ofertas de ${mostCommonCity} (${mostCommonDistance}km, offset=${relatedOffset}, has_more=${nearbyHasMore})`);
            } else {
              console.log(`   ℹ️  No se encontraron ofertas de "${query}" en ciudades cercanas`);
            }
          } else {
            console.log(`   ℹ️  No hay ciudades con ofertas dentro de 50km de "${location}"`);
          }
          } // Cierre de if (cityResult)
        } // Cierre de if (validCities.includes)
      } catch (error) {
        console.error('⚠️  Error en NIVEL 0.5:', error.message);
      }
    } // Cierre de if (NIVEL 0.5)


    // NIVEL 2: Si NO hay resultados Y NIVEL 0.5 no encontró nada, buscar en related_jobs
    if (query && totalMatches === 0 && startOffset === 0 && !relatedJobsResults) {
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

        // SIEMPRE buscar en ciudades cercanas para ampliar resultados
        if (location) {
          const foundInOriginalCity = offersWithRelatedJobs.length;
          console.log(`   Encontradas ${foundInOriginalCity} ofertas en "${location}", buscando en ciudades cercanas para ampliar...`);

          // Usar mapa dinámico de ciudades cercanas (basado en ofertas activas)
          const locationNormalized = normalizeText(location);
          let nearbyCitiesData = dynamicCityDistances[locationNormalized] || [];

          // Si no hay ciudades cercanas en el mapa dinámico
          if (nearbyCitiesData.length === 0) {
            console.log(`   ℹ️  "${location}" no tiene ciudades cercanas en el mapa dinámico`);
            console.log(`   Razones posibles:`);
            console.log(`     - No hay ofertas en "${location}"`);
            console.log(`     - "${location}" no tiene coordenadas en city_coordinates.json`);
            console.log(`     - No hay otras ciudades con ofertas dentro de 50km`);
            console.log(`   NIVEL 2 no se activará - respetando intención del usuario`);
          }

          // Analizar TODAS las ciudades dentro de 50km (no solo las primeras 5)
          // Barcelona puede estar en posición 31+ en cities pequeñas como Sitges
          const nearbyCitiesWithin50km = nearbyCitiesData
            .filter(c => c.distance && c.distance <= 50);

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

          // Aplicar paginación para related_jobs
          const totalRelatedMatches = offersWithRelatedJobs.length;
          const relatedHasMore = relatedOffset + maxResults < totalRelatedMatches;
          const relatedRemaining = relatedHasMore ? totalRelatedMatches - (relatedOffset + maxResults) : 0;

          // Tomar ofertas con offset y limit
          relatedJobsResults = offersWithRelatedJobs
            .slice(relatedOffset, relatedOffset + maxResults)
            .map(item => item.offer);

          // Determinar qué tipo de puesto se está sugiriendo
          const suggestedJobType = offersWithRelatedJobs[0].titulo || offersWithRelatedJobs[0].title;

          // Detectar si hay ofertas de ciudades cercanas
          const offersFromNearbyCities = offersWithRelatedJobs.filter(o => o.nearbyCity);
          const hasNearbyCities = offersFromNearbyCities.length > 0;

          // Encontrar la ciudad cercana más común (la que tiene más ofertas)
          let mostCommonNearbyCity = null;
          let mostCommonDistance = null;
          if (hasNearbyCities) {
            const cityCount = {};
            offersFromNearbyCities.forEach(o => {
              cityCount[o.nearbyCity] = (cityCount[o.nearbyCity] || 0) + 1;
            });
            mostCommonNearbyCity = Object.keys(cityCount).reduce((a, b) => cityCount[a] > cityCount[b] ? a : b);
            mostCommonDistance = offersFromNearbyCities.find(o => o.nearbyCity === mostCommonNearbyCity)?.distance;
          }

          amplificationUsed = {
            type: hasNearbyCities ? 'nivel_2_nearby' : 'nivel_2',
            original_query: query,
            original_location: location,
            related_job_used: offersWithRelatedJobs[0].relatedJobName,
            suggested_job_type: suggestedJobType,
            weight: offersWithRelatedJobs[0].weight,
            total_related_found: totalRelatedMatches,
            related_pagination: {
              total_matches: totalRelatedMatches,
              returned_results: relatedJobsResults.length,
              offset: relatedOffset,
              limit: maxResults,
              has_more: relatedHasMore,
              remaining: relatedRemaining,
              next_offset: relatedHasMore ? relatedOffset + maxResults : null
            },
            ...(hasNearbyCities && {
              nearby_city: mostCommonNearbyCity,
              distance_km: mostCommonDistance
            })
          };
          console.log(`   ✅ NIVEL 2: Retornando ${relatedJobsResults.length} de ${totalRelatedMatches} ofertas (offset: ${relatedOffset}, has_more: ${relatedHasMore})`);
        }
      } catch (error) {
        console.error('⚠️  Error en NIVEL 2:', error.message);
      }
    }

    // NIVEL 1.5: Si hay pocos resultados (<10), ampliar con MISMO puesto en ciudades cercanas
    if (query && location && totalMatches > 0 && totalMatches < 10 && startOffset === 0 && !relatedJobsResults) {
      try {
        console.log(`🔍 NIVEL 1.5: Solo ${totalMatches} resultados, ampliando con ciudades cercanas...`);

        const queryNormalized = normalizeText(query);
        const locationNormalized = normalizeText(location);
        // Intentar match parcial para el mapa dinámico
        let nearbyCitiesData = dynamicCityDistances[locationNormalized] || [];

        // Si no hay match exacto, buscar match parcial en el mapa dinámico
        if (nearbyCitiesData.length === 0) {
          const partialMatch = Object.keys(dynamicCityDistances).find(key =>
            key.includes(locationNormalized) || locationNormalized.includes(key)
          );
          if (partialMatch) {
            nearbyCitiesData = dynamicCityDistances[partialMatch];
            console.log(`   ✅ Match parcial en mapa dinámico: "${location}" → "${partialMatch}"`);
          }
        }

        if (nearbyCitiesData.length > 0) {
          console.log(`   Buscando "${query}" en ${nearbyCitiesData.length} ciudades cercanas...`);

          // Buscar MISMO puesto (query) en ciudades cercanas
          const offersInNearbyCities = [];

          nearbyCitiesData.slice(0, 10).forEach(nearbyCity => {
            const nearbyCityNormalized = normalizeText(nearbyCity.city);

            cacheData.offers.forEach(job => {
              // Match del título (mismo query)
              const title = normalizeText(job.titulo || job.title || '');
              const titleMatch = title.includes(queryNormalized) || queryNormalized.includes(title);
              if (!titleMatch) return;

              // Match de ciudad cercana
              const city = normalizeText(job.ciudad || job.city || '');
              const region = normalizeText(job.region || '');
              const cityMatch = city.includes(nearbyCityNormalized) ||
                              region.includes(nearbyCityNormalized) ||
                              nearbyCityNormalized.includes(city);
              if (!cityMatch) return;

              // Ya incluida en resultados originales?
              const alreadyIncluded = results.some(r => (r.id || r.guid) === (job.id || job.guid));
              if (alreadyIncluded) return;

              // Evitar duplicados
              const alreadyAdded = offersInNearbyCities.some(o => (o.id || o.guid) === (job.id || job.guid));
              if (alreadyAdded) return;

              offersInNearbyCities.push({
                ...job,
                nearbyCity: nearbyCity.city,
                distance: nearbyCity.distance
              });
            });
          });

          if (offersInNearbyCities.length > 0) {
            // PAGINACIÓN para NIVEL 1.5
            const totalNearbyMatches = offersInNearbyCities.length;
            const neededToReach10 = 10 - totalMatches;
            const nearbyHasMore = relatedOffset + neededToReach10 < totalNearbyMatches;
            const nearbyRemaining = nearbyHasMore ? totalNearbyMatches - (relatedOffset + neededToReach10) : 0;

            // Aplicar offset y limit
            relatedJobsResults = offersInNearbyCities
              .slice(relatedOffset, relatedOffset + neededToReach10);

            // Detectar ciudad más común
            const cityCount = {};
            relatedJobsResults.forEach(o => {
              cityCount[o.nearbyCity] = (cityCount[o.nearbyCity] || 0) + 1;
            });
            const mostCommonCity = Object.keys(cityCount).reduce((a, b) =>
              cityCount[a] > cityCount[b] ? a : b
            );
            const mostCommonDistance = relatedJobsResults.find(o =>
              o.nearbyCity === mostCommonCity
            )?.distance;

            amplificationUsed = {
              type: 'nivel_1_5_nearby',
              original_count: totalMatches,
              original_location: location,
              nearby_city: mostCommonCity,
              distance_km: mostCommonDistance,
              added_count: relatedJobsResults.length,
              total_with_additions: totalMatches + relatedJobsResults.length,
              nearby_pagination: {
                total_matches: totalNearbyMatches,
                returned_results: relatedJobsResults.length,
                offset: relatedOffset,
                limit: neededToReach10,
                has_more: nearbyHasMore,
                remaining: nearbyRemaining,
                next_offset: nearbyHasMore ? relatedOffset + neededToReach10 : null
              }
            };

            console.log(`   ✅ NIVEL 1.5: Agregando ${relatedJobsResults.length} de ${totalNearbyMatches} ofertas de ciudades cercanas (${mostCommonCity} a ${mostCommonDistance}km, offset=${relatedOffset}, next=${nearbyHasMore ? relatedOffset + neededToReach10 : 'none'})`);
          } else {
            console.log(`   ℹ️  No se encontraron ofertas de "${query}" en ciudades cercanas`);
          }
        } else {
          console.log(`   ℹ️  No hay ciudades cercanas en el mapa dinámico para "${location}"`);
        }
      } catch (error) {
        console.error('⚠️  Error en NIVEL 1.5:', error.message);
      }
    }

    // En NIVEL 1.5 nearby, NO devolver ofertas originales en páginas siguientes
    const finalResults = (amplificationUsed?.type === 'nivel_1_5_nearby' && relatedOffset > 0)
      ? []
      : results;

    // Filtrar valid_cities del metadata (no es necesario enviarlo al cliente, solo se usa internamente)
    const { valid_cities, ...metadataWithoutValidCities } = cacheData.metadata;

    return res.status(200).json({
      success: true,
      metadata: {
        ...metadataWithoutValidCities,
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
        returned_results: finalResults.length,
        offset: startOffset,
        limit: maxResults,
        has_more: hasMore,
        remaining: remainingResults,
        next_offset: hasMore ? startOffset + maxResults : null
      },
      results: finalResults,
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

// Force rebuild: Spanish/Catalan variant handling deployed at 2025-11-03 16:37
