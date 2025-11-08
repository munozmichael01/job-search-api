// Test script for new architecture
const https = require('https');

const BASE_URL = 'https://job-search-api-psi.vercel.app/api/jobs/search';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('🧪 Testing New Architecture (4 Levels)\n');
  console.log('='.repeat(60));

  // Test 1: NIVEL 1 ≥ 10 resultados
  console.log('\n📋 Test 1: camarero barcelona (should be NIVEL 1 only, ≥10)');
  try {
    const url1 = `${BASE_URL}?query=camarero&location=barcelona&limit=10`;
    const data1 = await fetchJSON(url1);
    console.log(`  Total matches: ${data1.pagination.total_matches}`);
    console.log(`  Results returned: ${data1.results.length}`);
    console.log(`  Amplification: ${data1.amplification_used?.type || 'none'}`);
    console.log(`  Available related: ${data1.available_related_jobs ? 'YES' : 'NO'}`);
    console.log(`  ✅ ${data1.pagination.total_matches >= 10 && !data1.amplification_used ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }

  // Test 2: NIVEL 1 + NIVEL 1+ ≥ 10
  console.log('\n📋 Test 2: recepcionista viladecans (should combine NIVEL 1 + NIVEL 1+)');
  try {
    const url2 = `${BASE_URL}?query=recepcionista&location=viladecans&limit=10`;
    const data2 = await fetchJSON(url2);
    console.log(`  Total matches: ${data2.pagination.total_matches}`);
    console.log(`  Results returned: ${data2.results.length}`);
    console.log(`  Amplification: ${data2.amplification_used?.type || 'none'}`);
    console.log(`  Nearby city: ${data2.amplification_used?.nearby_city || 'N/A'}`);
    console.log(`  Distance: ${data2.amplification_used?.distance_km || 'N/A'} km`);
    console.log(`  Available related: ${data2.available_related_jobs ? 'YES' : 'NO'}`);
    console.log(`  ✅ ${data2.amplification_used?.type === 'nivel_1_nearby' ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }

  // Test 3: NIVEL 1+ < 10 + button
  console.log('\n📋 Test 3: botones viladecans (should show <10 + button)');
  try {
    const url3 = `${BASE_URL}?query=botones&location=viladecans&limit=10`;
    const data3 = await fetchJSON(url3);
    console.log(`  Total matches: ${data3.pagination.total_matches}`);
    console.log(`  Results returned: ${data3.results.length}`);
    console.log(`  Amplification: ${data3.amplification_used?.type || 'none'}`);
    console.log(`  Available related: ${data3.available_related_jobs ? 'YES' : 'NO'}`);
    if (data3.available_related_jobs) {
      console.log(`  Related job: ${data3.available_related_jobs.job_name}`);
      console.log(`  Related count: ${data3.available_related_jobs.count}`);
      console.log(`  Related location: ${data3.available_related_jobs.location}`);
    }
    console.log(`  ✅ ${data3.available_related_jobs ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }

  // Test 4: NIVEL 2 with show_related=true
  console.log('\n📋 Test 4: botones viladecans + show_related=true (should activate NIVEL 2)');
  try {
    const url4 = `${BASE_URL}?query=botones&location=viladecans&limit=10&show_related=true`;
    const data4 = await fetchJSON(url4);
    console.log(`  Has related_jobs_results: ${data4.related_jobs_results ? 'YES' : 'NO'}`);
    console.log(`  Results count: ${data4.related_jobs_results?.length || 0}`);
    console.log(`  Amplification: ${data4.amplification_used?.type || 'none'}`);
    console.log(`  Related job used: ${data4.amplification_used?.related_job_used || 'N/A'}`);
    console.log(`  Weight: ${data4.amplification_used?.weight || 'N/A'}`);
    console.log(`  ✅ ${data4.related_jobs_results ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }

  // Test 5: 0 results → should show button (not activate NIVEL 2)
  console.log('\n📋 Test 5: sommelier tarragona (0 results, should show button)');
  try {
    const url5 = `${BASE_URL}?query=sommelier&location=tarragona&limit=10`;
    const data5 = await fetchJSON(url5);
    console.log(`  Total matches: ${data5.pagination?.total_matches || 0}`);
    console.log(`  Has available_related_jobs: ${data5.available_related_jobs ? 'YES' : 'NO'}`);
    if (data5.available_related_jobs) {
      console.log(`  Related job: ${data5.available_related_jobs.job_name}`);
      console.log(`  Related count: ${data5.available_related_jobs.count}`);
      console.log(`  Related location: ${data5.available_related_jobs.location}`);
    }
    console.log(`  ✅ ${data5.available_related_jobs ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests completed!\n');
}

runTests().catch(console.error);
