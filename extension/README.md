# LifeDesk Lead Capture — Extensión de Chrome

Al abrir un portal (Ethos, F&G, Mutual of Omaha, American Amicable,
National Life Group, Aetna) aparece un banner: "¿Capturar un lead?" ->
"Abrir formulario" abre el panel lateral. El lead se guarda en Supabase
con source = portal y agent_id = agente logueado. Cero scraping.

## Instalación
1. Edita config.js: SUPABASE_URL + SUPABASE_ANON_KEY (Supabase -> Settings -> API).
   Confirma los dominios de LIFEDESK_PORTALS; si tus agentes usan otros
   (ej. portal de un IMO), agrégalos ahí Y en manifest.json.
2. Corre supabase/migrations/003_lead_source.sql (requiere 002 antes).
3. chrome://extensions -> Developer mode -> Load unpacked -> carpeta extension/.
4. Requiere Chrome 116+ y migraciones 002 + 003 aplicadas.
