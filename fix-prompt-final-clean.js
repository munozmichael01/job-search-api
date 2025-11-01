import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.join(__dirname, 'assistant_prompt_with_nearby_v2.txt');

console.log('🔧 VERSIÓN FINAL LIMPIA: Solo mejora de mensaje, sin forzar paginación\n');

let content = fs.readFileSync(promptPath, { encoding: 'utf-8' });

// NIVEL 2 (sin nearby) - Solo cambiar el mensaje, sin instrucciones anti-paginación
const oldNivel2 = `   A) Si hay amplification_used.type === "nivel_2":
      "No encontré ofertas de [original_query] en [original_location], pero encontré **[X] ofertas relacionadas**:

      ⚡ MUESTRA TODAS LAS OFERTAS de related_jobs_results (NO pagines)



      [Mostrar ofertas de related_jobs_results con formato normal]

      Estas ofertas pueden incluir responsabilidades de [original_query]."`;

const newNivel2 = `   A) Si hay amplification_used.type === "nivel_2":
      "No encontré ofertas de [original_query] en [original_location], pero encontré **[X] ofertas relacionadas**:

      [Mostrar ofertas de related_jobs_results con formato normal]

      Estas ofertas pueden incluir responsabilidades de [original_query]."`;

if (content.includes('⚡ MUESTRA TODAS LAS OFERTAS de related_jobs_results (NO pagines)')) {
  content = content.replace(oldNivel2, newNivel2);
  console.log('✅ NIVEL 2: Limpiado (mantiene "ofertas relacionadas", quita anti-paginación)');
}

// NIVEL 2 NEARBY - Solo cambiar el mensaje, sin instrucciones anti-paginación
const oldNivel2Nearby = `   A2) Si hay amplification_used.type === "nivel_2_nearby":
      "No encontré ofertas de [original_query] en [original_location], pero encontré **[X] ofertas relacionadas en [nearby_city]** ([distance_km] km):

      ⚡ MUESTRA TODAS LAS OFERTAS de related_jobs_results (NO pagines, NO limites a 3 o 5)



      [Mostrar ofertas de related_jobs_results con formato normal]

      Estas ofertas pueden incluir responsabilidades de [original_query] aunque el título del puesto sea diferente."`;

const newNivel2Nearby = `   A2) Si hay amplification_used.type === "nivel_2_nearby":
      "No encontré ofertas de [original_query] en [original_location], pero encontré **[X] ofertas relacionadas en [nearby_city]** ([distance_km] km):

      [Mostrar ofertas de related_jobs_results con formato normal]

      Estas ofertas pueden incluir responsabilidades de [original_query] aunque el título del puesto sea diferente."`;

if (content.includes('⚡ MUESTRA TODAS LAS OFERTAS de related_jobs_results (NO pagines, NO limites a 3 o 5)')) {
  content = content.replace(oldNivel2Nearby, newNivel2Nearby);
  console.log('✅ NIVEL 2 NEARBY: Limpiado (mantiene "ofertas relacionadas", quita anti-paginación)');
}

// Quitar la regla absoluta si existe
const oldSection5 = `5. PUESTOS RELACIONADOS - AUTOMÁTICO EN EL BACKEND:

   🚨 REGLA ABSOLUTA: Cuando recibas related_jobs_results, MUESTRA TODAS las ofertas que recibiste.
      - Si hay 10 ofertas en related_jobs_results, muestra LAS 10 en un solo mensaje
      - NO limites a 3, 5 o "las primeras"
      - NO uses paginación con "siguiente"
      - Lista TODAS completas desde el inicio

   ⚡ CRÍTICO: El API AUTOMÁTICAMENTE agrega puestos relacionados cuando:`;

const newSection5 = `5. PUESTOS RELACIONADOS - AUTOMÁTICO EN EL BACKEND:

   ⚡ CRÍTICO: El API AUTOMÁTICAMENTE agrega puestos relacionados cuando:`;

if (content.includes('🚨 REGLA ABSOLUTA')) {
  content = content.replace(oldSection5, newSection5);
  console.log('✅ SECCIÓN 5: Quitada regla absoluta anti-paginación');
}

fs.writeFileSync(promptPath, content, { encoding: 'utf-8' });

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ PROMPT LIMPIADO!\n');
console.log('CAMBIOS MANTENIDOS:');
console.log('  ✅ "ofertas relacionadas" (más preciso que "ofertas de [puesto]")');
console.log('  ✅ Explicación clara sobre responsabilidades\n');
console.log('CAMBIOS REVERTIDOS:');
console.log('  ❌ Instrucciones anti-paginación (no funcionaban)');
console.log('  ❌ Regla absoluta (no funcionaba)\n');
console.log('RESULTADO:');
console.log('  → GPT-4 paginará naturalmente (~3 ofertas + "siguiente")');
console.log('  → Widget debe mostrar botón "siguiente" sin repetir ofertas');
