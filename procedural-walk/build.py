#!/usr/bin/env python3
"""Assemble src/*.js (ordre alphabétique) + human.js dans shell.html -> index.html (un seul fichier jouable).
Option : --test écrit aussi test/index.html qui charge Three.js depuis node_modules (tests hors-ligne)
et check.mjs pour `node --check check.mjs`."""
import re, glob, os, sys
ROOT=os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
h=open('human.js').read()
m=''.join(open(f).read() for f in sorted(glob.glob('src/*.js'))); sh=open('shell.html').read()
h=re.sub(r'^import \* as THREE from "three";\n','',h,flags=re.M).replace('export function','function').replace('export const','const')
m=m.replace('import { makeHuman, randomPerson } from "./human.js";\n','')
m=m.replace('const cam={yaw:28','window.__cam=null;const cam={yaw:28').replace('let drag=null;','window.__cam=cam;let drag=null;',1)
i=m.index('// ================================================================ utilitaires')
js=m[:i]+'const {makeHuman,randomPerson}=(()=>{\n'+h+'\nreturn {makeHuman,randomPerson};})();\n'+m[i:]
out=sh.replace('<!--SCRIPT-->','<script type="module">\n'+js+'\n</script>')
open('index.html','w').write(out)
open('check.mjs','w').write(js)
if '--test' in sys.argv:
    os.makedirs('test',exist_ok=True)
    t=out.replace("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","/node_modules/three/build/three.module.js").replace("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/","/node_modules/three/examples/jsm/")
    open('test/index.html','w').write(t)
print('index.html', len(out), 'octets')
