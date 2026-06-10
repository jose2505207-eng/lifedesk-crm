#!/usr/bin/env python3
import sys

path = "src/App.jsx"
with open(path) as f:
    lines = f.readlines()

# Find the line with "noFollowups" to locate insertion point
target = None
for i, line in enumerate(lines):
    if 'noFollowups' in line and 'filter' in line:
        target = i
        break

if target is None:
    print("NOT FOUND")
    sys.exit(1)

# The structure is:
# target+0: noFollowups line
# target+1:       </div>
# target+2:     </div>
# target+3:   );
# Insert workspace section before target+2 (the </div> closing SectionDashboard)

insert_at = target + 2  # before "    </div>"

workspace_block = """
      {/* Workspaces */}
      <div style={{ marginTop:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
          Workspaces {workspaces.length > 0 ? `(${workspaces.length})` : ""}
        </div>
        {workspaces.length > 0 && (
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
        )}
        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          <button onClick={()=>setShowCreateWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>+ Crear workspace</button>
          <button onClick={()=>setShowJoinWs(true)} style={{ ...s.btnGhost, fontSize:12 }}>↗ Unirse</button>
        </div>
      </div>
"""

lines.insert(insert_at, workspace_block)

with open(path, "w") as f:
    f.writelines(lines)

print(f"OK - insertado en linea {insert_at}, total {len(lines)} lineas")
print("\nAhora corre:")
print("  git add src/ && git commit -m 'feat: workspaces compartidos' && git push origin main")
