#!/bin/bash

# Script de verificación de producción
# Ejecutar: bash test-production.sh

echo "==================================="
echo "TEST 1: Version Endpoint"
echo "==================================="
curl -s "https://job-search-api-psi.vercel.app/api/version" | jq '.'

echo ""
echo "==================================="
echo "TEST 2: Metadata sin valid_cities"
echo "==================================="
echo "Esperado: false (valid_cities NO debe aparecer)"
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef&location=madrid" | jq '.metadata | has("valid_cities")'

echo ""
echo "==================================="
echo "TEST 3: NIVEL 0.5 - barman sant cugat"
echo "==================================="
echo "Esperado: Resultados de Barcelona con amplification_used"
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat" | jq '{
  results_count: (.results | length),
  related_results_count: (.related_jobs_results | length),
  amplification_type: .amplification_used.type,
  amplification_city: .amplification_used.nearby_city,
  amplification_distance: .amplification_used.distance_km
}'

echo ""
echo "==================================="
echo "TEST 4: Keys en metadata (verificar que NO tiene valid_cities)"
echo "==================================="
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef&location=barcelona" | jq '.metadata | keys'

echo ""
echo "==================================="
echo "TEST 5: NIVEL 0.5 - Verification con otra búsqueda"
echo "==================================="
echo "Búsqueda: cocinero tarragona (ciudad pequeña)"
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=cocinero&location=tarragona" | jq '{
  results_count: (.results | length),
  has_amplification: (.amplification_used != null),
  amplification_type: .amplification_used.type // "none"
}'
