# 🍎 NutriPass - Plataforma de Gestión de Comedores Escolares

NutriPass es un SaaS B2B2C multi-tenant diseñado para modernizar las cafeterías de escuelas privadas. Permite el cobro ultrarrápido mediante identificadores NFC, planificación de menús semanales para evitar mermas, y un portal transparente para que los padres de familia gestionen la nutrición y el saldo de sus hijos.

## 🛠 Stack Tecnológico

* **Frontend:** React + Vite
* **Estilos:** Tailwind CSS
* **Backend y Base de Datos:** Supabase (PostgreSQL)
* **Hosting Frontend Recomendado:** Render / Vercel
* **Lógica de Pagos y Alertas:** Supabase Edge Functions + Resend API

## 📂 Estructura del Proyecto (Monorepo)

* `/frontend`: Aplicación web principal (Dashboards Administrativos, POS y Portal de Padres).
* `/supabase`: Archivos de configuración de Supabase, migraciones SQL y Edge Functions.

## 🚀 Cómo levantar el proyecto localmente

### 1. Clonar e Instalar
\`\`\`bash
git clone https://github.com/TU-USUARIO/nutripass-saas.git
cd nutripass-saas/frontend
npm install
\`\`\`

### 2. Variables de Entorno
Crea un archivo `.env.local` en la carpeta `/frontend` y añade tus claves de Supabase:
\`\`\`env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
\`\`\`

### 3. Iniciar el Servidor de Desarrollo
\`\`\`bash
npm run dev
\`\`\`
La aplicación estará corriendo en `http://localhost:5173`.