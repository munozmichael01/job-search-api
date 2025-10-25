# 🚀 Desplegar Demo React en Vercel

## Opción 1: Proyecto Separado (Recomendado)

### Paso 1: Crear nuevo proyecto en Vercel

```bash
cd ..
npx create-react-app turijobs-demo
cd turijobs-demo
```

### Paso 2: Copiar archivos de este proyecto

```bash
# Copiar componentes y páginas
cp -r ../job-search-api/src/components ./src/
cp -r ../job-search-api/src/pages ./src/
cp ../job-search-api/src/App.js ./src/
cp ../job-search-api/src/index.js ./src/
cp ../job-search-api/src/index.css ./src/

# Copiar public
cp -r ../job-search-api/public/* ./public/
```

### Paso 3: Instalar dependencias

```bash
npm install react-router-dom
```

### Paso 4: Deploy a Vercel

```bash
vercel --prod
```

---

## Opción 2: Mismo proyecto (Más complejo)

Si quieres mantener API + Frontend en el mismo repo, necesitas:

### 1. Crear `vercel.json` actualizado:

```json
{
  "buildCommand": "npm run build:react",
  "outputDirectory": "build",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/jobs/refresh",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### 2. Build y deploy:

```bash
npm run build:react
vercel --prod
```

---

## ¿Cuál elegir?

### 👍 Opción 1 (Recomendado)
- **API**: `job-search-api-psi.vercel.app`
- **Demo**: `turijobs-demo.vercel.app`
- Más limpio y profesional

### 👎 Opción 2
- Todo en `job-search-api-psi.vercel.app`
- Más complejo de mantener

---

## Estado Actual

✅ API funcionando: https://job-search-api-psi.vercel.app/api/jobs/status
❌ Frontend React: No deployado aún

Elige una opción y continúo con el deployment 🚀

