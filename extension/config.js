// ÚNICO archivo que necesitas editar.
// 1) SUPABASE: Supabase -> Settings -> API
// 2) PORTALS: confirma/ajusta los dominios reales de tus agentes.
const LIFEDESK_CONFIG = {
  SUPABASE_URL: "https://TU_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "TU_ANON_KEY",
};

const LIFEDESK_PORTALS = {
  "ethoslife.com":           { source: "Ethos",               product: "Term Life" },
  "fglife.com":              { source: "F&G",                 product: "IUL" },
  "mutualofomaha.com":       { source: "Mutual of Omaha",     product: "Final Expense" },
  "americanamicable.com":    { source: "American Amicable",   product: "Term Life" },
  "nationallife.com":        { source: "National Life Group", product: "IUL" },
  "aetnaseniorproducts.com": { source: "Aetna",               product: "Final Expense" },
  "aetna.com":               { source: "Aetna",               product: "Final Expense" },
};

function lifedeskDetectPortal(hostname) {
  for (const key of Object.keys(LIFEDESK_PORTALS)) {
    if (hostname === key || hostname.endsWith("." + key)) return LIFEDESK_PORTALS[key];
  }
  return null;
}
