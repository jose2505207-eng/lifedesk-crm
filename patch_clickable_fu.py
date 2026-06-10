#!/usr/bin/env python3
"""
Corre desde ~/lifedesk-crm:
  python3 patch_clickable_fu.py
"""
import os, sys

path = "src/App.jsx"
with open(path) as f:
    code = f.read()

changes = []

# ── 1. Dashboard follow-up cards: clicking lead name navigates to lead detail ──
OLD1 = '''            <div key={f.id} style={{ ...s.card, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:600, color:th.text, fontSize:13 }}>{lead?.name}</span>
                <span style={{ color:th.text3, fontSize:12, marginLeft:8, fontFamily:"'JetBrains Mono',monospace" }}>{f.date}</span>
                <div style={{ color:th.text2, fontSize:12, marginTop:3 }}>{f.note}</div>
              </div>
              <button onClick={()=>toggleFU(f.id)} style={{ ...s.btnGhost }}>{t.dash.done}</button>
            </div>'''
NEW1 = '''            <div key={f.id} style={{ ...s.card, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
              onClick={()=>{ if(lead){ setSelectedLead(lead); setEditNote(lead.notes); setView("leadDetail"); } }}>
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:600, color:th.text, fontSize:13 }}>{lead?.name}</span>
                <span style={{ color:th.text3, fontSize:12, marginLeft:8, fontFamily:"'JetBrains Mono',monospace" }}>{f.date}</span>
                <div style={{ color:th.text2, fontSize:12, marginTop:3 }}>{f.note}</div>
              </div>
              <button onClick={e=>{ e.stopPropagation(); toggleFU(f.id); }} style={{ ...s.btnGhost }}>{t.dash.done}</button>
            </div>'''
changes.append(("Dashboard FU cards clickable", OLD1, NEW1))

# ── 2. Seguimientos FUCard: make the whole card clickable to lead detail ──
# The FUCard row div - add cursor pointer and onClick
OLD2 = '''        <div style={{ padding:"13px 16px", display:"flex", alignItems:"flex-start", gap:12 }}>
          <button onClick={()=>toggleFU(f.id)}'''
NEW2 = '''        <div style={{ padding:"13px 16px", display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}
          onClick={()=>{ if(lead){ setSelectedLead(lead); setEditNote(lead.notes); setView("leadDetail"); } }}>
          <button onClick={e=>{ e.stopPropagation(); toggleFU(f.id); }}'''
changes.append(("FUCard row clickable", OLD2, NEW2))

# ── 3. Stop edit/delete buttons from propagating in FUCard ──
OLD3 = '''              <button
                onClick={()=>setEditingFU(isEditing ? null : f.id)}'''
NEW3 = '''              <button
                onClick={e=>{ e.stopPropagation(); setEditingFU(isEditing ? null : f.id); }}'''
changes.append(("FUCard edit button stop propagation", OLD3, NEW3))

OLD4 = '''              <button onClick={()=>{ if(window.confirm(t.followups.confirmDelete)) deleteFU(f.id); }}'''
NEW4 = '''              <button onClick={e=>{ e.stopPropagation(); if(window.confirm(t.followups.confirmDelete)) deleteFU(f.id); }}'''
changes.append(("FUCard delete button stop propagation", OLD4, NEW4))

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
print("  git add src/App.jsx && git commit -m 'feat: clickable follow-up rows navigate to lead' && git push origin main")
