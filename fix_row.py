code = open('src/App.jsx').read()
old = 'cursor:"default",'
new = 'cursor:"pointer",'
if old in code:
    code = code.replace(old, new, 1)
    # Add onClick after the style prop on that tr
    old2 = 'onMouseEnter={e=>{ if(!selectedIds.has(l.id)) e.currentTarget.style.background=th.s2; }}'
    new2 = 'onClick={()=>{setSelectedLead(l);setEditNote(l.notes);setView("leadDetail");}}\n                onMouseEnter={e=>{ if(!selectedIds.has(l.id)) e.currentTarget.style.background=th.s2; }}'
    code = code.replace(old2, new2, 1)
    open('src/App.jsx','w').write(code)
    print('OK')
else:
    print('NOT FOUND - already fixed or different version')
