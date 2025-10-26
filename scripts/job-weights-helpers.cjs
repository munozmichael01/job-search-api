/**
 * Funciones auxiliares para el cálculo de pesos de relaciones
 */

// Palabras clave para detectar nivel jerárquico
const seniorKeywords = [
  'ejecutivo', 'executive', 'director', 'jefe', 'head',
  'chief', 'principal', 'master', 'gerente', 'manager',
  'capitán', 'líder', 'coordinador'
];

const midKeywords = [
  'sous', 'segundo', 'encargado', 'coordinador',
  'supervisor', 'lead', 'senior', 'partida',
  'especialista', 'técnico'
];

const juniorKeywords = [
  'ayudante', 'assistant', 'junior', 'commis',
  'aprendiz', 'trainee', 'intern', 'becario',
  'pinche', 'auxiliar'
];

/**
 * Determina el nivel jerárquico de un puesto basado en sus nombres
 * @param {string[]} jobNames - Array de nombres del puesto
 * @returns {number} 1=junior, 2=mid, 3=senior
 */
function getLevel(jobNames) {
  const text = jobNames.join(' ').toLowerCase();

  if (seniorKeywords.some(kw => text.includes(kw))) {
    return 3; // Senior
  }

  if (juniorKeywords.some(kw => text.includes(kw))) {
    return 1; // Junior
  }

  if (midKeywords.some(kw => text.includes(kw))) {
    return 2; // Mid
  }

  return 2; // Default: mid-level
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 * @param {string} s1 - Primer string
 * @param {string} s2 - Segundo string
 * @returns {number} Distancia de Levenshtein
 */
function levenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Inicializar matriz
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calcular distancia
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Eliminación
        matrix[i][j - 1] + 1,      // Inserción
        matrix[i - 1][j - 1] + cost // Sustitución
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calcula la similitud entre dos arrays de nombres usando Levenshtein
 * @param {string[]} names1 - Array de nombres del primer puesto
 * @param {string[]} names2 - Array de nombres del segundo puesto
 * @returns {number} Similitud normalizada entre 0.0 y 1.0
 */
function levenshteinSimilarity(names1, names2) {
  // Usar el nombre más corto de cada lista (más representativo)
  const name1 = names1.reduce((shortest, name) =>
    name.length < shortest.length ? name : shortest, names1[0]);
  const name2 = names2.reduce((shortest, name) =>
    name.length < shortest.length ? name : shortest, names2[0]);

  const maxLen = Math.max(name1.length, name2.length);
  if (maxLen === 0) return 0.0;

  const distance = levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
  return 1 - (distance / maxLen);
}

module.exports = {
  getLevel,
  levenshteinDistance,
  levenshteinSimilarity
};
