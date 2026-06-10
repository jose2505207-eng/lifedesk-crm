// supabase/functions/daily-digest/index.ts
//
// Envía a cada agente un email diario con sus follow-ups de hoy y vencidos.
// Pensado para correr con un cron (ver README → "Daily Digest").
//
// Variables de entorno requeridas (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   → API key de https://resend.com (free tier: 100 emails/día)
//   DIGEST_FROM      → remitente verificado en Resend, ej. "LifeDesk <digest@tudominio.com>"
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las inyecta Supabase automáticamente.
//
// Deploy:   supabase functions deploy daily-digest --no-verify-jwt
// Prueba:   supabase functions invoke daily-digest

import { createClient } from "npm:@supabase/supabase-js@2";

const TZ = "America/Los_Angeles";

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role: salta RLS, solo corre en servidor
  );

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("DIGEST_FROM");
  if (!resendKey || !from) {
    return json({ error: "Missing RESEND_API_KEY or DIGEST_FROM secrets" }, 500);
  }

  // "Hoy" en hora de California, no UTC
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

  // Follow-ups pendientes con fecha <= hoy, con datos del lead
  const { data: fus, error } = await supabase
    .from("follow_ups")
    .select("id, note, due_date, agent_id, leads ( name, phone, status )")
    .eq("done", false)
    .lte("due_date", today)
    .order("due_date", { ascending: true });

  if (error) return json({ error: error.message }, 500);
  if (!fus || fus.length === 0) return json({ sent: 0, message: "No pending follow-ups" });

  // Agrupar por agente
  const byAgent = new Map<string, typeof fus>();
  for (const fu of fus) {
    if (!fu.agent_id) continue; // datos huérfanos pre-migración 002
    if (!byAgent.has(fu.agent_id)) byAgent.set(fu.agent_id, []);
    byAgent.get(fu.agent_id)!.push(fu);
  }

  let sent = 0;
  const errors: string[] = [];

  for (const [agentId, items] of byAgent) {
    // Email del agente desde auth.users (requiere service role)
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(agentId);
    const email = userData?.user?.email;
    if (userErr || !email) {
      errors.push(`agent ${agentId}: no email`);
      continue;
    }

    const overdue = items.filter((f) => f.due_date < today);
    const dueToday = items.filter((f) => f.due_date === today);

    const row = (f: (typeof items)[number], late: boolean) => {
      const lead = f.leads as unknown as { name: string; phone: string; status: string } | null;
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">
          <strong>${esc(lead?.name ?? "(lead eliminado)")}</strong><br>
          <span style="color:#888;font-size:12px;">${esc(lead?.phone ?? "")} · ${esc(lead?.status ?? "")}</span>
        </td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${esc(f.note)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${late ? "#dc2626" : "#16a34a"};white-space:nowrap;">
          ${f.due_date}${late ? " ⚠️" : ""}
        </td>
      </tr>`;
    };

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="margin-bottom:4px;">LifeDesk — Tus seguimientos de hoy</h2>
        <p style="color:#666;margin-top:0;">${dueToday.length} para hoy · ${overdue.length} vencidos</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="text-align:left;color:#888;font-size:12px;text-transform:uppercase;">
            <th style="padding:6px 10px;">Lead</th><th style="padding:6px 10px;">Tarea</th><th style="padding:6px 10px;">Fecha</th>
          </tr>
          ${overdue.map((f) => row(f, true)).join("")}
          ${dueToday.map((f) => row(f, false)).join("")}
        </table>
        <p style="color:#aaa;font-size:12px;margin-top:18px;">
          Enviado automáticamente por LifeDesk CRM.
        </p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `LifeDesk: ${dueToday.length} seguimiento(s) hoy${overdue.length ? `, ${overdue.length} vencido(s)` : ""}`,
        html,
      }),
    });

    if (res.ok) sent++;
    else errors.push(`agent ${agentId}: resend ${res.status} ${await res.text()}`);
  }

  return json({ sent, agents: byAgent.size, errors });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
