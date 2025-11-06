// INSERTAR ESTO DESPUÉS DE LA LÍNEA 456 (después del cierre del NIVEL 2)
// Y ANTES DE LA LÍNEA 458 (antes del inicio del NIVEL 1.5)

    // NIVEL 0.5: Si NO hay resultados pero la ciudad tiene coordenadas, buscar en ciudades cercanas
    if (query && location && totalMatches === 0 && startOffset === 0 && !relatedJobsResults) {
      try {
        console.log(`🔍 NIVEL 0.5: No hay resultados en "${location}", buscando MISMO puesto en ciudades cercanas...`);

        const queryNormalized = normalizeText(query);
        const locationNormalized = normalizeText(location);

        // Cargar coordenadas de TODAS las ciudades (no solo las que tienen ofertas)
        const cityCoordinates = loadCityCoordinates();

        // Verificar si la ciudad solicitada tiene coordenadas
        if (!cityCoordinates[locationNormalized]) {
          console.log(`   ℹ️  "${location}" no tiene coordenadas en city_coordinates.json, saltando NIVEL 0.5`);
        } else {
          const requestedCityCoords = cityCoordinates[locationNormalized];
          console.log(`   "${location}" tiene coordenadas: lat ${requestedCityCoords.lat}, lon ${requestedCityCoords.lon}`);

          // Encontrar ciudades cercanas (dentro de 50km) que tengan ofertas
          const nearbyCitiesWithOffers = [];

          // Obtener ciudades únicas con ofertas
          const citiesWithOffers = {};
          cacheData.offers.forEach(job => {
            const city = normalizeText(job.ciudad || job.city || '');
            if (city && cityCoordinates[city]) {
              citiesWithOffers[city] = cityCoordinates[city];
            }
          });

          // Calcular distancias a ciudades con ofertas
          Object.keys(citiesWithOffers).forEach(city => {
            if (city === locationNormalized) return; // Skip la ciudad solicitada

            const coords = citiesWithOffers[city];
            const distance = calculateDistance(
              requestedCityCoords.lat,
              requestedCityCoords.lon,
              coords.lat,
              coords.lon
            );

            if (distance <= 50) {
              nearbyCitiesWithOffers.push({ city, distance: parseFloat(distance.toFixed(1)) });
            }
          });

          // Ordenar por distancia
          nearbyCitiesWithOffers.sort((a, b) => a.distance - b.distance);

          if (nearbyCitiesWithOffers.length > 0) {
            console.log(`   Encontradas ${nearbyCitiesWithOffers.length} ciudades cercanas con ofertas`);
            console.log(`   Top 3: ${nearbyCitiesWithOffers.slice(0, 3).map(c => `${c.city} (${c.distance}km)`).join(', ')}`);

            // Buscar MISMO puesto (query) en ciudades cercanas
            const offersInNearbyCities = [];

            nearbyCitiesWithOffers.slice(0, 10).forEach(nearbyCity => {
              const nearbyCityNormalized = normalizeText(nearbyCity.city);

              cacheData.offers.forEach(job => {
                // Match del título (mismo query)
                const title = normalizeText(job.titulo || job.title || '');
                const titleMatch = title.includes(queryNormalized) || queryNormalized.includes(title);
                if (!titleMatch) return;

                // Match de ciudad cercana
                const city = normalizeText(job.ciudad || job.city || '');
                const region = normalizeText(job.region || '');
                const cityMatch = city.includes(nearbyCityNormalized) ||
                                region.includes(nearbyCityNormalized) ||
                                nearbyCityNormalized.includes(city);
                if (!cityMatch) return;

                offersInNearbyCities.push({
                  ...job,
                  _nearbyCity: nearbyCity.city,
                  _distance: nearbyCity.distance
                });
              });
            });

            if (offersInNearbyCities.length > 0) {
              console.log(`   ✅ NIVEL 0.5: Encontradas ${offersInNearbyCities.length} ofertas de "${query}" en ciudades cercanas`);

              // Agrupar por ciudad para mostrar la más relevante
              const offersByCity = {};
              offersInNearbyCities.forEach(offer => {
                const city = offer._nearbyCity;
                if (!offersByCity[city]) offersByCity[city] = [];
                offersByCity[city].push(offer);
              });

              const mostCommonCity = Object.keys(offersByCity).reduce((a, b) =>
                offersByCity[a].length > offersByCity[b].length ? a : b
              );
              const mostCommonDistance = offersInNearbyCities.find(o => o._nearbyCity === mostCommonCity)?._distance;

              // Aplicar paginación
              const totalNearbyMatches = offersInNearbyCities.length;
              const nearbyHasMore = relatedOffset + maxResults < totalNearbyMatches;
              const nearbyRemaining = nearbyHasMore ? totalNearbyMatches - (relatedOffset + maxResults) : 0;

              relatedJobsResults = offersInNearbyCities
                .slice(relatedOffset, relatedOffset + maxResults)
                .map(offer => {
                  const { _nearbyCity, _distance, ...cleanOffer } = offer;
                  return cleanOffer;
                });

              amplificationUsed = {
                type: 'nivel_0_5_nearby',
                original_query: query,
                original_location: location,
                nearby_city: mostCommonCity,
                distance_km: mostCommonDistance,
                total_nearby_found: totalNearbyMatches,
                nearby_pagination: {
                  total_matches: totalNearbyMatches,
                  returned_results: relatedJobsResults.length,
                  offset: relatedOffset,
                  limit: maxResults,
                  has_more: nearbyHasMore,
                  remaining: nearbyRemaining,
                  next_offset: nearbyHasMore ? relatedOffset + maxResults : null
                }
              };

              console.log(`   ✅ NIVEL 0.5: Retornando ${relatedJobsResults.length} ofertas de ${mostCommonCity} (${mostCommonDistance}km, offset=${relatedOffset}, has_more=${nearbyHasMore})`);
            } else {
              console.log(`   ℹ️  No se encontraron ofertas de "${query}" en ciudades cercanas`);
            }
          } else {
            console.log(`   ℹ️  No hay ciudades con ofertas dentro de 50km de "${location}"`);
          }
        }
      } catch (error) {
        console.error('⚠️  Error en NIVEL 0.5:', error.message);
      }
    }

// --- FIN DE NIVEL 0.5 ---
// Después de esto continúa NIVEL 1.5 (línea 458)
