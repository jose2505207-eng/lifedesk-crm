#!/usr/bin/env python3
"""
Corre desde ~/lifedesk-crm:
  python3 fix_workspace.py
"""
import os, sys

path = "src/App.jsx"
with open(path) as f:
    code = f.read()

changes = []

# ── 1. Dashboard workspace section ──
OLD1 = '''      </div>
    </div>
  );
  // ─── Section: Leads list ──────────────────────────────────────────────────'''
NEW1 = '''      </div>

      {/* Workspaces */}
      {workspaces.length > 0 && (
        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
            Workspaces ({workspaces.length})
          </div>
          <div style={{ ...s.card, overflow:"hidden" }}>
            {workspaces.map((ws, i) => (
              <div key={ws.id}
                onClick={() => { setActiveWorkspace(ws); loadWsLeads(ws); setView("workspace"); }}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 18px",
                  borderBottom: i < workspaces.length-1 ? `1px solid ${th.border}` : "none",
                  cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:ws.color, flexShrink:0, display:"inline-block" }} />
                <span style={{ fontSize:13, color:th.text2, flex:1, fontWeight:500 }}>{ws.name}</span>
                <span style={{ fontSize:10, color:th.text3, background:th.s2, padding:"2px 8px", borderRadius:20, marginRight:4 }}>⇄ compartido</span>
                <span style={{ fontSize:12, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{ws.invite_code}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <button onClick={()=>setShowCreateWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>+ Crear workspace</button>
            <button onClick={()=>setShowJoinWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>↗ Unirse</button>
          </div>
        </div>
      )}
      {workspaces.length === 0 && (
        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>Workspaces</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowCreateWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>+ Crear workspace</button>
            <button onClick={()=>setShowJoinWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>↗ Unirse con código</button>
          </div>
        </div>
      )}
    </div>
  );
  // ─── Section: Leads list ──────────────────────────────────────────────────'''
changes.append(("Workspace dashboard section", OLD1, NEW1))

# ── 2. Workspace modals ──
OLD2 = '''      {/* Modals */}
      {ModalAddLead}
      {ModalEditLead}
      {ModalAddFU}'''
NEW2 = '''      {/* Modals */}
      {ModalAddLead}
      {ModalEditLead}

      {/* Create workspace */}
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

      {/* Join workspace */}
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

      {/* Add leads to workspace */}
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

      {/* Workspace settings */}
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
                  <button onClick={()=>updateMemberRole(activeWorkspace.id, m.user_id, m.role==="admin"?"member":"admin").then(()=>fetchWorkspaceMembers(activeWorkspace.id).then(setWsMembers))}
                    style={{ ...s.btnGhost, fontSize:10, padding:"2px 8px" }}>{m.role==="admin"?"→ member":"→ admin"}</button>
                  <button onClick={()=>removeMember(activeWorkspace.id, m.user_id).then(()=>fetchWorkspaceMembers(activeWorkspace.id).then(setWsMembers))}
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
      )}

      {ModalAddFU}'''
changes.append(("Workspace modals", OLD2, NEW2))

errors = []
for name, old, new in changes:
    if old not in code:
        errors.append(f"  ✗ No encontrado: {name}")
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
print("  git add src/ && git commit -m 'feat: workspaces compartidos' && git push origin main")
