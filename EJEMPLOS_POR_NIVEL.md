# 🎯 Ejemplos de Búsqueda por Nivel de Amplificación

**Basado en las ofertas actuales (2052 jobs, 323 ciudades)**
**Fecha:** 4 de noviembre de 2025

---

## NIVEL 1: Búsqueda Normal (≥10 resultados)

### ✅ Ejemplo: "camarero madrid"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=camarero&location=madrid"
```

**Esperado:**
- ≥10 resultados directos de Madrid
- **NO** hay amplificación (suficientes resultados)
- `amplification_used`: null

**Por qué funciona:**
- Madrid es la ciudad con más ofertas
- "Camarero" es un puesto muy común
- Hay muchos resultados directos

---

## NIVEL 1.5: Amplificación Leve (1-9 resultados + ciudades cercanas)

### ✅ Ejemplo: "sommelier barcelona"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=sommelier&location=barcelona"
```

**Esperado:**
- 1-9 resultados en Barcelona
- **NIVEL 1.5 se activa:** agrega ofertas de ciudades cercanas (≤50km)
- `amplification_used.type`: "nivel_1_5_nearby"
- Ciudades cercanas: El Prat de Llobregat, Badalona, etc.

**Por qué funciona:**
- Sommelier es un puesto especializado (pocos resultados)
- Barcelona tiene algunos pero no muchos
- Hay ciudades cercanas con más ofertas

---

### ✅ Ejemplo alternativo: "chef pastelero valencia"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef+pastelero&location=valencia"
```

**Esperado:**
- Pocos resultados en Valencia (1-9)
- **NIVEL 1.5 se activa**
- Agrega ofertas de ciudades cercanas

---

## NIVEL 0.5: Sin Resultados → Ciudades Cercanas (MISMO puesto)

### ✅ Ejemplo: "barman sant cugat" (ya probado)

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat"
```

**Esperado:**
- 0 resultados en Sant Cugat
- **NIVEL 0.5 se activa:** busca "barman" en ciudades cercanas
- `amplification_used.type`: "nivel_0_5_nearby"
- `nearby_city`: "Barcelona"
- `distance_km`: 12.5
- Retorna 4 ofertas de bartender de Barcelona

**Por qué funciona:**
- Sant Cugat es ciudad pequeña (sin ofertas de bartender)
- Barcelona (12.5km) tiene 4 ofertas de bartender
- Es el MISMO puesto, solo en otra ciudad

---

### ✅ Ejemplo alternativo: "recepcionista reus"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=recepcionista&location=reus"
```

**Esperado:**
- 0 resultados en Reus (ciudad mediana)
- **NIVEL 0.5 se activa**
- Busca "recepcionista" en ciudades cercanas (Tarragona, Salou, etc.)

---

### ✅ Ejemplo alternativo: "cocinero tarragona"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=cocinero&location=tarragona"
```

**Esperado:**
- Si hay 0 resultados en Tarragona
- **NIVEL 0.5 se activa**
- Busca "cocinero" en ciudades cercanas

---

## NIVEL 2: Sin Resultados → Trabajos Relacionados

### ✅ Ejemplo: "chef molecular barcelona"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef+molecular&location=barcelona"
```

**Esperado:**
- 0 resultados para "chef molecular" (demasiado específico)
- **NIVEL 2 se activa:** busca trabajos relacionados
- `amplification_used.type`: "nivel_2_related"
- Retorna ofertas de: Chef, Sous Chef, Chef de Partie, etc.

**Por qué funciona:**
- "Chef molecular" es un término muy específico/nicho
- No hay ofertas exactas
- Pero hay trabajos relacionados en la misma área (Cocina)

---

### ✅ Ejemplo alternativo: "mixólogo madrid"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=mixologo&location=madrid"
```

**Esperado:**
- Si hay 0 resultados para "mixólogo" exacto
- **NIVEL 2 se activa**
- Retorna: Bartender, Barman, Coctelero (trabajos relacionados)

---

### ✅ Ejemplo alternativo: "chef ejecutivo sevilla"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef+ejecutivo&location=sevilla"
```

**Esperado:**
- 0 resultados para "chef ejecutivo" en Sevilla
- **NIVEL 2 se activa**
- Retorna: Chef, Sous Chef, Jefe de Cocina (puestos relacionados)

---

## NIVEL 2 NEARBY: Trabajos Relacionados + Ciudades Cercanas

### ✅ Ejemplo: "chef dietético salamanca"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef+dietetico&location=salamanca"
```

**Esperado:**
- 0 resultados para "chef dietético" en Salamanca (ciudad mediana)
- **NIVEL 2 se activa:** busca trabajos relacionados en Salamanca
- **NIVEL 2 NO encuentra nada** en Salamanca
- **NIVEL 2 NEARBY se activa:** busca trabajos relacionados en ciudades cercanas
- `amplification_used.type`: "nivel_2_nearby"
- Retorna: Chef, Cocinero, etc. de Valladolid, Ávila, u otras ciudades ≤50km

**Por qué funciona:**
- "Chef dietético" es muy específico
- Salamanca es ciudad mediana con pocas ofertas
- Combina búsqueda de relacionados + ciudades cercanas

---

### ✅ Ejemplo alternativo: "gerente de coctelería burgos"

```bash
curl "https://job-search-api-psi.vercel.app/api/jobs/search?query=gerente+cocteleria&location=burgos"
```

**Esperado:**
- 0 resultados exactos en Burgos
- **NIVEL 2 NEARBY se activa**
- Busca: Bartender, Gerente de Bar, Sommelier en ciudades cercanas

---

## 🧪 Cómo Verificar Cada Nivel

### Ver el Nivel de Amplificación:

```bash
curl "URL" | jq '.amplification_used.type'
```

**Valores posibles:**
- `null` → NIVEL 1 (suficientes resultados directos)
- `"nivel_1_5_nearby"` → NIVEL 1.5 (pocos resultados, amplifica con cercanas)
- `"nivel_0_5_nearby"` → NIVEL 0.5 (0 resultados, busca mismo puesto en cercanas)
- `"nivel_2_related"` → NIVEL 2 (0 resultados, busca trabajos relacionados)
- `"nivel_2_nearby"` → NIVEL 2 NEARBY (trabajos relacionados en ciudades cercanas)

---

## 📊 Resumen Visual

```
Usuario busca: "chef molecular barcelona"
                    ↓
┌──────────────────────────────────────┐
│ NIVEL 1: ¿≥10 resultados directos?  │
└──────────────────────────────────────┘
                    ↓ NO
┌──────────────────────────────────────┐
│ NIVEL 1.5: ¿1-9 resultados?          │
│ → Agregar de ciudades cercanas       │
└──────────────────────────────────────┘
                    ↓ NO (0 resultados)
┌──────────────────────────────────────┐
│ NIVEL 0.5: ¿Hay mismo puesto en      │
│            ciudades cercanas ≤50km?  │
└──────────────────────────────────────┘
                    ↓ NO
┌──────────────────────────────────────┐
│ NIVEL 2: ¿Hay trabajos relacionados  │
│          en la ciudad original?      │
└──────────────────────────────────────┘
                    ↓ SÍ ✅
        Retorna: Chef, Sous Chef, Chef de Partie
        amplification_used.type: "nivel_2_related"
```

---

## 🎯 Ejemplos Rápidos por Nivel

| Nivel | Ejemplo | Query |
|-------|---------|-------|
| **NIVEL 1** | Búsqueda común | `camarero madrid` |
| **NIVEL 1.5** | Puesto especializado | `sommelier barcelona` |
| **NIVEL 0.5** | Ciudad pequeña | `barman sant cugat` |
| **NIVEL 2** | Término muy específico | `chef molecular barcelona` |
| **NIVEL 2 NEARBY** | Específico + ciudad mediana | `chef dietético salamanca` |

---

## 💡 Tips para Crear Tus Propios Ejemplos

### Para activar NIVEL 1.5:
- Usa puestos especializados: "sommelier", "chef pastelero", "maitre"
- En ciudades grandes: Barcelona, Madrid, Valencia

### Para activar NIVEL 0.5:
- Usa puestos comunes: "camarero", "cocinero", "recepcionista"
- En ciudades pequeñas: Sant Cugat, Reus, Marbella

### Para activar NIVEL 2:
- Usa términos muy específicos: "chef molecular", "chef ejecutivo"
- Combina términos: "gerente + coctelería", "chef + dietético"

### Para activar NIVEL 2 NEARBY:
- Combina término específico + ciudad mediana
- Ejemplos: Salamanca, Burgos, Tarragona, Cádiz

---

## 🧪 Script de Testing

```bash
#!/bin/bash

echo "=== NIVEL 1: Búsqueda Normal ==="
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=camarero&location=madrid" | jq '{nivel: .amplification_used.type, results: (.results | length)}'

echo ""
echo "=== NIVEL 1.5: Amplificación Leve ==="
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=sommelier&location=barcelona" | jq '{nivel: .amplification_used.type, results: (.results | length), related: (.related_jobs_results | length)}'

echo ""
echo "=== NIVEL 0.5: Ciudades Cercanas ==="
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=barman&location=sant+cugat" | jq '{nivel: .amplification_used.type, ciudad: .amplification_used.nearby_city, distancia: .amplification_used.distance_km, results: (.related_jobs_results | length)}'

echo ""
echo "=== NIVEL 2: Trabajos Relacionados ==="
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef+molecular&location=barcelona" | jq '{nivel: .amplification_used.type, results: (.related_jobs_results | length)}'

echo ""
echo "=== NIVEL 2 NEARBY: Relacionados + Cercanas ==="
curl -s "https://job-search-api-psi.vercel.app/api/jobs/search?query=chef+dietetico&location=salamanca" | jq '{nivel: .amplification_used.type, ciudad: .amplification_used.nearby_city, results: (.related_jobs_results | length)}'
```

Guarda como `test-all-levels.sh` y ejecuta:
```bash
bash test-all-levels.sh
```

---

**Nota:** Algunos ejemplos pueden variar según las ofertas actuales en el feed de Turijobs. Si un ejemplo no funciona como esperado, es porque el feed cambió. Usa los "Tips" arriba para crear tus propios ejemplos.