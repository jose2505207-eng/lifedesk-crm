#!/usr/bin/env python3
"""
Corre desde ~/lifedesk-crm:
  python3 patch_features.py

Agrega:
  1. Custom statuses con color picker (persistidos en localStorage)
  2. Workspace call queue con tel: links (Twilio-ready)
  3. Metricas de productividad en Dashboard
"""
import sys

PATH = "src/App.jsx"
with open(PATH) as f:
    code = f.read()

errors = []

def patch(name, old, new):
    global code
    if old not in code:
        errors.append(f"✗ No encontrado: {name}")
        return False
    code = code.replace(old, new, 1)
    print(f"✓ {name}")
    return True

# ─── 1. After WS_COLORS, add custom status state ─────────────────────────────
patch("Custom status state",
  '  const WS_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#14b8a6"];',
  '''  const WS_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#14b8a6"];

  // ── Custom statuses ──────────────────────────────────────────────────────
  const STATUS_COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#ec4899","#14b8a6","#f97316","#06b6d4"];
  const [customStatuses, setCustomStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ld_custom_statuses") || "[]"); }
    catch { return []; }
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatusName, setNewStatusName]     = useState("");
  const [newStatusColor, setNewStatusColor]   = useState("#6366f1");

  const allStatuses    = [...STATUSES, ...customStatuses.map(s => s.key)];
  const allStatusDots  = { ...STATUS_DOT, ...Object.fromEntries(customStatuses.map(s => [s.key, s.color])) };

  function addCustomStatus() {
    if (!newStatusName.trim()) return;
    const key = newStatusName.trim();
    if (allStatuses.includes(key)) return;
    const updated = [...customStatuses, { key, color: newStatusColor }];
    setCustomStatuses(updated);
    localStorage.setItem("ld_custom_statuses", JSON.stringify(updated));
    setNewStatusName(""); setNewStatusColor("#6366f1");
  }
  function removeCustomStatus(key) {
    const updated = customStatuses.filter(s => s.key !== key);
    setCustomStatuses(updated);
    localStorage.setItem("ld_custom_statuses", JSON.stringify(updated));
  }

  // ── Workspace call queue ─────────────────────────────────────────────────
  const [showWsDialer,   setShowWsDialer]   = useState(false);
  const [wsDialerIdx,    setWsDialerIdx]    = useState(0);
  const [wsDialerCalled, setWsDialerCalled] = useState(new Set());

  function openWsDialer() {
    setWsDialerIdx(0);
    setWsDialerCalled(new Set());
    setShowWsDialer(true);
  }
  function wsDialerCall(lead) {
    window.open(`tel:${lead.phone}`, "_self");
    setWsDialerCalled(prev => new Set([...prev, lead.id]));
  }''')

# ─── 2. Replace StatusDot to use allStatusDots ───────────────────────────────
patch("StatusDot uses allStatusDots",
  '        background:STATUS_DOT[status]||"#888", flexShrink:0, display:"inline-block" }} />',
  '        background:allStatusDots[status]||STATUS_DOT[status]||"#888", flexShrink:0, display:"inline-block" }} />')

# ─── 3. Add productivity metrics in dashboard (after stats grid) ─────────────
patch("Productivity metrics section",
  '''      {/* Pipeline */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>{t.dash.pipelineByStatus}</div>''',
  '''      {/* Productivity metrics */}
      {(() => {
        const today = new Date().toISOString().slice(0,10);
        const addedToday     = leads.filter(l => l.created_at?.slice(0,10) === today).length;
        const contactedToday = leads.filter(l => l.lastContact === today).length;
        const fuDoneToday    = fus.filter(f => f.done && f.updated_at?.slice(0,10) === today).length;
        const total          = leads.length;
        const won            = leads.filter(l => l.status === "Closed Won").length;
        const convRate       = total > 0 ? Math.round((won / total) * 100) : 0;
        return (
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
              Métricas de productividad
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {[
                { label:"Leads agregados hoy",      value:addedToday,     color:th.text },
                { label:"Contactados hoy",           value:contactedToday, color:"#60a5fa" },
                { label:"Seguimientos completados",  value:fuDoneToday,    color:th.accent },
                { label:"Tasa de conversión",        value:`${convRate}%`, color:"#fbbf24" },
              ].map(m => (
                <div key={m.label} style={{ ...s.card, padding:"14px 16px" }}>
                  <div style={{ fontSize:22, fontWeight:700, color:m.color,
                    fontFamily:"'JetBrains Mono',monospace", letterSpacing:"-0.02em" }}>{m.value}</div>
                  <div style={{ fontSize:10, color:th.text3, marginTop:4, fontWeight:500,
                    letterSpacing:"0.04em", textTransform:"uppercase", lineHeight:1.4 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Pipeline */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>{t.dash.pipelineByStatus}</div>''')

# ─── 4. Add "Crear Status" button in leads header ────────────────────────────
patch("Custom status button in leads",
  '''          <label style={{ ...s.btnGhost, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
            {t.leads.importCsv}''',
  '''          <button onClick={()=>setShowStatusModal(true)} style={{ ...s.btnGhost, fontSize:12 }}>
            ⊕ Status
          </button>
          <label style={{ ...s.btnGhost, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
            {t.leads.importCsv}''')

# ─── 5. Replace STATUSES with allStatuses in leads filter dropdown ────────────
patch("Leads filter uses allStatuses",
  '''          <option value="All">{t.leads.allStatuses}</option>
          {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
        </select>
      </div>

      <div style={{ ...s.card, overflow:"hidden" }}>''',
  '''          <option value="All">{t.leads.allStatuses}</option>
          {allStatuses.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
        </select>
      </div>

      <div style={{ ...s.card, overflow:"hidden" }}>''')

# ─── 6. Replace STATUSES in lead detail status change panel ──────────────────
patch("Lead detail uses allStatuses",
  '''            {STATUSES.map(st=>(
              <button key={st} onClick={()=>setLeadStatus(selectedLead.id,st)}''',
  '''            {allStatuses.map(st=>(
              <button key={st} onClick={()=>setLeadStatus(selectedLead.id,st)}''')

# ─── 7. Replace STATUSES in AddLead modal status dropdown ────────────────────
patch("Add lead modal uses allStatuses",
  '''              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>{t.leads.productLbl}</span>''',
  '''              {allStatuses.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>{t.leads.productLbl}</span>''')

# ─── 8. Replace STATUSES in EditLead modal ───────────────────────────────────
patch("Edit lead modal uses allStatuses",
  '''              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Producto</span>''',
  '''              {allStatuses.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Producto</span>''')

# ─── 9. Replace STATUSES in Mass Text filter ─────────────────────────────────
patch("Mass text uses allStatuses",
  '''              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st} ({leads.filter(l=>l.status===st).length})</option>)}''',
  '''              {allStatuses.map(st=><option key={st} value={st}>{t.status[st]||st} ({leads.filter(l=>l.status===st).length})</option>)}''')

# ─── 10. Replace STATUSES in Dialer filter ───────────────────────────────────
patch("Dialer uses allStatuses",
  '''                {STATUSES.filter(s=>!["Closed Won","Closed Lost"].includes(s)).map(st=>(
                  <option key={st} value={st}>{t.status[st]||st} ({leads.filter(l=>l.status===st).length})</option>
                ))}''',
  '''                {allStatuses.filter(s=>!["Closed Won","Closed Lost"].includes(s)).map(st=>(
                  <option key={st} value={st}>{t.status[st]||st} ({leads.filter(l=>l.status===st).length})</option>
                ))}''')

# ─── 11. Add workspace call queue button in workspace header ─────────────────
patch("Workspace call queue button",
  '''              <button onClick={()=>openWsSettings(activeWorkspace)} style={{ ...s.btnGhost }}>⚙ Configurar</button>''',
  '''              <button onClick={openWsDialer} style={{ ...s.btnGhost }}>📞 Cola de llamadas</button>
              <button onClick={()=>openWsSettings(activeWorkspace)} style={{ ...s.btnGhost }}>⚙ Configurar</button>''')

# ─── 12. Add workspace filter uses allStatuses ────────────────────────────────
patch("Workspace filter uses allStatuses",
  '''            <select value={wsFilterStatus} onChange={e=>setWsFilterStatus(e.target.value)} style={{ ...s.inp, maxWidth:180 }}>
              <option value="All">{t.leads.allStatuses}</option>
              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}''',
  '''            <select value={wsFilterStatus} onChange={e=>setWsFilterStatus(e.target.value)} style={{ ...s.inp, maxWidth:180 }}>
              <option value="All">{t.leads.allStatuses}</option>
              {allStatuses.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}''')

# ─── 13. Add modals before closing div ───────────────────────────────────────
patch("Custom status + WsDialer modals",
  '      {ModalEditLead}\n      {ModalAddFU}',
  '''      {ModalEditLead}

      {/* ── Custom Status Modal ── */}
      {showStatusModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
          <div style={{ ...s.card, padding:26, width:440, maxWidth:"94vw", maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ fontWeight:700, fontSize:16, color:th.text, margin:0 }}>Gestionar Status</h3>
              <button onClick={()=>setShowStatusModal(false)} style={{ background:"transparent", border:"none", color:th.text3, fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>Status predeterminados</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
                {STATUSES.map(st=>(
                  <span key={st} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px",
                    background:th.s2, borderRadius:20, fontSize:12, color:th.text2, border:`1px solid ${th.border}` }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:STATUS_DOT[st], display:"inline-block" }} />
                    {st}
                  </span>
                ))}
              </div>
              <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>
                Status personalizados ({customStatuses.length})
              </div>
              {customStatuses.length === 0 && (
                <div style={{ fontSize:12, color:th.text3, marginBottom:12 }}>Ninguno aún.</div>
              )}
              {customStatuses.map(cs=>(
                <div key={cs.key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${th.border}` }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:cs.color, flexShrink:0 }} />
                  <span style={{ flex:1, fontSize:13, color:th.text }}>{cs.key}</span>
                  <button onClick={()=>removeCustomStatus(cs.key)}
                    style={{ ...s.btnGhost, fontSize:11, padding:"2px 8px", color:th.danger, borderColor:th.dangerBg }}>✕ Eliminar</button>
                </div>
              ))}
            </div>
            <div style={{ borderTop:`1px solid ${th.border}`, paddingTop:16 }}>
              <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>Crear nuevo status</div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <input value={newStatusName} onChange={e=>setNewStatusName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addCustomStatus()}
                  placeholder="Ej: Pendiente pago" style={{ ...s.inp, flex:1 }} />
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                {STATUS_COLORS.map(c=>(
                  <button key={c} onClick={()=>setNewStatusColor(c)}
                    style={{ width:24, height:24, borderRadius:"50%", background:c, cursor:"pointer",
                      border:newStatusColor===c?`3px solid ${th.text}`:"3px solid transparent" }} />
                ))}
              </div>
              <button onClick={addCustomStatus} disabled={!newStatusName.trim()} style={{ ...s.btn, opacity:newStatusName.trim()?1:0.4 }}>
                + Agregar status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Workspace Call Queue Modal ── */}
      {showWsDialer&&activeWorkspace&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
          <div style={{ ...s.card, padding:26, width:500, maxWidth:"94vw", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <h3 style={{ fontWeight:700, fontSize:16, color:th.text, margin:0 }}>📞 Cola de llamadas — {activeWorkspace.name}</h3>
              <button onClick={()=>setShowWsDialer(false)} style={{ background:"transparent", border:"none", color:th.text3, fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ fontSize:12, color:th.text3, marginBottom:16 }}>
              {wsDialerCalled.size}/{wsLeads.length} contactados · Cuando tengamos Twilio, esto marcará automáticamente.
            </div>
            {/* Current lead */}
            {wsLeads.length > 0 && wsDialerIdx < wsLeads.length && (
              <div style={{ ...s.card, padding:20, marginBottom:16, background:th.s2 }}>
                <div style={{ fontSize:11, color:th.accent, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>
                  Lead actual ({wsDialerIdx+1}/{wsLeads.length})
                </div>
                <div style={{ fontWeight:700, fontSize:18, color:th.text, marginBottom:4 }}>{wsLeads[wsDialerIdx].name}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, color:th.accent, marginBottom:12 }}>{wsLeads[wsDialerIdx].phone}</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>wsDialerCall(wsLeads[wsDialerIdx])}
                    style={{ ...s.btn, flex:1, fontSize:15 }}>
                    📞 Llamar a {wsLeads[wsDialerIdx].name}
                  </button>
                  <button onClick={()=>setWsDialerIdx(i=>Math.min(i+1, wsLeads.length-1))}
                    style={{ ...s.btnGhost }}>Siguiente →</button>
                </div>
              </div>
            )}
            {wsDialerIdx >= wsLeads.length && (
              <div style={{ ...s.card, padding:20, marginBottom:16, textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>✓</div>
                <div style={{ fontSize:14, color:th.accent, fontWeight:600 }}>Cola completada</div>
                <div style={{ fontSize:12, color:th.text3, marginTop:4 }}>{wsDialerCalled.size} llamadas realizadas</div>
              </div>
            )}
            {/* Lead list */}
            <div style={{ flex:1, overflowY:"auto" }}>
              {wsLeads.map((l,i)=>(
                <div key={l.id} onClick={()=>setWsDialerIdx(i)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8,
                    marginBottom:4, cursor:"pointer",
                    background: i===wsDialerIdx ? th.accentBg : wsDialerCalled.has(l.id) ? th.s3 : "transparent",
                    border: i===wsDialerIdx ? `1px solid ${th.accentBd}` : "1px solid transparent" }}
                  onMouseEnter={e=>{ if(i!==wsDialerIdx) e.currentTarget.style.background=th.s2; }}
                  onMouseLeave={e=>{ if(i!==wsDialerIdx) e.currentTarget.style.background=wsDialerCalled.has(l.id)?th.s3:"transparent"; }}>
                  <span style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                    background:wsDialerCalled.has(l.id)?th.accent:th.s3, fontSize:10, fontWeight:700,
                    color:wsDialerCalled.has(l.id)?"#0d0d0d":th.text3 }}>
                    {wsDialerCalled.has(l.id)?"✓":i+1}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:th.text }}>{l.name}</div>
                    <div style={{ fontSize:11, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{l.phone}</div>
                  </div>
                  <StatusDot status={l.status} label={<span style={{ fontSize:11, color:th.text3 }}>{t.status[l.status]||l.status}</span>} />
                  <button onClick={e=>{ e.stopPropagation(); wsDialerCall(l); }}
                    style={{ ...s.btnGhost, fontSize:11, padding:"3px 10px" }}>📞</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {ModalAddFU}''')

if errors:
    print("\nERRORES:")
    for e in errors: print(e)
    sys.exit(1)

with open(PATH, "w") as f:
    f.write(code)

print(f"\n✓ App.jsx actualizado — {len(code.splitlines())} líneas")
print("\nCorre:")
print("  git add src/App.jsx && git commit -m 'feat: custom statuses, ws call queue, productivity metrics' && git push origin main")
