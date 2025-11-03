# Diagnóstico: Funciones Serverless No Se Actualizan (Vercel Pro)

**Fecha:** 3 de noviembre de 2025, 22:15
**Estado:** 🔍 INVESTIGANDO

---

## ❌ Teorías Descartadas

1. **Vercel Free tier limits** ❌
   - Usuario confirmó que es Vercel PRO
   - maxDuration: 300 es válido en Pro
   - Memory: 1024 MB es válido

2. **Bundle size demasiado grande** ❌
   - Total: ~15 MB (límite es 250 MB)
   - Muy por debajo del límite

---

## 🔍 Preguntas Críticas Para el Usuario

### 1. ¿Aparecen las funciones en el Dashboard de Vercel?

**Ir a:** https://vercel.com/[tu-proyecto]/deployments/[latest]

**Click en:** Tab "Functions"

**Pregunta:** ¿Ves funciones listadas como:
- `api/version.js`
- `api/jobs/search.js`
- `api/jobs/refresh.js`
- etc.

**Si NO aparecen funciones:**
→ Vercel NO está detectando/generando las funciones
→ Problema: Configuración de build

**Si SÍ aparecen funciones:**
→ Vercel SÍ las está generando
→ Problema: Runtime o routing

---

### 2. ¿Qué dice la sección "Build Logs"?

**Ir a:** Mismo deployment → Tab "Building"

**Buscar líneas que digan:**
- ✅ "Detected API Routes" o similar
- ✅ "Generating Serverless Functions"
- ✅ Listado de funciones creadas

**O errores como:**
- ❌ "No API routes found"
- ❌ "Failed to build function"
- ❌ Warnings sobre ES modules

**Por favor copiar/pegar las líneas relevantes**

---

### 3. ¿Hay warnings en los Build Logs?

Buscar por:
- `WARNING`
- `WARN`
- `⚠️`

Especialmente relacionados con:
- `"type": "module"`
- ES modules
- Functions
- API routes

---

### 4. Configuración del Proyecto en Vercel Dashboard

**Ir a:** Project Settings → General

**Verificar:**
- **Framework Preset:** ¿Qué dice? (debe ser "Other" o "Create React App")
- **Root Directory:** ¿Está en blanco? (debe estar en blanco o "./")
- **Build Command:** ¿Qué dice?
- **Output Directory:** ¿Qué dice?
- **Install Command:** ¿Qué dice?

**¿Coinciden con vercel.json?**

---

## 🧪 Teorías Actuales

### Teoría A: Vercel No Detecta las Funciones

**Causa posible:**
- `buildCommand` + `outputDirectory` hace que Vercel trate esto como sitio estático
- Vercel ignora completamente `/api/` directory

**Test:**
- Ver si aparecen funciones en Dashboard (pregunta #1)
- Ver si build logs mencionan "API Routes" (pregunta #2)

**Solución si es verdad:**
- Remover `buildCommand` y `outputDirectory` de vercel.json
- Dejar que Vercel auto-detecte

---

### Teoría B: Funciones Se Generan Pero Fallan en Runtime

**Causa posible:**
- `"type": "module"` en package.json causa problemas
- Vercel genera las funciones pero no se ejecutan correctamente

**Test:**
- Ver si aparecen funciones en Dashboard (pregunta #1)
- Ver si hay errores de runtime en Function Logs

**Solución si es verdad:**
- Agregar configuración explícita para ES modules
- O convertir a CommonJS (module.exports)

---

### Teoría C: Cache Persistente en Vercel Backend

**Causa posible:**
- Vercel tiene un cache en su sistema de build que no se invalida
- Similar a CDN cache pero a nivel de build system

**Test:**
- ¿Han cambiado las funciones en el Dashboard entre deployments?
- ¿Los timestamps de las funciones coinciden con los deployments?

**Solución si es verdad:**
- Contactar Vercel Support para clear cache
- O crear nuevo proyecto Vercel

---

### Teoría D: Rewrites Interfieren con API Routes

**Causa posible:**
```json
"rewrites": [
  {
    "source": "/((?!api).*)",
    "destination": "/index.html"
  }
]
```

Esta regex puede tener un problema que intercepta las API calls.

**Test:**
- Temporalmente remover completamente la sección `rewrites`
- Redeploy y probar

**Solución si es verdad:**
- Cambiar el approach de rewrites
- Usar routes en lugar de rewrites

---

## 🔨 Próximos Pasos Basados en Respuestas

### Si NO aparecen funciones en Dashboard:

```bash
# Estrategia: Simplificar vercel.json para que Vercel auto-detecte

# 1. Comentar temporalmente buildCommand, outputDirectory
# 2. Dejar solo:
# - functions config
# - crons
# - headers
# 3. Redeploy
```

### Si SÍ aparecen funciones en Dashboard:

```bash
# El problema es runtime, no build

# 1. Verificar logs de ejecución de las funciones
# 2. Puede ser "type": "module" causando problemas
# 3. Agregar package.json en /api/ con "type": "module"
```

### Si hay warnings sobre ES modules:

```bash
# Convertir a CommonJS O configurar correctamente

# Opción A: Agregar api/package.json
{
  "type": "module"
}

# Opción B: Renombrar archivos a .mjs
# Opción C: Convertir todo a CommonJS
```

---

## 📋 Checklist de Información Necesaria

- [ ] Screenshot del tab "Functions" en el deployment
- [ ] Build logs completos (especialmente secciones sobre functions)
- [ ] Framework Preset configurado en Project Settings
- [ ] Build/Output/Install commands del dashboard
- [ ] ¿Algún warning visible en el deployment?

**Con esta información podremos identificar el problema exacto.**
