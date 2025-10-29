import https from 'https';

function apiCall(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'https://job-search-api-psi.vercel.app');
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🧪 TEST: Ciudades cercanas PROACTIVAS\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Crear thread
  const thread = await apiCall('POST', '/api/chat/create-thread');
  console.log(`✅ Thread: ${thread.thread_id}\n`);

  await new Promise(r => setTimeout(r, 1000));

  // Buscar en Badalona (ciudad pequeña con pocas ofertas)
  console.log('💬 Usuario: "busca camarero en badalona"\n');
  console.log('⏳ Esperando respuesta...\n');

  const start = Date.now();
  const msg = await apiCall('POST', '/api/chat/send-message', {
    thread_id: thread.thread_id,
    message: 'busca camarero en badalona'
  });
  const time = Date.now() - start;

  if (msg.success) {
    console.log(`⏱️  Tiempo: ${(time/1000).toFixed(1)}s\n`);
    console.log('═══════════════════════════════════════════════════\n');
    console.log('📝 RESPUESTA COMPLETA:\n');
    console.log(msg.message);
    console.log('\n═══════════════════════════════════════════════════\n');

    // Verificar que mencione ciudades cercanas
    const hasBarcelona = msg.message.toLowerCase().includes('barcelona');
    const hasCercanas = msg.message.toLowerCase().includes('cercanas') ||
                        msg.message.toLowerCase().includes('cercanos') ||
                        msg.message.includes('🌆');

    console.log('✅ VERIFICACIÓN:\n');
    console.log(`   ${hasCercanas ? '✅' : '❌'} Menciona ciudades cercanas`);
    console.log(`   ${hasBarcelona ? '✅' : '❌'} Menciona Barcelona (ciudad cercana)`);

    if (hasCercanas && hasBarcelona) {
      console.log('\n🎉 ÉXITO: El assistant ES PROACTIVO con ciudades cercanas\n');
    } else {
      console.log('\n⚠️  PROBLEMA: El assistant NO mostró ciudades cercanas proactivamente\n');
    }
  } else {
    console.log(`❌ Error: ${msg.error}`);
  }
}

test();
