import { XMLParser } from 'fast-xml-parser';
import { enrichOffers } from './lib/enrichOffers.js';

const XML_FEED_URL = "https://feed.turijobs.com/partner/files/774E13F3-9D57-4BD6-920D-3A79A70C6AA2/E9753D5A-0F05-4444-9210-9D02EB15C7D5";

async function testEnrichment() {
  try {
    console.log('📥 Descargando ofertas del feed XML...');

    const response = await fetch(XML_FEED_URL, {
      headers: {
        'User-Agent': 'JobSearchBot/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log(`📄 XML descargado: ${xmlText.length} caracteres\n`);

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

    console.log(`📊 Jobs encontrados en XML: ${jobsArray.length}\n`);

    // Normalizar datos (primeros 500 para prueba más completa)
    const getText = (field) => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (field._text) return field._text;
      if (field['#text']) return field['#text'];
      return String(field);
    };

    const normalizedJobs = jobsArray.slice(0, 500).map(job => ({
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
      url: getText(job.url),
      url_aplicar: getText(job.url_apply),
      fecha_publicacion: getText(job.publication),
      num_vacantes: getText(job.num_vacancies) || '1'
    }));

    // ✨ ENRIQUECER OFERTAS
    console.log('✨ Enriqueciendo ofertas con datos inteligentes...\n');
    const enrichedJobs = enrichOffers(normalizedJobs);

    // Mostrar ejemplos enriquecidos
    console.log('\n🎯 EJEMPLOS DE OFERTAS ENRIQUECIDAS:\n');
    console.log('═'.repeat(80));

    // Mostrar los primeros 5 con enriquecimiento
    const withEnrichment = enrichedJobs.filter(
      j => j.enriched.related_jobs.length > 0 || j.enriched.nearby_cities.length > 0
    );

    withEnrichment.slice(0, 5).forEach((job, idx) => {
      console.log(`\n📌 OFERTA ${idx + 1}:`);
      console.log(`   Título: ${job.titulo}`);
      console.log(`   Ciudad: ${job.ciudad}`);
      console.log(`   Empresa: ${job.empresa}`);

      if (job.enriched.related_jobs.length > 0) {
        console.log(`\n   🔗 Puestos Relacionados (${job.enriched.related_jobs.length}):`);
        job.enriched.related_jobs.forEach(rel => {
          console.log(`      • ${rel.job} (peso: ${rel.weight}, área: ${rel.area})`);
          console.log(`        → ${rel.available_offers} ofertas disponibles`);
        });
      }

      if (job.enriched.nearby_cities.length > 0) {
        console.log(`\n   📍 Ciudades Cercanas (${job.enriched.nearby_cities.length}):`);
        job.enriched.nearby_cities.forEach(city => {
          console.log(`      • ${city.city} - ${city.distance.toFixed(1)} km`);
          console.log(`        → ${city.available_offers} ofertas disponibles`);
        });
      }

      console.log('\n' + '─'.repeat(80));
    });

    // Estadísticas finales
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log(`   Total ofertas procesadas: ${enrichedJobs.length}`);
    console.log(`   Ofertas con puestos relacionados: ${enrichedJobs.filter(j => j.enriched.related_jobs.length > 0).length}`);
    console.log(`   Ofertas con ciudades cercanas: ${enrichedJobs.filter(j => j.enriched.nearby_cities.length > 0).length}`);
    console.log(`   Ofertas totalmente enriquecidas: ${withEnrichment.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEnrichment();
