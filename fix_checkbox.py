code = open('src/App.jsx').read()
old = 'style={{ cursor:"pointer", accentColor:th.accent }}'
new = 'style={{ cursor:"pointer", accentColor:th.accent, width:20, height:20 }}'
count = code.count(old)
print(f"Found {count} occurrences")
open('src/App.jsx','w').write(code.replace(old, new))
print("Done")
