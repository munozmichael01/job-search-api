# 🆕 CREAR ASSISTANT NUEVO - URGENTE

## Problema Identificado:

**El Assistant actual está corrupto:**
- API responde en 1.4s ✅
- Assistant se queda "in_progress" 3 minutos ❌
- Timeout a los 300 segundos ❌

**Causa:** El Assistant tiene estado interno corrupto o caché corrupto en OpenAI.

---

## ✅ FUNCIÓN CORRECTA (ya la tienes bien):

```json
{
  "name": "searchJobs",
  "description": "Busca ofertas de empleo en el sector turístico",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Término de búsqueda (puesto). Ejemplos: 'chef', 'camarero'"
      },
      "location": {
        "type": "string",
        "description": "Ciudad o región. Ejemplos: 'Madrid', 'Barcelona'"
      },
      "limit": {
        "type": "number",
        "description": "Número máximo de resultados (default: 10)"
      },
      "offset": {
        "type": "number",
        "description": "Desplazamiento para paginación de resultados normales"
      },
      "related_offset": {
        "type": "number",
        "description": "Desplazamiento para paginación de related_jobs_results"
      }
    },
    "required": ["query"]
  }
}
```

✅ **Esta función está perfecta.** NO agregues más funciones.

---

## 🔧 PASOS PARA CREAR ASSISTANT NUEVO:

### Opción A: Desde OpenAI Dashboard (MÁS RÁPIDO)

1. Ve a: https://platform.openai.com/assistants
2. Click en **"Create"**
3. Configura:
   - **Name:** `Turijobs Assistant V2`
   - **Model:** `gpt-4o`
   - **Instructions:** Pega el prompt que acabas de actualizar (el de hace 1 día)
   - **Functions:** Agrega SOLO `searchJobs` con los parámetros de arriba
   - **Temperature:** 0.7
4. Click **"Save"**
5. Copia el **Assistant ID** (formato: `asst_xxxxxxxxxx`)

---

### Opción B: Desde el Código (llamar endpoint)

1. Actualiza la variable de entorno en Vercel:
   - Ve a Vercel → Project Settings → Environment Variables
   - **BORRA** `OPENAI_ASSISTANT_ID` temporalmente
   - Guarda cambios

2. Llama al endpoint de creación:
   ```bash
   curl -X POST https://job-search-api-psi.vercel.app/api/assistant/create
   ```

3. Copia el Assistant ID de la respuesta

4. Agrega la variable de nuevo en Vercel:
   - `OPENAI_ASSISTANT_ID` = `asst_xxxxxxxxxx` (el nuevo ID)

---

## 📋 PROMPT A USAR (El que me diste, está correcto):

Usa el prompt que acabas de pegar en el Assistant (el de hace 1 día). Ese prompt está bien y tiene:
- ✅ Reglas de negocio completas
- ✅ NIVEL 0.5, 1.5, 2, 2 NEARBY
- ✅ Paginación correcta con related_offset
- ✅ Instrucciones de mostrar TODAS las ofertas

---

## ⚠️ IMPORTANTE - NO agregues estas funciones:

❌ `checkCacheStatus` - NO EXISTE, no la agregues
❌ `refreshJobs` - NO EXISTE, no la agregues

Solo necesitas: ✅ `searchJobs`

---

## 🧪 Verificación Post-Creación:

Después de crear el Assistant nuevo:

1. **Actualiza OPENAI_ASSISTANT_ID en Vercel** con el nuevo ID
2. **Redeploy** para que tome efecto
3. **Prueba** con "camarero barcelona"

**Resultado esperado:**
- ⏱️ Respuesta en 30-60 segundos (no 3 minutos)
- ✅ Ofertas mostradas correctamente

---

## 🎯 Por Qué Esto Funcionará:

**Assistant viejo:**
- Estado corrupto
- 3 minutos de latencia
- Timeouts constantes

**Assistant nuevo:**
- Estado limpio
- 30-60 segundos de latencia
- Sin problemas de timeout

---

## 💡 Si Aún Así Es Lento (>1 minuto):

Eso sería latencia normal de GPT-4o con un prompt largo. Opciones:

1. **Aceptar 30-60 segundos** (es lo normal con prompts de 6000 tokens)
2. **Reducir el prompt** (pero perderías lógica de negocio)
3. **Migrar a Chat Completions API** con prompt caching (mucho más rápido)

---

**SIGUIENTE PASO:** Crea el Assistant nuevo (Opción A es más rápida) y prueba.
