// Login con Supabase Auth (REST) + alta rápida de leads.
// agent_id se llena solo (default auth.uid(), migración 002).
// source viene del portal detectado (migración 003).
const { SUPABASE_URL, SUPABASE_ANON_KEY } = LIFEDESK_CONFIG;
const $ = (id) => document.getElementById(id);
const show = (el, on) => el.classList.toggle("hidden", !on);

let session = null;
let portal = null;

init();

async function init() {
  const stored = await chrome.storage.local.get("lifedesk_session");
  session = stored.lifedesk_session || null;
  const sp = await chrome.storage.session.get("lifedesk_portal");
  portal = sp.lifedesk_portal || null;
  if (session && Date.now() / 1000 > (session.expires_at || 0) - 60) {
    session = await refreshSession(session).catch(() => null);
  }
  render();
  $("btn-login").addEventListener("click", onLogin);
  $("btn-save").addEventListener("click", onSave);
  $("btn-logout").addEventListener("click", onLogout);
}

function render() {
  show($("view-login"), !session);
  show($("view-form"), !!session);
  if (session && portal) {
    const badge = $("portal-badge");
    badge.textContent = `Portal detectado: ${portal.source}`;
    show(badge, true);
    const sel = $("f-product");
    for (const opt of sel.options) {
      if (opt.value === portal.product) { sel.value = portal.product; break; }
    }
  }
}

async function onLogin() {
  const msg = $("login-msg");
  msg.className = "msg"; msg.textContent = "Conectando…";
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("li-email").value.trim(), password: $("li-pass").value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Login falló");
    session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
    await chrome.storage.local.set({ lifedesk_session: session });
    msg.textContent = "";
    render();
  } catch (e) { msg.className = "msg err"; msg.textContent = e.message; }
}

async function refreshSession(old) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: old.refresh_token }),
  });
  if (!res.ok) { await chrome.storage.local.remove("lifedesk_session"); return null; }
  const data = await res.json();
  const fresh = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
  await chrome.storage.local.set({ lifedesk_session: fresh });
  return fresh;
}

async function onLogout() {
  session = null;
  await chrome.storage.local.remove("lifedesk_session");
  render();
}

async function onSave() {
  const msg = $("form-msg");
  const name = $("f-name").value.trim();
  const phone = $("f-phone").value.trim();
  if (!name || !phone) { msg.className = "msg err"; msg.textContent = "Nombre y teléfono son obligatorios."; return; }
  const lead = {
    name, phone,
    email: $("f-email").value.trim() || null,
    city: $("f-city").value.trim() || null,
    age: $("f-age").value ? Number($("f-age").value) : null,
    product: $("f-product").value,
    status: $("f-status").value,
    notes: $("f-notes").value.trim(),
    source: portal?.source || "Extensión",
  };
  $("btn-save").disabled = true;
  msg.className = "msg"; msg.textContent = "Guardando…";
  try {
    let res = await insertLead(lead);
    if (res.status === 401 && session?.refresh_token) {
      session = await refreshSession(session);
      if (!session) { render(); throw new Error("Sesión expirada — inicia sesión de nuevo."); }
      res = await insertLead(lead);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error ${res.status}`);
    }
    msg.className = "msg ok"; msg.textContent = `✓ Lead guardado (${lead.source})`;
    ["f-name","f-phone","f-email","f-city","f-age","f-notes"].forEach((id) => ($(id).value = ""));
  } catch (e) { msg.className = "msg err"; msg.textContent = e.message; }
  finally { $("btn-save").disabled = false; }
}

function insertLead(lead) {
  return fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(lead),
  });
}
