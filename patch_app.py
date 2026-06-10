#!/usr/bin/env python3
"""
Corre este script en ~/lifedesk-crm:
  python3 patch_app.py
"""
import os, sys

path = "src/App.jsx"
if not os.path.exists(path):
    print("ERROR: No se encontró src/App.jsx. Corre este script desde ~/lifedesk-crm")
    sys.exit(1)

with open(path, "r") as f:
    code = f.read()

# ── 1. Add state + helpers after "// ── CSV ──" block ────────────────────────
OLD1 = '  // ── CSV ──\n  const [csvModal, setCsvModal]   = useState(false);'
NEW1 = '''  // ── Bulk selection ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (rows) => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(l => l.id)));
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
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
  };

  const handleExportCSV = (leadsToExport) => {
    const headers = ["Nombre","Telefono","Email","Status","Producto","Prima","Ciudad","Ultimo Contacto","Notas"];
    const rows = leadsToExport.map(l =>
      [l.name, l.phone, l.email, l.status, l.product, l.premium, l.city, l.lastContact, l.notes]
        .map(v => `"${(v||"").toString().replace(/"/g,"\\"")}"`));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifedesk-leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV ──
  const [csvModal, setCsvModal]   = useState(false);'''

# ── 2. Add checkbox to thead ─────────────────────────────────────────────────
OLD2 = '''          <thead>
            <tr style={{ borderBottom:`1px solid ${th.border}` }}>
              {[t.leads.name,t.leads.phone,t.leads.city,t.leads.product,t.leads.status,t.leads.lastContact,""].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>'''
NEW2 = '''          <thead>
            <tr style={{ borderBottom:`1px solid ${th.border}` }}>
              <th style={{ padding:"10px 16px", width:40, textAlign:"center" }}>
                <input type="checkbox" style={{ cursor:"pointer", accentColor:th.accent }}
                  checked={filtLeads.length>0&&selectedIds.size===filtLeads.length}
                  onChange={()=>toggleSelectAll(filtLeads)} />
              </th>
              {[t.leads.name,t.leads.phone,t.leads.city,t.leads.product,t.leads.status,t.leads.lastContact,""].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>'''

# ── 3. Add checkbox to each tbody row ────────────────────────────────────────
OLD3 = '''              <tr key={l.id} style={{ borderBottom:i<filtLeads.length-1?`1px solid ${th.border}`:"none", cursor:"default" }}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"11px 16px" }}>'''
NEW3 = '''              <tr key={l.id} style={{ borderBottom:i<filtLeads.length-1?`1px solid ${th.border}`:"none", cursor:"default",
                  background:selectedIds.has(l.id)?th.accentBg:"transparent" }}
                onMouseEnter={e=>{ if(!selectedIds.has(l.id)) e.currentTarget.style.background=th.s2; }}
                onMouseLeave={e=>{ if(!selectedIds.has(l.id)) e.currentTarget.style.background="transparent"; }}>
                <td style={{ padding:"11px 16px", textAlign:"center", width:40 }}>
                  <input type="checkbox" style={{ cursor:"pointer", accentColor:th.accent }}
                    checked={selectedIds.has(l.id)}
                    onChange={e=>toggleSelect(l.id, e)}
                    onClick={e=>e.stopPropagation()} />
                </td>
                <td style={{ padding:"11px 16px" }}>'''

# ── 4. Add bulk action bar before search/filter row ──────────────────────────
OLD4 = '''      {csvErr&&<div style={{ background:th.dangerBg, color:th.danger, borderRadius:7, padding:"8px 12px", marginBottom:12, fontSize:12 }}>{csvErr}</div>}

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>'''
NEW4 = '''      {csvErr&&<div style={{ background:th.dangerBg, color:th.danger, borderRadius:7, padding:"8px 12px", marginBottom:12, fontSize:12 }}>{csvErr}</div>}

      {selectedIds.size>0&&(
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", marginBottom:12,
          background:th.accentBg, border:`1px solid ${th.accentBd}`, borderRadius:8 }}>
          <span style={{ fontSize:13, fontWeight:600, color:th.accent }}>
            {selectedIds.size} seleccionado{selectedIds.size!==1?"s":""}
          </span>
          <div style={{ display:"flex", gap:8 }}>
            <button style={{ ...s.btnGhost, fontSize:12, padding:"4px 12px", color:th.accent, borderColor:th.accentBd }}
              onClick={()=>handleExportCSV(leads.filter(l=>selectedIds.has(l.id)))}>
              ↓ Exportar CSV
            </button>
            <button style={{ ...s.btnGhost, fontSize:12, padding:"4px 12px", color:th.danger, borderColor:th.dangerBg }}
              onClick={()=>setShowBulkDeleteConfirm(true)}>
              🗑 Eliminar
            </button>
            <button style={{ ...s.btnGhost, fontSize:12, padding:"4px 12px" }} onClick={clearSelection}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>'''

# ── 5. Add bulk delete modal before closing modals ───────────────────────────
OLD5 = '''      {/* Modals */}
      {ModalAddLead}
      {ModalAddFU}
      {ModalCSV}'''
NEW5 = '''      {/* Modals */}
      {ModalAddLead}
      {ModalAddFU}
      {ModalCSV}
      {showBulkDeleteConfirm&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
          <div style={{ ...s.card, padding:26, width:380, maxWidth:"94vw" }}>
            <h3 style={{ fontWeight:700, fontSize:16, marginBottom:12, color:th.text }}>Eliminar leads</h3>
            <p style={{ color:th.text2, fontSize:13, marginBottom:20 }}>
              ¿Eliminar <strong>{selectedIds.size} leads</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowBulkDeleteConfirm(false)} style={s.btnGhost}>Cancelar</button>
              <button onClick={handleBulkDelete} style={{ ...s.btnDanger, fontWeight:700 }}>
                Eliminar {selectedIds.size} leads
              </button>
            </div>
          </div>
        </div>
      )}'''

changes = [
    ("State + helpers", OLD1, NEW1),
    ("Thead checkbox", OLD2, NEW2),
    ("Tbody checkbox", OLD3, NEW3),
    ("Bulk bar", OLD4, NEW4),
    ("Bulk delete modal", OLD5, NEW5),
]

errors = []
for name, old, new in changes:
    if old not in code:
        errors.append(f"  ✗ No se encontró: {name}")
    else:
        code = code.replace(old, new, 1)
        print(f"  ✓ {name}")

if errors:
    print("\nERRORES:")
    for e in errors: print(e)
    sys.exit(1)

with open(path, "w") as f:
    f.write(code)

print(f"\n✓ src/App.jsx actualizado ({len(code.splitlines())} líneas)")
print("\nAhora corre:")
print("  git add src/App.jsx && git commit -m 'feat: checkboxes, bulk delete, export CSV' && git push origin main")
