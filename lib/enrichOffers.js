import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar datos de pesos y distancias (una sola vez al iniciar)
let jobWeights = null;
let cityDistances = null;
let jobIdToNames = null;
let denominationToKey = null;

/**
 * Carga los datos de pesos y distancias (lazy loading)
 */
function loadData() {
  if (!jobWeights) {
    try {
      const weightsPath = path.join(__dirname, '../data/job_weights.json');
      jobWeights = JSON.parse(fs.readFileSync(weightsPath, 'utf-8'));
      console.log('✅ job_weights.json cargado');
    } catch (error) {
      console.error('⚠️  Error cargando job_weights.json:', error.message);
      jobWeights = {};
    }
  }

  if (!cityDistances) {
    try {
      const distancesPath = path.join(__dirname, '../data/city_distances.json');
      cityDistances = JSON.parse(fs.readFileSync(distancesPath, 'utf-8'));
      console.log('✅ city_distances.json cargado');
    } catch (error) {
      console.error('⚠️  Error cargando city_distances.json:', error.message);
      cityDistances = {};
    }

  if (!jobIdToNames) {
    try {
      const idToNamesPath = path.join(__dirname, '../data/job_id_to_names.json');
      jobIdToNames = JSON.parse(fs.readFileSync(idToNamesPath, 'utf-8'));
      console.log('✅ job_id_to_names.json cargado');

      // Crear mapeo inverso
      denominationToKey = {};
      for (const jobId in jobIdToNames) {
        const names = jobIdToNames[jobId];
        if (names.length > 0) {
          const primaryName = names[0];
          names.forEach(name => {
            const normalized = normalizeJobTitle(name);
            if (normalized) denominationToKey[normalized] = primaryName;
          });
        }
      }
      console.log(`✅ Mapeo inverso: ${Object.keys(denominationToKey).length} denominaciones`);
    } catch (error) {
      console.error('⚠️  Error cargando job_id_to_names.json:', error.message);
      jobIdToNames = {};
      denominationToKey = {};
    }
  }
  }
}

/**
 * Normaliza el nombre del puesto para buscar en job_weights
 * @param {string} jobTitle - Título del puesto
 * @returns {string} Título normalizado
 */
function normalizeJobTitle(jobTitle) {
  if (!jobTitle) return '';

  // Convertir a minúsculas y eliminar acentos
  let normalized = jobTitle.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Eliminar caracteres especiales y múltiples espacios
  normalized = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Busca el puesto más similar en job_weights usando fuzzy matching
 * @param {string} jobTitle - Título del puesto de la oferta
 * @returns {string|null} Clave del puesto en job_weights o null
 */
function findBestJobMatch(jobTitle) {
  if (!jobTitle || !jobWeights) return null;

  const normalized = normalizeJobTitle(jobTitle);

  // 0. Búsqueda en mapeo multiidioma (NUEVO)
  if (denominationToKey && denominationToKey[normalized]) {
    return denominationToKey[normalized];
  }


  // 1. Búsqueda exacta (case insensitive)
  for (const key in jobWeights) {
    if (normalizeJobTitle(key) === normalized) {
      return key;
    }
  }

  // 2. Búsqueda por inclusión (el título contiene la clave o viceversa)
  for (const key in jobWeights) {
    const normalizedKey = normalizeJobTitle(key);
    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      return key;
    }
  }

  // 3. Búsqueda por palabras clave principales
  const keywords = normalized.split(' ').filter(w => w.length > 3);
  if (keywords.length > 0) {
    for (const key in jobWeights) {
      const normalizedKey = normalizeJobTitle(key);
      const keyKeywords = normalizedKey.split(' ').filter(w => w.length > 3);

      // Si comparten al menos 1 keyword, considerar coincidencia
      const hasMatch = keywords.some(kw => keyKeywords.includes(kw));
      if (hasMatch) {
        return key;
      }
    }
  }

  return null;
}

/**
 * Normaliza el nombre de la ciudad para buscar en city_distances
 * @param {string} cityName - Nombre de la ciudad
 * @returns {string} Nombre normalizado
 */
function normalizeCityName(cityName) {
  if (!cityName) return '';

  // Eliminar espacios extra y capitalizar primera letra de cada palabra
  return cityName
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Enriquece una oferta de trabajo con puestos relacionados y ciudades cercanas
 * @param {Object} offer - Oferta de trabajo original
 * @param {Array} allOffers - Array de todas las ofertas (para contar disponibilidad)
 * @returns {Object} Oferta enriquecida
 */
export function enrichOffer(offer, allOffers = []) {
  // Cargar datos si no están cargados
  loadData();

  const enrichedOffer = {
    ...offer,
    enriched: {
      related_jobs: [],
      nearby_cities: []
    }
  };

  // 1. BUSCAR PUESTOS RELACIONADOS
  try {
    const jobMatch = findBestJobMatch(offer.titulo);

    if (jobMatch && jobWeights[jobMatch]) {
      const relatedJobs = jobWeights[jobMatch];

      // Tomar top 5 puestos relacionados
      enrichedOffer.enriched.related_jobs = relatedJobs
        .slice(0, 5)
        .map(rel => {
          // Contar cuántas ofertas hay de este puesto relacionado
          const count = allOffers.filter(o =>
            normalizeJobTitle(o.titulo) === normalizeJobTitle(rel.job)
          ).length;

          return {
            job: rel.job,
            weight: rel.weight,
            area: rel.area,
            available_offers: count
          };
        })
        .filter(rel => rel.weight > 0.60); // Solo puestos con peso > 0.60
    }
  } catch (error) {
    console.error('Error enriqueciendo puestos relacionados:', error.message);
  }

  // 2. BUSCAR CIUDADES CERCANAS
  try {
    const cityName = normalizeCityName(offer.ciudad);

    if (cityName && cityDistances[cityName]) {
      const nearbyCities = cityDistances[cityName];

      // Tomar top 5 ciudades cercanas (< 100km)
      enrichedOffer.enriched.nearby_cities = nearbyCities
        .filter(city => city.distance <= 100)
        .slice(0, 5)
        .map(city => {
          // Contar cuántas ofertas hay en esta ciudad cercana
          const count = allOffers.filter(o =>
            normalizeCityName(o.ciudad) === city.city
          ).length;

          return {
            city: city.city,
            distance: city.distance,
            country: city.country,
            available_offers: count
          };
        })
        .filter(city => city.available_offers > 0); // Solo ciudades con ofertas
    }
  } catch (error) {
    console.error('Error enriqueciendo ciudades cercanas:', error.message);
  }

  return enrichedOffer;
}

/**
 * Enriquece un array de ofertas
 * @param {Array} offers - Array de ofertas
 * @returns {Array} Array de ofertas enriquecidas
 */
export function enrichOffers(offers) {
  console.log(`📊 Enriqueciendo ${offers.length} ofertas...`);

  const startTime = Date.now();
  const enrichedOffers = offers.map(offer => enrichOffer(offer, offers));
  const endTime = Date.now();

  console.log(`✅ ${enrichedOffers.length} ofertas enriquecidas en ${endTime - startTime}ms`);

  // Estadísticas
  const withRelatedJobs = enrichedOffers.filter(o => o.enriched.related_jobs.length > 0).length;
  const withNearbyCities = enrichedOffers.filter(o => o.enriched.nearby_cities.length > 0).length;

  console.log(`   📈 ${withRelatedJobs} ofertas con puestos relacionados (${((withRelatedJobs/offers.length)*100).toFixed(1)}%)`);
  console.log(`   📈 ${withNearbyCities} ofertas con ciudades cercanas (${((withNearbyCities/offers.length)*100).toFixed(1)}%)`);

  return enrichedOffers;
}
