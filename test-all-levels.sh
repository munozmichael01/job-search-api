#!/bin/bash

# Script para probar todos los niveles de amplificación
# Ejecutar: bash test-all-levels.sh

BASE_URL="https://job-search-api-psi.vercel.app/api/jobs/search"

echo "🧪 TESTING TODOS LOS NIVELES DE AMPLIFICACIÓN"
echo "================================================"
echo ""

echo "=== NIVEL 1: Búsqueda Normal (≥10 resultados) ==="
echo "Query: camarero madrid"
curl -s "$BASE_URL?query=camarero&location=madrid" | jq '{
  nivel: (.amplification_used.type // "NIVEL 1 (sin amplificación)"),
  total_results: .pagination.total_matches,
  returned: (.results | length),
  mensaje: "✅ Suficientes resultados directos"
}'

echo ""
echo "=== NIVEL 1.5: Amplificación Leve (1-9 resultados) ==="
echo "Query: sommelier barcelona"
curl -s "$BASE_URL?query=sommelier&location=barcelona" | jq '{
  nivel: .amplification_used.type,
  results_originales: (.results | length),
  results_amplificados: (.related_jobs_results | length),
  ciudad_amplificacion: .amplification_used.nearby_city,
  distancia_km: .amplification_used.distance_km,
  mensaje: "✅ Pocos resultados → amplifica con ciudades cercanas"
}'

echo ""
echo "=== NIVEL 0.5: Sin Resultados → Ciudades Cercanas ==="
echo "Query: barman sant cugat"
curl -s "$BASE_URL?query=barman&location=sant+cugat" | jq '{
  nivel: .amplification_used.type,
  results_originales: (.results | length),
  results_de_ciudad_cercana: (.related_jobs_results | length),
  ciudad: .amplification_used.nearby_city,
  distancia_km: .amplification_used.distance_km,
  mensaje: "✅ 0 resultados → busca MISMO puesto en ciudades cercanas",
  ofertas: [.related_jobs_results[]? | {titulo: .titulo, ciudad: .ciudad}]
}'

echo ""
echo "=== NIVEL 2: Trabajos Relacionados ==="
echo "Query: chef molecular barcelona"
curl -s "$BASE_URL?query=chef+molecular&location=barcelona" | jq '{
  nivel: .amplification_used.type,
  results_originales: (.results | length),
  results_relacionados: (.related_jobs_results | length),
  mensaje: "✅ 0 resultados → busca trabajos RELACIONADOS",
  tipos_trabajos: [.related_jobs_results[]? | .titulo] | unique | .[0:5]
}'

echo ""
echo "=== NIVEL 2 NEARBY: Relacionados + Ciudades Cercanas ==="
echo "Query: chef dietético salamanca"
curl -s "$BASE_URL?query=chef+dietetico&location=salamanca" | jq '{
  nivel: .amplification_used.type,
  results_relacionados: (.related_jobs_results | length),
  ciudad_amplificacion: .amplification_used.nearby_city,
  distancia_km: .amplification_used.distance_km,
  mensaje: "✅ 0 resultados → busca trabajos RELACIONADOS en ciudades CERCANAS",
  ofertas: [.related_jobs_results[]? | {titulo: .titulo, ciudad: .ciudad}] | .[0:3]
}'

echo ""
echo "================================================"
echo "✅ Testing completado"
