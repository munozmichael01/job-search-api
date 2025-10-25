# 🤖 Guía para crear el OpenAI Assistant

Esta guía te ayudará a crear y configurar el Assistant de Turijobs paso a paso.

---

## 📋 Pasos para crear el Assistant

### Paso 1: Instalar dependencias

```bash
npm install
```

Esto instalará la dependencia `openai` que acabamos de agregar.

---

### Paso 2: Deploy a Vercel

```bash
vercel --prod
```

Esto desplegará el nuevo endpoint `/api/assistant/create` a producción.

---

### Paso 3: Crear el Assistant (ejecutar UNA VEZ)

**Opción A: Desde el navegador**

Visita esta URL en tu navegador:
```
https://job-search-api-psi.vercel.app/api/assistant/create
```

Nota: Puedes necesitar cambiar el método GET a POST. Mejor usa la Opción B.

**Opción B: Desde terminal (RECOMENDADO)**

```bash
curl -X POST https://job-search-api-psi.vercel.app/api/assistant/create
```

**Opción C: Desde PowerShell (Windows)**

```powershell
Invoke-WebRequest -Uri "https://job-search-api-psi.vercel.app/api/assistant/create" -Method POST
```

---

### Paso 4: Guardar el Assistant ID

El endpoint te devolverá algo como:

```json
{
  "success": true,
  "assistant_id": "asst_abc123xyz456",
  "name": "Turijobs Assistant",
  "model": "gpt-4o",
  "message": "✅ Assistant creado exitosamente...",
  "next_steps": [...]
}
```

**¡IMPORTANTE!** Copia el `assistant_id` (ejemplo: `asst_abc123xyz456`)

---

### Paso 5: Configurar Assistant ID en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto: `job-search-api-psi`
3. Ve a **Settings** → **Environment Variables**
4. Haz clic en **"Add New"**
5. Configura:

```
Name:  OPENAI_ASSISTANT_ID
Value: asst_abc123xyz456  (el ID que copiaste)
Environment: ✅ Production ✅ Preview ✅ Development
```

6. Haz clic en **"Save"**

---

### Paso 6: Redeploy (para que tome la nueva variable)

```bash
vercel --prod
```

O desde el dashboard de Vercel:
- Ve a **Deployments**
- Haz clic en el último deployment
- Click en los 3 puntos **"..."**
- Selecciona **"Redeploy"**

---

## ✅ Verificación

Tu Vercel ahora debería tener estas 2 variables de entorno:

```
OPENAI_API_KEY           sk-proj-••••••••••••••
OPENAI_ASSISTANT_ID      asst_••••••••••••••
```

(Los puntos indican que están ocultas - correcto por seguridad)

---

## 🎯 Próximos pasos

Una vez configurado el Assistant, los siguientes pasos son:

1. ✅ **Crear endpoints del chat** (`/api/chat/*`)
2. ✅ **Crear componente React del widget**
3. ✅ **Integrar el widget en tu web**
4. ✅ **Hacer versión embebible para otras webs**

---

## 🐛 Troubleshooting

### Error: "Invalid API key"
**Causa:** La variable `OPENAI_API_KEY` no está configurada correctamente.
**Solución:** Verifica que esté en Vercel Environment Variables.

### Error: "Module not found: openai"
**Causa:** No se instaló la dependencia.
**Solución:** Ejecuta `npm install` y vuelve a hacer deploy.

### No puedo ejecutar el curl
**Causa:** En Windows, curl a veces no funciona.
**Solución:** Usa PowerShell con `Invoke-WebRequest` o descarga y usa Postman.

### El endpoint devuelve 404
**Causa:** El archivo no se desplegó correctamente.
**Solución:** Verifica que el archivo esté en `api/assistant/create.js` y vuelve a hacer deploy.

---

## 📝 Notas importantes

- Solo necesitas crear el Assistant **UNA VEZ**
- El Assistant se queda guardado en tu cuenta de OpenAI
- Si lo borras accidentalmente, puedes recrearlo ejecutando el endpoint de nuevo
- El Assistant ID nunca cambia (a menos que lo borres y crees uno nuevo)
- Puedes ver todos tus Assistants en: https://platform.openai.com/assistants

---

## 🎉 ¡Listo!

Una vez que tengas el Assistant ID configurado en Vercel, estarás listo para crear los endpoints del chat y el widget.

