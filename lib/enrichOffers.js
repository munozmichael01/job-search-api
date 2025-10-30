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
 * Extrae el puesto principal del título de la oferta (elimina información extra)
 * @param {string} jobTitle - Título completo de la oferta
 * @returns {string} Título limpio solo con el puesto
 */
function extractJobTitle(jobTitle) {
  if (!jobTitle) return '';

  // Eliminar información común que no es parte del puesto
  let cleaned = jobTitle
    // Eliminar salarios y rangos: "1900-2200 Euros", "$50k-60k", etc.
    .replace(/\d+[-\s]*\d*\s*(euros?|eur|usd|dollars?|\$|€)/gi, '')
    // Eliminar ubicaciones geográficas entre paréntesis
    .replace(/\([^)]*(?:Austria|Germany|Spain|Portugal|Madrid|Barcelona|m\/w|f\/m)[^)]*\)/gi, '')
    // Eliminar "con Idioma" patterns
    .replace(/[-\s]*con\s+\w+/gi, '')
    // Eliminar "/ netos", "/ brutos", etc.
    .replace(/\/\s*(netos?|brutos?|mes|año|mensual)/gi, '')
    // Eliminar nombres de hoteles/resorts al inicio
    .replace(/^[A-Z][a-z]+\s+(?:Resort|Hotel|Group)\.?\s*/i, '')
    // Eliminar símbolos sobrantes
    .replace(/[-\/\s]+$/, '')
    .replace(/^[-\/\s]+/, '')
    .trim();

  return cleaned;
}

/**
 * Busca el puesto más similar en job_weights usando fuzzy matching MEJORADO
 * @param {string} jobTitle - Título del puesto de la oferta
 * @returns {string|null} Clave del puesto en job_weights o null
 */
function findBestJobMatch(jobTitle) {
  if (!jobTitle || !jobWeights) return null;

  // Limpiar el título primero
  const cleanedTitle = extractJobTitle(jobTitle);
  const normalized = normalizeJobTitle(cleanedTitle);

  // 0. Búsqueda en mapeo multiidioma
  if (denominationToKey && denominationToKey[normalized]) {
    return denominationToKey[normalized];
  }

  // 1. Búsqueda exacta (case insensitive)
  for (const key in jobWeights) {
    if (normalizeJobTitle(key) === normalized) {
      return key;
    }
  }

  // 1.5. Búsqueda por primera palabra significativa (para casos como "Camarero/a - Bar")
  // Si la primera palabra del título coincide exactamente con una clave, priorizar esa
  const words = normalized.split(' ');
  if (words.length > 0 && words[0].length > 3) {
    const firstWord = words[0];
    for (const key in jobWeights) {
      const normalizedKey = normalizeJobTitle(key);
      if (normalizedKey === firstWord) {
        return key;
      }
    }
  }

  // 2. Búsqueda por inclusión (el título contiene la clave)
  // Solo si la clave tiene al menos 2 palabras (evita falsos positivos de palabras sueltas)
  for (const key in jobWeights) {
    const normalizedKey = normalizeJobTitle(key);
    const keyWords = normalizedKey.split(' ').filter(w => w.length > 2);

    if (keyWords.length >= 2) {
      if (normalized.includes(normalizedKey)) {
        return key;
      }
    }
  }

  // 3. Búsqueda por palabras clave principales (MEJORADO - más estricto)
  const keywords = normalized.split(' ').filter(w => w.length > 3);

  if (keywords.length > 0) {
    let bestMatch = null;
    let maxMatchedKeywords = 0;
    let shortestMatchLength = Infinity;

    for (const key in jobWeights) {
      const normalizedKey = normalizeJobTitle(key);
      const keyKeywords = normalizedKey.split(' ').filter(w => w.length > 3);

      // Contar cuántas keywords coinciden
      const matchedKeywords = keywords.filter(kw => keyKeywords.includes(kw)).length;
      const keywordsInQuery = keyKeywords.filter(kw => keywords.includes(kw)).length;

      // Solo considerar coincidencia si:
      // - Coinciden al menos 2 keywords, O
      // - Coincide 1 keyword Y es >50% de las keywords de la clave
      const minMatch = Math.min(2, keyKeywords.length);
      const percentMatch = keyKeywords.length > 0 ? keywordsInQuery / keyKeywords.length : 0;

      if (matchedKeywords >= minMatch || (matchedKeywords >= 1 && percentMatch >= 0.5)) {
        // Si tiene más keywords matcheadas, es mejor
        // Si tiene las mismas, preferir la clave más corta (más específica)
        if (matchedKeywords > maxMatchedKeywords ||
            (matchedKeywords === maxMatchedKeywords && normalizedKey.length < shortestMatchLength)) {
          maxMatchedKeywords = matchedKeywords;
          shortestMatchLength = normalizedKey.length;
          bestMatch = key;
        }
      }
    }

    return bestMatch;
  }

  return null;
}

/**
 * Normaliza el nombre de la ciudad para buscar en city_distances
 * Intenta múltiples variaciones para encontrar match
 * @param {string} cityName - Nombre de la ciudad
 * @returns {string} Nombre normalizado que existe en city_distances
 */
function normalizeCityName(cityName) {
  if (!cityName) return '';

  // Preposiciones y artículos que deben ir en minúscula
  const lowercaseWords = ['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'i'];

  // Función auxiliar para capitalizar correctamente
  const capitalize = (name) => {
    const words = name.trim().split(' ');
    return words
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index === 0 || !lowercaseWords.includes(lower)) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return lower;
      })
      .join(' ');
  };

  const normalized = capitalize(cityName);

  // Si existe directamente, devolverlo
  if (cityDistances && cityDistances[normalized]) {
    return normalized;
  }

  // Mapeos específicos de nombres en diferentes idiomas
  const specificMappings = {
    'lisboa': 'Lisbon'
  };

  const lowerNormalized = normalized.toLowerCase();
  if (specificMappings[lowerNormalized]) {
    const mapped = specificMappings[lowerNormalized];
    if (cityDistances && cityDistances[mapped]) {
      return mapped;
    }
  }

  // Intentar variaciones comunes para ciudades españolas/portuguesas
  const variations = [
    // "Las Palmas de Gran Canaria" → "Las Palmas"
    normalized.replace(/\s+de\s+Gran\s+Canaria$/i, ''),
    // "Palma de Mallorca" → "Palma"
    normalized.replace(/\s+de\s+Mallorca$/i, ''),
    // "Santa Cruz de Tenerife" → "Santa Cruz"
    normalized.replace(/\s+de\s+Tenerife$/i, ''),
    // "Santiago de Compostela" → "Santiago"
    normalized.replace(/\s+de\s+Compostela$/i, ''),
    // Eliminar " de [palabra]" al final
    normalized.replace(/\s+de\s+\w+$/i, ''),
    // Solo primeras dos palabras si hay más de 2
    normalized.split(' ').slice(0, 2).join(' ')
  ];

  // Buscar primera variación que existe in city_distances
  for (const variation of variations) {
    if (variation && variation !== normalized && cityDistances && cityDistances[variation]) {
      return variation;
    }
  }

  // Si no se encontró ninguna variación, devolver el normalizado original
  return normalized;
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
    const jobMatch = findBestJobMatch(offer.titulo || offer.title);

    if (jobMatch && jobWeights[jobMatch]) {
      const relatedJobs = jobWeights[jobMatch];

      // Tomar top 20 puestos relacionados, filtrando genéricos
      // Aumentado de 5 a 20 para incluir relaciones como "Cocinero → Sushiman" (posición 17)
      // El filtro weight > 0.60 más abajo asegura que solo se incluyan relaciones relevantes
      enrichedOffer.enriched.related_jobs = relatedJobs
        .filter(rel => !rel.job.match(/^Job_\d+$/)) // Filtrar "Job_XXX"
        .slice(0, 20)
        .map(rel => {
          // Contar cuántas ofertas hay de este puesto relacionado
          const count = allOffers.filter(o =>
            normalizeJobTitle(o.titulo || o.title) === normalizeJobTitle(rel.job)
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
    const cityName = normalizeCityName(offer.ciudad || offer.city);

    if (cityName && cityDistances[cityName]) {
      const nearbyCities = cityDistances[cityName];

      // Tomar top 5 ciudades cercanas (< 100km)
      enrichedOffer.enriched.nearby_cities = nearbyCities
        .filter(city => city.distance <= 100)
        .slice(0, 5)
        .map(city => {
          // Contar cuántas ofertas hay en esta ciudad cercana
          const count = allOffers.filter(o =>
            normalizeCityName(o.ciudad || o.city) === city.city
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
