import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let jobSynonyms = null;

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

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
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

    const { query = '', location = '', category = '', limit = '10' } = req.query;
    const maxResults = parseInt(limit) || 10;

    const synonyms = loadSynonyms();
    const normalizedQuery = normalizeText(query);
    const queryTerms = normalizedQuery ? (synonyms[normalizedQuery] || [normalizedQuery]) : [];

    const locationLower = normalizeText(location);
    const categoryLower = normalizeText(category);

    let results = cacheData.offers.filter(job => {
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

    const totalMatches = results.length;
    results = results.slice(0, maxResults);

    const lastUpdate = new Date(cacheData.metadata.last_updated);
    const now = new Date();
    const ageMinutes = Math.round((now - lastUpdate) / (1000 * 60));

    return res.status(200).json({
      success: true,
      metadata: {
        ...cacheData.metadata,
        cache_age_minutes: ageMinutes,
        query_params: { query, location, category, limit: maxResults, expanded_terms: queryTerms.length > 1 ? queryTerms : undefined }
      },
      total_matches: totalMatches,
      returned_results: results.length,
      results: results
    });

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
