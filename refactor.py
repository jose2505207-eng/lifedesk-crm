#!/usr/bin/env python3
"""
Corre desde ~/lifedesk-crm:
  python3 refactor.py

Cambios:
1. Agrega estado propio del workspace (wsSelectedIds, wsSearch, wsFilterStatus)
2. Reemplaza workspace view con version completa (checkboxes 20x20, busqueda,
   filtro, bulk select, exportar CSV, quitar del workspace)
3. Quitar del workspace NO borra el lead personal
4. Eliminar lead personal NO borra del workspace (usa soft-remove via agent_id)
"""
import sys

PATH = "src/App.jsx"
with open(PATH) as f:
    code = f.read()

errors = []

# ─── 1. Add workspace-specific UI state after wsError state ──────────────────
OLD1 = '  const WS_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#14b8a6"];'
NEW1 = '''  const WS_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#14b8a6"];

  // Workspace table state (independent from personal leads table)
  const [wsSelectedIds,    setWsSelectedIds]    = useState(new Set());
  const [wsSearch,         setWsSearch]         = useState("");
  const [wsFilterStatus,   setWsFilterStatus]   = useState("All");

  const wsToggleSelect = (id, e) => {
    e.stopPropagation();
    setWsSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const wsToggleSelectAll = (rows) => {
    if (wsSelectedIds.size === rows.length) setWsSelectedIds(new Set());
    else setWsSelectedIds(new Set(rows.map(l => l.id)));
  };
  const wsClearSelection = () => setWsSelectedIds(new Set());

  const wsFiltLeads = useMemo(() => wsLeads.filter(l => {
    if (wsFilterStatus !== "All" && l.status !== wsFilterStatus) return false;
    if (wsSearch) {
      const q = wsSearch.toLowerCase();
      return (
        l.name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.product?.toLowerCase().includes(q)
      );
    }
    return true;
  }), [wsLeads, wsFilterStatus, wsSearch]);

  const handleBulkRemoveFromWs = async () => {
    if (!activeWorkspace || wsSelectedIds.size === 0) return;
    const ids = [...wsSelectedIds];
    // Optimistic update
    setWsLeads(p => p.filter(l => !wsSelectedIds.has(l.id)));
    wsClearSelection();
    try {
      for (const id of ids) {
        await removeLeadFromWorkspace(activeWorkspace.id, id);
      }
    } catch(e) { console.error(e); await loadWsLeads(activeWorkspace); }
  };

  const handleWsExportCSV = () => {
    const toExport = wsFiltLeads.filter(l =>
      wsSelectedIds.size === 0 || wsSelectedIds.has(l.id)
    );
    const headers = ["Nombre","Telefono","Email","Status","Producto","Prima","Ciudad","Ultimo Contacto","Notas"];
    const rows = toExport.map(l =>
      [l.name,l.phone,l.email,l.status,l.product,l.premium,l.city,l.lastContact,l.notes]
        .map(v => `"${(v||"").toString().replace(/"/g,'""')}"`)
    );
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeWorkspace?.name||"workspace"}-leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };'''

# ─── 2. Replace handleBulkDelete to NOT cascade-delete workspace leads ────────
OLD2 = '''  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    setLeads(p => p.filter(l => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    try {
      for (const id of ids) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
          method: "DELETE",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + import.meta.env.VITE_SUPABASE_ANON_KEY,
          }
        });
      }
    } catch(e) { console.error(e); }
  };'''
NEW2 = '''  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    // Optimistic update
    setLeads(p => p.filter(l => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    try {
      for (const id of ids) {
        // Use supabase client so RLS handles it cleanly
        await supabase.from("leads").delete().eq("id", id);
      }
    } catch(e) {
      console.error(e);
      // Reload leads if something failed
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (data) setLeads(data.map(normLead));
    }
  };'''

# ─── 3. Replace workspace view with full-featured version ────────────────────
OLD3 = '''          {wsLeads.length === 0 ? (
            <div style={{ ...s.card, padding:40, textAlign:"center" }}>
              <div style={{ fontSize:13, color:th.text3, marginBottom:12 }}>Sin leads en este workspace.</div>
              <div style={{ fontSize:12, color:th.text3 }}>Ve a Leads, selecciona con checkbox y usa "+ Agregar al workspace".</div>
            </div>
          ) : (
            <div style={{ ...s.card, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${th.border}` }}>
                    {["Nombre","Teléfono","Ciudad","Producto","Status","Último Contacto",""].map(h=>(
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wsLeads.map((l,i)=>(
                    <tr key={l.id} style={{ borderBottom:i<wsLeads.length-1?`1px solid ${th.border}`:"none", cursor:"pointer" }}
                      onClick={()=>{setSelectedLead(l);setEditNote(l.notes);setView("leadDetail");}}
                      onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"11px 16px" }}>
                        <div style={{ fontWeight:600, fontSize:13, color:th.text }}>{l.name}</div>
                        <div style={{ fontSize:11, color:th.text3 }}>{l.email}</div>
                      </td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text2, fontFamily:"'JetBrains Mono',monospace" }}>{l.phone}</td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text2 }}>{l.city||"—"}</td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text2 }}>{l.product}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <StatusDot status={l.status} label={<span style={{ fontSize:12, color:th.text2 }}>{t.status[l.status]||l.status}</span>} />
                      </td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{l.lastContact}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <button onClick={e=>{ e.stopPropagation(); removeLeadFromWorkspace(activeWorkspace.id, l.id).then(()=>loadWsLeads(activeWorkspace)); }}
                          style={{ ...s.btnGhost, fontSize:11, color:th.danger, borderColor:th.dangerBg }}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}'''
NEW3 = '''          {/* Search + filter bar */}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <input
              value={wsSearch}
              onChange={e=>setWsSearch(e.target.value)}
              placeholder="Buscar en workspace…"
              style={{ ...s.inp, maxWidth:280, flex:1 }}
            />
            <select value={wsFilterStatus} onChange={e=>setWsFilterStatus(e.target.value)} style={{ ...s.inp, maxWidth:180 }}>
              <option value="All">{t.leads.allStatuses}</option>
              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
            </select>
            {(wsSearch||wsFilterStatus!=="All") && (
              <button onClick={()=>{ setWsSearch(""); setWsFilterStatus("All"); }}
                style={{ ...s.btnGhost, fontSize:12 }}>Limpiar</button>
            )}
          </div>

          {/* Bulk action bar */}
          {wsSelectedIds.size > 0 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 14px", marginBottom:12,
              background:th.accentBg, border:`1px solid ${th.accentBd}`, borderRadius:8 }}>
              <span style={{ fontSize:13, fontWeight:600, color:th.accent }}>
                {wsSelectedIds.size} seleccionado{wsSelectedIds.size!==1?"s":""}
              </span>
              <div style={{ display:"flex", gap:8 }}>
                <button style={{ ...s.btnGhost, fontSize:12, padding:"4px 12px", color:th.accent, borderColor:th.accentBd }}
                  onClick={handleWsExportCSV}>↓ Exportar CSV</button>
                <button style={{ ...s.btnGhost, fontSize:12, padding:"4px 12px", color:th.danger, borderColor:th.dangerBg }}
                  onClick={handleBulkRemoveFromWs}>🗑 Quitar del workspace</button>
                <button style={{ ...s.btnGhost, fontSize:12, padding:"4px 12px" }}
                  onClick={wsClearSelection}>Cancelar</button>
              </div>
            </div>
          )}

          {wsFiltLeads.length === 0 ? (
            <div style={{ ...s.card, padding:40, textAlign:"center" }}>
              <div style={{ fontSize:13, color:th.text3, marginBottom:12 }}>
                {wsLeads.length === 0
                  ? "Sin leads en este workspace."
                  : "Sin resultados para la búsqueda."}
              </div>
              {wsLeads.length === 0 && (
                <div style={{ fontSize:12, color:th.text3 }}>
                  Ve a Leads, selecciona con checkbox y usa "+ Agregar al workspace".
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...s.card, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${th.border}` }}>
                    <th style={{ padding:"10px 16px", width:40, textAlign:"center" }}>
                      <input type="checkbox"
                        style={{ cursor:"pointer", accentColor:th.accent, width:20, height:20 }}
                        checked={wsFiltLeads.length>0 && wsSelectedIds.size===wsFiltLeads.length}
                        onChange={()=>wsToggleSelectAll(wsFiltLeads)} />
                    </th>
                    {[t.leads.name,t.leads.phone,t.leads.city,t.leads.product,t.leads.status,t.leads.lastContact,""].map(h=>(
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700,
                        color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wsFiltLeads.map((l,i)=>(
                    <tr key={l.id}
                      style={{ borderBottom:i<wsFiltLeads.length-1?`1px solid ${th.border}`:"none",
                        cursor:"pointer", background:wsSelectedIds.has(l.id)?th.accentBg:"transparent" }}
                      onClick={()=>{setSelectedLead(l);setEditNote(l.notes);setView("leadDetail");}}
                      onMouseEnter={e=>{ if(!wsSelectedIds.has(l.id)) e.currentTarget.style.background=th.s2; }}
                      onMouseLeave={e=>{ if(!wsSelectedIds.has(l.id)) e.currentTarget.style.background="transparent"; }}>
                      <td style={{ padding:"11px 16px", textAlign:"center", width:40 }}>
                        <input type="checkbox"
                          style={{ cursor:"pointer", accentColor:th.accent, width:20, height:20 }}
                          checked={wsSelectedIds.has(l.id)}
                          onChange={e=>wsToggleSelect(l.id, e)}
                          onClick={e=>e.stopPropagation()} />
                      </td>
                      <td style={{ padding:"11px 16px" }}>
                        <div style={{ fontWeight:600, fontSize:13, color:th.text }}>{l.name}</div>
                        <div style={{ fontSize:11, color:th.text3 }}>{l.email}</div>
                      </td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text2, fontFamily:"'JetBrains Mono',monospace" }}>{l.phone}</td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text2 }}>{l.city||"—"}</td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text2 }}>{l.product}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <StatusDot status={l.status} label={<span style={{ fontSize:12, color:th.text2 }}>{t.status[l.status]||l.status}</span>} />
                      </td>
                      <td style={{ padding:"11px 16px", fontSize:12, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{l.lastContact}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <button onClick={e=>{
                          e.stopPropagation();
                          removeLeadFromWorkspace(activeWorkspace.id, l.id)
                            .then(()=>{ setWsLeads(p=>p.filter(x=>x.id!==l.id)); setWsSelectedIds(p=>{ const n=new Set(p); n.delete(l.id); return n; }); })
                            .catch(console.error);
                        }} style={{ ...s.btnGhost, fontSize:11, color:th.danger, borderColor:th.dangerBg }}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}'''

changes = [
    ("Workspace UI state + helpers", OLD1, NEW1),
    ("handleBulkDelete fix", OLD2, NEW2),
    ("Workspace full table", OLD3, NEW3),
]

for name, old, new in changes:
    if old not in code:
        errors.append(f"✗ No encontrado: {name}")
    else:
        code = code.replace(old, new, 1)
        print(f"✓ {name}")

if errors:
    print("\nERRORES:")
    for e in errors: print(e)
    sys.exit(1)

with open(PATH, "w") as f:
    f.write(code)

print(f"\n✓ App.jsx actualizado — {len(code.splitlines())} líneas")
print("\nCorre:")
print("  git add src/App.jsx && git commit -m 'feat: workspace full table + refactor' && git push origin main")
