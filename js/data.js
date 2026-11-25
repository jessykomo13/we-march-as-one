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
    hp: 10, dmg: 2.0, range: 0.12, speed: 3.0, cd: 0.8, r: 0.23, cost: 10, reward: 1.5 },
  { id: 'square',   name: 'Carré',     role: "Ancre : lent et robuste, tient un flanc ou un pont et absorbe les charges.",
    hp: 34, dmg: 2.0, range: 0.12, speed: 2.0, cd: 0.9, r: 0.24, cost: 25, reward: 4 },
  { id: 'triangle', name: 'Triangle',  role: 'Briseur : frappe fort pour percer une ligne, mais fragile dans la durée.',
    hp: 8,  dmg: 6.5, range: 0.12, speed: 3.5, cd: 0.9, r: 0.22, cost: 25, reward: 4 },
  { id: 'diamond',  name: 'Losange',   role: 'Liaison : rapide et bon marché, comble les trous entre les blocs.',
    hp: 9,  dmg: 2.6, range: 0.12, speed: 4.8, cd: 0.7, r: 0.21, cost: 15, reward: 2.5 },
  { id: 'pentagon', name: 'Pentagone', role: "Ancre de flanc : très cher, tient seul une voie de côté.",
    hp: 80, dmg: 7.5, range: 0.15, speed: 2.4, cd: 1.0, r: 0.30, cost: 90, reward: 13 },
  { id: 'hexagon',  name: 'Hexagone',  role: 'Écran : tire de loin et interdit une zone, mais ne tient pas seul.',
    hp: 7,  dmg: 2.4, range: 9.0,  speed: 2.6, cd: 1.4, r: 0.23, cost: 35, reward: 5, ranged: true, pspeed: 18 },
  { id: 'rhombus',  name: 'Rhombe',    role: 'Remplissage : très bon marché, idéal dans les couloirs étroits.',
    hp: 6,  dmg: 1.6, range: 0.12, speed: 3.9, cd: 0.7, r: 0.19, cost: 8, reward: 1 },
  // --- nouvelles formes
  { id: 'star',     name: 'Étoile',    role: 'Assassin : très rapide et dévastateur, mais tombe au moindre coup.',
    hp: 7,  dmg: 11,  range: 0.12, speed: 5.4, cd: 0.8, r: 0.22, cost: 40, reward: 6 },
  { id: 'octagon',  name: 'Octogone',  role: 'Colosse : énorme et lent, chaque coup frappe tous les ennemis autour de sa cible.',
    hp: 160, dmg: 9, range: 0.2, speed: 1.7, cd: 1.3, r: 0.34, cost: 160, reward: 24, cleave: 0.9 },
  { id: 'cross',    name: 'Croix',     role: 'Soigneur : reste en retrait et soigne les alliés autour de lui.',
    hp: 9,  dmg: 0,   range: 4.5, speed: 3.0, cd: 1.0, r: 0.22, cost: 45, reward: 6, heal: 2.2, healR: 3.2 },
  { id: 'crescent', name: 'Croissant', role: "Tireur d'élite : tire de très loin et fait très mal, mais très fragile.",
    hp: 6,  dmg: 9,   range: 15,  speed: 2.4, cd: 2.4, r: 0.22, cost: 60, reward: 9, ranged: true, pspeed: 30 },
];
export const NS = SHAPES.length;
export const SHAPE_IDX = Object.fromEntries(SHAPES.map((s, i) => [s.id, i]));

// ----------------------------------------------------------------------------
// OBJETS : comme la Couronne. Touche deux fois une unité de la bonne forme pour la transformer.
// On les achète dans Améliorations > Objets ; comme les troupes, ils reviennent après chaque bataille.
// mul = multiplicateurs de stats ; set = valeurs remplacées ; aura = effet sur les alliés proches.
export const ITEMS = [
  { id: 'crown',   name: 'Couronne',  unit: 'Roi',       base: 'circle',   icon: '♛', cost: 0,    unique: true, needs: 'king',
    desc: 'x10 PV et dégâts. Les alliés proches vont 30% plus vite.',
    mul: { hp: 10, dmg: 10 }, size: 2.2, aura: { type: 'speed', v: 1.3, r: 7 } },
  { id: 'tank',    name: 'Char',      unit: 'Char',      base: 'square',   icon: '🛡', cost: 450,
    desc: 'x8 PV. Tire des obus qui explosent sur un groupe d\'ennemis.',
    mul: { hp: 8, dmg: 5, speed: .8 }, set: { range: 4, cd: 1.6, ranged: true, pspeed: 20, splash: 1.3 }, size: 2.1 },
  { id: 'banner',  name: 'Étendard',  unit: 'Porte-étendard', base: 'triangle', icon: '🚩', cost: 500,
    desc: 'x5 PV. Les alliés proches font +25% de dégâts.',
    mul: { hp: 5, dmg: 2 }, size: 1.7, aura: { type: 'dmg', v: 1.25, r: 6 } },
  { id: 'knight',  name: 'Chevalier', unit: 'Chevalier', base: 'diamond',  icon: '⚔', cost: 400,
    desc: 'x6 PV, x5 dégâts, +40% vitesse : charge au cœur des lignes.',
    mul: { hp: 6, dmg: 5, speed: 1.4 }, size: 1.8 },
  { id: 'bastion', name: 'Bastion',   unit: 'Bastion',   base: 'pentagon', icon: '🏰', cost: 1200,
    desc: 'x10 PV, x3 dégâts. Les alliés proches subissent 30% de dégâts en moins.',
    mul: { hp: 10, dmg: 3, speed: .7 }, size: 2.3, aura: { type: 'armor', v: .7, r: 6 } },
  { id: 'cannon',  name: 'Canon',     unit: 'Canon',     base: 'hexagon',  icon: '💣', cost: 650,
    desc: 'Tire très loin des boulets qui écrasent tout un groupe.',
    mul: { hp: 4, dmg: 7 }, set: { range: 17, cd: 3.2, pspeed: 16, splash: 2.2 }, size: 1.8 },
  { id: 'medic',   name: 'Médecin',   unit: 'Médecin',   base: 'rhombus',  icon: '✚', cost: 350,
    desc: 'x4 PV. Soigne fortement tous les alliés autour de lui.',
    mul: { hp: 4, dmg: .5 }, size: 1.6, aura: { type: 'heal', v: 4, r: 4.5 } },
  { id: 'shadow',  name: 'Ombre',     unit: 'Ombre',     base: 'star',     icon: '🗡', cost: 600, needs: 'starU',
    desc: 'x4 PV, x4 dégâts, encore plus rapide : traque les tireurs ennemis.',
    mul: { hp: 4, dmg: 4, speed: 1.25 }, size: 1.7 },
  { id: 'titan',   name: 'Titan',     unit: 'Titan',     base: 'octagon',  icon: '🗿', cost: 2000, needs: 'octU',
    desc: 'x8 PV, x4 dégâts, frappe une large zone.',
    mul: { hp: 8, dmg: 4, speed: .8 }, set: { cleave: 1.8 }, size: 2.4 },
];
export const ITEM_IDX = Object.fromEntries(ITEMS.map((it, i) => [it.id, i]));
export const ITEM_FOR_SHAPE = Object.fromEntries(ITEMS.map((it, i) => [SHAPE_IDX[it.base], i]));
// stats d'une unité transformée par un objet
export function eliteStats(st, item) {
  const o = Object.assign({}, st);
  for (const k in item.mul) o[k] = (o[k] || 0) * item.mul[k];
  if (item.set) Object.assign(o, item.set);
  o.r = st.r * item.size; o.aura = item.aura || null;
  return o;
}

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
  { id: 'armor',   tier: 2, x: 0.5, cost: 420, name: 'Armures',          desc: '+15% PV de toute l\'armée',               pre: ['circ1'] },
  { id: 'eco3',    tier: 3, x: 0, cost: 1000, name: 'Trésor de guerre', desc: "+50% d'or gagné",                         pre: ['eco2'] },
  { id: 'drill',   tier: 3, x: 3, cost: 950, name: 'Drill',             desc: '-15% temps entre deux attaques (toute l\'armée)', pre: ['spear'] },
  // nouvelles formes
  { id: 'starU',   tier: 2, x: 2, cost: 600,  name: 'Étoiles',           desc: 'Débloque les Étoiles (assassins)',        pre: ['tri'], unlock: 'star' },
  { id: 'crossU',  tier: 3, x: 1, cost: 900,  name: 'Croix',             desc: 'Débloque les Croix (soigneurs)',         pre: ['rho'], unlock: 'cross' },
  { id: 'cresU',   tier: 3, x: 3.5, cost: 1300, name: 'Croissants',      desc: "Débloque les Croissants (tireurs d'élite)", pre: ['hex'], unlock: 'crescent' },
  { id: 'octU',    tier: 4, x: 4, cost: 2600, name: 'Octogones',         desc: 'Débloque les Octogones (colosses)',      pre: ['pent'], unlock: 'octagon' },
  // palier IV : grosses améliorations
  { id: 'vigor',   tier: 4, x: 0, cost: 2200, name: 'Vigueur',           desc: '+30% PV de toute l\'armée',               pre: ['armor', 'eco3'] },
  { id: 'frenzy',  tier: 4, x: 1, cost: 2400, name: 'Frénésie',          desc: '+15% cadence d\'attaque de toute l\'armée', pre: ['drill'] },
  { id: 'forge',   tier: 4, x: 2, cost: 2000, name: 'Forge des élites',  desc: 'Objets : +30% PV et dégâts des unités transformées', pre: ['spear'] },
  { id: 'cheap',   tier: 4, x: 3, cost: 1800, name: 'Intendance',        desc: '-30% prix des objets',                   pre: ['recruit2'] },
  { id: 'eco4',    tier: 4, x: 5, cost: 3000, name: 'Empire',            desc: "+75% d'or gagné",                         pre: ['eco3'] },
  { id: 'heroes',  tier: 4, x: 6, cost: 3500, name: 'Héros',             desc: '+25% PV et dégâts de toute l\'armée',     pre: ['vigor', 'frenzy'] },
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
  'Le dernier rempart', 'We March as One',
  'Nouvelle aube', 'Les cendres', 'Le retour', 'Ombres', 'La vallée', 'Les assassins', 'Croisée', 'Les guérisseurs', 'Pont brisé', 'Le titan',
  'Mer rouge', 'Les tours', 'Lune noire', 'Embuscade', 'Le bastion', 'Les canons', 'Tempête', 'La garde', 'Faux-semblant', 'La reine rouge',
  'Le siège', 'Les remparts', 'Feu croisé', 'Le dédale', 'Métropole', 'La meute', 'Nuée', 'Les étendards', 'Le gué maudit', 'Le conquérant',
  'Fer et sang', 'Les géants', 'Marche forcée', 'Contre-attaque', 'La grande cité', 'Le précipice', 'Les sentinelles', 'Le mur de fer', 'Trahison', 'Le souverain',
  'Apocalypse', 'Les légions', 'Dernière ligne', 'Ciel de flèches', 'Capitale rouge', 'Le chaos', 'Ultime pont', 'Raz-de-marée', 'Le trône', 'Nous marchons comme un'];
export const LEVEL_COUNT = 100;

// Niveau de campagne n (1..50) — déterministe
export function campaignLevel(n) {
  const r = rng(n * 92821 + 7);
  // plus durs : armées qui grossissent plus vite, puis plafonnent (la difficulté continue via la force des unités)
  const total = Math.round(Math.min(18000, 18 * Math.pow(1.22, n - 1)));
  const isBoss = n % 10 === 0;
  const isCity = n % 5 === 0 && !isBoss || n === 25 || n === 45 || n === 65 || n === 85;
  const terrain = emptyTerrain();

  // rivière horizontale au milieu avec ponts (niveaux 3, 7, 13, 19, 23, 33, 47...)
  if (n === 3 || n === 7 || n % 6 === 1 && n > 7 || n === 19 || n === 33 || n === 47 || n === 24 || n === 59 || n === 77 || n === 97) {
    const bridges = n === 33 || n === 77 ? 3 : n === 47 || n === 97 ? 1 : 2 + (r() < .3 ? 1 : 0);
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
  const w = [1, n >= 4 ? .35 : 0, n >= 3 ? .3 : 0, n >= 8 ? .25 : 0, n >= 14 ? .08 : 0, n >= 6 ? .25 : 0, n >= 11 ? .3 : 0,
    n >= 30 ? .15 : 0, n >= 45 ? .04 : 0, n >= 38 ? .08 : 0, n >= 52 ? .1 : 0];
  const sum = w.reduce((a, b) => a + b);
  const enemy = [];
  const rows = { 1: -10, 4: -10, 8: -10, 0: -12, 2: -12, 6: -12, 3: -14, 7: -14, 9: -20, 5: -26, 10: -30 }; // lourds devant, tireurs derrière
  const order = (n % 7 === 6 || n === 22 || n === 35) ? 'hold' : 'march';
  for (let t = 0; t < NS; t++) {
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
  // unités d'élite ennemies (objets) : de plus en plus nombreuses
  const eliteKinds = [['tank', 20], ['banner', 24], ['knight', 22], ['cannon', 28], ['medic', 32], ['bastion', 45], ['shadow', 55], ['titan', 70]];
  const nElite = n < 20 ? 0 : Math.min(60, Math.floor((n - 16) / 3));
  for (let k = 0; k < nElite; k++) {
    const avail = eliteKinds.filter(e => n >= e[1]); const [id] = avail[Math.floor(r() * avail.length)];
    const it = ITEMS[ITEM_IDX[id]], t = SHAPE_IDX[it.base];
    // remplace une unité ennemie de la bonne forme, sinon en ajoute une
    const idx = enemy.findIndex(e => e.t === t && !e.item);
    if (idx >= 0) enemy[idx].item = id; else enemy.push({ x: (r() - .5) * 60, z: rows[t] - 4 - r() * 6, t, item: id });
  }
  if (isBoss) {
    enemy.push({ x: 0, z: -30, t: SHAPE_IDX.pentagon, king: true, item: 'bastion' });
    if (n >= 60) enemy.push({ x: -20, z: -32, t: SHAPE_IDX.octagon, king: true, item: 'titan' }, { x: 20, z: -32, t: SHAPE_IDX.octagon, king: true, item: 'titan' });
  }

  // plafond de coût à partir du niveau 15
  const cap = 0; // pas de plafond : envoie autant de troupes que tu veux

  return { id: n, name: LEVEL_NAMES[n - 1] || 'Niveau ' + n, terrain, enemy, enemyOrder: order, cap, boss: isBoss, city: isCity };
}

// Modes Tactique (armée fixe) et Rassemblement (armée libre) : quelques puzzles faits main
export function tacticsLevel(i) {
  const base = campaignLevel([6, 9, 12, 17, 21, 26][i]);
  const army = [[60, 0, 30, 0, 0, 0, 0], [80, 40, 0, 20, 0, 0, 0], [0, 60, 60, 0, 0, 40, 0], [200, 80, 60, 40, 0, 60, 0], [300, 0, 120, 100, 4, 0, 200], [400, 200, 100, 100, 10, 120, 300]][i];
  return Object.assign(base, { name: 'Tactique ' + (i + 1) + ' — ' + base.name, army: army.concat(Array(NS - army.length).fill(0)), cap: 0 });
}
export function musterLevel(i) {
  const base = campaignLevel([5, 8, 11, 15, 18, 24][i]);
  let v = 0; for (const e of base.enemy) v += SHAPES[e.t].cost;
  return Object.assign(base, { name: 'Rassemblement ' + (i + 1) + ' — ' + base.name, cap: 0 });
}
