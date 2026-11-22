// ============================================================================
// We March as One — données : formes, arbre d'améliorations, niveaux
// ============================================================================

export const CELL = 0.5;          // taille d'une case de peinture (une unité par case)
export const MAP_W = 100;         // largeur du terrain (x)
export const MAP_H = 140;         // hauteur du terrain (z) — rouges en haut (z<0), bleus en bas (z>0)
export const HW = MAP_W / 2, HH = MAP_H / 2;
export const MAX_TROOPS = 30000;
export const DEPLOY_MIN_Z = 6;    // la zone bleue commence ici
export const ENEMY_MAX_Z = -6;

// Les 7 formes. Les stats sont cachées dans le vrai jeu : valeurs maison, rôles fidèles.
export const SHAPES = [
  { id: 'circle',   name: 'Cercle',    role: 'Infanterie de ligne : remplit le front et encaisse le premier choc.',
    hp: 10, dmg: 2.0, range: 0.12, speed: 3.0, cd: 0.8, r: 0.23, cost: 10, reward: 3 },
  { id: 'square',   name: 'Carré',     role: "Ancre : lent et robuste, tient un flanc ou un pont et absorbe les charges.",
    hp: 34, dmg: 2.0, range: 0.12, speed: 2.0, cd: 0.9, r: 0.24, cost: 25, reward: 8 },
  { id: 'triangle', name: 'Triangle',  role: 'Briseur : frappe fort pour percer une ligne, mais fragile dans la durée.',
    hp: 8,  dmg: 6.5, range: 0.12, speed: 3.5, cd: 0.9, r: 0.22, cost: 25, reward: 8 },
  { id: 'diamond',  name: 'Losange',   role: 'Liaison : rapide et bon marché, comble les trous entre les blocs.',
    hp: 9,  dmg: 2.6, range: 0.12, speed: 4.8, cd: 0.7, r: 0.21, cost: 15, reward: 5 },
  { id: 'pentagon', name: 'Pentagone', role: "Ancre de flanc : très cher, tient seul une voie de côté.",
    hp: 80, dmg: 7.5, range: 0.15, speed: 2.4, cd: 1.0, r: 0.30, cost: 90, reward: 27 },
  { id: 'hexagon',  name: 'Hexagone',  role: 'Écran : tire de loin et interdit une zone, mais ne tient pas seul.',
    hp: 7,  dmg: 2.4, range: 9.0,  speed: 2.6, cd: 1.4, r: 0.23, cost: 35, reward: 10, ranged: true, pspeed: 18 },
  { id: 'rhombus',  name: 'Rhombe',    role: 'Remplissage : très bon marché, idéal dans les couloirs étroits.',
    hp: 6,  dmg: 1.6, range: 0.12, speed: 3.9, cd: 0.7, r: 0.19, cost: 8, reward: 2 },
];
export const SHAPE_IDX = Object.fromEntries(SHAPES.map((s, i) => [s.id, i]));

// Arbre d'améliorations : 3 paliers (≈250 → ≈1050 or), achats définitifs.
// x = colonne (0..4), tier = ligne. pre = prérequis.
export const NODES = [
  // Palier I
  { id: 'eco1',    tier: 1, x: 0, cost: 250, name: 'Butin',              desc: "+25% d'or gagné",                         pre: [] },
  { id: 'circ1',   tier: 1, x: 1, cost: 250, name: 'Cercles aguerris',   desc: '+25% PV et dégâts des Cercles',          pre: [] },
  { id: 'tri',     tier: 1, x: 2, cost: 250, name: 'Triangles',          desc: 'Débloque les Triangles (briseurs)',      pre: [], unlock: 'triangle' },
  { id: 'sq',      tier: 1, x: 3, cost: 250, name: 'Carrés',             desc: 'Débloque les Carrés (ancres)',           pre: [], unlock: 'square' },
  { id: 'recruit1',tier: 1, x: 4, cost: 250, name: 'Recruteurs',         desc: '-15% coût de recrutement',               pre: [] },
  // Palier II
  { id: 'eco2',    tier: 2, x: 0, cost: 400, name: 'Pillage',            desc: "+35% d'or gagné",                         pre: ['eco1'] },
  { id: 'rho',     tier: 2, x: 1, cost: 300, name: 'Rhombes',            desc: 'Débloque les Rhombes (remplissage)',     pre: ['circ1'], unlock: 'rhombus' },
  { id: 'dia',     tier: 2, x: 1.75, cost: 350, name: 'Losanges',        desc: 'Débloque les Losanges (rapides)',        pre: ['tri'], unlock: 'diamond' },
  { id: 'tri2',    tier: 2, x: 2.5, cost: 400, name: 'Pointes acérées',  desc: '+30% dégâts des Triangles',              pre: ['tri'] },
  { id: 'hex',     tier: 2, x: 3.25, cost: 450, name: 'Hexagones',       desc: 'Débloque les Hexagones (tir à distance)',pre: ['sq'], unlock: 'hexagon' },
  { id: 'sq2',     tier: 2, x: 4, cost: 350, name: 'Murailles',          desc: '+35% PV des Carrés',                     pre: ['sq'] },
  // Palier III
  { id: 'king',    tier: 3, x: 0.5, cost: 1050, name: 'La Couronne',     desc: 'Touche deux fois un Cercle pour le couronner : x10 PV et dégâts, alliés proches +30% vitesse', pre: ['circ1', 'eco1'] },
  { id: 'march',   tier: 3, x: 1.5, cost: 700, name: 'Pas cadencé',      desc: '+15% vitesse de toute l\'armée',          pre: ['dia'] },
  { id: 'spear',   tier: 3, x: 2.5, cost: 850, name: 'Fer de lance',     desc: '+20% dégâts de toute l\'armée',           pre: ['tri2'] },
  { id: 'volley',  tier: 3, x: 3.25, cost: 800, name: 'Volées',          desc: '+30% portée et cadence des Hexagones',   pre: ['hex'] },
  { id: 'pent',    tier: 3, x: 4, cost: 1050, name: 'Pentagones',        desc: 'Débloque les Pentagones (ancres de flanc)', pre: ['sq2'], unlock: 'pentagon' },
  { id: 'recruit2',tier: 3, x: 5, cost: 900, name: 'Conscription',       desc: '-25% coût de recrutement',               pre: ['recruit1'] },
];
export const NODE_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));

// ----------------------------------------------------------------------------
// Générateur pseudo-aléatoire déterministe
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ----------------------------------------------------------------------------
// Terrain : obstacles (bâtiments = rectangles, arbres = petits carrés) et rivières (zones lentes).
// Une "rivière" est une bande horizontale avec des ponts (trous).
export function emptyTerrain() { return { buildings: [], trees: [], rivers: [] }; }

// Formation ennemie : liste de blocs { shape, x, z, w, h, order } en cases.
function enemyBlock(out, shape, cx, cz, n, r) {
  // bloc large (front) et peu profond, comme une ligne de bataille
  const s = SHAPES[shape];
  const sp = CELL;
  let width = Math.max(4, Math.round(Math.sqrt(n * 4)));
  width = Math.min(width, Math.floor((MAP_W - 6) / sp));
  const depth = Math.ceil(n / width);
  for (let k = 0; k < n; k++) {
    const row = Math.floor(k / width), col = k % width;
    const x = cx + (col - (width - 1) / 2) * sp;
    const z = cz - row * sp;
    if (x < -HW + 1 || x > HW - 1 || z < -HH + 1 || z > ENEMY_MAX_Z) continue;
    out.push({ x, z, t: shape });
  }
  return depth * sp;
}

const LEVEL_NAMES = ['Premier sang', 'La plaine', 'Le gué', 'Les bosquets', 'Le hameau', 'Deux lignes', 'Le pont', 'La percée',
  'Flancs exposés', 'Le roi rouge', 'Marée rouge', 'Les ruines', 'Le couloir', 'Avant-garde', 'La cité', 'Le mur',
  'Pluie de traits', 'Les jumeaux', 'Le delta', 'Le seigneur', 'La horde', 'Bastion', 'Fourches', 'Le marais',
  'La capitale', 'Tenaille', 'Les archers', 'Débordement', 'Ligne de feu', 'Le tyran', 'Déferlante', 'Labyrinthe',
  'Les trois ponts', 'Contre-pente', 'La forteresse', 'Écrasement', 'Les colosses', 'Rideau', 'Cisaille', "L'empereur",
  'Fin du monde', 'Citadelle', 'Encerclement', 'Mur de boucliers', 'Grande cité', 'Le gouffre', 'Dernier pont', 'Avalanche',
  'Le dernier rempart', 'We March as One'];

// Niveau de campagne n (1..50) — déterministe
export function campaignLevel(n) {
  const r = rng(n * 92821 + 7);
  const total = Math.round(Math.min(16000, 16 * Math.pow(1.155, n - 1)));
  const isBoss = n % 10 === 0;
  const isCity = n % 5 === 0 && !isBoss || n === 25 || n === 45;
  const terrain = emptyTerrain();

  // rivière horizontale au milieu avec ponts (niveaux 3, 7, 13, 19, 23, 33, 47...)
  if (n === 3 || n === 7 || n % 6 === 1 && n > 7 || n === 19 || n === 33 || n === 47 || n === 24) {
    const bridges = n === 33 ? 3 : n === 47 ? 1 : 2 + (r() < .3 ? 1 : 0);
    const gaps = [];
    for (let b = 0; b < bridges; b++) gaps.push(-HW + (b + 1) * MAP_W / (bridges + 1) + (r() - .5) * 10);
    terrain.rivers.push({ z0: -3, z1: 3, gaps: gaps.map(g => [g - 3, g + 3]) });
  }
  // bâtiments (cités)
  const nb = isCity ? 10 + Math.floor(r() * 8) : (n > 4 && r() < .5 ? 2 + Math.floor(r() * 4) : 0);
  for (let i = 0; i < nb; i++) {
    const w = 3 + r() * 6, h = 3 + r() * 6, x = (r() - .5) * (MAP_W - 16), z = (r() - .5) * 60;
    if (Math.abs(z) < 4 && terrain.rivers.length) continue;
    terrain.buildings.push({ x, z, w, h, hgt: 1.5 + r() * 3.5 });
  }
  // arbres
  const nt = Math.floor(r() * (n === 4 ? 70 : 30));
  for (let i = 0; i < nt; i++) terrain.trees.push({ x: (r() - .5) * (MAP_W - 6), z: (r() - .5) * (MAP_H - 30) });

  // composition ennemie selon le niveau
  const w = [1, n >= 4 ? .35 : 0, n >= 3 ? .3 : 0, n >= 8 ? .25 : 0, n >= 14 ? .08 : 0, n >= 6 ? .25 : 0, n >= 11 ? .3 : 0];
  const sum = w.reduce((a, b) => a + b);
  const enemy = [];
  const rows = { 1: -10, 4: -10, 0: -12, 2: -12, 6: -12, 3: -14, 5: -26 }; // carrés/pentagones devant, hexagones derrière
  const order = (n % 7 === 6 || n === 22 || n === 35) ? 'hold' : 'march';
  for (let t = 0; t < 7; t++) {
    let cnt = Math.round(total * w[t] / sum);
    if (!cnt) continue;
    const parts = 1 + Math.floor(r() * Math.min(3, 1 + n / 8));
    for (let p = 0; p < parts; p++) {
      const pn = p === parts - 1 ? cnt - Math.floor(cnt / parts) * (parts - 1) : Math.floor(cnt / parts);
      let cx = parts === 1 ? (r() - .5) * 20 : -HW * .55 + p * (HW * 1.1 / (parts - 1 || 1)) + (r() - .5) * 8;
      if (t === 3) cx = (p % 2 ? -1 : 1) * (HW * .55 + r() * 10);
      enemyBlock(enemy, t, cx, rows[t] - r() * 6, pn, r);
    }
  }
  const kings = [];
  if (isBoss) { kings.push(enemy.length); enemy.push({ x: 0, z: -30, t: SHAPE_IDX.pentagon, king: true }); }

  // plafond de coût à partir du niveau 15
  let cap = 0;
  if (n >= 15) { let v = 0; for (const e of enemy) v += SHAPES[e.t].cost * (e.king ? 10 : 1); cap = Math.round(v * 1.15 / 10) * 10; }

  return { id: n, name: LEVEL_NAMES[n - 1] || 'Niveau ' + n, terrain, enemy, enemyOrder: order, cap, boss: isBoss, city: isCity };
}

// Modes Tactique (armée fixe) et Rassemblement (budget fixe) : quelques puzzles faits main
export function tacticsLevel(i) {
  const base = campaignLevel([6, 9, 12, 17, 21, 26][i]);
  const army = [[60, 0, 30, 0, 0, 0, 0], [80, 40, 0, 20, 0, 0, 0], [0, 60, 60, 0, 0, 40, 0], [200, 80, 60, 40, 0, 60, 0], [300, 0, 120, 100, 4, 0, 200], [400, 200, 100, 100, 10, 120, 300]][i];
  return Object.assign(base, { name: 'Tactique ' + (i + 1) + ' — ' + base.name, army, cap: 0 });
}
export function musterLevel(i) {
  const base = campaignLevel([5, 8, 11, 15, 18, 24][i]);
  let v = 0; for (const e of base.enemy) v += SHAPES[e.t].cost;
  return Object.assign(base, { name: 'Rassemblement ' + (i + 1) + ' — ' + base.name, budget: Math.round(v * 0.95 / 10) * 10, cap: 0 });
}
