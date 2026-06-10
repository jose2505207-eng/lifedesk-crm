#!/usr/bin/env python3
"""
Corre desde ~/lifedesk-crm:
  python3 patch_dashboard.py
"""
import os, sys

path = "src/App.jsx"
with open(path) as f:
    code = f.read()

changes = []

# ── 1. Make pipeline status rows in dashboard clickable → leads filtered ──
OLD1 = '''            <div key={st} style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 18px",
                borderBottom:i<STATUSES.length-1?`1px solid ${th.border}`:"none" }}>'''
NEW1 = '''            <div key={st} onClick={()=>{ setFilterStatus(st); setView("leads"); }}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 18px",
                borderBottom:i<STATUSES.length-1?`1px solid ${th.border}`:"none",
                cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background=th.s2}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>'''
changes.append(("Dashboard status rows clickable", OLD1, NEW1))

# ── 2. Make lead detail have an Edit button that opens the add/edit modal ──
OLD2 = '''          <div style={{ ...s.card, padding:22, marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h2 style={{ fontSize:20, fontWeight:700, color:th.text, letterSpacing:"-0.03em", marginBottom:4 }}>{selectedLead.name}</h2>'''
NEW2 = '''          <div style={{ ...s.card, padding:22, marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h2 style={{ fontSize:20, fontWeight:700, color:th.text, letterSpacing:"-0.03em", marginBottom:4 }}>{selectedLead.name}</h2>'''
changes.append(("Lead detail edit button placeholder", OLD2, NEW2))

# ── 3. Add Edit button in lead detail header (after the StatusDot) ──
OLD3 = '''              <StatusDot status={selectedLead.status} label={<span style={{ fontSize:13, color:th.text2, fontWeight:600 }}>{t.status[selectedLead.status]||selectedLead.status}</span>} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>'''
NEW3 = '''              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                <StatusDot status={selectedLead.status} label={<span style={{ fontSize:13, color:th.text2, fontWeight:600 }}>{t.status[selectedLead.status]||selectedLead.status}</span>} />
                <button onClick={()=>setShowEditLead(true)} style={{ ...s.btnGhost, fontSize:12 }}>✎ Editar</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>'''
changes.append(("Edit button in lead detail", OLD3, NEW3))

# ── 4. Add showEditLead state ──
OLD4 = '  const [showAddLead, setShowAddLead]   = useState(false);'
NEW4 = '''  const [showAddLead, setShowAddLead]   = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [editLead, setEditLead]         = useState(null);'''
changes.append(("showEditLead state", OLD4, NEW4))

# ── 5. Add edit lead modal after ModalAddLead ──
OLD5 = '  // ─── Modal: Add Follow-up ─────────────────────────────────────────────────'
NEW5 = '''  // ─── Modal: Edit Lead ────────────────────────────────────────────────────────
  const ModalEditLead = showEditLead&&selectedLead&&(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
      <div style={{ ...s.card, padding:26, width:440, maxWidth:"94vw" }}>
        <h3 style={{ fontWeight:700, fontSize:16, marginBottom:20, color:th.text, letterSpacing:"-0.02em" }}>Editar Lead</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[["Nombre *","name","text"],["Teléfono","phone","tel"],["Email","email","email"],["Ciudad","city","text"],["Edad","age","number"]].map(([label,field,type])=>(
            <div key={field}>
              <span style={s.label}>{label}</span>
              <input type={type} defaultValue={selectedLead[field]}
                onChange={e=>setEditLead(p=>({...(p||selectedLead),[field]:e.target.value}))}
                style={s.inp} />
            </div>
          ))}
          <div>
            <span style={s.label}>Status</span>
            <select defaultValue={selectedLead.status}
              onChange={e=>setEditLead(p=>({...(p||selectedLead),status:e.target.value}))}
              style={s.inp}>
              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Producto</span>
            <select defaultValue={selectedLead.product}
              onChange={e=>setEditLead(p=>({...(p||selectedLead),product:e.target.value}))}
              style={s.inp}>
              {EN_PRODUCTS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>Prima/mes ($)</span>
            <input type="number" defaultValue={selectedLead.premium}
              onChange={e=>setEditLead(p=>({...(p||selectedLead),premium:parseFloat(e.target.value)||0}))}
              style={s.inp} />
          </div>
          <div>
            <span style={s.label}>Último contacto</span>
            <input type="date" defaultValue={selectedLead.lastContact}
              onChange={e=>setEditLead(p=>({...(p||selectedLead),lastContact:e.target.value}))}
              style={s.inp} />
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <span style={s.label}>Notas</span>
          <textarea defaultValue={selectedLead.notes} rows={3}
            onChange={e=>setEditLead(p=>({...(p||selectedLead),notes:e.target.value}))}
            style={{ ...s.inp, resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" }}>
          <button onClick={()=>{ setShowEditLead(false); setEditLead(null); }} style={s.btnGhost}>Cancelar</button>
          <button onClick={async()=>{
            const data = editLead || selectedLead;
            const updated = { name:data.name, phone:data.phone, email:data.email,
              city:data.city, age:data.age, status:data.status, product:data.product,
              premium:data.premium, notes:data.notes, last_contact:data.lastContact };
            setLeads(p=>p.map(l=>l.id===selectedLead.id?{...l,...data}:l));
            setSelectedLead(p=>({...p,...data}));
            setShowEditLead(false); setEditLead(null);
            try { await updateLead(selectedLead.id, updated); } catch(e){ console.error(e); }
          }} style={s.btn}>Guardar</button>
        </div>
      </div>
    </div>
  );

  // ─── Modal: Add Follow-up ─────────────────────────────────────────────────'''
changes.append(("Edit lead modal", OLD5, NEW5))

# ── 6. Add ModalEditLead to layout ──
OLD6 = '      {ModalAddLead}\n      {ModalAddFU}'
NEW6 = '      {ModalAddLead}\n      {ModalEditLead}\n      {ModalAddFU}'
changes.append(("Add ModalEditLead to layout", OLD6, NEW6))

errors = []
for name, old, new in changes:
    if name == "Lead detail edit button placeholder":
        # This one is a no-op placeholder, skip
        print(f"  - {name} (skipped)")
        continue
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
print("  git add src/App.jsx && git commit -m 'feat: clickable dashboard stats, editable lead detail' && git push origin main")
