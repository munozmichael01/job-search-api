const fs = require('fs');
const path = require('path');

try {
  // Leer el prompt mejorado
  const improvedPrompt = fs.readFileSync('assistant_prompt_improved.txt', 'utf-8');
  console.log('✅ Prompt mejorado cargado:', improvedPrompt.length, 'caracteres');

  // Leer el archivo create.js actual
  const createJsPath = path.join('api', 'assistant', 'create.js');
  let createJs = fs.readFileSync(createJsPath, 'utf-8');
  console.log('✅ Archivo create.js cargado');

  // Reemplazar el prompt completo entre el primer backtick de instructions y el último .`
  // Buscar: instructions: `...`,
  const regex = /(instructions:\s*`)([\s\S]*?)(`\s*,\s*tools:)/;

  if (!regex.test(createJs)) {
    console.error('❌ No se encontró el patrón del prompt en create.js');
    process.exit(1);
  }

  const newCreateJs = createJs.replace(regex, `$1${improvedPrompt}$3`);

  // Guardar el archivo actualizado
  fs.writeFileSync(createJsPath, newCreateJs, 'utf-8');

  console.log('✅ Archivo create.js actualizado exitosamente');
  console.log('');
  console.log('📊 Cambios aplicados:');
  console.log('  - Fuente exclusiva: Turijobs.com');
  console.log('  - Jerarquías con pesos (0.30-1.00)');
  console.log('  - Tabla de distancias geográficas');
  console.log('  - Búsqueda por sector completo');
  console.log('  - Reglas dinámicas de aprendizaje');
  console.log('');
  console.log('🚀 Próximo paso: Hacer commit y deploy');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
