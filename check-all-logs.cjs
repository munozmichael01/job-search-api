const fetch = require('node-fetch');

async function checkLogs() {
  const url = 'https://job-search-api-psi.vercel.app/api/jobs/search?query=mantenimiento&location=tarragona&limit=10&debug=true';
  const res = await fetch(url);
  const data = await res.json();

  console.log('Total debug logs:', data.debug_logs ? data.debug_logs.length : 0);
  console.log('\n📋 PRIMEROS 20 LOGS:\n');

  if (data.debug_logs) {
    data.debug_logs.slice(0, 20).forEach((log, i) => {
      console.log(`[${i.toString().padStart(2, '0')}] ${log}`);
    });
  } else {
    console.log('⚠️  No hay debug_logs');
  }
}

checkLogs().catch(err => console.error('Error:', err.message));
