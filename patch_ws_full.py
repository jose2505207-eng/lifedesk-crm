#!/usr/bin/env python3
"""
Corre desde ~/lifedesk-crm:
  python3 patch_ws_full.py
"""
import os, sys, re

path = "src/App.jsx"
with open(path) as f:
    code = f.read()

def apply(name, old, new):
    if old not in code:
        print(f"  ✗ No encontrado: {name}")
        return False
    return True

changes = []

# ─── 1. Imports ───────────────────────────────────────────────────────────────
OLD1 = '''import {
  fetchLeads, createLead, updateLead, bulkCreateLeads,
  fetchFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  logCall, supabase,
} from "./lib/supabase.js";'''
NEW1 = '''import {
  fetchLeads, createLead, updateLead, bulkCreateLeads,
  fetchFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  logCall, supabase,
  fetchWorkspaces, createWorkspace, joinWorkspace,
  fetchWorkspaceLeads, addLeadsToWorkspace, removeLeadFromWorkspace,
  updateWorkspace, deleteWorkspace, fetchWorkspaceMembers, updateMemberRole, removeMember,
} from "./lib/supabase.js";'''
changes.append(("Imports", OLD1, NEW1))

# ─── 2. Workspace state (added before "// ── Leads UI ──") ───────────────────
OLD2 = '  // ── Leads UI ──\n  const [filterStatus, setFilterStatus] = useState("All");'
NEW2 = '''  // ── Workspaces ──
  const [workspaces, setWorkspaces]           = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [wsLeads, setWsLeads]                 = useState([]);
  const [showCreateWs, setShowCreateWs]       = useState(false);
  const [showJoinWs, setShowJoinWs]           = useState(false);
  const [showAddToWs, setShowAddToWs]         = useState(false);
  const [showWsSettings, setShowWsSettings]   = useState(false);
  const [newWs, setNewWs]                     = useState({ name:"", color:"#6366f1" });
  const [joinCode, setJoinCode]               = useState("");
  const [wsMembers, setWsMembers]             = useState([]);
  const [wsError, setWsError]                 = useState("");

  const WS_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#14b8a6"];

  useEffect(() => {
    fetchWorkspaces().then(setWorkspaces).catch(console.error);
  }, []);

  async function loadWsLeads(ws) {
    if (!ws) return;
    const data = await fetchWorkspaceLeads(ws.id);
    setWsLeads(data);
  }
  async function handleCreateWs() {
    if (!newWs.name.trim()) return;
    try {
      const ws = await createWorkspace(newWs);
      setWorkspaces(p => [...p, ws]);
      setShowCreateWs(false); setNewWs({ name:"", color:"#6366f1" });
    } catch(e) { setWsError(e.message); }
  }
  async function handleJoinWs() {
    if (!joinCode.trim()) return;
    try {
      await joinWorkspace(joinCode);
      const updated = await fetchWorkspaces();
      setWorkspaces(updated); setShowJoinWs(false); setJoinCode("");
    } catch(e) { setWsError(e.message); }
  }
  async function handleAddToWs(wsId) {
    if (selectedIds.size === 0) return;
    try {
      await addLeadsToWorkspace(wsId, [...selectedIds]);
      if (activeWorkspace?.id === wsId) await loadWsLeads(activeWorkspace);
      setShowAddToWs(false); clearSelection();
    } catch(e) { alert(e.message); }
  }
  async function openWsSettings(ws) {
    setActiveWorkspace(ws);
    const members = await fetchWorkspaceMembers(ws.id);
    setWsMembers(members); setShowWsSettings(true);
  }

  // ── Leads UI ──
  const [filterStatus, setFilterStatus] = useState("All");'''
changes.append(("Workspace state", OLD2, NEW2))

# ─── 3. Dashboard workspace section ──────────────────────────────────────────
# Insert BEFORE the closing </div> of SectionDashboard
# The exact pattern is: noFollowups line, then two closing divs, then );
OLD3 = '''        {fus.filter(f=>!f.done).length===0&&<div style={{ color:th.text3, fontSize:13 }}>{t.dash.noFollowups}</div>}
      </div>
    </div>
  );'''
NEW3 = '''        {fus.filter(f=>!f.done).length===0&&<div style={{ color:th.text3, fontSize:13 }}>{t.dash.noFollowups}</div>}
      </div>

      {/* Workspaces */}
      <div style={{ marginTop:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
          Workspaces{workspaces.length > 0 ? ` (${workspaces.length})` : ""}
        </div>
        {workspaces.length > 0 && (
          <div style={{ ...s.card, overflow:"hidden" }}>
            {workspaces.map((ws, i) => (
              <div key={ws.id}
                onClick={() => { setActiveWorkspace(ws); loadWsLeads(ws); setView("workspace"); }}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 18px",
                  borderBottom: i < workspaces.length-1 ? `1px solid ${th.border}` : "none", cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:ws.color, flexShrink:0, display:"inline-block" }} />
                <span style={{ fontSize:13, color:th.text2, flex:1, fontWeight:500 }}>{ws.name}</span>
                <span style={{ fontSize:10, color:th.text3, background:th.s2, padding:"2px 8px", borderRadius:20, marginRight:4 }}>⇄ compartido</span>
                <span style={{ fontSize:12, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{ws.invite_code}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          <button onClick={()=>setShowCreateWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>+ Crear workspace</button>
          <button onClick={()=>setShowJoinWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>↗ Unirse</button>
        </div>
      </div>
    </div>
  );'''
changes.append(("Dashboard workspace section", OLD3, NEW3))

# ─── 4. Workspace nav items ───────────────────────────────────────────────────
OLD4 = '''  const NAVITEMS = [
    { id:"dashboard", icon:"⊞", label:t.nav.dashboard },
    { id:"leads",     icon:"⊹", label:t.nav.leads },
    { id:"pipeline",  icon:"⊳", label:t.nav.pipeline },
    { id:"followups", icon:"⊙", label:t.nav.followups },
    { id:"masstext",  icon:"⊠", label:t.nav.massText },
    { id:"dialer",    icon:"⊕", label:t.nav.dialer },
  ];'''
NEW4 = '''  const NAVITEMS = [
    { id:"dashboard", icon:"⊞", label:t.nav.dashboard },
    { id:"leads",     icon:"⊹", label:t.nav.leads },
    { id:"pipeline",  icon:"⊳", label:t.nav.pipeline },
    { id:"followups", icon:"⊙", label:t.nav.followups },
    { id:"masstext",  icon:"⊠", label:t.nav.massText },
    { id:"dialer",    icon:"⊕", label:t.nav.dialer },
  ];
  const wsNavItems = workspaces.map(ws => ({ id:`ws_${ws.id}`, ws, label:ws.name, color:ws.color }));'''
changes.append(("Workspace nav items", OLD4, NEW4))

# ─── 5. Workspace sidebar ─────────────────────────────────────────────────────
OLD5 = '''        {/* Bottom controls */}
        <div style={{ padding:"16px 14px", borderTop:`1px solid ${th.border}`, display:"flex", flexDirection:"column", gap:8 }}>'''
NEW5 = '''        {/* Workspace nav */}
        {wsNavItems.length > 0 && (
          <div style={{ padding:"8px 10px", borderTop:`1px solid ${th.border}`, marginTop:8 }}>
            <div style={{ fontSize:10, color:th.text3, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", padding:"6px 10px 4px" }}>Workspaces</div>
            {wsNavItems.map(item => (
              <button key={item.id}
                onClick={()=>{ setActiveWorkspace(item.ws); loadWsLeads(item.ws); setView("workspace"); setSelectedLead(null); }}
                style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"7px 10px",
                  background: view==="workspace"&&activeWorkspace?.id===item.ws.id ? th.s2 : "transparent",
                  border:"none", borderRadius:7, color:th.text2, fontSize:13,
                  fontWeight: view==="workspace"&&activeWorkspace?.id===item.ws.id ? 600 : 400,
                  cursor:"pointer", marginBottom:2, textAlign:"left" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:item.color, flexShrink:0 }} />
                {item.label}
                <span style={{ marginLeft:"auto", fontSize:9, color:th.text3 }}>⇄</span>
              </button>
            ))}
          </div>
        )}

        {/* Bottom controls */}
        <div style={{ padding:"16px 14px", borderTop:`1px solid ${th.border}`, display:"flex", flexDirection:"column", gap:8 }}>'''
changes.append(("Workspace sidebar", OLD5, NEW5))

# ─── 6. Workspace view in main content ───────────────────────────────────────
OLD6 = '      {view==="dialer"&&SectionDialer}\n      </main>'
NEW6 = '''      {view==="dialer"&&SectionDialer}
      {view==="workspace"&&activeWorkspace&&(
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ width:10, height:10, borderRadius:"50%", background:activeWorkspace.color, display:"inline-block" }} />
                <h1 style={{ fontSize:22, fontWeight:700, color:th.text, letterSpacing:"-0.03em", margin:0 }}>{activeWorkspace.name}</h1>
                <span style={{ fontSize:11, color:th.text3, background:th.s2, border:`1px solid ${th.border}`, padding:"2px 10px", borderRadius:20 }}>⇄ workspace compartido</span>
              </div>
              <div style={{ fontSize:12, color:th.text3 }}>
                Código: <span style={{ fontFamily:"'JetBrains Mono',monospace", color:th.accent, fontWeight:700 }}>{activeWorkspace.invite_code}</span>
                <button onClick={()=>navigator.clipboard.writeText(activeWorkspace.invite_code)} style={{ ...s.btnGhost, fontSize:10, padding:"1px 8px", marginLeft:8 }}>Copiar</button>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {selectedIds.size > 0 && (
                <button onClick={()=>setShowAddToWs(true)} style={{ ...s.btnGhost }}>+ Agregar {selectedIds.size} lead(s)</button>
              )}
              <button onClick={()=>openWsSettings(activeWorkspace)} style={{ ...s.btnGhost }}>⚙ Configurar</button>
            </div>
          </div>
          {wsLeads.length === 0 ? (
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
          )}
        </div>
      )}
      </main>'''
changes.append(("Workspace main view", OLD6, NEW6))

# ─── 7. Bulk add to workspace button in leads ─────────────────────────────────
OLD7 = '''          <label style={{ ...s.btnGhost, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
            {t.leads.importCsv}'''
NEW7 = '''          {selectedIds.size > 0 && workspaces.length > 0 && (
            <button onClick={()=>setShowAddToWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>
              ⇄ Workspace ({selectedIds.size})
            </button>
          )}
          <label style={{ ...s.btnGhost, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
            {t.leads.importCsv}'''
changes.append(("Bulk add to workspace button", OLD7, NEW7))

# ─── 8. Workspace modals ─────────────────────────────────────────────────────
OLD8 = '      {/* Modals */}\n      {ModalAddLead}'
NEW8 = '''      {/* Modals */}
      {ModalAddLead}

      {showCreateWs&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
          <div style={{ ...s.card, padding:26, width:400, maxWidth:"94vw" }}>
            <h3 style={{ fontWeight:700, fontSize:16, marginBottom:20, color:th.text }}>Crear Workspace</h3>
            <div style={{ marginBottom:14 }}>
              <span style={s.label}>Nombre</span>
              <input value={newWs.name} onChange={e=>setNewWs(p=>({...p,name:e.target.value}))} style={s.inp} placeholder="Ej: Equipo Ventas CA" />
            </div>
            <div style={{ marginBottom:20 }}>
              <span style={s.label}>Color</span>
              <div style={{ display:"flex", gap:8, marginTop:6 }}>
                {WS_COLORS.map(c=>(
                  <button key={c} onClick={()=>setNewWs(p=>({...p,color:c}))}
                    style={{ width:28, height:28, borderRadius:"50%", background:c, border:newWs.color===c?`3px solid ${th.text}`:"3px solid transparent", cursor:"pointer" }} />
                ))}
              </div>
            </div>
            {wsError&&<div style={{ color:th.danger, fontSize:12, marginBottom:12 }}>{wsError}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>{ setShowCreateWs(false); setWsError(""); }} style={s.btnGhost}>Cancelar</button>
              <button onClick={handleCreateWs} style={s.btn}>Crear</button>
            </div>
          </div>
        </div>
      )}
      {showJoinWs&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
          <div style={{ ...s.card, padding:26, width:360, maxWidth:"94vw" }}>
            <h3 style={{ fontWeight:700, fontSize:16, marginBottom:20, color:th.text }}>Unirse a Workspace</h3>
            <div style={{ marginBottom:16 }}>
              <span style={s.label}>Código de invitación</span>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}
                style={{ ...s.inp, textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", fontSize:16, letterSpacing:"0.1em" }}
                placeholder="ABC123" maxLength={6} />
            </div>
            {wsError&&<div style={{ color:th.danger, fontSize:12, marginBottom:12 }}>{wsError}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>{ setShowJoinWs(false); setWsError(""); setJoinCode(""); }} style={s.btnGhost}>Cancelar</button>
              <button onClick={handleJoinWs} style={s.btn}>Unirse</button>
            </div>
          </div>
        </div>
      )}
      {showAddToWs&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
          <div style={{ ...s.card, padding:26, width:360, maxWidth:"94vw" }}>
            <h3 style={{ fontWeight:700, fontSize:16, marginBottom:16, color:th.text }}>Agregar a Workspace</h3>
            <p style={{ fontSize:13, color:th.text2, marginBottom:16 }}>{selectedIds.size} lead(s) seleccionado(s)</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
              {workspaces.map(ws=>(
                <button key={ws.id} onClick={()=>handleAddToWs(ws.id)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                    background:th.s2, border:`1px solid ${th.border}`, borderRadius:8, cursor:"pointer", textAlign:"left" }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:ws.color, flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:600, color:th.text }}>{ws.name}</span>
                  <span style={{ marginLeft:"auto", fontSize:10, color:th.text3 }}>{ws.invite_code}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setShowAddToWs(false)} style={s.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}
      {showWsSettings&&activeWorkspace&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
          <div style={{ ...s.card, padding:26, width:460, maxWidth:"94vw", maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ fontWeight:700, fontSize:16, color:th.text, margin:0 }}>⚙ {activeWorkspace.name}</h3>
              <button onClick={()=>setShowWsSettings(false)} style={{ background:"transparent", border:"none", color:th.text3, fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom:16 }}>
              <span style={s.label}>Código de invitación</span>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:700, color:th.accent, letterSpacing:"0.1em" }}>{activeWorkspace.invite_code}</span>
                <button onClick={()=>navigator.clipboard.writeText(activeWorkspace.invite_code)} style={{ ...s.btnGhost, fontSize:11 }}>Copiar</button>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <span style={s.label}>Miembros ({wsMembers.length})</span>
              {wsMembers.map(m=>(
                <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${th.border}` }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:th.s2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:th.accent }}>
                    {m.user_id.slice(0,1).toUpperCase()}
                  </div>
                  <span style={{ flex:1, fontSize:11, color:th.text2, fontFamily:"'JetBrains Mono',monospace" }}>{m.user_id.slice(0,8)}…</span>
                  <span style={{ fontSize:11, color:m.role==="admin"?th.accent:th.text3, fontWeight:m.role==="admin"?700:400 }}>{m.role}</span>
                  <button onClick={()=>updateMemberRole(activeWorkspace.id,m.user_id,m.role==="admin"?"member":"admin").then(()=>fetchWorkspaceMembers(activeWorkspace.id).then(setWsMembers))}
                    style={{ ...s.btnGhost, fontSize:10, padding:"2px 8px" }}>{m.role==="admin"?"→ member":"→ admin"}</button>
                  <button onClick={()=>removeMember(activeWorkspace.id,m.user_id).then(()=>fetchWorkspaceMembers(activeWorkspace.id).then(setWsMembers))}
                    style={{ ...s.btnGhost, fontSize:10, padding:"2px 8px", color:th.danger, borderColor:th.dangerBg }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>{ if(window.confirm("¿Eliminar este workspace?")) deleteWorkspace(activeWorkspace.id).then(()=>{ setWorkspaces(p=>p.filter(w=>w.id!==activeWorkspace.id)); setView("dashboard"); setShowWsSettings(false); }); }}
                style={{ ...s.btnGhost, color:th.danger, borderColor:th.dangerBg }}>Eliminar workspace</button>
              <button onClick={()=>setShowWsSettings(false)} style={s.btn}>Cerrar</button>
            </div>
          </div>
        </div>
      )}'''
changes.append(("Workspace modals", OLD8, NEW8))

# ─── 9. Fix activeView ────────────────────────────────────────────────────────
OLD9 = '  const activeView = view==="leadDetail"?"leads":view;'
NEW9 = '  const activeView = view==="leadDetail"?"leads":view==="workspace"?"workspace":view;'
changes.append(("Fix activeView", OLD9, NEW9))

# ─── Apply all ────────────────────────────────────────────────────────────────
errors = []
for name, old, new in changes:
    if old not in code:
        errors.append(f"  ✗ {name}")
    else:
        code = code.replace(old, new, 1)
        print(f"  ✓ {name}")

if errors:
    print("\nERRORES:")
    for e in errors: print(e)
    sys.exit(1)

with open(path, "w") as f:
    f.write(code)

print(f"\n✓ src/App.jsx actualizado ({len(code.splitlines())} lineas)")
print("\nAhora corre:")
print("  git add src/ && git commit -m 'feat: workspaces compartidos' && git push origin main")
