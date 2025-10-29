import https from 'https';

function testStreaming() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      thread_id: 'thread_test_123',  // Este thread debe existir o crear uno antes
      message: 'busca chef en madrid'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat/send-message-stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log('🧪 TEST: Streaming de respuestas del chatbot\n');
    console.log('═══════════════════════════════════════════\n');
    console.log('📡 Conectando al streaming endpoint...\n');

    const req = https.request(options, (res) => {
      console.log(`✅ Conexión establecida (Status: ${res.statusCode})\n`);

      let accumulatedText = '';
      let chunkCount = 0;

      res.on('data', (chunk) => {
        chunkCount++;
        const data = chunk.toString();
        const lines = data.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'status') {
                console.log(`⏳ Status: ${event.content}`);
              } else if (event.type === 'content') {
                accumulatedText = event.accumulated || (accumulatedText + event.content);
                // Mostrar progreso cada 10 chunks
                if (chunkCount % 10 === 0) {
                  console.log(`📝 Recibido (${accumulatedText.length} chars)...`);
                }
              } else if (event.type === 'done') {
                console.log(`\n✅ Streaming completado\n`);
                console.log(`📊 Total de chunks: ${chunkCount}`);
                console.log(`📏 Longitud final: ${event.full_message.length} caracteres\n`);
                console.log(`📝 Primeros 300 caracteres:`);
                console.log(`"${event.full_message.substring(0, 300)}..."\n`);
              } else if (event.type === 'error') {
                console.error(`❌ Error: ${event.content}`);
              }
            } catch (e) {
              // Ignorar líneas vacías o mal formateadas
            }
          }
        }
      });

      res.on('end', () => {
        console.log('═══════════════════════════════════════════\n');
        console.log('🎉 Test completado exitosamente\n');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error en la petición:', error.message);
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

// Primero crear un thread para testing
async function createTestThread() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat/create-thread',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.success) {
          console.log(`✅ Thread de prueba creado: ${result.thread_id}\n`);
          resolve(result.thread_id);
        } else {
          reject(new Error('No se pudo crear thread'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  try {
    // Primero crear thread
    const threadId = await createTestThread();

    // Ahora probar streaming con ese thread
    await testStreaming();

  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

runTest();
