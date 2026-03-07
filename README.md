# LifeDesk CRM

CRM para agentes de seguros de vida en California.
Incluye gestión de leads, seguimientos, marcador automático y envío masivo de textos.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Base de datos | Supabase (Postgres) |
| Auth (próximo) | Supabase Auth |
| Llamadas (próximo) | Twilio Conferences |
| SMS (próximo) | Twilio SMS |
| Deploy (próximo) | Vercel / Netlify |

---

## Setup inicial (15 minutos)

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/lifedesk-crm.git
cd lifedesk-crm
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Elige un nombre (ej. `lifedesk-crm`) y una contraseña fuerte
3. Región: **US West (North California)** — más cercana a tus leads de CA
4. Espera ~2 minutos a que se inicialice

### 3. Ejecutar el schema SQL

1. En el dashboard de Supabase → **SQL Editor** → **New query**
2. Pega el contenido de `schema.sql`
3. Clic en **Run** ✓

### 3b. Aplicar migración de métricas de productividad

Esta migración agrega la columna `done_at` a `follow_ups`, el trigger automático,
y la función RPC `dashboard_metrics` usada por el Dashboard.

1. En el dashboard de Supabase → **SQL Editor** → **New query**
2. Pega el contenido de `supabase/migrations/001_done_at_and_metrics.sql`
3. Clic en **Run** ✓

> **Nota:** Aplica primero `schema.sql` y después la migración `001_…sql`.

### 4. Obtener las API keys

1. En Supabase → **Settings** → **API**
2. Copia **Project URL** y **anon/public key**

### 5. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 6. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## Estructura del proyecto

```
lifedesk-crm/
├── schema.sql              ← Schema de Supabase (correr una vez)
├── supabase/
│   └── migrations/
│       └── 001_done_at_and_metrics.sql  ← done_at + dashboard_metrics RPC
├── .env.example            ← Template de variables de entorno
├── .env                    ← Variables reales (NO subir a git)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx            ← Entry point
    ├── App.jsx             ← Componente principal del CRM
    └── lib/
        └── supabase.js     ← Cliente Supabase + todos los helpers DB
```

---

## Roadmap

- [x] UI completa (leads, pipeline, follow-ups, mass text, dialer)
- [x] Dark/Light mode
- [x] Español / English
- [x] Importar CSV con preview
- [ ] **Supabase — persistencia de datos** ← aquí estamos
- [ ] Supabase Auth — login por agente
- [ ] Twilio SMS — envío masivo real
- [ ] Twilio Conferences — marcador predictivo real
- [ ] Vercel deploy
- [ ] PWA / mobile

---

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anon de Supabase |

---

## Compliance

Este CRM incluye recordatorios de compliance para TCPA y California law en el módulo de Mass Text y Auto Dialer. El agente es responsable de obtener consentimiento escrito previo de todos los leads antes de enviar mensajes o llamadas automatizadas.
