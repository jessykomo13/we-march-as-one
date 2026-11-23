// ====================================================================
// Générateur d'humains procéduraux skinnés (squelette nommé comme Mixamo)
// ====================================================================
import * as THREE from "three";
const V3 = THREE.Vector3;

const gss = x => Math.exp(-x * x);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function curve(pts) { // [[t,v],...] interpolation lissée
  return t => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) {
      const a = pts[i - 1], b = pts[i], u = (t - a[0]) / (b[0] - a[0]), s = u * u * (3 - 2 * u);
      return a[1] + (b[1] - a[1]) * s;
    }
    return pts[pts.length - 1][1];
  };
}
function chainW(pts) { // [[t,boneIdx],...] -> poids linéaires entre voisins
  return t => {
    if (t <= pts[0][0]) return [[pts[0][1], 1]];
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) {
      const a = pts[i - 1], b = pts[i], u = (t - a[0]) / (b[0] - a[0]);
      return a[1] === b[1] ? [[a[1], 1]] : [[a[1], 1 - u], [b[1], u]];
    }
    return [[pts[pts.length - 1][1], 1]];
  };
}
function hexRGB(h) { const c = new THREE.Color(h); return [c.r, c.g, c.b]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function vnoise(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
function snoise(x, y, z) { // bruit 3D lisse simple
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  const n = (a, b, c) => vnoise(ix + a, iy + b, iz + c);
  return L(L(L(n(0, 0, 0), n(1, 0, 0), u), L(n(0, 1, 0), n(1, 1, 0), u), v), L(L(n(0, 0, 1), n(1, 0, 1), u), L(n(0, 1, 1), n(1, 1, 1), u), v), w);
}

class Acc { // accumulateur de géométrie skinnée
  constructor() { this.pos = []; this.col = []; this.si = []; this.sw = []; this.idx = []; }
  get n() { return this.pos.length / 3; }
  vert(p, c, w) {
    this.pos.push(p.x, p.y, p.z); this.col.push(c[0], c[1], c[2]);
    w = w.filter(e => e[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let s = 0; for (const e of w) s += e[1];
    for (let i = 0; i < 4; i++) { this.si.push(w[i] ? w[i][0] : 0); this.sw.push(w[i] ? w[i][1] / s : 0); }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

// Tube de sections elliptiques le long d'un segment
function sweep(G, o) {
  const a = o.a, b = o.b, d = new V3().subVectors(b, a);
  const n = o.n || 18, seg = o.seg || 14, t0 = o.t0 ?? 0, t1 = o.t1 ?? 1;
  const th0 = o.th0 ?? 0, th1 = o.th1 ?? Math.PI * 2, closed = o.th0 === undefined;
  const cols = closed ? n : n + 1, base = G.n;
  const flip = (new V3().crossVectors(d, o.az).dot(o.ax) < 0) !== !!o.flip;
  for (let i = 0; i <= seg; i++) {
    const t = t0 + (t1 - t0) * i / seg;
    const c = a.clone().addScaledVector(d, t);
    if (o.center) c.add(o.center(t));
    for (let j = 0; j < cols; j++) {
      const th = th0 + (th1 - th0) * j / n, cs = Math.cos(th), sn = Math.sin(th);
      let rx = o.rx(t, th), rz = o.rz(t, th);
      const add = (o.shape ? o.shape(t, th) : 0) + (o.off || 0);
      const radial = o.ax.clone().multiplyScalar(cs * rx).addScaledVector(o.az, sn * rz);
      const len = radial.length() || 1;
      const p = c.clone().add(radial).addScaledVector(radial, add / len);
      const col = o.color(p, t, th);
      G.vert(p, col, o.w(t, th, p));
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < (closed ? n : n); j++) {
    const j2 = closed ? (j + 1) % n : j + 1;
    const A = base + i * cols + j, B = base + i * cols + j2, C = base + (i + 1) * cols + j, D = base + (i + 1) * cols + j2;
    if (flip) G.idx.push(A, B, C, B, D, C); else G.idx.push(A, C, B, B, C, D);
  }
  if (o.capA || o.capB) for (const [cap, t, i] of [[o.capA, t0, 0], [o.capB, t1, seg]]) {
    if (!cap) continue;
    const c = a.clone().addScaledVector(d, t); if (o.center) c.add(o.center(t));
    const ci = G.n; G.vert(c, o.color(c, t, 0), o.w(t, 0, c));
    for (let j = 0; j < n; j++) {
      const A = base + i * cols + j, B = base + i * cols + (j + 1) % n;
      if ((i === 0) !== flip) G.idx.push(ci, A, B); else G.idx.push(ci, B, A);
    }
  }
}

// Ellipsoïde déformable, avec filtrage de triangles (coiffures, barbe...)
function blob(G, o) {
  const ws = o.ws || 28, hs = o.hs || 20, base = G.n, keep = [];
  const q = o.q || new THREE.Quaternion();
  for (let i = 0; i <= hs; i++) {
    const v = i / hs, phi = v * Math.PI;
    for (let j = 0; j <= ws; j++) {
      const u = j / ws, th = u * Math.PI * 2;
      const un = new V3(Math.sin(phi) * Math.sin(th), Math.cos(phi), Math.sin(phi) * Math.cos(th)); // z = avant
      let p = new V3(un.x * o.rx, un.y * o.ry, un.z * o.rz);
      if (o.deform) p = o.deform(p, un);
      p.applyQuaternion(q).add(o.c);
      keep.push(o.keep ? o.keep(un) : true);
      G.vert(p, o.color(p, un), typeof o.w === "function" ? o.w(p, un) : o.w);
    }
  }
  for (let i = 0; i < hs; i++) for (let j = 0; j < ws; j++) {
    const A = i * (ws + 1) + j, B = A + 1, C = A + ws + 1, D = C + 1;
    if (keep[A] && keep[B] && keep[C] && keep[D]) G.idx.push(base + A, base + C, base + B, base + B, base + C, base + D);
  }
}

// ------------------------------------------------------------- palettes
export const PAL = {
  skin: ["#f6d7c3", "#eec3a6", "#e3ac88", "#d39a74", "#bd8460", "#a36b47", "#8a5636", "#6e4129", "#563220", "#f1c9ae"],
  hair: ["#120d0b", "#1f1510", "#2e1f16", "#45301f", "#5e4128", "#7a5532", "#9b7044", "#c29a62", "#dcc08b", "#7b3a1c", "#a34b25", "#8f8a85", "#d9d5cf"],
  top: ["#f2f2ef", "#1b1c1f", "#6f7277", "#26324d", "#8e2430", "#c9a13a", "#56603d", "#e2a7b4", "#9cc3df", "#e6dcc8", "#5c1f2b", "#2f5f63", "#d96c3b", "#3c6e47", "#7d5ba6"],
  jacket: ["#4a6889", "#3a5372", "#4c5637", "#1d1d1f", "#9f7b55", "#55595f", "#2c4848", "#6b2c2c", "#c8bfae", "#30343f"],
  pants: ["#86a3c4", "#5d7ca3", "#3b5274", "#263247", "#1c1d21", "#b7a585", "#77797d", "#5a5e46", "#8a6d55", "#d8d2c4"],
  skirt: ["#1c1d21", "#8e2430", "#26324d", "#b7a585", "#5d7ca3", "#e2a7b4", "#56603d"],
  shoes: [["#ecebe7", "#ffffff"], ["#1d1d20", "#f2f2f2"], ["#1d1d20", "#1d1d20"], ["#6b4428", "#2a1c12"], ["#8a5a33", "#3a2818"], ["#a8322c", "#f2f2f2"], ["#77808a", "#e8e8e8"], ["#2a3a5a", "#f2f2f2"]],
  eyes: ["#3b2414", "#24160c", "#4d3520", "#3f5a6e", "#4d6b48", "#6b5a3a"]
};
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];

export function randomPerson(r) {
  const f = r() < 0.5;
  const p = {
    sex: f ? "f" : "m",
    height: f ? 1.56 + r() * 0.2 : 1.66 + r() * 0.24,
    build: 0.86 + r() * 0.36,
    skin: pick(r, PAL.skin), eyes: pick(r, PAL.eyes),
    hairColor: pick(r, r() < 0.12 ? PAL.hair.slice(11) : PAL.hair.slice(0, 11)),
    hair: f ? pick(r, ["long", "long", "ponytail", "bun", "bob", "afro", "curly", "long", "short"]) : pick(r, ["short", "short", "quiff", "buzz", "bald", "afro", "curly", "long", "quiff", "short"]),
    beard: !f && r() < 0.45 ? pick(r, ["stubble", "stubble", "full", "goatee"]) : null,
    glasses: r() < 0.22 ? (r() < 0.3 ? "sun" : "clear") : null,
    top: pick(r, f ? ["tee", "tee", "long", "tank", "hoodie", "long"] : ["tee", "tee", "long", "hoodie", "tee", "long"]),
    topColor: pick(r, PAL.top),
    jacket: r() < 0.42 ? pick(r, PAL.jacket) : null,
    bottom: f ? pick(r, ["jeans", "jeans", "skirt", "pants", "joggers", "shorts", "skirt"]) : pick(r, ["jeans", "jeans", "pants", "joggers", "shorts", "jeans"]),
    bottomColor: null, cuffs: r() < 0.3,
    shoes: pick(r, PAL.shoes), boots: r() < 0.2,
    seed: r() * 1000,
    age: pick(r, ["young", "young", "adult", "adult", "adult", "senior"]),
    muscle: f ? r() * 0.35 : r() * r()
  };
  if (p.age === "senior") {
    p.hairColor = pick(r, ["#8f8a85", "#b5b0aa", "#d9d5cf", "#6e6a66"]);
    if (!f && r() < 0.35) p.hair = "bald";
    if (f && (p.hair === "afro" || p.hair === "curly")) p.hair = "bob";
    p.height -= 0.03; p.build = Math.max(p.build, 0.95); p.muscle *= 0.3;
    if (p.top === "tank") p.top = "long";
    if (r() < 0.5) p.glasses = "clear";
  }
  p.bottomColor = p.bottom === "skirt" ? pick(r, PAL.skirt) : p.bottom === "jeans" ? pick(r, PAL.pants.slice(0, 5)) : pick(r, PAL.pants);
  if (p.top === "hoodie") p.jacket = null;
  return p;
}

// ------------------------------------------------------------- construction
export function makeHuman(o) {
  const H = o.height, F = o.sex === "f", g = o.build, S = H / 1.75;
  const M = o.muscle || 0, OLD = o.age === "senior";
  const gw = g, gd = Math.pow(g, 0.85);
  const skin = hexRGB(o.skin), hairC = hexRGB(o.hairColor);
  const lip = mix(skin, [0.55, 0.22, 0.22], F ? 0.35 : 0.2);
  const nz = (p, f = 30) => 0.93 + 0.07 * snoise(p.x * f + o.seed, p.y * f, p.z * f);
  const colSkin = p => { const k = nz(p, 20); return [skin[0] * k, skin[1] * k, skin[2] * k]; };

  // ---- squelette (T-pose, face +Z, gauche = +X)
  const J = {}, parent = {};
  const hipY = 0.515 * H, hw = (F ? 0.054 : 0.049) * H * Math.pow(g, 0.5);
  J.Hips = [0, hipY + 0.015 * H, 0]; parent.Hips = null;
  J.Spine = [0, 0.585 * H, -0.004 * H]; parent.Spine = "Hips";
  J.Spine1 = [0, 0.65 * H, -0.002 * H]; parent.Spine1 = "Spine";
  J.Spine2 = [0, 0.73 * H, 0]; parent.Spine2 = "Spine1";
  J.Neck = [0, 0.838 * H, -0.006 * H]; parent.Neck = "Spine2";
  J.Head = [0, 0.873 * H, 0.002 * H]; parent.Head = "Neck";
  J.HeadTop_End = [0, H, 0.004 * H]; parent.HeadTop_End = "Head";
  const shX = (F ? 0.098 : 0.112) * H * Math.pow(g, 0.4) * (1 + 0.07 * M), shY = 0.818 * H;
  const uaL = 0.172 * H, faL = 0.15 * H, hdL = 0.105 * H;
  for (const [s, P] of [[1, "Left"], [-1, "Right"]]) {
    J[P + "Shoulder"] = [s * 0.022 * H, 0.806 * H, -0.004 * H]; parent[P + "Shoulder"] = "Spine2";
    J[P + "Arm"] = [s * shX, shY, -0.006 * H]; parent[P + "Arm"] = P + "Shoulder";
    J[P + "ForeArm"] = [s * (shX + uaL), shY, -0.006 * H]; parent[P + "ForeArm"] = P + "Arm";
    J[P + "Hand"] = [s * (shX + uaL + faL), shY, -0.006 * H]; parent[P + "Hand"] = P + "ForeArm";
    J[P + "HandEnd"] = [s * (shX + uaL + faL + hdL), shY, -0.006 * H]; parent[P + "HandEnd"] = P + "Hand";
    J[P + "UpLeg"] = [s * hw, hipY, 0]; parent[P + "UpLeg"] = "Hips";
    J[P + "Leg"] = [s * hw * 0.93, 0.284 * H, 0.006 * H]; parent[P + "Leg"] = P + "UpLeg";
    J[P + "Foot"] = [s * hw * 0.9, 0.044 * H, -0.004 * H]; parent[P + "Foot"] = P + "Leg";
    J[P + "ToeBase"] = [s * hw * 0.92, 0.012 * H, 0.078 * H]; parent[P + "ToeBase"] = P + "Foot";
    J[P + "Toe_End"] = [s * hw * 0.93, 0.008 * H, 0.118 * H]; parent[P + "Toe_End"] = P + "ToeBase";
  }
  const names = Object.keys(J), bi = {}, bones = [];
  names.forEach((n, i) => { bi[n] = i; const b = new THREE.Bone(); b.name = "mixamorig" + n; bones.push(b); });
  const W = name => new V3(...J[name]);
  names.forEach(n => {
    const b = bones[bi[n]], p = W(n);
    if (parent[n]) { bones[bi[parent[n]]].add(b); p.sub(W(parent[n])); }
    b.position.copy(p);
  });

  const G = { skin: new Acc(), cloth: new Acc(), hair: new Acc(), shoe: new Acc(), eye: new Acc() };
  const X = new V3(1, 0, 0), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1);

  // ---- tronc
  const y0 = 0.465 * H, y1 = 0.852 * H;
  const tA = new V3(0, y0, 0), tB = new V3(0, y1, 0);
  const tOfY = y => (y - y0) / (y1 - y0);
  const rxT = F
    ? curve([[0, 0.150], [0.1, 0.176], [0.24, 0.168], [0.42, 0.128], [0.55, 0.13], [0.7, 0.14], [0.84, 0.15], [0.91, 0.148], [0.955, 0.12], [1, 0.06]])
    : curve([[0, 0.142], [0.1, 0.158], [0.24, 0.152], [0.42, 0.142], [0.56, 0.15], [0.72, 0.164], [0.86, 0.17], [0.91, 0.164], [0.955, 0.132], [1, 0.07]]);
  const rzT = F
    ? curve([[0, 0.092], [0.12, 0.108], [0.3, 0.096], [0.45, 0.086], [0.62, 0.094], [0.8, 0.094], [0.92, 0.07], [1, 0.054]])
    : curve([[0, 0.094], [0.12, 0.104], [0.3, 0.1], [0.45, 0.098], [0.65, 0.11], [0.82, 0.104], [0.93, 0.076], [1, 0.06]]);
  const belly = Math.max(0, g - 1.05) * 0.18;
  const torsoShape = (t, th) => {
    const sn = Math.sin(th), cs = Math.cos(th);
    let a = 0;
    if (F) a += 0.034 * S * Math.exp(-(((t - 0.69) / 0.075) ** 2)) * Math.max(0, sn) ** 1.5 * gss((Math.abs(cs) - 0.42) / 0.3);
    a += (F ? 0.026 : 0.016) * S * Math.exp(-(((t - 0.1) / 0.09) ** 2)) * Math.max(0, -sn) ** 1.5 * gss((Math.abs(cs) - 0.4) / 0.35);
    a += belly * S * Math.exp(-(((t - 0.42) / 0.14) ** 2)) * Math.max(0, sn) ** 2;
    if (!F) a += (0.012 + 0.02 * M) * S * Math.exp(-(((t - 0.72) / 0.08) ** 2)) * Math.max(0, sn) ** 2; // pectoraux
    return a;
  };
  const torsoCenter = t => new V3(0, 0, (curve([[0, -0.004], [0.3, 0.004], [0.6, 0.0], [0.85, 0.006], [1, -0.004]])(t)) * H);
  const tw = chainW([[tOfY(0.5 * H), bi.Hips], [tOfY(0.56 * H), bi.Hips], [tOfY(0.615 * H), bi.Spine], [tOfY(0.685 * H), bi.Spine1], [tOfY(0.77 * H), bi.Spine2]]);
  const torsoW = (t, th, p) => {
    const w = tw(t);
    const side = p.x > 0 ? "Left" : "Right";
    const ws = sstep(0.07 * H, 0.11 * H, Math.abs(p.x)) * sstep(0.755 * H, 0.815 * H, p.y) * 0.55;
    if (ws > 0) { for (const e of w) e[1] *= 1 - ws; w.push([bi[side + "Shoulder"], ws * 0.5], [bi[side + "Arm"], ws * 0.5]); }
    const wl = sstep(0.12, 0.0, t) * 0.45; // haut des cuisses
    if (wl > 0 && Math.abs(p.x) > 0.02 * H) { for (const e of w) e[1] *= 1 - wl; w.push([bi[side + "UpLeg"], wl]); }
    return w;
  };
  const torso = (acc, off, ta, tb, color, extra = {}) => sweep(acc, Object.assign({
    a: tA, b: tB, t0: ta, t1: tb, n: 28, seg: 26, ax: X, az: Z,
    rx: t => rxT(t) * S * gw, rz: t => rzT(t) * S * gd, shape: torsoShape, center: torsoCenter, off, w: torsoW, color
  }, extra));
  torso(G.skin, 0, 0, 1, colSkin, { capA: true });

  // ---- cou
  const neckA = new V3(0, 0.818 * H, -0.004 * H), neckB = new V3(0, 0.9 * H, 0.004 * H);
  const neckR = (F ? 0.046 : 0.056) * S * Math.pow(g, 0.6);
  sweep(G.skin, { a: neckA, b: neckB, n: 18, seg: 8, ax: X, az: Z, rx: t => neckR * (t < 0.2 ? 1.25 - t * 1.25 : 1), rz: t => neckR * 0.95, w: chainW([[0, bi.Spine2], [0.35, bi.Neck], [0.75, bi.Neck], [1, bi.Head]]), color: colSkin });

  // ---- tête
  const hs = Math.pow(S, 0.35);
  const hc = new V3(0, 0.93 * H, 0.008 * H);
  const hrx = (F ? 0.073 : 0.078) * hs, hry = (F ? 0.112 : 0.119) * hs, hrz = (F ? 0.094 : 0.099) * hs;
  const jaw = F ? 0.3 : 0.22;
  const headDeform = (p, u) => {
    const q = p.clone();
    if (u.y < 0) { const k = Math.pow(-u.y, 1.4); q.x *= 1 - jaw * k; if (u.z > 0) q.z *= 1 - 0.06 * k; }
    if (u.z < 0 && u.y > -0.3) q.z *= 1.06;
    if (u.y < -0.55 && u.z > 0.2) q.z += 0.008 * hs; // menton
    q.x *= 1 - 0.05 * Math.max(0, u.z) * Math.max(0, u.y + 0.2); // tempes
    // relief du visage (bosses gaussiennes le long de la normale)
    const bump = (cx, cy, cz, sg, amt) => { const d2 = (u.x - cx) ** 2 + (u.y - cy) ** 2 + (u.z - cz) ** 2; return amt * Math.exp(-d2 / (sg * sg)); };
    let r = 0;
    for (const s of [1, -1]) {
      r += bump(s * 0.36, 0.26, 0.9, 0.16, 0.0055 * hs);   // arcades
      r -= bump(s * 0.37, 0.1, 0.93, 0.12, 0.0075 * hs);   // orbites
      r += bump(s * 0.6, -0.12, 0.78, 0.2, 0.0055 * hs);   // pommettes
      r -= bump(s * 0.5, -0.36, 0.8, 0.18, F ? 0.002 * hs : 0.0035 * hs); // joues
    }
    r += bump(0, 0.08, 1, 0.1, 0.006 * hs);                // arête du nez
    r += bump(0, -0.72, 0.68, 0.18, (F ? 0.003 : 0.0065) * hs); // menton
    r += bump(0, -0.4, 0.97, 0.06, 0.002 * hs);           // philtrum
    if (r) q.addScaledVector(u, r);
    return q;
  };
  const headSurf = (ux, uy, uz, sc = 1) => { // point sur la surface de la tête (pour placer les traits)
    const u = new V3(ux, uy, uz).normalize();
    return headDeform(new V3(u.x * hrx * sc, u.y * hry * sc, u.z * hrz * sc), u).add(hc);
  };
  const HAIR = { buzz: [0.42, 0.12, -0.42], short: [0.4, 0.1, -0.5], quiff: [0.42, 0.1, -0.5], afro: [0.38, 0.0, -0.55], curly: [0.38, -0.1, -0.6], bob: [0.4, -0.55, -0.7], long: [0.42, -0.3, -0.75], ponytail: [0.42, 0.05, -0.45], bun: [0.42, 0.05, -0.45] }[o.hair];
  const hairLine = u => { const [fr, sd, bk] = HAIR; return u.z > 0 ? sd + (fr - sd) * u.z * u.z : sd + (bk - sd) * u.z * u.z; };
  const beardMask = u => {
    if (!o.beard) return 0;
    let m = sstep(-0.1, -0.24, u.y) * sstep(-0.25, 0.1, u.z);
    m = Math.max(m, sstep(0.55, 0.78, Math.abs(u.x)) * sstep(0.12, -0.05, u.y) * sstep(-0.3, 0.0, u.z) * sstep(-0.3, -0.1, u.y + 0.6)); // favoris
    m *= 1 - gss((u.y + 0.5) / 0.07) * gss(u.x / 0.17) * 0.95;      // bouche
    m = Math.max(m, gss((u.y + 0.39) / 0.05) * gss(u.x / 0.26) * sstep(0.5, 0.8, u.z)); // moustache
    if (o.beard === "goatee") m *= gss(u.x / 0.28);
    return clamp(m, 0, 1);
  };
  const blush = mix(skin, [0.8, 0.35, 0.33], 0.18);
  const headCol = (p, u) => {
    let c = colSkin(p);
    if (OLD) {
      const fore = sstep(0.25, 0.4, u.y) * sstep(0.75, 0.5, u.y) * sstep(0.3, 0.7, u.z) * (0.5 + 0.5 * Math.sin(u.y * 90));
      const naso = gss((Math.abs(u.x) - 0.3 + (u.y + 0.3) * 0.25) / 0.03) * sstep(-0.1, -0.2, u.y) * sstep(-0.55, -0.45, u.y) * sstep(0.6, 0.85, u.z);
      const crow = gss((Math.abs(u.x) - 0.6) / 0.06) * gss((u.y - 0.08) / 0.08) * (0.5 + 0.5 * Math.sin(u.y * 120));
      c = mix(c, mix(skin, [0.2, 0.12, 0.1], 0.35), Math.min(0.5, fore * 0.35 + naso * 0.5 + crow * 0.3));
      c = mix(c, [c[0] * 0.95 + 0.03, c[1] * 0.95 + 0.03, c[2] * 0.95 + 0.04], 0.5);
    }
    const cheek = Math.max(gss(Math.hypot(u.x - 0.55, u.y + 0.2) / 0.2), gss(Math.hypot(u.x + 0.55, u.y + 0.2) / 0.2)) * sstep(0.4, 0.8, u.z);
    c = mix(c, blush, cheek * 0.5);
    const under = Math.max(gss(Math.hypot(u.x - 0.36, u.y + 0.02) / 0.09), gss(Math.hypot(u.x + 0.36, u.y + 0.02) / 0.09)) * sstep(0.7, 0.9, u.z);
    c = mix(c, mix(skin, [0.25, 0.15, 0.15], 0.3), under * 0.35);
    if (HAIR) c = mix(c, hairC, sstep(hairLine(u) - 0.1, hairLine(u) + 0.02, u.y) * 0.85);
    const bm = beardMask(u);
    if (bm > 0) c = mix(c, mix(hairC, c, 0.25), bm * (o.beard === "stubble" ? 0.42 : 0.8));
    return c;
  };
  blob(G.skin, { c: hc, rx: hrx, ry: hry, rz: hrz, ws: 60, hs: 46, deform: headDeform, w: [[bi.Head, 1]], color: headCol });
  const headW = [[bi.Head, 1]];
  // oreilles
  for (const s of [1, -1]) {
    const ec2 = headSurf(s, 0.02, -0.08).add(new V3(s * 0.004, 0, 0));
    blob(G.skin, { c: ec2, rx: 0.011 * hs, ry: (OLD ? 0.032 : 0.029) * hs, rz: 0.019 * hs, ws: 16, hs: 12, w: headW, color: p => mix(colSkin(p), [0.6, 0.3, 0.28], 0.12) });
    blob(G.skin, { c: ec2.clone().add(new V3(s * 0.007 * hs, -0.004 * hs, 0.004 * hs)), rx: 0.004 * hs, ry: 0.008 * hs, rz: 0.006 * hs, ws: 10, hs: 8, w: headW, color: p => mix(colSkin(p), [0.25, 0.12, 0.1], 0.35) });
  }
  // nez
  blob(G.skin, { c: headSurf(0, -0.12, 1).add(new V3(0, 0, -0.004)), rx: 0.0125 * hs, ry: 0.025 * hs, rz: 0.016 * hs, ws: 14, hs: 12, q: new THREE.Quaternion().setFromAxisAngle(X, -0.25), w: headW, color: colSkin });
  blob(G.skin, { c: headSurf(0, -0.3, 1).add(new V3(0, 0.003, 0.004)), rx: 0.013 * hs, ry: 0.0075 * hs, rz: 0.01 * hs, ws: 14, hs: 10, w: headW, color: colSkin });
  // narines
  for (const s of [1, -1]) blob(G.eye, { c: headSurf(s * 0.065, -0.335, 1).add(new V3(0, -0.0065 * hs, -0.004 * hs)), rx: 0.0026 * hs, ry: 0.0014 * hs, rz: 0.0028 * hs, ws: 8, hs: 6, w: headW, color: () => mix(skin, [0.1, 0.05, 0.05], 0.75) });
  // lèvres
  for (const [dy, ry] of [[-0.47, 0.0055], [-0.53, 0.0065]]) blob(G.skin, { c: headSurf(0, dy, 1).add(new V3(0, 0, -0.002)), rx: 0.021 * hs, ry: ry * hs, rz: 0.008 * hs, ws: 14, hs: 8, w: headW, color: () => lip });
  // yeux
  const eyeC = hexRGB(o.eyes);
  for (const s of [1, -1]) {
    const ec = headSurf(s * 0.38, 0.1, 0.92).add(new V3(0, 0, -0.011 * hs));
    blob(G.eye, { c: ec, rx: 0.0118 * hs, ry: 0.0105 * hs, rz: 0.011 * hs, ws: 14, hs: 10, w: headW, color: () => [0.93, 0.92, 0.9] });
    blob(G.eye, { c: ec.clone().add(new V3(0, 0, 0.0085 * hs)), rx: 0.0062 * hs, ry: 0.0062 * hs, rz: 0.004 * hs, ws: 12, hs: 8, w: headW, color: () => eyeC });
    blob(G.eye, { c: ec.clone().add(new V3(0, 0, 0.0112 * hs)), rx: 0.0027 * hs, ry: 0.0027 * hs, rz: 0.0015 * hs, ws: 8, hs: 6, w: headW, color: () => [0.02, 0.02, 0.02] });
    // paupières + cils
    blob(G.skin, { c: ec.clone().add(new V3(0, 0.0045 * hs, 0.001)), rx: 0.0128 * hs, ry: 0.0065 * hs, rz: 0.0112 * hs, ws: 18, hs: 10, keep: u => u.y > 0.15, w: headW, color: p => mix(colSkin(p), [0, 0, 0], 0.12) });
    blob(G.skin, { c: ec.clone().add(new V3(0, -0.0042 * hs, 0.0008)), rx: 0.0126 * hs, ry: 0.0055 * hs, rz: 0.011 * hs, ws: 18, hs: 10, keep: u => u.y < -0.35, w: headW, color: p => mix(colSkin(p), [0.35, 0.18, 0.18], OLD ? 0.18 : 0.08) });
    blob(G.hair, { c: ec.clone().add(new V3(0, 0.0072 * hs, 0.0095 * hs)), rx: 0.0125 * hs, ry: (F ? 0.0022 : 0.0014) * hs, rz: 0.003 * hs, ws: 14, hs: 4, q: new THREE.Quaternion().setFromAxisAngle(X, -0.5), w: headW, color: () => [0.04, 0.03, 0.03] });
    blob(G.eye, { c: ec.clone().add(new V3(0, 0, 0.0092 * hs)), rx: 0.0066 * hs, ry: 0.0066 * hs, rz: 0.0022 * hs, ws: 14, hs: 8, w: headW, color: () => mix(eyeC, [0, 0, 0], 0.55) });
    // sourcils
    blob(G.hair, { c: headSurf(s * 0.4, 0.27, 0.9).add(new V3(0, 0, 0.002)), rx: 0.02 * hs, ry: (F ? 0.0028 : 0.0042) * hs, rz: 0.006 * hs, ws: 12, hs: 6, q: new THREE.Quaternion().setFromAxisAngle(Z, s * (F ? -0.12 : -0.06)), w: headW, color: () => o.hair === "bald" || o.hair === "buzz" ? mix(skin, [0.05, 0.04, 0.03], 0.75) : mix(hairC, [0, 0, 0], 0.2) });
  }

  // ---- bras
  const armR = (F ? 0.036 : 0.043) * S * Math.pow(g, 0.7) * (1 + 0.28 * M);
  const armDefs = [];
  for (const [s, P] of [[1, "Left"], [-1, "Right"]]) {
    const A = W(P + "Arm"), E = W(P + "ForeArm"), Wr = W(P + "Hand"), HE = W(P + "HandEnd");
    const up = { a: A, b: E, n: 16, seg: 12, ax: Y, az: Z, rx: t => armR * curve([[-0.35, 0.4], [-0.08, 0.95], [0.05, 1.08], [0.3, 1.05], [0.7, 0.92], [1, 0.82]])(t), rz: t => armR * curve([[-0.35, 0.45], [-0.08, 1.0], [0.05, 1.12], [0.35, 1.0], [1, 0.82]])(t), w: chainW([[-0.25, bi[P + "Shoulder"]], [0.18, bi[P + "Arm"]], [0.84, bi[P + "Arm"]], [1.14, bi[P + "ForeArm"]]]) };
    const fo = { a: E, b: Wr, n: 16, seg: 12, ax: Y, az: Z, rx: t => armR * curve([[0, 0.82], [0.3, 0.86], [1, 0.52]])(t), rz: t => armR * curve([[0, 0.84], [0.3, 0.9], [1, 0.7]])(t), w: chainW([[-0.14, bi[P + "Arm"]], [0.14, bi[P + "ForeArm"]], [0.9, bi[P + "ForeArm"]], [1.08, bi[P + "Hand"]]]) };
    armDefs.push({ s, P, up, fo, A, E, Wr, HE });
    sweep(G.skin, Object.assign({}, up, { t0: -0.33, color: colSkin }));
    sweep(G.skin, Object.assign({}, fo, { t1: 1.04, color: colSkin }));
    // main : paume + doigts + pouce
    const dir = new V3().subVectors(HE, Wr).normalize(), hl = Wr.distanceTo(HE);
    const qh = new THREE.Quaternion().setFromUnitVectors(Z, dir);
    const hW = [[bi[P + "Hand"], 1]];
    blob(G.skin, { c: Wr.clone().addScaledVector(dir, hl * 0.32), rx: 0.034 * S * (F ? 0.88 : 1), ry: 0.0135 * S, rz: hl * 0.3, ws: 16, hs: 12, q: qh.clone(), w: p => { const k = sstep(0.0, hl * 0.15, p.distanceTo(Wr)); return [[bi[P + "Hand"], k], [bi[P + "ForeArm"], 1 - k]]; }, color: colSkin });
    // doigts : index (côté pouce, avant) -> auriculaire
    const fwdZ = new V3(0, 0, 1), fr = 0.0078 * S * (F ? 0.88 : 1) * (1 + 0.15 * M);
    for (const [lk, k] of [[0.92, 1.5], [1.0, 0.5], [0.95, -0.5], [0.76, -1.5]]) {
      const base = Wr.clone().addScaledVector(dir, hl * 0.56).addScaledVector(fwdZ, k * 0.0165 * S * (F ? 0.9 : 1)).add(new V3(0, -0.002 * S, 0));
      const len = hl * 0.45 * lk, tip = base.clone().addScaledVector(dir, len * 0.92).add(new V3(0, -len * 0.38, 0));
      const dd = new V3().subVectors(tip, base).normalize(), axF = Y.clone().addScaledVector(dd, -Y.dot(dd)).normalize();
      sweep(G.skin, { a: base, b: tip, n: 10, seg: 6, ax: axF, az: new V3().crossVectors(dd, axF).normalize(), rx: t => fr * (1 - 0.25 * t), rz: t => fr * (1.05 - 0.25 * t), center: t => new V3(0, -len * 0.12 * Math.sin(t * Math.PI), 0), capB: true, w: () => hW, color: p => mix(colSkin(p), [0.8, 0.5, 0.45], 0.06) });
    }
    { const base = Wr.clone().addScaledVector(dir, hl * 0.18).addScaledVector(fwdZ, 0.024 * S).add(new V3(0, -0.006 * S, 0));
      const tip = base.clone().addScaledVector(dir, hl * 0.32).addScaledVector(fwdZ, 0.022 * S).add(new V3(0, -0.02 * S, 0));
      const dd = new V3().subVectors(tip, base).normalize(), axF = Y.clone().addScaledVector(dd, -Y.dot(dd)).normalize();
      sweep(G.skin, { a: base, b: tip, n: 10, seg: 6, ax: axF, az: new V3().crossVectors(dd, axF).normalize(), rx: t => fr * 1.15 * (1 - 0.2 * t), rz: t => fr * 1.2 * (1 - 0.2 * t), capB: true, w: () => hW, color: colSkin }); }
  }

  // ---- jambes
  const legR = (F ? 0.078 : 0.075) * S * Math.pow(g, 0.75);
  const legDefs = [];
  for (const [s, P] of [[1, "Left"], [-1, "Right"]]) {
    const Hp = W(P + "UpLeg"), K = W(P + "Leg"), An = W(P + "Foot");
    const th = { a: Hp, b: K, n: 20, seg: 16, ax: X, az: Z, rx: t => legR * curve([[0, 1.0], [0.25, 0.95], [0.7, 0.78], [1, 0.62]])(t), rz: t => legR * curve([[0, 1.02], [0.3, 0.98], [0.75, 0.8], [1, 0.66]])(t), w: chainW([[-0.3, bi.Hips], [0.16, bi[P + "UpLeg"]], [0.86, bi[P + "UpLeg"]], [1.13, bi[P + "Leg"]]]) };
    const ca = { a: K, b: An, n: 20, seg: 16, ax: X, az: Z, rx: t => legR * curve([[0, 0.6], [0.28, 0.66], [0.75, 0.4], [1, 0.34]])(t), rz: t => legR * curve([[0, 0.64], [0.25, 0.74], [0.75, 0.42], [1, 0.38]])(t), center: t => new V3(0, 0, -0.012 * S * Math.exp(-(((t - 0.28) / 0.2) ** 2))), w: chainW([[-0.13, bi[P + "UpLeg"]], [0.13, bi[P + "Leg"]], [0.9, bi[P + "Leg"]], [1.08, bi[P + "Foot"]]]) };
    legDefs.push({ s, P, th, ca });
    sweep(G.skin, Object.assign({}, th, { t0: -0.28, color: colSkin }));
    sweep(G.skin, Object.assign({}, ca, { t1: 1.05, color: colSkin }));
  }

  // ---- vêtements
  const fab = (hex, k = 14, amp = 0.07) => { const c = hexRGB(hex); return p => { const n = 1 - amp + amp * 2 * snoise(p.x * k + o.seed, p.y * k * 1.3, p.z * k); return [c[0] * n, c[1] * n, c[2] * n]; }; };
  const denim = hex => { const c = hexRGB(hex); return (p, t, th) => { let n = 0.9 + 0.12 * snoise(p.x * 60, p.y * 140, p.z * 60);
    if (th !== undefined && Math.abs(Math.cos(th)) > 0.975 && p.y < 0.47 * H) n *= 1.12;
    if (p.y > 0.41 * H && p.y < 0.49 * H && p.z < 0 && Math.abs(Math.abs(p.x) - 0.055 * H) < 0.028 * H && (Math.abs(Math.abs(p.x) - 0.055 * H) > 0.025 * H || Math.abs(p.y - 0.41 * H) < 0.003 * H)) n *= 0.82;
    if (p.y > 0.47 * H && p.y < 0.53 * H && p.z > 0 && Math.abs(Math.abs(p.x) - 0.075 * H + (p.y - 0.5 * H) * 0.6) < 0.003 * H) n *= 0.78; const front = p.z > 0 ? 1 : 0.4; const fade = 1 + front * (0.1 * gss((p.y - 0.38 * H) / (0.05 * H)) + 0.08 * gss((p.y - 0.29 * H) / (0.035 * H))); return [c[0] * n * fade, c[1] * n * fade, c[2] * n * fade]; }; };
  const topCol = fab(o.topColor), tight = o.top === "tank" ? 0.009 : 0.013;

  // haut
  if (o.top === "tank") torso(G.cloth, tight * S, 0.2, 0.88, topCol);
  else torso(G.cloth, (o.top === "hoodie" ? 0.02 : tight) * S, o.top === "hoodie" ? 0.08 : 0.07, 0.958, topCol);
  if (o.top !== "hoodie") torso(G.cloth, (tight + 0.003) * S, o.top === "tank" ? 0.87 : 0.945, o.top === "tank" ? 0.885 : 0.962, p => topCol(p).map(v => v * 0.86));
  if (o.top === "hoodie") {
    for (const s2 of [1, -1]) sweep(G.cloth, { a: new V3(s2 * 0.025 * S, 0.82 * H, 0.075 * S), b: new V3(s2 * 0.028 * S, 0.73 * H, 0.11 * S), n: 6, seg: 4, ax: X, az: new V3(0, 0.35, 1).normalize(), rx: () => 0.0028 * S, rz: () => 0.0028 * S, capB: true, w: () => [[bi.Spine2, 1]], color: () => [0.92, 0.92, 0.9] });
  }
  // bas (taille du pantalon)
  const botCol = o.bottom === "jeans" ? denim(o.bottomColor) : fab(o.bottomColor, 18, 0.06);
  if (o.bottom !== "skirt") torso(G.cloth, 0.006 * S, -0.02, o.top === "hoodie" ? 0.2 : 0.27, botCol, { capA: true });
  // ceinture
  if ((o.bottom === "jeans" || o.bottom === "pants") && o.top === "tank") torso(G.cloth, 0.011 * S, 0.25, 0.275, fab(o.sex === "f" ? "#2a1d14" : "#3b2a1c", 30, 0.05));

  for (const L of legDefs) {
    if (o.bottom === "skirt") break;
    const loose = o.bottom === "joggers" ? 0.016 : o.bottom === "pants" ? 0.012 : 0.009;
    sweep(G.cloth, Object.assign({}, L.th, { t0: -0.3, t1: o.bottom === "shorts" ? 0.62 : 1, off: loose * S, color: botCol }));
    if (o.bottom !== "shorts") {
      const hem = o.bottom === "joggers" ? -0.004 : o.bottom === "jeans" ? 0.01 : 0.008;
      sweep(G.cloth, Object.assign({}, L.ca, { t0: -0.05, t1: o.cuffs ? 0.9 : 0.97, off: loose * S, shape: t => hem * S * sstep(0.5, 1, t), color: botCol }));
      if (o.cuffs) sweep(G.cloth, Object.assign({}, L.ca, { t0: 0.86, t1: 0.92, off: (loose + 0.006 + hem) * S, color: p => botCol(p).map(v => v * 1.18) }));
    }
  }
  if (o.bottom === "skirt") {
    const sk = fab(o.bottomColor, 16, 0.06);
    const sy0 = 0.62 * H, sy1 = (0.36 + 0.06 * vnoise(o.seed, 1, 2)) * H;
    sweep(G.cloth, {
      a: new V3(0, sy0, 0), b: new V3(0, sy1, 0), n: 30, seg: 14, ax: X, az: Z,
      rx: t => (rxT(tOfY(sy0)) * S * gw + 0.008) * (1 + t * 0.55) + t * 0.02 * S, rz: t => (rzT(tOfY(sy0)) * S * gd + 0.012) * (1 + t * 0.7),
      center: t => new V3(0, 0, 0.004 * H * t),
      w: (t, th, p) => { const side = p.x > 0 ? "Left" : "Right", k = sstep(0.05, 0.8, t) * 0.65 * sstep(0.0, 0.05 * H, Math.abs(p.x)); return [[bi.Hips, 1 - k], [bi[side + "UpLeg"], k]]; },
      color: sk
    });
  }
  // manches
  for (const A of armDefs) {
    if (o.top === "tank") break;
    const long = o.top !== "tee";
    if (!long) sweep(G.cloth, Object.assign({}, A.up, { t0: 0.38, t1: 0.42, off: 0.017 * S, shape: () => 0.0035 * S, color: p => topCol(p).map(v => v * 0.88) }));
    sweep(G.cloth, Object.assign({}, A.up, { t0: -0.33, t1: long ? 1 : 0.42, off: (long ? 0.011 : 0.014) * S, shape: t => long ? 0 : 0.008 * S * t, color: topCol }));
    if (long) sweep(G.cloth, Object.assign({}, A.fo, { t0: -0.05, t1: 0.96, off: 0.01 * S, shape: t => o.top === "hoodie" ? 0.004 * S * t : 0, color: topCol }));
  }
  if (o.top === "hoodie") {
    blob(G.cloth, { c: new V3(0, 0.855 * H, -0.06 * H), rx: 0.1 * S, ry: 0.05 * S, rz: 0.05 * S, ws: 18, hs: 10, w: [[bi.Spine2, 0.6], [bi.Neck, 0.4]], color: topCol }); // capuche
  }
  // veste ouverte
  if (o.jacket) {
    const jc = fab(o.jacket, 12, 0.08), gap = 0.32;
    torso(G.cloth, 0.03 * S, 0.05, 0.962, jc, { th0: Math.PI / 2 + gap, th1: Math.PI / 2 - gap + Math.PI * 2, n: 30 });
    for (const A of armDefs) {
      sweep(G.cloth, Object.assign({}, A.up, { t0: -0.22, t1: 1, off: 0.019 * S, color: jc }));
      sweep(G.cloth, Object.assign({}, A.fo, { t0: -0.05, t1: 0.94, off: 0.02 * S, color: jc }));
    }
    // col
    sweep(G.cloth, { a: new V3(0, 0.826 * H, -0.004 * H), b: new V3(0, 0.846 * H, -0.012 * H), th0: Math.PI / 2 + 0.6, th1: Math.PI / 2 - 0.6 + Math.PI * 2, n: 28, seg: 3, ax: X, az: Z, rx: t => neckR * (1.55 + t * 0.15), rz: t => neckR * (1.5 + t * 0.12), w: chainW([[0, bi.Spine2], [1, bi.Spine2]]), color: jc });
  }

  // ---- chaussures
  const [shoeHex, soleHex] = o.shoes, shoeC = fab(shoeHex, 20, 0.05), soleC = hexRGB(soleHex);
  for (const L of legDefs) {
    const P = L.P, An = W(P + "Foot"), Ball = W(P + "ToeBase");
    const heelZ = An.z - 0.035 * H, toeZ = W(P + "Toe_End").z + 0.012 * H;
    const cz = (heelZ + toeZ) / 2, hl = (toeZ - heelZ) / 2;
    const fw = (F ? 0.038 : 0.044) * S;
    const footW = p => { const k = sstep(Ball.z - 0.03 * S, Ball.z + 0.02 * S, p.z); return [[bi[P + "Foot"], 1 - k], [bi[P + "ToeBase"], k]]; };
    const shoeDeform = (p, u) => {
      const q = p.clone();
      if (u.z > 0.2) q.y *= 1 - 0.45 * sstep(0.2, 1, u.z);
      if (u.y < -0.45) q.y = -0.45 * 0.05 * S - (u.y + 0.45) * 0.01;
      q.x *= 1 + 0.12 * Math.max(0, u.z) - 0.1 * Math.max(0, -u.z);
      return q;
    };
    const c = new V3(An.x, 0.036 * S, cz);
    blob(G.shoe, { c, rx: fw, ry: 0.044 * S, rz: hl, ws: 22, hs: 14, deform: shoeDeform, w: footW, color: shoeC });
    blob(G.shoe, { c: new V3(An.x, 0.011 * S, cz), rx: fw * 1.06, ry: 0.012 * S, rz: hl * 1.04, ws: 22, hs: 8, deform: (p, u) => { const q = p.clone(); q.x *= 1 + 0.12 * Math.max(0, u.z) - 0.1 * Math.max(0, -u.z); return q; }, w: footW, color: () => soleC });
    if (o.boots) sweep(G.shoe, Object.assign({}, L.ca, { t0: 0.72, t1: 1.02, off: 0.016 * S, capB: false, color: shoeC }));
    const laceC = o.boots ? [0.15, 0.1, 0.07] : mix(hexRGB(shoeHex), [1, 1, 1], 0.6);
    for (let i = 0; i < 4; i++) {
      const lz = An.z + (0.012 + i * 0.016) * S, lu = (lz - cz) / hl, ly = 0.036 * S + 0.044 * S * (1 - 0.45 * sstep(0.2, 1, lu)) * Math.sqrt(Math.max(0, 1 - lu * lu)) - 0.002 * S;
      blob(G.shoe, { c: new V3(An.x, ly, lz), rx: fw * 0.42, ry: 0.003 * S, rz: 0.0035 * S, ws: 10, hs: 4, w: footW, color: () => laceC });
    }
    blob(G.shoe, { c: new V3(An.x, 0.021 * S, cz), rx: fw * 1.035, ry: 0.006 * S, rz: hl * 1.02, ws: 22, hs: 6, deform: (p, u) => { const q = p.clone(); q.x *= 1 + 0.12 * Math.max(0, u.z) - 0.1 * Math.max(0, -u.z); return q; }, w: footW, color: () => mix(soleC, [1, 1, 1], 0.4) });
  }

  // ---- cheveux
  const hairCol = p => { const n = 0.82 + 0.3 * snoise(p.x * 90 + o.seed, p.y * 40, p.z * 90); return [hairC[0] * n, hairC[1] * n, hairC[2] * n]; };
  const hairCap = (sc, front, side, back, extra = {}) => blob(G.hair, Object.assign({
    c: hc, rx: hrx * sc, ry: hry * sc, rz: hrz * sc, ws: 64, hs: 50,
    deform: (p, u) => {
      const line = u.z > 0 ? side + (front - side) * u.z * u.z : side + (back - side) * u.z * u.z;
      const f = sstep(line - 0.02, line + 0.09, u.y);
      const q = headDeform(new V3(u.x * hrx, u.y * hry, u.z * hrz), u);
      const k = (0.965 + (sc - 0.965) * f);
      q.multiplyScalar(k);
      if (extra.vol) q.addScaledVector(u, extra.vol(u) * f);
      return q;
    },
    keep: u => { const line = u.z > 0 ? side + (front - side) * u.z * u.z : side + (back - side) * u.z * u.z; return u.y > line - 0.12; },
    w: [[bi.Head, 1]], color: hairCol
  }, extra.o || {}));
  switch (o.hair) {
    case "buzz": break; // juste le cuir chevelu teinté
    case "short": hairCap(1.035, 0.4, 0.1, -0.5, { vol: u => 0.012 * hs * Math.max(0, u.y) }); break;
    case "quiff": hairCap(1.035, 0.42, 0.1, -0.5, { vol: u => 0.008 * hs * Math.max(0, u.y) + 0.03 * hs * Math.exp(-(((u.z - 0.55) ** 2 + (u.y - 0.62) ** 2) / 0.07)) }); break;
    case "afro": hairCap(1.06, 0.38, 0.0, -0.55, { vol: u => (0.045 + 0.012 * snoise(u.x * 8 + o.seed, u.y * 8, u.z * 8)) * hs * sstep(-0.6, 0.3, u.y) }); break;
    case "curly": hairCap(1.06, 0.38, -0.1, -0.6, { vol: u => (0.022 + 0.018 * snoise(u.x * 12 + o.seed, u.y * 12, u.z * 12)) * hs * sstep(-0.7, 0.2, u.y) }); break;
    case "bob": hairCap(1.09, 0.4, -0.55, -0.7, { vol: u => 0.012 * hs * sstep(-0.6, 0.2, u.y) }); break;
    case "long": case "ponytail": case "bun": {
      const loose = o.hair === "long";
      hairCap(loose ? 1.07 : 1.04, 0.42, loose ? -0.3 : 0.05, loose ? -0.75 : -0.45, { vol: u => 0.008 * hs * Math.max(0, u.y) });
      if (loose) {
        const top = hc.y - 0.02 * hs, bot = (0.7 + 0.06 * vnoise(o.seed, 3, 4)) * H;
        sweep(G.hair, {
          a: new V3(0, top, hc.z), b: new V3(0, bot, -0.02 * H), th0: Math.PI * 0.92, th1: Math.PI * 2.08, n: 26, seg: 12, ax: X, az: Z,
          rx: t => hrx * 1.08 * (1 + t * 0.55), rz: t => hrz * (1.06 - t * 0.35), shape: (t, th) => 0.006 * snoise(th * 6 + o.seed, t * 3, 1),
          w: (t, th, p) => { const k = sstep(0.25, 1, t); return [[bi.Head, 1 - k], [bi.Neck, k * 0.4], [bi.Spine2, k * 0.6]]; }, color: hairCol
        });
        for (let i = 0; i < 14; i++) {
          const th = Math.PI * (0.95 + i / 13 * 1.1), rr = vnoise(o.seed, i, 7);
          const a0 = new V3(Math.cos(th) * hrx * 1.05, top - 0.01, hc.z + Math.sin(th) * hrz * 1.02);
          const len = (top - bot) * (0.75 + 0.3 * rr), b0 = new V3(Math.cos(th) * hrx * (1.5 + 0.2 * rr), top - len, -0.02 * H + Math.sin(th) * hrz * (0.75 + 0.1 * rr));
          const dd = new V3().subVectors(b0, a0).normalize(); let ax2 = new V3().crossVectors(dd, Y); if (ax2.lengthSq() < 0.05) ax2 = X.clone(); ax2.normalize();
          sweep(G.hair, { a: a0, b: b0, n: 8, seg: 10, ax: ax2, az: new V3().crossVectors(ax2, dd).normalize(), rx: t => 0.012 * hs * (1 - 0.6 * t), rz: t => 0.007 * hs * (1 - 0.5 * t), center: t => new V3(Math.sin(t * 5 + i) * 0.006, 0, 0), capB: true,
            w: (t) => { const k = sstep(0.2, 1, t); return [[bi.Head, 1 - k], [bi.Neck, k * 0.4], [bi.Spine2, k * 0.6]]; }, color: p => hairCol(p).map(v => v * (0.9 + 0.2 * rr)) });
        }
      } else if (o.hair === "ponytail") {
        const a = headSurf(0, 0.35, -1, 1.05), b = a.clone().add(new V3(0, -0.2 * hs, -0.05 * hs));
        sweep(G.hair, { a, b, n: 12, seg: 10, ax: X, az: new V3().crossVectors(new V3().subVectors(b, a), X).normalize(), rx: t => 0.026 * hs * (1 - t * 0.6), rz: t => 0.022 * hs * (1 - t * 0.6), capB: true, w: (t) => [[bi.Head, 1 - t * 0.5], [bi.Neck, t * 0.5]], color: hairCol });
        blob(G.hair, { c: a, rx: 0.02 * hs, ry: 0.018 * hs, rz: 0.018 * hs, ws: 10, hs: 8, w: [[bi.Head, 1]], color: () => [0.08, 0.08, 0.1] });
      } else {
        blob(G.hair, { c: headSurf(0, 0.72, -0.7, 1.15), rx: 0.042 * hs, ry: 0.036 * hs, rz: 0.04 * hs, ws: 16, hs: 12, deform: (p, u) => p.clone().addScaledVector(u, 0.004 * snoise(u.x * 9, u.y * 9, u.z * 9)), w: [[bi.Head, 1]], color: hairCol });
      }
      break;
    }
    default: break; // chauve
  }
  // barbe fournie : volume
  if (o.beard === "full") blob(G.hair, { c: hc, rx: hrx, ry: hry, rz: hrz, ws: 60, hs: 46, deform: (p, u) => headDeform(p, u).multiplyScalar(0.97 + 0.07 * sstep(0.2, 0.8, beardMask(u))), keep: u => beardMask(u) > 0.05, w: [[bi.Head, 1]], color: hairCol });
  // casquette de police + insigne
  if (o.hat === "police") {
    const navy = [0.07, 0.1, 0.18], blk = [0.03, 0.03, 0.035];
    blob(G.shoe, { c: hc.clone().add(new V3(0, 0.05 * hs, -0.004)), rx: hrx * 1.13, ry: hry * 0.62, rz: hrz * 1.13, ws: 36, hs: 20,
      deform: (p, u) => { const q = p.clone(); if (u.y > 0.55) q.y = 0.55 * hry * 0.62 + (q.y - 0.55 * hry * 0.62) * 0.35; if (u.z > 0) q.z *= 1 + 0.08 * Math.max(0, u.y); return q; },
      keep: u => u.y > -0.15, w: [[bi.Head, 1]], color: () => navy });
    sweep(G.shoe, { a: hc.clone().add(new V3(0, 0.035 * hs, 0)), b: hc.clone().add(new V3(0, 0.062 * hs, 0)), n: 30, seg: 1, ax: X, az: Z, rx: () => hrx * 1.135, rz: () => hrz * 1.14, w: () => [[bi.Head, 1]], color: () => blk });
    blob(G.shoe, { c: hc.clone().add(new V3(0, 0.032 * hs, hrz * 1.12)), rx: 0.072 * hs, ry: 0.006 * hs, rz: 0.045 * hs, ws: 16, hs: 6, q: new THREE.Quaternion().setFromAxisAngle(X, 0.28), keep: u => u.z > -0.3, w: [[bi.Head, 1]], color: () => blk });
    blob(G.eye, { c: hc.clone().add(new V3(0, 0.075 * hs, hrz * 1.13)), rx: 0.016 * hs, ry: 0.018 * hs, rz: 0.004, ws: 10, hs: 8, w: [[bi.Head, 1]], color: () => [0.85, 0.7, 0.25] });
  }
  if (o.badge) {
    const ty = tOfY(0.76 * H), bz = rzT(ty) * S * gd + 0.018 * S + torsoShape(ty, Math.PI / 2 - 0.4);
    blob(G.eye, { c: new V3(0.075 * S, 0.76 * H, bz), rx: 0.022 * S, ry: 0.026 * S, rz: 0.004, ws: 10, hs: 8, w: [[bi.Spine2, 1]], color: () => [0.86, 0.72, 0.28] });
  }
  // lunettes
  if (o.glasses) {
    const frameC = o.glasses === "sun" ? [0.04, 0.04, 0.045] : [0.12, 0.1, 0.09];
    for (const s of [1, -1]) {
      const c = headSurf(s * 0.38, 0.1, 0.92).add(new V3(0, 0, 0.012 * hs));
      sweep(G.shoe, { a: c.clone().add(new V3(0, 0, -0.002)), b: c.clone().add(new V3(0, 0, 0.002)), n: 22, seg: 1, ax: X, az: Y, rx: () => 0.022 * hs, rz: () => 0.016 * hs, w: () => headW, color: () => frameC, off: 0 });
      sweep(G.shoe, { a: c.clone().add(new V3(0, 0, -0.002)), b: c.clone().add(new V3(0, 0, 0.002)), n: 22, seg: 1, ax: X, az: Y, rx: () => 0.019 * hs, rz: () => 0.013 * hs, w: () => headW, color: () => frameC });
      if (o.glasses === "sun") blob(G.eye, { c: c.clone(), rx: 0.0195 * hs, ry: 0.0135 * hs, rz: 0.002, ws: 14, hs: 8, w: headW, color: () => [0.03, 0.03, 0.035] });
      const t0 = c.clone().add(new V3(s * 0.021 * hs, 0.004, 0)), t1 = headSurf(s, 0.12, -0.1, 1.04);
      sweep(G.shoe, { a: t0, b: t1, n: 6, seg: 2, ax: Y, az: X, rx: () => 0.0018, rz: () => 0.0018, w: () => headW, color: () => frameC });
    }
    const l = headSurf(0.17, 0.14, 1).add(new V3(0, 0, 0.012 * hs)), r = l.clone(); r.x = -l.x;
    sweep(G.shoe, { a: l, b: r, n: 6, seg: 2, ax: Y, az: Z, rx: () => 0.0018, rz: () => 0.0018, w: () => headW, color: () => frameC });
  }

  // ---- assemblage
  const group = new THREE.Group();
  group.add(bones[bi.Hips]);
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const mats = {
    skin: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.52, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(0.8, 0.45, 0.35), clearcoat: 0.04 }),
    cloth: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.88, sheen: 0.6, sheenRoughness: 0.8, side: THREE.DoubleSide }),
    hair: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.9, sheenRoughness: 0.4, sheenColor: new THREE.Color(0.6, 0.55, 0.5), side: THREE.DoubleSide }),
    shoe: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }),
    eye: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12 })
  };
  for (const k in G) {
    if (!G[k].n) continue;
    const m = new THREE.SkinnedMesh(G[k].build(), mats[k]);
    m.castShadow = true; m.receiveShadow = k !== "eye"; m.frustumCulled = false;
    group.add(m); m.bind(skeleton, new THREE.Matrix4());
  }
  group.userData.groundY = 0;
  group.userData.mouth = { pos: headSurf(0, -0.5, 1).add(new V3(0, 0, 0.002)), w: 0.019 * hs, h: 0.006 * hs, lip };
  return { scene: group, animations: [] };
}
