// ============================================================================
// We March as One — jeu (rendu Three.js, peinture, écrans, campagne)
// ============================================================================
import * as THREE from 'three';
import { SHAPES, SHAPE_IDX, NODES, NODE_BY_ID, CELL, MAP_W, MAP_H, HW, HH, MAX_TROOPS, DEPLOY_MIN_Z, ENEMY_MAX_Z,
  campaignLevel, tacticsLevel, musterLevel, emptyTerrain } from './data.js?v=8';
import { Sim } from './sim.js?v=8';
import { sfx } from './audio.js?v=8';

const GAME_VERSION = '8';
const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const kfmt = n => n >= 1e5 ? Math.round(n / 1e3) + 'k' : n >= 1e4 ? (n / 1e3).toFixed(0) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'k' : String(Math.round(n));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const CW = Math.round(MAP_W / CELL), CH = Math.round(MAP_H / CELL);

// ============================================================================ sauvegarde
const KEY = 'wmao3d_v1';
const S = loadSave();
function loadSave() {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  s = Object.assign({ gold: 0, owned: [30, 0, 0, 0, 0, 0, 0], nodes: {}, ratings: { campaign: {}, command: {}, tactics: {}, muster: {} },
    formations: {}, seen: [0], sandbox: null, firstWin: {} }, s || {});
  for (const k of ['campaign', 'command', 'tactics', 'muster']) s.ratings[k] = s.ratings[k] || {};
  return s;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
// succès
const ACH = [
  ['first', 'Premier sang', 'Gagner le niveau 1'],
  ['combined', 'Armes combinées', 'Gagner une bataille de campagne avec au moins 5 types d\'unités'],
  ['king', 'Longue vie au roi', 'Gagner avec un Roi encore debout'],
  ['heroic', 'Héroïque', 'Obtenir une note HÉROÏQUE'],
  ['tenk', 'Dix mille', 'Envoyer 10 000 troupes au combat'],
  ['studied', 'Studieux', 'Acheter la moitié de l\'arbre'],
  ['leaf', 'Jusqu\'à la dernière feuille', 'Acheter tout l\'arbre'],
  ['boss', 'Régicide', 'Vaincre un roi ennemi'],
  ['end', 'We March as One', 'Gagner le niveau 50'],
];
function unlockAch(id) {
  S.ach = S.ach || {}; if (S.ach[id]) return;
  S.ach[id] = 1; save(); const a = ACH.find(x => x[0] === id); setTimeout(() => toast('🏆 Succès : ' + a[1]), 600);
}
function checkTreeAch() { const n = Object.keys(S.nodes).length; if (n >= NODES.length / 2) unlockAch('studied'); if (n >= NODES.length) unlockAch('leaf'); }
const has = id => !!S.nodes[id];
const unlockedShape = t => t === 0 || NODES.some(n => n.unlock === SHAPES[t].id && has(n.id));
const goldMul = () => 1 + (has('eco1') ? .25 : 0) + (has('eco2') ? .35 : 0) + (has('eco3') ? .5 : 0);
const trainLvl = t => (S.train || [])[t] | 0;
const trainCost = t => Math.round(SHAPES[t].cost * 20 * Math.pow(1.6, trainLvl(t)) / 10) * 10;
const recruitMul = () => 1 - (has('recruit1') ? .15 : 0) - (has('recruit2') ? .25 : 0);
const recruitCost = t => Math.max(1, Math.round(SHAPES[t].cost * recruitMul()));
const campaignProgress = () => { let m = 0; for (const k in S.ratings.campaign) if (S.ratings.campaign[k] >= 1) m = Math.max(m, +k); return m; };

function playerStats(t, upgraded) {
  const b = SHAPES[t], s = Object.assign({}, b);
  if (!upgraded) return s;
  if (t === 0 && has('circ1')) { s.hp *= 1.25; s.dmg *= 1.25; }
  if (t === 2 && has('tri2')) s.dmg *= 1.3;
  if (t === 1 && has('sq2')) s.hp *= 1.35;
  if (t === 5 && has('volley')) { s.range *= 1.3; s.cd /= 1.3; }
  if (has('march')) s.speed *= 1.15;
  if (has('spear')) s.dmg *= 1.2;
  if (has('armor')) s.hp *= 1.15;
  if (has('drill')) s.cd /= 1.15;
  const tl = trainLvl(t); s.hp *= 1 + .1 * tl; s.dmg *= 1 + .1 * tl;
  return s;
}

// ============================================================================ Three.js
const canvas = $('#c');
// sur les écrans haute densité (téléphones) l'anticrénelage coûte cher et ne se voit pas
const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 1.5, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
// qualité adaptative : si le jeu descend sous ~35 images/s, on baisse la résolution (et les ombres), puis on remonte si ça va mieux
const quality = { level: 0, big: false, ema: 16, slowT: 0, fastT: 0 };
const QUALITY_PR = [2, 1.5, 1.2, 1];
function applyQuality() {
  const dpr = window.devicePixelRatio || 1;
  let pr = Math.min(dpr, QUALITY_PR[quality.level]);
  if (quality.big) pr = Math.min(pr, 1.5);
  renderer.setPixelRatio(pr);
  sun.castShadow = quality.level < 2;
  if (typeof resize === 'function') resize();
}
function trackQuality(frameMs) {
  quality.ema += (frameMs - quality.ema) * .05;
  if (quality.ema > 28) { quality.slowT += frameMs; quality.fastT = 0; } else if (quality.ema < 17) { quality.fastT += frameMs; quality.slowT = 0; } else { quality.slowT = quality.fastT = 0; }
  if (quality.slowT > 1500 && quality.level < QUALITY_PR.length - 1) { quality.level++; quality.slowT = 0; quality.ema = 20; applyQuality(); setUnitShadows(false); }
  else if (quality.fastT > 6000 && quality.level > 0) { quality.level--; quality.fastT = 0; applyQuality(); }
}
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
// ciel en dégradé
scene.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb2dd'); gr.addColorStop(.55, '#bcd9ec'); gr.addColorStop(1, '#efe6cf'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const FOG = new THREE.Color('#e3dccb');
scene.fog = new THREE.Fog(FOG, 170, 460);
const hemi = new THREE.HemisphereLight(0xdcecff, 0xc9b27a, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.4); sun.position.set(-45, 90, 35);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 10, far: 260 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
scene.add(sun, sun.target);

// sable : grain + taches, texture répétée
function sandDraw(base, dark, light) {
  return (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = () => Math.random();
    for (let i = 0; i < 6; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 70, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, i % 2 ? dark : light); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = r() < .5 ? 'rgba(120,95,50,.10)' : 'rgba(255,250,235,.14)'; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
  };
}
const sandTex = canvasTex(512, 512, sandDraw('#ead9ac', 'rgba(190,160,100,.08)', 'rgba(255,245,215,.12)'), [MAP_W / 22, MAP_H / 22]);
const groundMat = new THREE.MeshLambertMaterial({ map: sandTex });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, MAP_H), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const outerTex = canvasTex(512, 512, sandDraw('#d4bf8a', 'rgba(150,125,70,.2)', 'rgba(240,225,180,.2)'), [MAP_W * 6 / 14, MAP_H * 6 / 14]);
const outer = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W * 6, MAP_H * 6), new THREE.MeshLambertMaterial({ map: outerTex }));
outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05; outer.receiveShadow = true; scene.add(outer);
// bordure du terrain : petit muret de bois
const fenceMat = new THREE.MeshLambertMaterial({ color: '#9b7a4f' });
for (const [w, h, x, z] of [[MAP_W + .6, .3, 0, -HH - .15], [MAP_W + .6, .3, 0, HH + .15], [.3, MAP_H, -HW - .15, 0], [.3, MAP_H, HW + .15, 0]]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, .35, h), fenceMat); m.position.set(x, .17, z); m.castShadow = m.receiveShadow = true; scene.add(m);
}
// zones de déploiement + grille de peinture (visibles pendant la préparation)
const zoneB = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, HH - DEPLOY_MIN_Z), new THREE.MeshBasicMaterial({ color: '#3b78e7', transparent: true, opacity: .12, depthWrite: false }));
zoneB.rotation.x = -Math.PI / 2; zoneB.position.set(0, .02, (HH + DEPLOY_MIN_Z) / 2); scene.add(zoneB);
const zoneR = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, HH + ENEMY_MAX_Z), new THREE.MeshBasicMaterial({ color: '#e5484d', transparent: true, opacity: .09, depthWrite: false }));
zoneR.rotation.x = -Math.PI / 2; zoneR.position.set(0, .02, (-HH + ENEMY_MAX_Z) / 2); scene.add(zoneR);
const gridGeo = (() => {
  const pts = [];
  for (let x = -HW; x <= HW + 1e-6; x += CELL) pts.push(x, 0, DEPLOY_MIN_Z, x, 0, HH);
  for (let z = DEPLOY_MIN_Z; z <= HH + 1e-6; z += CELL) pts.push(-HW, 0, z, HW, 0, z);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
})();
const gridLines = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: '#2c64cf', transparent: true, opacity: .1, depthWrite: false }));
gridLines.position.y = .025; scene.add(gridLines);
const frontLine = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, .18), new THREE.MeshBasicMaterial({ color: '#2c64cf', transparent: true, opacity: .55 }));
frontLine.rotation.x = -Math.PI / 2; frontLine.position.set(0, .03, DEPLOY_MIN_Z); scene.add(frontLine);
const border = { visible: true };

// brosse
const brushMesh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, .01, 1)), new THREE.LineBasicMaterial({ color: '#23262d' }));
brushMesh.position.y = .06; brushMesh.visible = false; scene.add(brushMesh);
const targetRing = new THREE.Mesh(new THREE.RingGeometry(6.7, 7, 64), new THREE.MeshBasicMaterial({ color: '#f5b400', side: THREE.DoubleSide }));
targetRing.rotation.x = -Math.PI / 2; targetRing.position.y = .07; targetRing.visible = false; scene.add(targetRing);

// géométries des formes (posées au sol, rayon normalisé 1)
function shapeGeo(t) {
  let g;
  switch (SHAPES[t].id) {
    case 'circle':   g = new THREE.CylinderGeometry(1, 1, 1, 12); break;
    case 'square':   g = new THREE.BoxGeometry(1.75, 1, 1.75); break;
    case 'triangle': g = new THREE.CylinderGeometry(1.3, 1.3, 1, 3); break;
    case 'diamond':  g = new THREE.OctahedronGeometry(1.15); g.scale(1, 1.25, 1); g.translate(0, .9, 0); return g;
    case 'pentagon': g = new THREE.CylinderGeometry(1.12, 1.12, 1, 5); break;
    case 'hexagon':  g = new THREE.CylinderGeometry(1.1, 1.1, 1, 6); break;
    case 'rhombus':  g = new THREE.CylinderGeometry(1.25, 1.25, 1, 4); g.scale(.62, 1, 1.3); break;
  }
  g.translate(0, .5, 0); return g;
}
const GEOS = SHAPES.map((s, t) => shapeGeo(t));
const TEAMCOL = [['#3b78e7', '#2b5fc0', '#5d95ff', '#4aa3f0', '#1f4aa3', '#6cb7ff', '#3d86d6'],
                 ['#e5484d', '#b8323a', '#ff6a5a', '#f07a3c', '#8f1f2a', '#ff8f73', '#d9415f']];

const _c = new THREE.Color();
class Group {
  // color = couleur de base ; chaque instance peut être éclaircie (flash) ou assombrie (blessure)
  constructor(geo, color, cap = 256, opts = {}) {
    this.geo = geo; this.base = new THREE.Color(color);
    this.mat = opts.mat || new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.cast = opts.cast !== false; this.cap = 0; this.mesh = null; this.n = 0; this.ensure(cap);
  }
  ensure(c) {
    if (c <= this.cap) return;
    let nc = Math.max(256, this.cap); while (nc < c) nc *= 2;
    const old = this.arr, oldC = this.col;
    if (this.mesh) { scene.remove(this.mesh); this.mesh.dispose(); }
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, nc);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nc * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    if (old) { this.mesh.instanceMatrix.array.set(old.subarray(0, Math.min(old.length, this.n * 16))); this.mesh.instanceColor.array.set(oldC.subarray(0, Math.min(oldC.length, this.n * 3))); }
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; this.mesh.count = 0; this.cap = nc;
    this.mesh.castShadow = this.cast; this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.arr = this.mesh.instanceMatrix.array; this.col = this.mesh.instanceColor.array;
  }
  begin() { this.n = 0; }
  // (hx,hz) = direction vers laquelle pointe la forme ; light : -1 (sombre) .. 0 .. 1 (blanc)
  push(x, y, z, hx, hz, sxz, sy, light = 0) {
    if (this.n >= this.cap) this.ensure(this.n + 1);
    const a = this.arr, o = this.n * 16;
    a[o] = hz * sxz; a[o + 1] = 0; a[o + 2] = -hx * sxz; a[o + 3] = 0;
    a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = hx * sxz; a[o + 9] = 0; a[o + 10] = hz * sxz; a[o + 11] = 0;
    a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
    const c = this.col, p = this.n * 3, b = this.base;
    if (light > 0) { c[p] = b.r + (1 - b.r) * light; c[p + 1] = b.g + (1 - b.g) * light; c[p + 2] = b.b + (1 - b.b) * light; }
    else { const k = 1 + light; c[p] = b.r * k; c[p + 1] = b.g * k; c[p + 2] = b.b * k; }
    this.n++;
  }
  end() {
    // n'envoie au GPU que la partie utilisée des tampons
    const m = this.mesh, n = this.n; m.count = n;
    const im = m.instanceMatrix, ic = m.instanceColor;
    im.clearUpdateRanges(); ic.clearUpdateRanges();
    if (n) { im.addUpdateRange(0, n * 16); ic.addUpdateRange(0, n * 3); im.needsUpdate = true; ic.needsUpdate = true; }
  }
}
// légère arête sombre sous chaque forme pour mieux les détacher du sable
function bevel(g) { g.computeVertexNormals(); return g; }
const groups = [0, 1].map(tm => SHAPES.map((s, t) => new Group(bevel(GEOS[t]), TEAMCOL[tm][t])));
const kingGroup = [new Group(GEOS[0], '#f5c542', 4), new Group(GEOS[4], '#7a1020', 4)];
const corpseGeo = new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, .5, 0);
const corpseGroup = [new Group(corpseGeo, '#6d7fa8', 512, { cast: false }), new Group(corpseGeo, '#a87570', 512, { cast: false })];
const projGroup = new Group(new THREE.BoxGeometry(.07, .07, .75), '#3a2a12', 512, { cast: false });
const crownGeo = new THREE.ConeGeometry(.9, 1.1, 5).translate(0, .55, 0);
const crownGroup = new Group(crownGeo, '#ffd84a', 4, { mat: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: '#7a5a00' }) });
// particules (éclats à la mort d'une unité)
const partGroup = new Group(new THREE.BoxGeometry(1, 1, 1), '#ffffff', 1024, { cast: false });
const allGroups = [...groups[0], ...groups[1], ...kingGroup, ...corpseGroup, projGroup, crownGroup, partGroup];
// ombres des unités seulement quand l'armée n'est pas trop grande (perfs mobile)
function setUnitShadows(on) { for (const tm of [0, 1]) for (const g of groups[tm]) g.mesh.castShadow = on; }

// particules : pool simple
const PMAX = 5000, P = { n: 0, x: new Float32Array(PMAX), y: new Float32Array(PMAX), z: new Float32Array(PMAX), vx: new Float32Array(PMAX), vy: new Float32Array(PMAX), vz: new Float32Array(PMAX), life: new Float32Array(PMAX), s: new Float32Array(PMAX), c: [] };
function burst(x, z, color, n, size = .09, up = 3) {
  for (let k = 0; k < n; k++) {
    if (P.n >= PMAX) return; const i = P.n++;
    const a = Math.random() * 6.283, sp = .8 + Math.random() * 2.2;
    P.x[i] = x; P.y[i] = .25; P.z[i] = z; P.vx[i] = Math.cos(a) * sp; P.vz[i] = Math.sin(a) * sp; P.vy[i] = up * (.5 + Math.random());
    P.life[i] = .5 + Math.random() * .5; P.s[i] = size * (.6 + Math.random() * .8); P.c[i] = color;
  }
}
function stepParticles(dt) {
  for (let i = 0; i < P.n;) {
    P.life[i] -= dt;
    if (P.life[i] <= 0) { const l = --P.n; P.x[i] = P.x[l]; P.y[i] = P.y[l]; P.z[i] = P.z[l]; P.vx[i] = P.vx[l]; P.vy[i] = P.vy[l]; P.vz[i] = P.vz[l]; P.life[i] = P.life[l]; P.s[i] = P.s[l]; P.c[i] = P.c[l]; continue; }
    P.vy[i] -= 12 * dt; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
    if (P.y[i] < .03) { P.y[i] = .03; P.vy[i] *= -.3; P.vx[i] *= .6; P.vz[i] *= .6; }
    i++;
  }
}
function drawParticles() {
  partGroup.begin();
  for (let i = 0; i < P.n; i++) {
    const s = P.s[i] * Math.min(1, P.life[i] * 3);
    partGroup.base.setHex(P.c[i]); partGroup.push(P.x[i], P.y[i], P.z[i], .7, .7, s, s, 0);
  }
  partGroup.end();
}

// terrain
const terrainRoot = new THREE.Group(); scene.add(terrainRoot);
const treeTrunkGeo = new THREE.CylinderGeometry(.12, .17, .8, 6).translate(0, .4, 0);
const treeTopGeo = new THREE.ConeGeometry(.8, 1.5, 7).translate(0, 1.35, 0);
const treeTop2Geo = new THREE.ConeGeometry(.6, 1.2, 7).translate(0, 2.05, 0);
const rockGeo = new THREE.DodecahedronGeometry(.35, 0);
const wallTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(120,100,70,${Math.random() * .08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = '#5b6b7a'; for (let y = 18; y < h - 20; y += 40) for (let x = 14; x < w - 20; x += 36) { g.fillRect(x, y, 16, 20); g.fillStyle = '#8fa4b5'; g.fillRect(x + 2, y + 2, 5, 7); g.fillStyle = '#5b6b7a'; }
}, [1, 1]);
const waterTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#6fa9d6'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h; g.strokeStyle = `rgba(255,255,255,${.12 + Math.random() * .2})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); }
}, [12, 1]);
const waterMat = new THREE.MeshLambertMaterial({ map: waterTex, transparent: true, opacity: .92 });
const ROOFS = ['#a8593c', '#8e4a33', '#6f7c8c', '#9a6b3f'];
function rnd(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
function buildTerrainMeshes(t) {
  while (terrainRoot.children.length) { const c = terrainRoot.children.pop(); c.geometry?.dispose?.(); }
  t.buildings.forEach((b, i) => {
    const tex = wallTex.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(b.w / 2.5)), Math.max(1, Math.round(b.hgt / 2)));
    const wall = new THREE.MeshLambertMaterial({ map: tex });
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.hgt, b.h), wall); m.position.set(b.x, b.hgt / 2, b.z);
    m.castShadow = m.receiveShadow = true; terrainRoot.add(m);
    // toit à deux pans
    const roofMat = new THREE.MeshLambertMaterial({ color: ROOFS[i % ROOFS.length] });
    const rh = Math.min(b.w, b.h) * .35;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(.01, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4), roofMat);
    roof.scale.set(b.w + .5, rh, b.h + .5); roof.position.set(b.x, b.hgt + rh / 2, b.z);
    roof.castShadow = true; terrainRoot.add(roof);
  });
  if (t.trees.length) {
    const n = t.trees.length;
    const trunk = new THREE.InstancedMesh(treeTrunkGeo, new THREE.MeshLambertMaterial({ color: '#7a5a3a' }), n);
    const top = new THREE.InstancedMesh(treeTopGeo, new THREE.MeshLambertMaterial({ color: '#4f8f45' }), n);
    const top2 = new THREE.InstancedMesh(treeTop2Geo, new THREE.MeshLambertMaterial({ color: '#69a95a' }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    t.trees.forEach((tr, i) => { const sc = .8 + rnd(i) * .6; q.setFromEuler(e.set(0, rnd(i + 3) * 6, 0)); m.compose(new THREE.Vector3(tr.x, 0, tr.z), q, new THREE.Vector3(sc, sc, sc)); trunk.setMatrixAt(i, m); top.setMatrixAt(i, m); top2.setMatrixAt(i, m); });
    for (const x of [trunk, top, top2]) { x.frustumCulled = false; x.castShadow = true; x.receiveShadow = true; terrainRoot.add(x); }
  }
  // cailloux décoratifs (hors zones jouables critiques)
  const nr = 60, rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshLambertMaterial({ color: '#b5a685' }), nr);
  const m = new THREE.Matrix4();
  for (let i = 0; i < nr; i++) { const side = i % 2 ? 1 : -1; const x = side * (HW + 3 + rnd(i) * 30), z = (rnd(i + 7) - .5) * MAP_H * 1.3, sc = .6 + rnd(i + 2) * 2; m.makeScale(sc, sc * .7, sc).setPosition(x, .1, z); rocks.setMatrixAt(i, m); }
  rocks.castShadow = true; rocks.frustumCulled = false; terrainRoot.add(rocks);
  const wood = new THREE.MeshLambertMaterial({ color: '#9c7650' }), bank = new THREE.MeshLambertMaterial({ color: '#b9a06e' });
  for (const rv of t.rivers) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, rv.z1 - rv.z0), waterMat); w.rotation.x = -Math.PI / 2; w.position.set(0, .02, (rv.z0 + rv.z1) / 2); w.receiveShadow = true; terrainRoot.add(w);
    for (const z of [rv.z0, rv.z1]) { const bk = new THREE.Mesh(new THREE.BoxGeometry(MAP_W, .12, .4), bank); bk.position.set(0, .05, z); terrainRoot.add(bk); }
    for (const g of rv.gaps) {
      const bw = g[1] - g[0], len = rv.z1 - rv.z0 + 1.2;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(bw, .14, len), wood); deck.position.set((g[0] + g[1]) / 2, .08, (rv.z0 + rv.z1) / 2); deck.castShadow = deck.receiveShadow = true; terrainRoot.add(deck);
      for (const sx of [g[0] + .1, g[1] - .1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(.15, .4, len), wood); rail.position.set(sx, .3, (rv.z0 + rv.z1) / 2); rail.castShadow = true; terrainRoot.add(rail); }
    }
  }
}
function cellBlocked(t, x, z) {
  for (const b of t.buildings) if (Math.abs(x - b.x) < b.w / 2 + .25 && Math.abs(z - b.z) < b.h / 2 + .25) return true;
  for (const tr of t.trees) if (Math.abs(x - tr.x) < .7 && Math.abs(z - tr.z) < .7) return true;
  for (const rv of t.rivers) if (z > rv.z0 - .25 && z < rv.z1 + .25 && !rv.gaps.some(g => x > g[0] && x < g[1])) return true;
  return false;
}

// ============================================================================ caméras
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 1000);
const persp = new THREE.PerspectiveCamera(50, 1, .1, 1500);
const view = { mode: '2d', tx: 0, tz: 10, zoom: 40, yaw: 0, pitch: .95, dist: 70, fx: 0, fy: 20, fz: 60, fyaw: 0, fpitch: -.35 };
let VW = innerWidth, VH = innerHeight, portrait = VH >= VW;
function resize() {
  VW = innerWidth; VH = innerHeight; portrait = VH >= VW;
  renderer.setSize(VW, VH, false); persp.aspect = VW / VH; persp.updateProjectionMatrix(); updateCam();
}
function activeCam() { return view.mode === '2d' ? ortho : persp; }
function updateCam() {
  const a = VW / VH;
  if (view.mode === '2d') {
    // view.zoom = largeur visible (dans le sens de la largeur de l'écran)
    const w = view.zoom, h = w / a;
    ortho.left = -w / 2; ortho.right = w / 2; ortho.top = h / 2; ortho.bottom = -h / 2; ortho.updateProjectionMatrix();
    ortho.position.set(view.tx, 120, view.tz);
    ortho.up.set(portrait ? 0 : 1, 0, portrait ? -1 : 0);
    ortho.lookAt(view.tx, 0, view.tz);
  } else if (view.mode === '3d') {
    if (screen === 'menu') persp.setViewOffset(VW, VH, 0, VH * .2, VW, VH); else if (persp.view) persp.clearViewOffset();
    const yaw = view.yaw;
    const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
    persp.position.set(view.tx + Math.sin(yaw) * cp * view.dist, sp * view.dist, view.tz + Math.cos(yaw) * cp * view.dist);
    persp.up.set(0, 1, 0); persp.lookAt(view.tx, 0, view.tz);
  } else {
    persp.position.set(view.fx, view.fy, view.fz);
    persp.up.set(0, 1, 0);
    const d = new THREE.Vector3(Math.sin(view.fyaw) * Math.cos(view.fpitch), Math.sin(view.fpitch), -Math.cos(view.fyaw) * Math.cos(view.fpitch));
    persp.lookAt(persp.position.clone().add(d));
  }
}
function setCamMode(m) {
  if (m === 'fly' && view.mode !== 'fly') {
    const c = view.mode === '2d' ? { x: view.tx, z: view.tz + 40 } : { x: persp.position.x, z: persp.position.z };
    view.fx = view.tx; view.fz = view.tz + 45; view.fy = 22; view.fyaw = 0; view.fpitch = -.45;
  }
  if (m === '3d' && view.mode === '2d') { view.dist = view.zoom * (portrait ? 1.6 : 1.05); view.yaw = 0; }
  if (m === '2d' && view.mode === '3d') view.zoom = view.dist / (portrait ? 1.6 : 1.05);
  view.mode = m; updateCam(); renderTop();
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function groundAt(px, py) {
  ndc.set(px / VW * 2 - 1, -(py / VH) * 2 + 1);
  ray.setFromCamera(ndc, activeCam());
  return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
}
function panBy(p0, p1) {
  const a = groundAt(p0.x, p0.y), b = groundAt(p1.x, p1.y); if (!a || !b) return;
  if (view.mode === 'fly') return;
  view.tx = clamp(view.tx - (b.x - a.x), -HW - 20, HW + 20); view.tz = clamp(view.tz - (b.z - a.z), -HH - 20, HH + 20); updateCam();
}
function zoomBy(f) {
  if (view.mode === '2d') view.zoom = clamp(view.zoom / f, 6, 260);
  else if (view.mode === '3d') view.dist = clamp(view.dist / f, 8, 320);
  else { const d = new THREE.Vector3(); persp.getWorldDirection(d); const k = (f - 1) * 40; view.fx += d.x * k; view.fy = Math.max(1.5, view.fy + d.y * k); view.fz += d.z * k; }
  updateCam();
}
function fitTo(width, cz) { view.tx = 0; view.tz = cz; view.zoom = width; view.dist = width * 1.25; updateCam(); }
// cadre la vue sur les deux armées (la peinture se fait en 2D, comme dans le jeu)
function frameArmies(force2d) {
  let x0 = -6, x1 = 6, z0 = -10, z1 = DEPLOY_MIN_Z + 6;
  const pts = mode === 'sandbox' ? [...form[1].keys()].map(k => [cellX(k), cellZ(k)]) : level.enemy.map(e => [e.x, e.z]);
  for (const [k] of form[0]) pts.push([cellX(k), cellZ(k)]);
  for (const [x, z] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const w = x1 - x0 + 6, h = z1 - z0 + 6, a = VW / VH;
  view.tx = (x0 + x1) / 2;
  // laisse de la place pour la palette en bas
  const along = portrait ? h * 1.35 : h * 1.25, across = w;
  view.zoom = clamp(portrait ? Math.max(across, along * a) : Math.max(along, across * a), 14, 200);
  view.tz = (z0 + z1) / 2 + (portrait ? view.zoom / a * .08 : 0);
  view.dist = view.zoom * (portrait ? 1.6 : 1.05); view.yaw = 0; view.pitch = .95;
  if (force2d) view.mode = '2d';
  updateCam();
}

// ============================================================================ état de partie
let screen = 'menu';
let mode = 'campaign';      // campaign | command | tactics | muster | sandbox
let level = null;           // niveau courant
const form = [new Map(), new Map()];   // cellule -> forme (équipe bleue, rouge en bac à sable)
let kingKey = -1;
let undoStack = [];
let brush = { t: 0, size: 7, erase: false, team: 0, terrain: null };
let order = 0;              // 0 = MARCHE, 1 = TENIR
let sim = null, speed = 1, paused = false, power = null, volleyReady = 0, rallyReady = 0;
let result = null;
let formDirty = true;

const cellKey = (gx, gz) => gz * CW + gx;
const cellX = k => (k % CW) * CELL - HW + CELL / 2, cellZ = k => Math.floor(k / CW) * CELL - HH + CELL / 2;
const toCell = (x, z) => [Math.floor((x + HW) / CELL), Math.floor((z + HH) / CELL)];

function armyLimit(t) {
  if (mode === 'campaign' || mode === 'command') return S.owned[t];
  if (mode === 'tactics') return level.army[t] || 0;
  return Infinity;
}
function shapeAvailable(t) {
  if (mode === 'campaign' || mode === 'command') return unlockedShape(t);
  if (mode === 'tactics') return (level.army[t] || 0) > 0;
  return unlockedShape(t) || S.seen.includes(t);
}
function counts(team = 0) { const c = [0, 0, 0, 0, 0, 0, 0]; for (const t of form[team].values()) c[t]++; return c; }
function formationCost(team = 0) { let v = 0; for (const t of form[team].values()) v += SHAPES[t].cost; if (kingKey >= 0 && team === 0) v += SHAPES[0].cost * 9; return v; }
function costCap() { return 0; } // plus aucune limite de coût

function zoneOk(team, x, z) {
  if (Math.abs(x) > HW - .3 || Math.abs(z) > HH - .3) return false;
  if (team === 0 ? z < DEPLOY_MIN_Z : z > ENEMY_MAX_Z) return false;
  return !cellBlocked(level.terrain, x, z);
}

function stamp(px, pz, stroke) {
  const [cx, cz] = toCell(px, pz), n = brush.size, h = Math.floor((n - 1) / 2);
  const team = mode === 'sandbox' ? brush.team : 0, F = form[team];
  const c = counts(team);
  for (let dz = -h; dz < n - h; dz++) for (let dx = -h; dx < n - h; dx++) {
    const gx = cx + dx, gz = cz + dz; if (gx < 0 || gz < 0 || gx >= CW || gz >= CH) continue;
    const k = cellKey(gx, gz);
    if (brush.erase) { if (F.has(k)) { stroke.push([team, k, F.get(k)]); F.delete(k); if (k === kingKey) kingKey = -1; } continue; }
    if (F.has(k)) continue;                       // case déjà occupée : rien à faire
    const x = cellX(k), z = cellZ(k);
    if (!zoneOk(team, x, z)) continue;
    if (c[brush.t] >= armyLimit(brush.t)) { if (!stroke.warned) { toast(mode === 'tactics' ? 'Plus de ' + SHAPES[brush.t].name + ' pour ce puzzle.' : 'Tu n\'as plus de ' + SHAPES[brush.t].name + 's : recrute-en dans AMÉLIORATIONS.'); stroke.warned = true; } return; }
    if (form[0].size + form[1].size >= MAX_TROOPS) { toast('Maximum ' + fmt(MAX_TROOPS) + ' troupes.'); return; }
    F.set(k, brush.t); c[brush.t]++; stroke.push([team, k, -1]); sfx.paint();
  }
}
function undo() {
  const s = undoStack.pop(); if (!s) return;
  for (let i = s.length - 1; i >= 0; i--) { const [tm, k, prev] = s[i]; if (prev < 0) { form[tm].delete(k); if (k === kingKey) kingKey = -1; } else form[tm].set(k, prev); }
  formDirty = true; renderBottom(); renderTop();
}
function clearForm() { const s = []; const tm = mode === 'sandbox' ? brush.team : 0; for (const [k, t] of form[tm]) s.push([tm, k, t]); form[tm].clear(); if (tm === 0) kingKey = -1; if (s.length) undoStack.push(s); formDirty = true; renderBottom(); renderTop(); }

function formKey() { return mode + ':' + (level ? level.id : 0); }
function storeFormation() {
  if (mode === 'sandbox') return;
  S.formations[formKey()] = { k: [...form[0].keys()], t: [...form[0].values()], king: kingKey, order };
  // garde aussi la dernière formation de campagne (l'armée suit d'un niveau à l'autre)
  if (mode === 'campaign' || mode === 'command') S.formations.last = S.formations[formKey()];
  save();
}
function restoreFormation() {
  form[0].clear(); form[1].clear(); kingKey = -1;
  const f = S.formations[formKey()] || ((mode === 'campaign' || mode === 'command') ? S.formations.last : null);
  if (f) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    f.k.forEach((k, i) => { const t = f.t[i]; if (!shapeAvailable(t) || c[t] >= armyLimit(t)) return; const x = cellX(k), z = cellZ(k); if (!zoneOk(0, x, z)) return; form[0].set(k, t); c[t]++; });
    if (f.king >= 0 && form[0].get(f.king) === 0 && has('king')) kingKey = f.king;
    order = f.order || 0;
    const cap = costCap();
    if (cap && formationCost(0) > cap) { form[0].clear(); kingKey = -1; autoFill(); setTimeout(() => toast('Ton armée dépassait le plafond de coût : formation refaite automatiquement.'), 50); }
  }
  if (!form[0].size && mode !== 'muster') autoFill();
}
// pose automatique : une ligne large devant la zone, par forme
function autoFill() {
  const before = new Set(form[0].keys());
  const c = counts(0); let z0 = DEPLOY_MIN_Z + .25;
  const cap = costCap(); let budget = cap ? cap - formationCost(0) : Infinity;
  const orderShapes = [1, 4, 0, 6, 2, 3, 5]; // ancres devant, tireurs derrière
  for (const t of orderShapes) {
    if (!shapeAvailable(t)) continue;
    let n = Math.min(armyLimit(t) - c[t], 4000, Math.floor(budget / SHAPES[t].cost)); if (!isFinite(n) || n <= 0) continue;
    budget -= n * SHAPES[t].cost;
    const width = Math.min(CW - 8, Math.max(8, Math.round(Math.sqrt(n * 6))));
    let placed = 0, row = 0;
    while (placed < n && row < 200) {
      const z = z0 + row * CELL;
      for (let col = 0; col < width && placed < n; col++) {
        const x = (col - (width - 1) / 2) * CELL;
        const [gx, gz] = toCell(x, z); const k = cellKey(gx, gz);
        if (form[0].has(k) || !zoneOk(0, cellX(k), cellZ(k))) continue;
        form[0].set(k, t); placed++;
      }
      row++;
    }
    z0 += row * CELL + CELL;
  }
  const st = []; for (const [k, t] of form[0]) if (!before.has(k)) st.push([0, k, -1]);
  if (st.length) undoStack.push(st);
  formDirty = true;
}

// ============================================================================ écrans
function show(id) {
  screen = id;
  for (const s of ['menu', 'levels', 'upgrades']) $('#' + s).hidden = s !== id;
  $('#top').hidden = !(id === 'setup' || id === 'battle');
  $('#bottom').hidden = !(id === 'setup' || id === 'battle');
  $('#result').hidden = id !== 'result';
  if (id === 'menu') { renderMenu(); startDemo(); }
  if (id === 'levels') renderLevels();
  if (id === 'upgrades') renderUpgrades();
  if (id === 'setup' || id === 'battle') { renderTop(); renderBottom(); }
  if (id === 'result') renderResult();
  zoneB.visible = zoneR.visible = frontLine.visible = gridLines.visible = id === 'setup';
}

function shapeSVG(t, fill = '#23262d') {
  const P = {
    circle: '<circle cx="12" cy="12" r="9"/>', square: '<rect x="4" y="4" width="16" height="16"/>',
    triangle: '<polygon points="12,3 21,20 3,20"/>', diamond: '<polygon points="12,2 20,12 12,22 4,12"/>',
    pentagon: '<polygon points="12,2.5 21.5,9.5 18,21 6,21 2.5,9.5"/>', hexagon: '<polygon points="7,3 17,3 22,12 17,21 7,21 2,12"/>',
    rhombus: '<polygon points="9,4 22,4 15,20 2,20"/>', erase: '<path d="M4 16l8-11 8 6-8 11H8z" fill="none" stroke-width="2.4" stroke="' + fill + '"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="${fill}">${P[t < 0 ? 'erase' : SHAPES[t].id]}</svg>`;
}

// ---------------------------------------------------------------- menu
function renderMenu() {
  const prog = campaignProgress();
  $('#menu').innerHTML = `<div class="wrap">
    <h1 class="logo">WE MARCH<br>AS ONE</h1>
    <p class="small" style="font-size:14px;max-width:520px;background:#fffdf7d9;border-radius:10px;padding:6px 9px;color:#3c414c">Commence avec quelques formes et bâtis une armée de dizaines de milliers. Peins tes troupes sur le champ de bataille et envoie-les contre des hordes immenses : chaque soldat est simulé.</p>
    <div class="row" style="margin-top:6px"><button data-act="mute" style="padding:5px 9px">${sfx.muted ? '🔇' : '🔊'}</button><span class="chip gold">${fmt(S.gold)} or</span><span class="chip">Campagne ${prog}/50</span><span class="chip">${fmt(S.owned.reduce((a, b) => a + b))} troupes</span></div>
    <div class="spacer"></div>
    <div class="modes">
      <button class="mode panel" data-act="mode" data-v="campaign"><b>Campagne</b>Bâtis ton armée bataille après bataille. 50 niveaux.</button>
      <button class="mode panel" data-act="mode" data-v="command"><b>Commandement</b>Ordres en temps réel et pouvoirs sur le champ de bataille.</button>
      <button class="mode panel" data-act="mode" data-v="tactics"><b>Tactique</b>Puzzles à armée fixe : seuls le placement et les ordres comptent.</button>
      <button class="mode panel" data-act="mode" data-v="muster"><b>Rassemblement</b>Compose librement ton armée avec toutes les formes que tu connais.</button>
      <button class="mode panel" data-act="mode" data-v="sandbox"><b>Bac à sable</b>Éditeur de niveau : peins les deux armées et le terrain.</button>
      <button class="mode panel" data-act="upgrades"><b>Améliorations</b>Arbre de compétences et recrutement.</button>
      <button class="mode panel" data-act="help"><b>Comment jouer</b>Les règles, les formes et les astuces.</button>
    </div>
    <div class="panel" style="padding:10px;margin-top:14px"><b>Succès ${Object.keys(S.ach || {}).length}/${ACH.length}</b><div class="row" style="margin-top:6px">${ACH.map(a => `<span class="chip" title="${a[2]}" style="${(S.ach || {})[a[0]] ? 'background:#ffd84a' : 'opacity:.45'}">🏆 ${a[1]}</span>`).join('')}</div></div>
    <p class="small" style="margin-top:18px"><b>Version ${GAME_VERSION}</b> · Astuce : ajoute cette page à ton écran d'accueil pour l'installer comme une application.</p>
  </div>`;
}

function renderHelp() {
  const shapes = SHAPES.map((sh, t) => `<div class="ncard"><div class="nic">${shapeSVG(t, TEAMCOL[0][t])}</div><div class="ntx"><b>${sh.name}</b> <span class="small">${sh.cost} or · ${sh.ranged ? 'tir à distance' : 'mêlée'}</span><div class="small">${sh.role}</div></div></div>`).join('');
  $('#menu').innerHTML = `<div class="uphead"><button data-act="menu">◀ Menu</button><b style="font-size:18px">Comment jouer</b></div><div class="wrap" style="padding-top:10px">
    <div class="panel" style="padding:12px;line-height:1.5">
    <b>1. Peins ton armée.</b> Choisis une forme dans la palette en bas, puis glisse le doigt dans la zone bleue. Une case = une unité. Pinceaux 1×1 à 8×8, ANNULER, EFFACER, et AUTO pour une ligne toute faite.<br>
    <b>2. Donne un ordre.</b> MARCHE : l'armée avance et va chercher l'ennemi (elle contourne les bâtiments et prend les ponts). TENIR : elle reste en place jusqu'à ce que l'ennemi arrive.<br>
    <b>3. COMBATTRE !</b> Chaque soldat vise l'ennemi le plus proche. Une armée large combat sur tout son front ; une armée étroite ne se bat qu'avec ses premiers rangs.<br>
    <b>4. Gagne de l'or</b> même en perdant. Tes troupes tombées reviennent. Recrute, entraîne tes formes et achète des améliorations, puis reviens plus fort.<br>
    <b>Notes :</b> ✔ victoire · ◆ DÉCISIVE (moins de 35% de pertes) · ★ HÉROÏQUE (moins de 10%). Chaque nouvelle note rapporte de l'or.<br>
    <b>Le Roi :</b> avec l'amélioration « La Couronne », touche deux fois un Cercle : ×10 PV et dégâts, et les alliés autour vont 30% plus vite.<br>
    <b>Caméra :</b> 2D pour peindre, 3D et FLY pour admirer. Deux doigts : déplacer et zoomer (et tourner en 3D).
    </div><div class="tierlbl">Les 7 formes</div><div class="cards">${shapes}</div></div>`;
  $('#menu').scrollTop = 0;
}

// ---------------------------------------------------------------- niveaux
function levelList() {
  if (mode === 'tactics') return [0, 1, 2, 3, 4, 5].map(i => ({ id: i + 1, mk: () => tacticsLevel(i), name: 'Tactique ' + (i + 1) }));
  if (mode === 'muster') return [0, 1, 2, 3, 4, 5].map(i => ({ id: i + 1, mk: () => musterLevel(i), name: 'Rassemblement ' + (i + 1) }));
  const L = []; for (let n = 1; n <= 50; n++) L.push({ id: n, mk: () => campaignLevel(n), n }); return L;
}
function renderLevels() {
  const R = S.ratings[mode] || {};
  const prog = mode === 'campaign' ? campaignProgress() : mode === 'command' ? Math.max(campaignProgress(), Object.keys(R).length) : 99;
  let h = `<div class="wrap"><div class="hdr"><button data-act="menu">◀ Menu</button><b style="font-size:20px">${{ campaign: 'Campagne', command: 'Commandement', tactics: 'Tactique', muster: 'Rassemblement' }[mode]}</b><span class="sp"></span><span class="chip gold">${fmt(S.gold)} or</span><button class="blue" data-act="upgrades">AMÉLIORATIONS</button></div>`;
  if (mode === 'command') h += `<p class="small">Les niveaux débloqués en Campagne, avec ordres en direct (MARCHE / TENIR) et pouvoirs : Pluie de flèches et Ralliement.</p>`;
  if (mode === 'tactics') h += `<p class="small">Armée imposée, pas de recrutement ni d'améliorations : trouve le bon placement.</p>`;
  if (mode === 'muster') h += `<p class="small">Aucune limite : peins l'armée de ton choix avec toutes les formes que tu connais.</p>`;
  h += `<div class="levels">`;
  for (const L of levelList()) {
    const r = R[L.id] || 0, locked = (mode === 'campaign' || mode === 'command') && L.id > prog + 1;
    const lv = (mode === 'campaign' || mode === 'command') ? campaignLevel(L.id) : null;
    const cls = lv ? (lv.boss ? 'boss' : lv.city ? 'city' : '') : '';
    h += `<button class="lv panel ${cls}" data-act="level" data-v="${L.id}" ${locked ? 'disabled' : ''}><span class="num">${locked ? '🔒' : L.id}</span><span class="nm">${lv ? lv.name : L.name}</span>${lv ? `<span class="nm">👥 ${kfmt(lv.enemy.length)}${lv.terrain.rivers.length ? ' 🌊' : ''}${lv.city ? ' 🏠' : ''}${lv.boss ? ' ♛' : ''}${lv.cap ? ' 💰' : ''}</span>` : ''}<span class="st"><span class="${r >= 1 ? '' : 'off'}">✔</span><span class="${r >= 2 ? '' : 'off'}">◆</span><span class="${r >= 3 ? '' : 'off'}">★</span></span></button>`;
  }
  h += `</div><p class="small" style="margin-top:12px">✔ Victoire · ◆ DÉCISIVE (moins de 35% de pertes) · ★ HÉROÏQUE (moins de 10% de pertes). Rejoue les niveaux pour de meilleures notes et plus d'or.</p></div>`;
  $('#levels').innerHTML = h;
  // place la vue sur le prochain niveau à jouer
  const cur = $('#levels').querySelector(`[data-act=level][data-v="${Math.min(50, prog + 1)}"]`);
  if (cur && (mode === 'campaign' || mode === 'command')) { cur.classList.add('cur'); requestAnimationFrame(() => cur.scrollIntoView({ block: 'center' })); }
}

// ---------------------------------------------------------------- améliorations
let upTab = 0;
function nodeIcon(n) {
  if (n.unlock) return shapeSVG(SHAPE_IDX[n.unlock]);
  const g = { king: '♛', eco1: '¤', eco2: '¤', eco3: '¤', recruit1: '+', recruit2: '+', armor: '⛨', drill: '⟳', march: '»', spear: '➶', volley: '➶', circ1: '●', tri2: '▲', sq2: '■' }[n.id] || '▲';
  return `<span style="font-size:20px;font-weight:900;line-height:24px">${g}</span>`;
}
function renderUpgrades() {
  const back = upgradesFrom === 'setup' || upgradesFrom === 'result';
  let h = `<div class="uphead"><button data-act="tocampaign">◀ Campagne</button><b style="font-size:18px">Améliorations</b><span class="sp"></span><span class="chip gold">${fmt(S.gold)} or</span>${back && level ? `<button class="go" data-act="backlevel" style="font-size:13px;padding:7px 10px">⚔ Retour au combat</button>` : ''}</div>`;
  h += `<div class="wrap" style="padding-top:8px"><div class="seg" style="margin-bottom:10px"><button data-act="uptab" data-v="0" class="${upTab === 0 ? 'on' : ''}">Arbre de compétences</button><button data-act="uptab" data-v="1" class="${upTab === 1 ? 'on' : ''}">Recruter et entraîner</button></div>`;
  if (upTab === 0) {
    const owned = Object.keys(S.nodes).length;
    h += `<div class="small" style="margin-bottom:6px">${owned}/${NODES.length} acquis · les achats sont définitifs · chaque palier s'ouvre avec le précédent.</div>`;
    for (let tier = 1; tier <= 3; tier++) {
      h += `<div class="tierlbl">Palier ${'I'.repeat(tier)}</div><div class="cards">`;
      for (const n of NODES.filter(x => x.tier === tier).sort((a, b) => a.x - b.x)) {
        const own = has(n.id), avail = n.pre.every(has), afford = S.gold >= n.cost;
        const cls = own ? 'own' : avail ? (afford ? 'buy' : 'avail') : 'lock';
        h += `<div class="ncard ${cls}"><div class="nic">${nodeIcon(n)}</div><div class="ntx"><b>${n.name}</b><div class="small">${n.desc}</div>`;
        if (!avail && !own) h += `<div class="small req">🔒 Après : ${n.pre.map(p => NODE_BY_ID[p].name).join(' + ')}</div>`;
        h += `</div>`;
        h += own ? `<div class="nst">✔ Acquis</div>` : `<button class="${avail && afford ? 'blue' : ''}" data-act="buynode" data-v="${n.id}" ${!avail || !afford ? 'disabled' : ''}>${fmt(n.cost)} or</button>`;
        h += `</div>`;
      }
      h += `</div>`;
    }
  } else {
    h += `<div class="small" style="margin-bottom:6px">Les troupes tombées reviennent après chaque bataille. L'entraînement donne +10% de PV et de dégâts par niveau à une forme.</div>`;
    for (let t = 0; t < 7; t++) {
      if (!unlockedShape(t)) { h += `<div class="ncard lock"><div class="nic">${shapeSVG(t, '#8a7a55')}</div><div class="ntx"><b>${SHAPES[t].name}</b><div class="small">À débloquer dans l'arbre de compétences</div></div></div>`; continue; }
      const c = recruitCost(t), tl = trainLvl(t), tc = trainCost(t);
      h += `<div class="ncard own2"><div class="nic">${shapeSVG(t, TEAMCOL[0][t])}</div><div class="ntx"><b>${SHAPES[t].name}</b> <b>× ${fmt(S.owned[t])}</b> <span class="lvl">Nv ${tl}</span><div class="small">${SHAPES[t].role}</div>
        <div class="row" style="margin-top:6px"><span class="small gold">${c} or l'unité</span>${[1, 10, 100].map(a => `<button data-act="recruit" data-t="${t}" data-v="${a}" ${S.gold < a * c ? 'disabled' : ''}>+${a}</button>`).join('')}<button data-act="recruit" data-t="${t}" data-v="max" ${S.gold < c ? 'disabled' : ''}>Max</button></div>
        <div class="row" style="margin-top:6px"><button class="blue" data-act="train" data-t="${t}" ${S.gold < tc ? 'disabled' : ''}>Entraîner → Nv ${tl + 1} · ${fmt(tc)} or</button></div></div></div>`;
    }
  }
  h += `</div>`;
  const sc = $('#upgrades').scrollTop;
  $('#upgrades').innerHTML = h; $('#upgrades').scrollTop = sc;
}

// ---------------------------------------------------------------- préparation / bataille (HUD)
function renderTop() {
  if (screen !== 'setup' && screen !== 'battle') return;
  const cap = costCap(), cost = formationCost(0), over = cap && cost > cap;
  const camSeg = `<div class="seg">${['2d', '3d', 'fly'].map(m => `<button data-act="cam" data-v="${m}" class="${view.mode === m ? 'on' : ''}">${m === 'fly' ? 'FLY' : m.toUpperCase()}</button>`).join('')}</div>`;
  let h = `<button data-act="levelsbtn">◀ ${mode === 'sandbox' ? 'Menu' : 'NIVEAUX'}</button><span class="chip title">${level.name}</span>`;
  if (screen === 'setup') {
    if (mode !== 'sandbox') {
      // force estimée : valeur (coût) de ton armée améliorée vs celle de l'ennemi
      const up = mode === 'campaign' || mode === 'command', lm = 1 + .03 * ((level.id || 1) - 1);
      let mine = 0, foe = 0;
      for (const t of form[0].values()) { const st = playerStats(t, up); mine += SHAPES[t].cost * Math.sqrt(st.hp * st.dmg / (SHAPES[t].hp * SHAPES[t].dmg)); }
      if (kingKey >= 0) mine += SHAPES[0].cost * 9;
      for (const e of level.enemy) foe += SHAPES[e.t].cost * lm * (e.king ? 10 : 1);
      const ratio = foe ? mine / foe : 1, col = ratio >= 1.3 ? '#1f9d55' : ratio >= .9 ? '#c98a00' : '#d8343a';
      h += `<span class="chip" style="color:${col}" title="Force estimée de ton armée par rapport à l'ennemi">⚔ ${Math.round(ratio * 100)}%</span>`;
      h += `<span class="chip red">👥 ${kfmt(level.enemy.length)}</span>`;
    }
    else h += `<span class="chip">Bleus ${fmt(form[0].size)} · Rouges ${fmt(form[1].size)}</span>`;
    if (mode === 'campaign' || mode === 'command') h += `<span class="chip gold">${fmt(S.gold)} or</span>`;
  }
  h += `<span class="sp"></span><button data-act="mute">${sfx.muted ? '🔇' : '🔊'}</button>${camSeg}`;
  $('#top').innerHTML = h;
  const c = $('#cost'); if (c) c.classList.toggle('over', !!over);
}
function renderBottom() {
  if (screen === 'setup') {
    const c0 = counts(0), c1 = counts(1);
    let pal = '';
    for (let t = 0; t < 7; t++) {
      if (!shapeAvailable(t)) continue;
      const lim = armyLimit(t), team = mode === 'sandbox' ? brush.team : 0, used = (team ? c1 : c0)[t];
      const label = isFinite(lim) ? `${kfmt(used)}/${kfmt(lim)}` : kfmt(used);
      pal += `<button class="slot ${brush.t === t && !brush.erase ? 'on' : ''}" data-act="brush" data-v="${t}">${shapeSVG(t, brush.t === t && !brush.erase ? '#fffdf7' : TEAMCOL[team][t])}<span class="n">${label}</span></button>`;
    }
    pal += `<button class="slot ${brush.erase ? 'on' : ''}" data-act="erase">${shapeSVG(-1, brush.erase ? '#fffdf7' : '#23262d')}<span class="n">Gomme</span></button>`;
    let h = `<div class="panel pal">${pal}</div><div class="row">`;
    h += `<div class="seg">${[1, 3, 7, 8].map(s => `<button data-act="size" data-v="${s}" class="${brush.size === s ? 'on' : ''}">${s}×${s}</button>`).join('')}</div>`;
    h += `<div class="seg"><button data-act="order" data-v="0" class="${order === 0 ? 'on' : ''}">MARCHE</button><button data-act="order" data-v="1" class="${order === 1 ? 'on' : ''}">TENIR</button></div>`;
    if (mode === 'sandbox') h += `<div class="seg"><button data-act="team" data-v="0" class="${brush.team === 0 ? 'on' : ''}">Bleus</button><button data-act="team" data-v="1" class="${brush.team === 1 ? 'on' : ''}">Rouges</button></div>
      <div class="seg"><button data-act="ter" data-v="building" class="${brush.terrain === 'building' ? 'on' : ''}">🏠</button><button data-act="ter" data-v="tree" class="${brush.terrain === 'tree' ? 'on' : ''}">🌲</button><button data-act="ter" data-v="river" class="${brush.terrain === 'river' ? 'on' : ''}">〰</button><button data-act="ter" data-v="clear">✖</button></div>
      <button data-act="sbsave">Sauver</button><button data-act="sbload">Charger</button>`;
    h += `<button data-act="undo">ANNULER</button><button data-act="clear">EFFACER</button><button data-act="auto">AUTO</button>`;
    if (mode === 'campaign' || mode === 'command') h += `<button class="blue" data-act="upgrades">AMÉLIORATIONS</button>`;
    const cap = costCap(), over = cap && formationCost(0) > cap;
    h += `<span style="flex:1"></span><button class="go" data-act="fight" ${over ? 'disabled' : ''}>COMBATTRE</button></div>`;
    if (has('king') && (mode === 'campaign' || mode === 'command') && kingKey < 0) h += `<div class="small" style="background:#fffdf7cc;border-radius:6px;padding:2px 6px;align-self:flex-start">♛ Touche deux fois un Cercle pour le couronner.</div>`;
    $('#bottom').innerHTML = h;
  } else if (screen === 'battle') {
    let h = `<div class="panel" style="padding:8px"><div class="row"><b class="blue-t" id="nB"></b><div id="bar"><i id="bB" style="background:#3b78e7"></i><i id="bR" style="background:#e5484d"></i></div><b class="red" id="nR"></b></div>`;
    h += `<div class="row" style="margin-top:6px"><div class="seg">${[[0, '⏸'], [.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×']].map(([v, l]) => `<button data-act="speed" data-v="${v}" class="${speed === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    if (mode === 'command' || mode === 'sandbox') {
      h += `<div class="seg"><button data-act="liveorder" data-v="0">MARCHE</button><button data-act="liveorder" data-v="1">TENIR</button></div>`;
      h += `<button data-act="power" data-v="volley" id="pV"></button><button data-act="power" data-v="rally" id="pR"></button>`;
    }
    h += `<span style="flex:1"></span><span class="small" id="tm"></span><button data-act="retreat">Retraite</button></div></div>`;
    if (sim && sim.kings.length) h = sim.kings.map(k => `<div class="panel bossbar"><b>${sim.team[k] ? '♛ Roi ennemi' : '♛ Ton Roi'}</b><div class="hpb"><i id="kb${k}" style="background:${sim.team[k] ? '#e5484d' : '#f5c542'}"></i></div></div>`).join('') + h;
    $('#bottom').innerHTML = h; updateBattleHud();
  }
}
function updateBattleHud() {
  if (!sim || screen !== 'battle') return;
  const a = sim.aliveC[0], b = sim.aliveC[1];
  $('#nB').textContent = fmt(a); $('#nR').textContent = fmt(b);
  for (const k of sim.kings) { const el = $('#kb' + k); if (el) el.style.width = Math.max(0, 100 * sim.hp[k] / sim.maxHp[k]) + '%'; }
  $('#bB').style.width = (100 * a / Math.max(1, a + b)) + '%'; $('#bR').style.width = (100 * b / Math.max(1, a + b)) + '%';
  $('#tm').textContent = (mode === 'campaign' || mode === 'command' ? '+' + fmt(sim.gold * goldMul()) + ' or · ' : '') + Math.floor(sim.time) + ' s';
  const pV = $('#pV'), pR = $('#pR');
  if (pV) { const r = sim.time >= volleyReady; pV.disabled = !r; pV.classList.toggle('on', power === 'volley'); pV.textContent = power === 'volley' ? '🎯 Touche la carte' : r ? '🏹 Pluie' : '🏹 ' + Math.ceil(volleyReady - sim.time) + 's'; }
  if (pR) { const r = sim.time >= rallyReady; pR.disabled = !r; pR.textContent = r ? '🚩 Ralliement' : '🚩 ' + Math.ceil(rallyReady - sim.time) + 's'; }
}

// ---------------------------------------------------------------- résultat
function renderResult() {
  const r = result, camp = mode === 'campaign' || mode === 'command';
  let h = `<div class="panel"><h2 style="color:${r.win ? '#2c64cf' : '#d8343a'}">${mode === 'sandbox' ? (r.win ? 'VICTOIRE BLEUE' : 'VICTOIRE ROUGE') : r.win ? 'VICTOIRE' : 'DÉFAITE'}</h2>`;
  if (mode !== 'sandbox') h += `<div class="badges"><span class="badge ${r.win ? 'got' : ''}">✔ VICTOIRE</span><span class="badge ${r.rating >= 2 ? 'got' : ''}">◆ DÉCISIVE</span><span class="badge ${r.rating >= 3 ? 'got' : ''}">★ HÉROÏQUE</span></div>`;
  h += `<table class="tbl"><tr><td>Ennemis éliminés</td><td>${fmt(r.killed)} / ${fmt(r.enemies)}</td></tr><tr><td>Pertes</td><td>${fmt(r.lost)} / ${fmt(r.army)} (${Math.round(100 * r.lost / Math.max(1, r.army))}%)</td></tr><tr><td>Durée</td><td>${Math.round(r.time)} s</td></tr>`;
  if (camp) {
    h += `<tr><td>Or des ennemis vaincus</td><td class="gold">+${fmt(r.gKills)}</td></tr>`;
    if (r.gWin) h += `<tr><td>Victoire${r.first ? '' : ' (rejouée)'}</td><td class="gold">+${fmt(r.gWin)}</td></tr>`;
    if (r.gRate) h += `<tr><td>Nouvelle note</td><td class="gold">+${fmt(r.gRate)}</td></tr>`;
    h += `<tr><td><b>Total</b></td><td class="gold">+${fmt(r.gKills + r.gWin + r.gRate)} or</td></tr>`;
  }
  h += `</table>`;
  const rows = r.by.map((v, t) => v[0] ? `<div class="byrow">${shapeSVG(t, TEAMCOL[0][t])}<span>${SHAPES[t].name}</span><div class="hpb"><i style="width:${100 * (v[0] - v[1]) / v[0]}%;background:${TEAMCOL[0][t]}"></i></div><b>${fmt(v[0] - v[1])}/${fmt(v[0])}</b></div>` : '').join('');
  if (rows) h += `<div class="small" style="text-align:left;margin-top:4px">Survivants par forme</div>${rows}`;
  if (camp && !r.win) h += `<p class="small">Tes troupes tombées reviennent. Recrute, améliore et réessaie !</p>`;
  h += `<div class="row" style="justify-content:center">`;
  if (mode === 'sandbox') h += `<button class="blue" data-act="again">Retour à l'éditeur</button>`;
  else {
    h += `<button data-act="levelsbtn">NIVEAUX</button><button data-act="again">Rejouer</button>`;
    if (camp) h += `<button class="blue" data-act="upgrades">AMÉLIORATIONS</button>`;
    if (r.win && levelList().some(l => l.id === level.id + 1)) h += `<button class="go" data-act="nextlevel">Suivant ▶</button>`;
  }
  h += `</div></div>`;
  $('#result').innerHTML = h;
}

function banner(txt, cls = '') {
  const el = document.createElement('div'); el.className = 'banner ' + cls; el.textContent = txt;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1700);
}
let toastT = 0;
function toast(m) { const t = $('#toast'); t.textContent = m; t.style.opacity = 1; toastT = 2.8; }

// ============================================================================ flux de jeu
function openLevel(L) {
  quality.big = false; applyQuality();
  level = L; undoStack = []; result = null; sim = null; power = null;
  if (mode === 'sandbox') {
    form[0].clear(); form[1].clear(); kingKey = -1;
  } else {
    restoreFormation();
    form[1].clear();
  }
  buildTerrainMeshes(level.terrain);
  formDirty = true;
  if (!shapeAvailable(brush.t)) brush.t = [0, 1, 2, 3, 4, 5, 6].find(shapeAvailable) ?? 0;
  brush.erase = false; brush.terrain = null;
  frameArmies(true);
  show('setup');
  if (mode === 'campaign' && level.id === 1 && !S.ratings.campaign[1]) toast('Peins tes troupes dans la zone bleue, choisis MARCHE ou TENIR, puis COMBATTRE !');
}
function startLevel(id) {
  const L = levelList().find(l => l.id === id); if (!L) return;
  openLevel(L.mk());
}
function sandboxLevel() {
  const t = S.sandbox ? S.sandbox.terrain : emptyTerrain();
  return { id: 0, name: 'Bac à sable', terrain: t, enemy: [], enemyOrder: 'march', cap: 0 };
}

function fight() {
  const cap = costCap();
  if (cap && formationCost(0) > cap) { toast('Ton armée dépasse le plafond de coût !'); return; }
  if (!form[0].size) { toast('Peins au moins une unité !'); return; }
  const enemyCount = mode === 'sandbox' ? form[1].size : level.enemy.length;
  if (!enemyCount) { toast('Il n\'y a aucun ennemi.'); return; }
  storeFormation();
  sim = new Sim(form[0].size + enemyCount, level.terrain);
  const upgraded = mode === 'campaign' || mode === 'command';
  const ps = SHAPES.map((s, t) => playerStats(t, upgraded));
  for (const [k, t] of form[0]) sim.add(cellX(k), cellZ(k), t, order, 0, ps[t], 0, k === kingKey);
  const lm = mode === 'sandbox' ? 1 : 1 + .03 * ((level.id || 1) - 1);
  const es = SHAPES.map(s => Object.assign({}, s, { hp: s.hp * lm, dmg: s.dmg * lm }));
  const eo = level.enemyOrder === 'hold' ? 1 : 0;
  if (mode === 'sandbox') for (const [k, t] of form[1]) sim.add(cellX(k), cellZ(k), t, eo, 1, es[t], 0, false);
  else for (const e of level.enemy) sim.add(e.x, e.z, e.t, eo, 1, es[e.t], SHAPES[e.t].reward, !!e.king);
  // formes rencontrées (débloquées dans le bac à sable)
  if (mode !== 'sandbox') for (const e of level.enemy) if (!S.seen.includes(e.t)) S.seen.push(e.t);
  speed = S.speed || 1; power = null; volleyReady = 0; rallyReady = 0; P.n = 0;
  setUnitShadows(sim.n < 2500 && quality.level === 0);
  quality.big = sim.n > 12000; applyQuality();
  if (form[0].size >= 10000) unlockAch('tenk');
  show('battle'); sfx.march(); autoCam = true;
  banner(mode === 'sandbox' ? 'COMBAT !' : order === 1 ? 'TENEZ LA LIGNE !' : 'EN AVANT, MARCHE !');
  if (view.mode === '2d') { /* garde la vue */ }
}
function endBattle() {
  const win = sim.winner === 0;
  const army = sim.startC[0], lost = sim.startC[0] - sim.aliveC[0];
  const r = { win, army, lost, enemies: sim.startC[1], killed: sim.startC[1] - sim.aliveC[1], time: sim.time, rating: 0, gKills: 0, gWin: 0, gRate: 0, first: false, by: [] };
  // pertes par forme (camp bleu)
  for (let t = 0; t < 7; t++) r.by[t] = [0, 0];
  for (let i = 0; i < sim.n; i++) if (sim.team[i] === 0) { r.by[sim.type[i]][0]++; if (!sim.alive[i]) r.by[sim.type[i]][1]++; }
  if (win) r.rating = lost / army < .1 ? 3 : lost / army < .35 ? 2 : 1;
  if (mode !== 'sandbox') {
    const R = S.ratings[mode], prev = R[level.id] || 0;
    if (mode === 'campaign' || mode === 'command') {
      const n = level.id, gm = goldMul();
      r.gKills = Math.round(sim.gold * gm);
      if (win) { r.first = prev === 0; r.gWin = Math.round((25 + 8 * n * Math.pow(1.07, n)) * gm * (r.first ? 1 : .3)); }
      for (let q = prev + 1; q <= r.rating; q++) if (q >= 2) r.gRate += Math.round((30 + 10 * n * Math.pow(1.06, n)) * gm * (q === 3 ? 1.5 : 1));
      S.gold += r.gKills + r.gWin + r.gRate;
    }
    if (r.rating > prev) R[level.id] = r.rating;
    save();
    if (win) {
      if ((mode === 'campaign' || mode === 'command') && level.id === 1) unlockAch('first');
      if (mode === 'campaign' && counts(0).filter(c => c > 0).length >= 5) unlockAch('combined');
      if (sim.kings.some(k => sim.team[k] === 0 && sim.alive[k])) unlockAch('king');
      if (r.rating === 3) unlockAch('heroic');
      if (level.boss) unlockAch('boss');
      if ((mode === 'campaign' || mode === 'command') && level.id === 50) unlockAch('end');
    }
  }
  result = r;
  banner(mode === 'sandbox' ? (win ? 'VICTOIRE BLEUE' : 'VICTOIRE ROUGE') : win ? 'VICTOIRE !' : 'DÉFAITE', win ? 'win' : 'lose');
  if (win) sfx.win(); else sfx.lose();
  screen = 'ending';
  setTimeout(() => { if (result === r) show('result'); }, 1100);
}

// ============================================================================ entrées
let autoCam = true;
const ptrs = new Map(); let gesture = null, painting = false, stroke = null, panning = false, lastStamp = null, lastTap = { t: 0, k: -1 };
let mouseIn = false, mouseP = { x: 0, y: 0 };
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  if (screen === 'battle') autoCam = false;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  mouseP = { x: e.clientX, y: e.clientY }; mouseIn = true;
  if (ptrs.size === 1) {
    const g = groundAt(e.clientX, e.clientY);
    if (e.button === 1 || (view.mode === 'fly' && screen !== 'setup')) { panning = true; return; }
    if (screen === 'setup' && view.mode !== 'fly' && g) {
      if (brush.terrain) { editTerrain(g.x, g.z); return; }
      // double tap sur un cercle -> couronne
      const now = performance.now(), k = nearestCircle(g.x, g.z);
      if (has('king') && (mode === 'campaign' || mode === 'command') && k >= 0) {
        if (lastTap.k === k && now - lastTap.t < 500) { kingKey = kingKey === k ? -1 : k; formDirty = true; if (kingKey === k) sfx.crown(); toast(kingKey === k ? '♛ Le Roi est couronné : x10 PV et dégâts, alliés proches +30% vitesse.' : 'Couronne retirée.'); renderBottom(); renderTop(); lastTap = { t: 0, k: -1 }; return; }
        lastTap = { t: now, k };
      }
      painting = true; stroke = []; const wasErase = brush.erase; if (e.button === 2) brush.erase = true;
      stamp(g.x, g.z, stroke); lastStamp = g; brush._restore = !wasErase && e.button === 2; formDirty = true;
      return;
    }
    if (screen === 'battle' && power === 'volley' && g) { castVolley(g.x, g.z); return; }
    panning = true;
  } else {
    if (painting) endStroke();
    painting = false; panning = false; startGesture();
  }
});
canvas.addEventListener('pointermove', e => {
  mouseP = { x: e.clientX, y: e.clientY }; mouseIn = true;
  const p = ptrs.get(e.pointerId); if (!p) return;
  const prev = { x: p.x, y: p.y }; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size >= 2 && gesture) {
    const [a, b] = [...ptrs.values()]; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), ang = Math.atan2(b.y - a.y, b.x - a.x);
    if (view.mode === 'fly') { view.fyaw += (mx - gesture.mx) * .004; view.fpitch = clamp(view.fpitch - (my - gesture.my) * .004, -1.4, 1.2); zoomBy(d / gesture.d); }
    else {
      panBy({ x: gesture.mx, y: gesture.my }, { x: mx, y: my }); zoomBy(d / gesture.d);
      if (view.mode === '3d') { let da = ang - gesture.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; view.yaw -= da; updateCam(); }
    }
    gesture = { mx, my, d, ang };
  } else if (painting) {
    const g = groundAt(e.clientX, e.clientY); if (!g) return;
    // interpole pour un trait continu
    const dx = g.x - lastStamp.x, dz = g.z - lastStamp.z, dist = Math.hypot(dx, dz), step = Math.max(CELL, brush.size * CELL * .5);
    const n = Math.ceil(dist / step);
    for (let i = 1; i <= n; i++) stamp(lastStamp.x + dx * i / n, lastStamp.z + dz * i / n, stroke);
    lastStamp = g; formDirty = true;
  } else if (panning) {
    if (view.mode === 'fly') { view.fyaw += (p.x - prev.x) * .005; view.fpitch = clamp(view.fpitch - (p.y - prev.y) * .005, -1.4, 1.2); updateCam(); }
    else panBy(prev, p);
  }
});
// cercle bleu le plus proche du doigt (tolérance d'un peu plus d'une case)
function nearestCircle(x, z) {
  const [cx, cz] = toCell(x, z); let best = -1, bd = 1e9;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const k = cellKey(cx + dx, cz + dz); if (form[0].get(k) !== 0) continue;
    const d = (cellX(k) - x) ** 2 + (cellZ(k) - z) ** 2; if (d < bd) { bd = d; best = k; }
  }
  return best;
}
function endStroke() {
  if (stroke && stroke.length) undoStack.push(stroke);
  if (brush._restore) { brush.erase = false; brush._restore = false; }
  stroke = null; renderBottom(); renderTop();
}
const endPtr = e => {
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) gesture = null;
  if (ptrs.size === 0) { if (painting) endStroke(); painting = false; panning = false; if (e.pointerType !== 'mouse') mouseIn = false; }
};
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouseIn = false; });
function startGesture() { const [a, b] = [...ptrs.values()]; gesture = { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), ang: Math.atan2(b.y - a.y, b.x - a.x) }; }
canvas.addEventListener('wheel', e => { e.preventDefault(); autoCam = false; zoomBy(Math.pow(1.0015, -e.deltaY)); }, { passive: false });
// iPhone : empêche Safari de zoomer / faire défiler la page à la place du jeu
canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
const keys = new Set();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys.add(k);
  if (screen === 'setup') {
    if ('1234567'.includes(k)) { const t = +k - 1; if (shapeAvailable(t)) { brush.t = t; brush.erase = false; renderBottom(); } }
    if (k === 'z' && (e.ctrlKey || e.metaKey)) undo();
  }
  if (screen === 'battle' && k === ' ') { speed = speed ? 0 : 1; renderBottom(); e.preventDefault(); }
  if (k === 'c' && (screen === 'setup' || screen === 'battle')) setCamMode({ '2d': '3d', '3d': 'fly', 'fly': '2d' }[view.mode]);
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function editTerrain(x, z) {
  const t = level.terrain;
  if (brush.terrain === 'building') t.buildings.push({ x, z, w: 5, h: 5, hgt: 3 });
  else if (brush.terrain === 'tree') t.trees.push({ x, z });
  else if (brush.terrain === 'river') { t.rivers = [{ z0: z - 3, z1: z + 3, gaps: [[-HW / 2 - 3, -HW / 2 + 3], [HW / 2 - 3, HW / 2 + 3]] }]; }
  // retire les unités devenues bloquées
  for (const F of form) for (const k of [...F.keys()]) if (cellBlocked(t, cellX(k), cellZ(k))) F.delete(k);
  buildTerrainMeshes(t); formDirty = true;
}

function castVolley(x, z) {
  sim.volley(x, z, 7, 9, 110); sfx.volley(); volleyReady = sim.time + 14; power = null; targetRing.visible = false; updateBattleHud();
}

// ============================================================================ clics sur l'interface
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, v = b.dataset.v;
  if (act !== 'fight') sfx.click();
  switch (act) {
    case 'mode':
      mode = v;
      if (mode === 'sandbox') { const L = sandboxLevel(); openLevel(L); if (S.sandbox) loadSandbox(); return; }
      show('levels'); return;
    case 'menu': show('menu'); return;
    case 'help': renderHelp(); return;
    case 'upgrades': if (screen === 'setup') storeFormation(); upgradesFrom = screen; upTab = 0; show('upgrades'); $('#upgrades').scrollTop = 0; return;
    case 'tocampaign': if (mode !== 'campaign' && mode !== 'command') mode = 'campaign'; show('levels'); return;
    case 'backlevel': if (level && mode !== 'sandbox') { openLevel(level); return; } show('levels'); return;
    case 'uptab': upTab = +v; renderUpgrades(); return;
    case 'train': { const t = +b.dataset.t, c = trainCost(t); if (S.gold >= c) { S.gold -= c; S.train = S.train || [0, 0, 0, 0, 0, 0, 0]; S.train[t] = trainLvl(t) + 1; save(); sfx.buy(); toast(SHAPES[t].name + ' : niveau ' + S.train[t] + ' !'); } renderUpgrades(); return; }
    case 'level': startLevel(+v); return;
    case 'levelsbtn': if (screen === 'setup') storeFormation(); if (mode === 'sandbox') { show('menu'); return; } show('levels'); return;
    case 'buynode': { const n = NODE_BY_ID[v]; if (!has(v) && n.pre.every(has) && S.gold >= n.cost) { S.gold -= n.cost; S.nodes[v] = 1; save(); checkTreeAch(); sfx.buy(); if (n.unlock) toast('Nouvelle forme : ' + SHAPES[SHAPE_IDX[n.unlock]].name + ' ! Recrute-en à droite.'); } renderUpgrades(); return; }
    case 'recruit': { const t = +b.dataset.t, c = recruitCost(t); let a = v === 'max' ? Math.floor(S.gold / c) : +v; a = Math.min(a, Math.floor(S.gold / c)); if (a > 0) { S.gold -= a * c; S.owned[t] += a; save(); sfx.buy(); } renderUpgrades(); return; }
    case 'cam': setCamMode(v); return;
    case 'brush': brush.t = +v; brush.erase = false; brush.terrain = null; renderBottom(); return;
    case 'erase': brush.erase = !brush.erase; brush.terrain = null; renderBottom(); return;
    case 'size': brush.size = +v; renderBottom(); return;
    case 'order': order = +v; renderBottom(); return;
    case 'team': brush.team = +v; renderBottom(); return;
    case 'ter': if (v === 'clear') { level.terrain = emptyTerrain(); buildTerrainMeshes(level.terrain); brush.terrain = null; } else brush.terrain = brush.terrain === v ? null : v; renderBottom(); return;
    case 'sbsave': S.sandbox = { terrain: level.terrain, a: [[...form[0].keys()], [...form[0].values()]], b: [[...form[1].keys()], [...form[1].values()]] }; save(); toast('Carte sauvegardée.'); return;
    case 'sbload': if (S.sandbox) { loadSandbox(); toast('Carte chargée.'); } else toast('Aucune carte sauvegardée.'); return;
    case 'undo': undo(); return;
    case 'clear': clearForm(); return;
    case 'auto': if (mode === 'sandbox') { sandboxAuto(); } else { autoFill(); } renderBottom(); renderTop(); return;
    case 'fight': fight(); return;
    case 'mute': sfx.toggle(); b.textContent = sfx.muted ? '🔇' : '🔊'; return;
    case 'speed': speed = +v; if (speed > 0) { S.speed = speed; save(); } renderBottom(); return;
    case 'liveorder': sim.setOrder(0, +v); toast(+v ? 'Toute l\'armée TIENT sa position.' : 'Toute l\'armée MARCHE !'); return;
    case 'power':
      if (v === 'volley') { power = power === 'volley' ? null : 'volley'; if (power) toast('Touche la zone à bombarder.'); }
      else { sim.rally(5); rallyReady = sim.time + 22; toast('Ralliement ! +60% vitesse.'); sfx.rally(); }
      updateBattleHud(); return;
    case 'retreat': sim.finished = true; sim.winner = 1; return;
    case 'again': { const L = level; if (mode === 'sandbox') { show('setup'); formDirty = true; return; } startLevel(L.id); return; }
    case 'nextlevel': startLevel(level.id + 1); return;
  }
});
let upgradesFrom = 'levels';
function loadSandbox() {
  const sb = S.sandbox; level.terrain = sb.terrain || emptyTerrain(); buildTerrainMeshes(level.terrain);
  form[0].clear(); form[1].clear();
  sb.a[0].forEach((k, i) => form[0].set(k, sb.a[1][i])); sb.b[0].forEach((k, i) => form[1].set(k, sb.b[1][i]));
  formDirty = true; renderBottom(); renderTop();
}
function sandboxAuto() {
  const tm = brush.team, n = 2000, t = brush.t;
  const width = 90, zStart = tm === 0 ? DEPLOY_MIN_Z + .25 : ENEMY_MAX_Z - .25;
  let placed = 0;
  for (let row = 0; placed < n && row < 100; row++) for (let col = 0; col < width && placed < n; col++) {
    const x = (col - (width - 1) / 2) * CELL, z = zStart + (tm === 0 ? 1 : -1) * row * CELL;
    const [gx, gz] = toCell(x, z), k = cellKey(gx, gz);
    if (form[tm].has(k) || !zoneOk(tm, cellX(k), cellZ(k))) continue;
    form[tm].set(k, t); placed++;
  }
  formDirty = true;
}

// ============================================================================ rendu par image
function drawFormation() {
  for (const g of allGroups) g.begin(); P.n = 0;
  setUnitShadows(form[0].size + form[1].size + (level ? level.enemy.length : 0) < 2500 && quality.level === 0);
  for (const tm of [0, 1]) {
    for (const [k, t] of form[tm]) {
      const r = SHAPES[t].r, x = cellX(k), z = cellZ(k), hz = tm === 0 ? -1 : 1;
      if (tm === 0 && k === kingKey) { kingGroup[0].push(x, 0, z, 0, hz, r * 2.2, r * 3.2); crownGroup.push(x, r * 3.2, z, 0, -1, r * 1.3, r * 1.6); continue; }
      groups[tm][t].push(x, 0, z, 0, hz, r, r * 1.6);
    }
  }
  if (mode !== 'sandbox' && level) for (const e of level.enemy) {
    const r = SHAPES[e.t].r;
    if (e.king) { kingGroup[1].push(e.x, 0, e.z, 0, 1, r * 2.2, r * 3.2); crownGroup.push(e.x, r * 3.2, e.z, 0, 1, r * 1.3, r * 1.6); }
    else groups[1][e.t].push(e.x, 0, e.z, 0, 1, r, r * 1.6);
  }
  for (const g of allGroups) g.end();
}
const TEAMHEX = [0x3b78e7, 0xe5484d];
function drawSim(dt) {
  for (const g of allGroups) g.begin();
  const s = sim, n = s.n, now = s.time;
  // éclats des unités tombées
  if (s !== demo) { sfx.clash(s.events.length); sfx.arrows(Math.max(0, s.pn - (s._pn || 0))); s._pn = s.pn; }
  if (s.events.length) {
    if (s !== demo) for (const i of s.events) if (s.king[i]) sfx.kingDown();
    const per = s.events.length > 300 ? 1 : s.events.length > 60 ? 2 : 4;
    for (const i of s.events) burst(s.x[i], s.z[i], s.king[i] ? 0xffd84a : TEAMHEX[s.team[i]], s.king[i] ? 40 : per, s.king[i] ? .18 : .08 + s.r[i] * .15);
    s.events.length = 0;
  }
  if (s.impacts.length) { for (let j = 0; j < s.impacts.length; j += 2) burst(s.impacts[j], s.impacts[j + 1], 0xcbb88a, 3, .07, 2); s.impacts.length = 0; }
  stepParticles(dt);
  for (let i = 0; i < n; i++) {
    const r = s.r[i];
    if (s.alive[i]) {
      const tm = s.team[i], ht = now - s.hitT[i];
      const light = ht < .1 ? .85 : ht < .2 ? .4 : -(1 - s.hp[i] / s.maxHp[i]) * .4;
      const sq = ht < .12 ? 1.2 : 1;   // petit écrasement quand l'unité est touchée
      const v = Math.abs(s.vx[i]) + Math.abs(s.vz[i]);
      const bob = v > .4 ? Math.abs(Math.sin(now * 13 + i * 1.7)) * r * .35 : 0;
      if (s.king[i]) { kingGroup[tm].push(s.x[i], bob, s.z[i], s.hx[i], s.hz[i], r, r * 1.45 / sq, light); crownGroup.push(s.x[i], r * 1.45 / sq + bob, s.z[i], s.hx[i], s.hz[i], r * .6, r * .75); }
      else groups[tm][s.type[i]].push(s.x[i], bob, s.z[i], s.hx[i], s.hz[i], r * (sq > 1 ? 1.08 : 1), r * 1.6 / sq, light);
    } else {
      const age = now - s.deathT[i];
      if (age < 3) corpseGroup[s.team[i]].push(s.x[i], 0, s.z[i], 0, 1, r * (1 - age / 6), .03, -age * .15);
    }
  }
  for (let p = 0; p < s.pn; p++) {
    const dx = s.tx[p] - s.px[p], dz = s.tz[p] - s.pz[p], d = Math.hypot(dx, dz) + 1e-5;
    const f = 1 - clamp(d / s.pd0[p], 0, 1), y = .4 + s.parc[p] * s.pd0[p] * 4 * f * (1 - f);
    projGroup.push(s.px[p], y, s.pz[p], dx / d, dz / d, 1, 1);
  }
  drawParticles();
  for (const g of allGroups) g.end();
}

// ---------------------------------------------------------------- bataille de démonstration derrière le menu
let demo = null;
function startDemo() {
  const L = campaignLevel(12); buildTerrainMeshes(L.terrain);
  demo = new Sim(800, L.terrain); sim = null;
  for (let i = 0; i < 400; i++) { const t = [0, 0, 0, 1, 2, 5, 6][i % 7]; const x = -25 + (i % 100) * .5, z = 8 + Math.floor(i / 100) * .5; if (!cellBlocked(L.terrain, x, z)) demo.add(x, z, t, 0, 0, SHAPES[t], 0); }
  for (let i = 0; i < 400; i++) { const t = [0, 0, 1, 3, 2, 5, 6][i % 7]; const x = -25 + (i % 100) * .5, z = -8 - Math.floor(i / 100) * .5; if (!cellBlocked(L.terrain, x, z)) demo.add(x, z, t, 0, 1, SHAPES[t], 0); }
  view.mode = '3d'; view.tx = 0; view.tz = 0; view.dist = 58; view.pitch = .62; view.yaw = .4; updateCam();
  P.n = 0; setUnitShadows(true);
}

let last = performance.now(), hudT = 0;
function frame(now) {
  const frameMs = now - last; const dt = Math.min(.1, frameMs / 1000); last = now;
  if (screen === 'battle' || screen === 'setup' || screen === 'menu') trackQuality(Math.min(frameMs, 100));
  // clavier : déplacement caméra
  let kx = 0, kz = 0;
  if (keys.has('w') || keys.has('z') || keys.has('arrowup')) kz -= 1;
  if (keys.has('s') || keys.has('arrowdown')) kz += 1;
  if (keys.has('a') || keys.has('q') || keys.has('arrowleft')) kx -= 1;
  if (keys.has('d') || keys.has('arrowright')) kx += 1;
  if ((kx || kz) && (screen === 'setup' || screen === 'battle')) {
    if (view.mode === 'fly') { const sp = 30 * dt * (keys.has('shift') ? 3 : 1); view.fx += (Math.sin(view.fyaw) * -kz + Math.cos(view.fyaw) * kx) * sp; view.fz += (-Math.cos(view.fyaw) * -kz + Math.sin(view.fyaw) * kx) * sp; updateCam(); }
    else { const cx = VW / 2, cy = VH / 2, sp = 600 * dt; panBy({ x: cx, y: cy }, { x: cx - kx * sp, y: cy - kz * sp }); }
  }
  if (view.mode === '3d' && (keys.has('e') || keys.has('r'))) { view.yaw += (keys.has('e') ? 1 : -1) * dt; updateCam(); }

  if (screen === 'menu' && demo) {
    demo.step(Math.min(dt, 1 / 30));
    if (demo.finished) startDemo();
    const keep = sim; sim = demo; drawSim(dt); sim = keep;
    view.yaw += dt * .06; updateCam();
  } else if (screen === 'battle' && sim) {
    if (speed > 0) {
      // pas fixes, avec budget de temps pour rester fluide sur mobile
      let acc = dt * speed; const t0 = performance.now();
      while (acc > 1e-4 && !sim.finished) { const h = Math.min(acc, sim.an > 15000 ? 1 / 18 : sim.an > 6000 ? 1 / 24 : 1 / 30); sim.step(h); acc -= h; if (performance.now() - t0 > 22) break; }
    }
    drawSim(speed > 0 ? dt * speed : 0);
    // caméra auto : suit la ligne de front tant que le joueur ne touche pas l'écran
    if (autoCam && view.mode !== 'fly' && sim.aliveC[0] && sim.aliveC[1]) {
      const mx = (sim.cen[0][0] + sim.cen[1][0]) / 2, mz = (sim.cen[0][1] + sim.cen[1][1]) / 2, k = Math.min(1, dt * .8);
      view.tx += (mx - view.tx) * k; view.tz += (mz + (view.mode === '2d' && portrait ? view.zoom * VH / VW * .06 : 0) - view.tz) * k; updateCam();
    }
    hudT -= dt; if (hudT <= 0) { hudT = .2; updateBattleHud(); }
    if (sim.finished) endBattle();
  } else if ((screen === 'ending' || screen === 'result') && sim) {
    // fin de bataille : on laisse retomber les éclats au ralenti
    drawSim(dt * .4);
  } else if (screen === 'setup' || screen === 'result') {
    if (formDirty && screen === 'setup') { drawFormation(); formDirty = false; }
  }
  // aperçu de la brosse / zone du pouvoir
  brushMesh.visible = false; targetRing.visible = false;
  if (mouseIn && (screen === 'setup' || screen === 'battle')) {
    const g = groundAt(mouseP.x, mouseP.y);
    if (g && screen === 'setup' && view.mode !== 'fly' && !brush.terrain) {
      const [cx, cz] = toCell(g.x, g.z), n = brush.size, h = Math.floor((n - 1) / 2);
      const x0 = (cx - h) * CELL - HW, z0 = (cz - h) * CELL - HH;
      brushMesh.scale.set(n * CELL, 1, n * CELL); brushMesh.position.set(x0 + n * CELL / 2, .06, z0 + n * CELL / 2);
      brushMesh.material.color.set(brush.erase ? '#d8343a' : '#23262d'); brushMesh.visible = true;
    }
    if (g && screen === 'battle' && power === 'volley') { targetRing.position.set(g.x, .07, g.z); targetRing.visible = true; }
  }
  waterTex.offset.x += dt * .03; waterTex.offset.y = Math.sin(now / 1400) * .05;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').style.opacity = 0; }
  // les écrans Niveaux / Améliorations sont opaques : inutile de dessiner la 3D derrière (batterie)
  if (screen !== 'levels' && screen !== 'upgrades' && !(screen === 'menu' && $('#menu').querySelector('.uphead'))) renderer.render(scene, activeCam());
  requestAnimationFrame(frame);
}

// ============================================================================ démarrage
addEventListener('resize', () => { const was = portrait; resize(); if (was !== portrait && (screen === 'setup' || screen === 'battle') && view.mode !== 'fly') frameArmies(false); });
resize();
// décor du menu : une petite bataille de démonstration en fond
level = campaignLevel(1); buildTerrainMeshes(level.terrain);
show('menu');
requestAnimationFrame(frame);
if ('serviceWorker' in navigator) {
  // quand une nouvelle version du jeu est installée, on recharge une fois pour l'utiliser tout de suite
  let reloaded = false;
  if (navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js?v=' + GAME_VERSION, { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
}
window.__wmao = { stampAt: (x, z) => { const st = []; stamp(x, z, st); }, drawSimOnly: () => drawSim(0), get kingKey() { return kingKey; }, proj: (x, z) => { const v = new THREE.Vector3(x, 0, z).project(activeCam()); return [Math.round((v.x + 1) / 2 * VW), Math.round((1 - v.y) / 2 * VH)]; }, groups, S, get sim() { return sim; }, get screen() { return screen; }, form, startLevel, setMode: m => mode = m, fight, view };
