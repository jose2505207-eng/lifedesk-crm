#!/usr/bin/env python3
"""
Corre desde ~/lifedesk-crm:
  python3 patch_metrics.py
"""
import os, sys

path = "src/App.jsx"
if not os.path.exists(path):
    print("ERROR: No se encontró src/App.jsx")
    sys.exit(1)

with open(path, "r") as f:
    code = f.read()

changes = []

# ── 1. Make lead table rows fully clickable (remove → button, make whole row clickable) ──
OLD1 = '''              <tr key={l.id} style={{ borderBottom:i<filtLeads.length-1?`1px solid ${th.border}`:"none", cursor:"default" }}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>'''
NEW1 = '''              <tr key={l.id} style={{ borderBottom:i<filtLeads.length-1?`1px solid ${th.border}`:"none", cursor:"pointer" }}
                onClick={()=>{setSelectedLead(l);setEditNote(l.notes);setView("leadDetail");}}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>'''
changes.append(("Lead row clickable", OLD1, NEW1))

# ── 2. Remove the → button cell from table rows ──
OLD2 = '''                <td style={{ padding:"11px 16px" }}>
                  <button onClick={()=>{setSelectedLead(l);setEditNote(l.notes);setView("leadDetail");}} style={s.btnGhost}>→</button>
                </td>'''
NEW2 = ''''''
changes.append(("Remove arrow button", OLD2, NEW2))

# ── 3. Remove the "" empty header for the → column ──
OLD3 = '''              {[t.leads.name,t.leads.phone,t.leads.city,t.leads.product,t.leads.status,t.leads.lastContact,""].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
              ))}'''
NEW3 = '''              {[t.leads.name,t.leads.phone,t.leads.city,t.leads.product,t.leads.status,t.leads.lastContact].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
              ))}'''
changes.append(("Remove empty header", OLD3, NEW3))

# ── 4. Add persistent metrics bar at top of main content ──
OLD4 = '''      {/* ── Main content ── */}
      <main style={{ flex:1, padding:"32px 36px", overflowY:"auto", minWidth:0 }}>
        {view==="dashboard"&&SectionDashboard}'''
NEW4 = '''      {/* ── Main content ── */}
      <main style={{ flex:1, overflowY:"auto", minWidth:0, display:"flex", flexDirection:"column" }}>

        {/* ── Metrics bar ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:0,
          borderBottom:`1px solid ${th.border}`, flexShrink:0 }}>
          {[
            { label: t.dash.totalLeads,  value: stats.total,      color: th.text },
            { label: t.dash.inPipeline,  value: stats.pipeline,   color: "#60a5fa" },
            { label: t.dash.closed,      value: stats.won,        color: th.accent },
            { label: t.dash.pending,     value: stats.pendingFU,  color: "#fbbf24" },
            { label: t.dash.monthly,     value: `$${stats.revenue}`, color: th.accent },
          ].map((m, i) => (
            <div key={m.label} style={{
              padding:"12px 20px",
              borderRight: i < 4 ? `1px solid ${th.border}` : "none",
              background: th.surface,
            }}>
              <div style={{ fontSize:20, fontWeight:700, color:m.color,
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:"-0.02em" }}>
                {m.value}
              </div>
              <div style={{ fontSize:10, color:th.text3, fontWeight:600,
                letterSpacing:"0.06em", textTransform:"uppercase", marginTop:3 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex:1, padding:"32px 36px", overflowY:"auto" }}>
        {view==="dashboard"&&SectionDashboard}'''
changes.append(("Metrics bar", OLD4, NEW4))

# ── 5. Close the new wrapping div before closing </main> ──
OLD5 = '''      </main>

      {/* Modals */}'''
NEW5 = '''        </div>
      </main>

      {/* Modals */}'''
changes.append(("Close wrapper div", OLD5, NEW5))

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
print("  git add src/App.jsx && git commit -m 'feat: clickable rows, persistent metrics bar' && git push origin main")
