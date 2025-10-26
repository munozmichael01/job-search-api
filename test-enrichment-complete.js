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

    // Normalizar TODAS las ofertas para obtener mejor muestra
    const getText = (field) => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (field._text) return field._text;
      if (field['#text']) return field['#text'];
      return String(field);
    };

    const normalizedJobs = jobsArray.map(job => ({
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
    console.log('✨ Enriqueciendo TODAS las ofertas con datos inteligentes...\n');
    const enrichedJobs = enrichOffers(normalizedJobs);

    // Mostrar ejemplos enriquecidos
    console.log('\n🎯 EJEMPLOS DE OFERTAS TOTALMENTE ENRIQUECIDAS:\n');
    console.log('═'.repeat(80));

    // Buscar ofertas que tengan AMBOS: puestos relacionados Y ciudades cercanas
    const fullyEnriched = enrichedJobs.filter(
      j => j.enriched.related_jobs.length > 0 && j.enriched.nearby_cities.length > 0
    );

    console.log(`\n✅ Encontradas ${fullyEnriched.length} ofertas con puestos relacionados Y ciudades cercanas\n`);

    fullyEnriched.slice(0, 10).forEach((job, idx) => {
      console.log(`\n📌 OFERTA ${idx + 1}:`);
      console.log(`   Título: ${job.titulo}`);
      console.log(`   Ciudad: ${job.ciudad}`);
      console.log(`   Empresa: ${job.empresa}`);

      if (job.enriched.related_jobs.length > 0) {
        console.log(`\n   🔗 Puestos Relacionados (${job.enriched.related_jobs.length}):`);
        job.enriched.related_jobs.slice(0, 3).forEach(rel => {
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
    console.log(`   Ofertas con puestos relacionados: ${enrichedJobs.filter(j => j.enriched.related_jobs.length > 0).length} (${((enrichedJobs.filter(j => j.enriched.related_jobs.length > 0).length / enrichedJobs.length) * 100).toFixed(1)}%)`);
    console.log(`   Ofertas con ciudades cercanas: ${enrichedJobs.filter(j => j.enriched.nearby_cities.length > 0).length} (${((enrichedJobs.filter(j => j.enriched.nearby_cities.length > 0).length / enrichedJobs.length) * 100).toFixed(1)}%)`);
    console.log(`   Ofertas TOTALMENTE enriquecidas: ${fullyEnriched.length} (${((fullyEnriched.length / enrichedJobs.length) * 100).toFixed(1)}%)`);

    // Distribución de ciudades
    const citiesWithOffers = {};
    enrichedJobs.forEach(job => {
      const city = job.ciudad;
      if (city) {
        citiesWithOffers[city] = (citiesWithOffers[city] || 0) + 1;
      }
    });

    const topCities = Object.entries(citiesWithOffers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log(`\n🏙️  TOP 10 CIUDADES CON MÁS OFERTAS:`);
    topCities.forEach(([city, count], idx) => {
      console.log(`   ${idx + 1}. ${city}: ${count} ofertas`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEnrichment();
