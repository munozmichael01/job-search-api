import { XMLParser } from 'fast-xml-parser';
import { kv } from '@vercel/kv';
import { enrichOffers } from './lib/enrichOffers.js';
import dotenv from 'dotenv';

// Cargar .env
dotenv.config();

const XML_FEED_URL = "https://feed.turijobs.com/partner/files/774E13F3-9D57-4BD6-920D-3A79A70C6AA2/E9753D5A-0F05-4444-9210-9D02EB15C7D5";

async function refreshCache() {
  try {
    console.log('📥 Descargando ofertas del feed XML...');

    const response = await fetch(XML_FEED_URL, {
      headers: { 'User-Agent': 'JobSearchBot/1.0' }
    });

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

    // Extraer jobs
    let jobsArray = [];
    if (result.jobs && result.jobs.job) {
      jobsArray = Array.isArray(result.jobs.job) ? result.jobs.job : [result.jobs.job];
    } else if (result.job) {
      jobsArray = Array.isArray(result.job) ? result.job : [result.job];
    }

    console.log(`📊 Jobs encontrados: ${jobsArray.length}`);

    // Normalizar datos
    const normalizedJobs = jobsArray.map(job => {
      const getText = (field) => {
        if (!field) return '';
        if (typeof field === 'string') return field;
        if (field._text) return field._text;
        if (field['#text']) return field['#text'];
        return String(field);
      };

      const cleanAndAddUTM = (url) => {
        if (!url) return '';
        let cleanUrl = url.split('?')[0].split('&')[0];
        const utmParams = new URLSearchParams({
          utm_source: 'chatbot_ai',
          utm_medium: 'chat_widget',
          utm_campaign: 'job_search_assistant'
        }).toString();
        return `${cleanUrl}?${utmParams}`;
      };

      return {
        id: getText(job.id),
        title: getText(job.title),
        company: getText(job.company),
        city: getText(job.city),
        region: getText(job.region),
        country: getText(job.country),
        category: getText(job.category),
        url: cleanAndAddUTM(getText(job.url)),
        url_apply: cleanAndAddUTM(getText(job.url_apply)),
        description: getText(job.description),
        salary: getText(job.salary),
        date: getText(job.date),
        jobtype: getText(job.jobtype)
      };
    });

    console.log('✨ Enriqueciendo ofertas con datos inteligentes...');
    const enrichedJobs = enrichOffers(normalizedJobs);

    console.log(`✅ ${enrichedJobs.length} ofertas enriquecidas`);
    console.log('💾 Guardando en Vercel KV...');

    // Crear estructura de caché
    const cacheData = {
      metadata: {
        total_offers: enrichedJobs.length,
        last_updated: new Date().toISOString(),
        source: 'turijobs',
        feed_url: XML_FEED_URL
      },
      offers: enrichedJobs
    };

    // Guardar en Vercel KV (expira en 48 horas)
    await kv.set('job_offers_cache', cacheData, { ex: 172800 });

    console.log('');
    console.log('✅ CACHÉ ACTUALIZADA EXITOSAMENTE');
    console.log('');
    console.log('📊 Estadísticas:');
    console.log(`  - Total ofertas: ${enrichedJobs.length}`);
    console.log(`  - Timestamp: ${cacheData.metadata.last_updated}`);
    console.log(`  - Expira en: 48 horas`);
    console.log('');

    // Verificar enriquecimiento
    const withRelated = enrichedJobs.filter(j => j.enriched?.related_jobs?.length > 0).length;
    const withCities = enrichedJobs.filter(j => j.enriched?.nearby_cities?.length > 0).length;

    console.log('🎯 Enriquecimiento:');
    console.log(`  - Con puestos relacionados: ${withRelated} (${((withRelated/enrichedJobs.length)*100).toFixed(1)}%)`);
    console.log(`  - Con ciudades cercanas: ${withCities} (${((withCities/enrichedJobs.length)*100).toFixed(1)}%)`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

console.log('🚀 Iniciando refresh de caché...');
console.log('');
refreshCache();
