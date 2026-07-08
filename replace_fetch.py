import sys
content = open('app.js','r',encoding='utf-8').read()
content = content.replace("fetch('/api/", "apiFetch('/api/")
content = content.replace("fetch(`/api/", "apiFetch(`/api/")
open('app.js','w',encoding='utf-8').write(content)
