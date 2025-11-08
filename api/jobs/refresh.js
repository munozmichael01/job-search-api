import { XMLParser } from 'fast-xml-parser';
import { kv } from '@vercel/kv';
import { enrichOffers } from '../../lib/enrichOffers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const XML_FEED_URL = "https://feed.turijobs.com/partner/files/774E13F3-9D57-4BD6-920D-3A79A70C6AA2/E9753D5A-0F05-4444-9210-9D02EB15C7D5";

// Helper: normalizar texto
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Helper: buscar ciudad en city_distances.json con match flexible
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

  return null;
}

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

    // ✨ ENRIQUECER OFERTAS con puestos relacionados y ciudades cercanas
    console.log('✨ Enriqueciendo ofertas con datos inteligentes...');
    const enrichedJobs = enrichOffers(normalizedJobs);

    // 🗺️  GENERAR MAPA DE CIUDADES CON DISTANCIAS (con ofertas + cercanas ≤100km)
    console.log('🗺️  Construyendo mapa de ciudad distances para NIVEL 1+...');
    const cityDistancesFullSource = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../data/city_distances_full.json'), 'utf-8')
    );

    // 1. Extraer ciudades únicas con ofertas
    const citiesWithOffers = [...new Set(
      enrichedJobs
        .map(j => j.ciudad)
        .filter(Boolean)
        .map(c => c.trim())
    )];

    console.log(`   📍 ${citiesWithOffers.length} ciudades con ofertas activas`);

    // 2. Para cada ciudad con ofertas, construir su entrada en el mapa con ciudades cercanas ≤100km
    const cityDistancesMap = {};
    const allCitiesSet = new Set();
    let foundInDistancesFile = 0;
    let notFoundInDistancesFile = 0;

    citiesWithOffers.forEach(city => {
      // Buscar en city_distances_full.json (con match flexible)
      const result = findCityInDistances(city, cityDistancesFullSource);

      if (result) {
        foundInDistancesFile++;

        // Filtrar ciudades cercanas ≤100km
        const nearbyCities = result.distances.filter(c => c.distance <= 100);

        // Guardar en el mapa con el nombre matched
        cityDistancesMap[result.matchedName] = nearbyCities;

        // Agregar la ciudad con ofertas al set
        allCitiesSet.add(normalizeText(city));

        // Agregar TODAS las ciudades cercanas al set (incluso si no tienen ofertas)
        // Esto permite que Viladecans (sin ofertas) encuentre Barcelona (con ofertas)
        nearbyCities.forEach(c => allCitiesSet.add(normalizeText(c.city)));
      } else {
        notFoundInDistancesFile++;
        console.log(`   ⚠️  Ciudad no encontrada en city_distances_full.json: "${city}"`);
      }
    });

    const validCitiesList = Array.from(allCitiesSet).sort();

    console.log(`   ✅ ${foundInDistancesFile} ciudades encontradas en city_distances_full.json`);
    console.log(`   ⚠️  ${notFoundInDistancesFile} ciudades NO encontradas`);
    console.log(`   ✅ ${Object.keys(cityDistancesMap).length} ciudades en el mapa de distancias`);
    console.log(`   ✅ ${validCitiesList.length} ciudades válidas totales (con ofertas + cercanas ≤100km)`);

    // Reducir tamaño del JSON para caber en Vercel KV (10MB limit)
    // Eliminar descripcion que ocupa ~70% del tamaño y no se usa en búsquedas
    console.log('📦 Optimizando tamaño del cache (eliminando descripciones)...');
    const compactOffers = enrichedJobs.map(job => {
      const { descripcion, ...rest } = job;
      return rest; // Mantiene todos los campos excepto descripcion
    });

    // Crear estructura de caché
    const cacheData = {
      metadata: {
        last_update: new Date().toISOString(),
        total_jobs: compactOffers.length,
        status: 'success',
        feed_url: XML_FEED_URL,
        cities_with_offers: citiesWithOffers.length,
        valid_cities: validCitiesList, // Lista de todas las ciudades (con ofertas + cercanas)
        city_distances_entries: Object.keys(cityDistancesMap).length
      },
      offers: compactOffers,
      city_distances: cityDistancesMap // Mapa de distancias construido automáticamente
    };

    console.log(`📏 Tamaño estimado: ~${Math.round(JSON.stringify(cacheData).length / 1024 / 1024 * 10) / 10}MB`);

    // Guardar en Vercel KV (expira en 48 horas)
    await kv.set('job_offers_cache', cacheData, { ex: 172800 });

    console.log(`✅ ${compactOffers.length} ofertas enriquecidas almacenadas en caché`);

    return res.status(200).json({
      success: true,
      total_jobs: enrichedJobs.length,
      timestamp: cacheData.metadata.last_update,
      message: 'Ofertas actualizadas y enriquecidas correctamente'
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
