// ============================================================================
// Simulation : chaque soldat et chaque projectile est simulé individuellement.
// Collisions dures (les formes ne se traversent pas), obstacles, rivières lentes.
// ============================================================================
import { SHAPES, MAP_W, MAP_H, HW, HH } from './data.js?v=7';

const G = 1.0;                                   // cellule de la grille spatiale
const GW = Math.ceil(MAP_W / G) + 1, GH = Math.ceil(MAP_H / G) + 1;
export const TIME_LIMIT = 240;

export class Sim {
  constructor(cap, terrain) {
    this.cap = Math.max(1, cap); this.n = 0;
    const F = () => new Float32Array(this.cap);
    this.x = F(); this.z = F(); this.vx = F(); this.vz = F(); this.hx = F(); this.hz = F();
    this.hp = F(); this.maxHp = F(); this.cd = F(); this.dmg = F(); this.range = F(); this.speed = F();
    this.cool = F(); this.r = F(); this.ps = F(); this.reward = F(); this.deathT = F(); this.hitT = F();
    this.team = new Uint8Array(this.cap); this.type = new Uint8Array(this.cap); this.order = new Uint8Array(this.cap);
    this.alive = new Uint8Array(this.cap); this.ranged = new Uint8Array(this.cap); this.king = new Uint8Array(this.cap);
    this.target = new Int32Array(this.cap); this.wait = new Int32Array(this.cap); this.next = new Int32Array(this.cap);
    this.head = new Int32Array(GW * GH);
    this.aliveC = [0, 0]; this.startC = [0, 0]; this.gold = 0; this.time = 0;
    this.buff = [1, 1]; this.rallyT = 0; this.kings = [];
    this.finished = false; this.winner = -1; this.cen = [[0, 0], [0, 0]];
    this.deaths = 0; this.events = []; this.impacts = [];
    // champs de navigation : distance (en cases) jusqu'à l'ennemi le plus proche, pour chaque camp
    this.field = [new Int32Array(GW * GH), new Int32Array(GW * GH)];
    this.queue = new Int32Array(GW * GH);
    this.lastHit = 0; this.forceMarch = false; this.stepN = 0;
    // projectiles
    const PC = 30000; this.PC = PC; this.pn = 0;
    this.px = new Float32Array(PC); this.pz = new Float32Array(PC); this.tx = new Float32Array(PC); this.tz = new Float32Array(PC);
    this.pd = new Float32Array(PC); this.pspd = new Float32Array(PC); this.parea = new Float32Array(PC); this.pd0 = new Float32Array(PC);
    this.parc = new Float32Array(PC); this.ptgt = new Int32Array(PC); this.pteam = new Uint8Array(PC);
    this.buildTerrain(terrain);
  }

  // ------------------------------------------------------------ terrain
  buildTerrain(t) {
    this.block = new Int16Array(GW * GH).fill(-1);  // collisions : obstacle qui touche la cellule
    this.nav = new Uint8Array(GW * GH);              // navigation : 1 si le centre de la cellule est dans un obstacle
    this.slow = new Uint8Array(GW * GH);
    this.obs = [];
    const mark = (x0, z0, x1, z1, id) => {
      for (let gz = this.cz(z0); gz <= this.cz(z1); gz++) for (let gx = this.cx(x0); gx <= this.cx(x1); gx++) {
        const c = gz * GW + gx; this.block[c] = id;
        const cx = gx * G - HW + G / 2, cz = gz * G - HH + G / 2, m = .3;   // marge ≈ rayon d'une unité
        if (cx > x0 - m && cx < x1 + m && cz > z0 - m && cz < z1 + m) this.nav[c] = 1;
      }
    };
    for (const b of t.buildings) { const o = { x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.h / 2, z1: b.z + b.h / 2 }; this.obs.push(o); mark(o.x0, o.z0, o.x1, o.z1, this.obs.length - 1); }
    for (const tr of t.trees) { const o = { x0: tr.x - .45, x1: tr.x + .45, z0: tr.z - .45, z1: tr.z + .45 }; this.obs.push(o); mark(o.x0, o.z0, o.x1, o.z1, this.obs.length - 1); }
    for (const rv of t.rivers) {
      for (let gz = this.cz(rv.z0); gz <= this.cz(rv.z1); gz++) for (let gx = 0; gx < GW; gx++) {
        const x = gx * G - HW + G / 2;
        if (!rv.gaps.some(g => x >= g[0] && x <= g[1])) this.slow[gz * GW + gx] = 1;
      }
    }
  }

  // ------------------------------------------------------------ unités
  add(x, z, t, order, team, st, reward, king = false) {
    if (this.n >= this.cap) return -1; const i = this.n++;
    const mul = king ? 10 : 1;
    this.x[i] = x; this.z[i] = z; this.hx[i] = 0; this.hz[i] = team === 0 ? -1 : 1;
    this.hp[i] = this.maxHp[i] = st.hp * mul; this.dmg[i] = st.dmg * mul; this.range[i] = st.range;
    this.speed[i] = st.speed * (.94 + .12 * Math.random()); this.cool[i] = st.cd; this.cd[i] = Math.random() * st.cd;
    this.r[i] = st.r * (king ? 2.2 : 1); this.ranged[i] = st.ranged ? 1 : 0; this.ps[i] = st.pspeed || 0;
    this.reward[i] = reward * mul; this.team[i] = team; this.type[i] = t; this.order[i] = order;
    this.alive[i] = 1; this.king[i] = king ? 1 : 0; this.target[i] = -1; this.wait[i] = i % 8; this.hitT[i] = -9;
    this.aliveC[team]++; this.startC[team]++;
    if (king) this.kings.push(i);
    return i;
  }
  cx(x) { const c = ((x + HW) / G) | 0; return c < 0 ? 0 : c >= GW ? GW - 1 : c; }
  cz(z) { const c = ((z + HH) / G) | 0; return c < 0 ? 0 : c >= GH ? GH - 1 : c; }

  grid() {
    this.head.fill(-1);
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      const c = this.cz(this.z[i]) * GW + this.cx(this.x[i]);
      this.next[i] = this.head[c]; this.head[c] = i;
    }
  }
  centroids() {
    let a = 0, b = 0, c = 0, d = 0, n0 = 0, n1 = 0;
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      if (this.team[i] === 0) { a += this.x[i]; b += this.z[i]; n0++; } else { c += this.x[i]; d += this.z[i]; n1++; }
    }
    if (n0) this.cen[0] = [a / n0, b / n0]; if (n1) this.cen[1] = [c / n1, d / n1];
  }

  step(dt) {
    if (this.finished) return;
    this.time += dt;
    if (this.rallyT > 0) { this.rallyT -= dt; if (this.rallyT <= 0) this.buff[0] = 1; }
    this.grid(); this.centroids();
    if (this.stepN++ % 12 === 0) { this.buildField(0); this.buildField(1); }
    // anti-blocage : si plus personne ne se bat depuis 5 s, tout le monde marche
    if (!this.forceMarch && this.time - this.lastHit > 5 && this.pn === 0 && this.time > 3) this.forceMarch = true;
    // aura des rois : +30% vitesse aux alliés proches (calculée par unité via kings[])
    const K = this.kings.filter(k => this.alive[k]);
    for (let i = 0; i < this.n; i++) if (this.alive[i]) this.unit(i, dt, K);
    this.collide(); if (this.n < 15000 || (this.stepN & 1)) this.collide();
    this.projectiles(dt);
    if (this.aliveC[0] <= 0 || this.aliveC[1] <= 0) { this.finished = true; this.winner = this.aliveC[0] > 0 ? 0 : 1; }
    else if (this.time >= TIME_LIMIT) { this.finished = true; this.winner = this.aliveC[0] / this.startC[0] > this.aliveC[1] / this.startC[1] ? 0 : 1; }
  }

  // ennemi le plus proche (anneaux de cellules)
  find(i, maxR) {
    const cx = this.cx(this.x[i]), cz = this.cz(this.z[i]), rings = Math.ceil(maxR / G), my = this.team[i];
    const xi = this.x[i], zi = this.z[i], head = this.head, next = this.next, X = this.x, Z = this.z, TM = this.team, AL = this.alive;
    let best = -1, bd = maxR * maxR;
    for (let r = 0; r <= rings; r++) {
      for (let dz = -r; dz <= r; dz++) {
        const gz = cz + dz; if (gz < 0 || gz >= GH) continue;
        const st = (dz === -r || dz === r || r === 0) ? 1 : 2 * r;
        for (let dx = -r; dx <= r; dx += st) {
          const gx = cx + dx; if (gx < 0 || gx >= GW) continue;
          for (let j = head[gz * GW + gx]; j !== -1; j = next[j]) {
            if (TM[j] === my || !AL[j]) continue;
            const a = X[j] - xi, b = Z[j] - zi, d = a * a + b * b; if (d < bd) { bd = d; best = j; }
          }
        }
      }
      const rd = r * G; if (best !== -1 && bd <= rd * rd) break;
    }
    return best;
  }

  unit(i, dt, K) {
    this.cd[i] -= dt;
    let t = this.target[i];
    const lost = t >= 0 && !this.alive[t]; if (lost) t = -1;
    const holdO = this.order[i] === 1 && !this.forceMarch;
    if (lost || --this.wait[i] <= 0) {
      const r = holdO ? Math.max(this.range[i] + 5, 7) : Math.max(this.range[i] + 2.5, 9);
      t = this.find(i, r); this.wait[i] = t >= 0 ? 6 + (i & 3) : 14 + (i & 15);
    }
    this.target[i] = t;
    let spd = this.speed[i] * this.buff[this.team[i]];
    if (K.length) for (const k of K) if (k !== i && this.team[k] === this.team[i]) { const a = this.x[k] - this.x[i], b = this.z[k] - this.z[i]; if (a * a + b * b < 49) { spd *= 1.3; break; } }
    if (this.slow[this.cz(this.z[i]) * GW + this.cx(this.x[i])]) spd *= .4;
    let mx = 0, mz = 0;
    const hold = this.order[i] === 1 && !this.forceMarch;
    if (t >= 0) {
      const dx = this.x[t] - this.x[i], dz = this.z[t] - this.z[i], d = Math.sqrt(dx * dx + dz * dz) + 1e-5;
      const reach = this.range[i] + this.r[i] + this.r[t] + .04;
      this.hx[i] = dx / d; this.hz[i] = dz / d;
      if (d <= reach) {
        if (this.cd[i] <= 0) {
          this.cd[i] = this.cool[i];
          if (this.ranged[i]) this.fire(i, t); else this.damage(t, this.dmg[i], this.team[i]);
        }
      } else if (d < 2.5) { mx = this.hx[i]; mz = this.hz[i]; }
      else { const f = this.flow(i); if (f) { mx = f[0]; mz = f[1]; } else { mx = this.hx[i]; mz = this.hz[i]; } }
    } else if (!hold) {
      // MARCHE : suit le champ de navigation (contourne bâtiments, prend les ponts) jusqu'à l'ennemi le plus proche
      const f = this.flow(i);
      if (f) { mx = f[0]; mz = f[1]; this.hx[i] = mx; this.hz[i] = mz; }
    }
    // vitesse lissée (évite les à-coups)
    this.vx[i] += (mx * spd - this.vx[i]) * Math.min(1, dt * 10);
    this.vz[i] += (mz * spd - this.vz[i]) * Math.min(1, dt * 10);
    this.x[i] += this.vx[i] * dt; this.z[i] += this.vz[i] * dt;
  }

  // BFS multi-sources depuis toutes les unités ennemies (obstacles infranchissables)
  buildField(team) {
    const F = this.field[team], Q = this.queue, B = this.nav, et = 1 - team;
    F.fill(0x3fffffff);
    let qh = 0, qt = 0;
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i] || this.team[i] !== et) continue;
      const c = this.cz(this.z[i]) * GW + this.cx(this.x[i]);
      if (F[c] !== 0) { F[c] = 0; Q[qt++] = c; }
    }
    while (qh < qt) {
      const c = Q[qh++], gx = c % GW, gz = (c / GW) | 0, nd = F[c] + 1;
      for (let dz = -1; dz <= 1; dz++) {
        const z = gz + dz; if (z < 0 || z >= GH) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const x = gx + dx; if (x < 0 || x >= GW) continue;
          const k = z * GW + x;
          if (F[k] <= nd || B[k]) continue;
          // pas de coupe en diagonale à travers un coin de bâtiment
          if (dx && dz && (B[gz * GW + x] || B[z * GW + gx])) continue;
          F[k] = nd; Q[qt++] = k;
        }
      }
    }
  }
  // direction vers la case voisine la plus proche de l'ennemi
  flow(i) {
    const F = this.field[this.team[i]], gx = this.cx(this.x[i]), gz = this.cz(this.z[i]);
    const INF = 0x3fffffff, here = F[gz * GW + gx], N = this.nav;
    let best = here, bx = 0, bz = 0;
    for (let dz = -1; dz <= 1; dz++) {
      const z = gz + dz; if (z < 0 || z >= GH) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = gx + dx; if (x < 0 || x >= GW) continue;
        if (dx && dz && (N[gz * GW + x] || N[z * GW + gx])) continue;   // ne coupe pas les coins
        const v = F[z * GW + x];
        if (v < best) { best = v; bx = dx; bz = dz; }
      }
    }
    if (!bx && !bz && here >= INF) {
      // aucune case accessible connue (coincé contre un mur) : se décaler vers une case libre voisine
      for (let r = 1; r <= 3; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const x = gx + dx, z = gz + dz; if (x < 0 || z < 0 || x >= GW || z >= GH) continue;
        if (F[z * GW + x] < INF) { const ex = dx, ez = dz, d = Math.hypot(ex, ez); return [ex / d, ez / d]; }
      }
    }
    if (!bx && !bz) {
      // déjà dans la case la plus proche : va droit vers le centre de la masse ennemie
      const et = 1 - this.team[i]; if (!this.aliveC[et]) return null;
      const ex = this.cen[et][0] - this.x[i], ez = this.cen[et][1] - this.z[i], d = Math.hypot(ex, ez) || 1;
      return [ex / d, ez / d];
    }
    // vise le centre de la case suivante (mouvement fluide)
    const tx = (gx + bx) * G - HW + G / 2, tz = (gz + bz) * G - HH + G / 2;
    const ex = tx - this.x[i], ez = tz - this.z[i], d = Math.hypot(ex, ez) || 1;
    return [ex / d, ez / d];
  }

  // collisions dures entre formes + obstacles + bords
  collide() {
    const X = this.x, Z = this.z, R = this.r, AL = this.alive, head = this.head, next = this.next, n = this.n;
    for (let i = 0; i < n; i++) {
      if (!AL[i]) continue;
      const cx = this.cx(X[i]), cz = this.cz(Z[i]); const ri = R[i];
      const wi = this.king[i] ? 0.1 : 1;
      for (let gz = cz - 1; gz <= cz + 1; gz++) {
        if (gz < 0 || gz >= GH) continue;
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gx >= GW) continue;
          for (let j = head[gz * GW + gx]; j !== -1; j = next[j]) {
            if (j <= i || !AL[j]) continue;
            let dx = X[i] - X[j], dz = Z[i] - Z[j]; const md = ri + R[j]; let d2 = dx * dx + dz * dz;
            if (d2 >= md * md) continue;
            if (d2 < 1e-8) { dx = (Math.random() - .5) * .01; dz = (Math.random() - .5) * .01; d2 = dx * dx + dz * dz + 1e-8; }
            const d = Math.sqrt(d2), pen = (md - d) / d;
            // les gros (et les rois) poussent plus qu'ils ne sont poussés
            const mi = ri * ri * wi, mj = R[j] * R[j] * (this.king[j] ? 0.1 : 1), sum = mi + mj;
            const ai = mj / sum, aj = mi / sum;
            X[i] += dx * pen * ai; Z[i] += dz * pen * ai;
            X[j] -= dx * pen * aj; Z[j] -= dz * pen * aj;
          }
        }
      }
      // obstacles
      const b = this.block[this.cz(Z[i]) * GW + this.cx(X[i])];
      if (b >= 0) this.pushOut(i, this.obs[b]);
      // bords
      const lx = HW - ri, lz = HH - ri;
      if (X[i] < -lx) X[i] = -lx; else if (X[i] > lx) X[i] = lx;
      if (Z[i] < -lz) Z[i] = -lz; else if (Z[i] > lz) Z[i] = lz;
    }
  }
  pushOut(i, o) {
    const x = this.x[i], z = this.z[i], r = this.r[i];
    if (x < o.x0 - r || x > o.x1 + r || z < o.z0 - r || z > o.z1 + r) return;
    const l = x - (o.x0 - r), rr = (o.x1 + r) - x, t = z - (o.z0 - r), bb = (o.z1 + r) - z;
    const m = Math.min(l, rr, t, bb);
    if (m === l) this.x[i] = o.x0 - r; else if (m === rr) this.x[i] = o.x1 + r; else if (m === t) this.z[i] = o.z0 - r; else this.z[i] = o.z1 + r;
  }

  fire(i, t) {
    if (this.pn >= this.PC) { this.damage(t, this.dmg[i], this.team[i]); return; }
    this.spawnP(this.x[i], this.z[i], this.x[t], this.z[t], t, this.dmg[i], this.ps[i], 0, this.team[i], .16);
  }
  spawnP(sx, sz, tx, tz, tgt, d, spd, area, tm, arc) {
    if (this.pn >= this.PC) return; const p = this.pn++;
    this.px[p] = sx; this.pz[p] = sz; this.tx[p] = tx; this.tz[p] = tz; this.ptgt[p] = tgt; this.pd[p] = d; this.pspd[p] = spd;
    this.parea[p] = area; this.pteam[p] = tm; this.parc[p] = arc; this.pd0[p] = Math.hypot(tx - sx, tz - sz) + .01;
  }
  removeP(p) {
    const l = --this.pn; if (p === l) return;
    this.px[p] = this.px[l]; this.pz[p] = this.pz[l]; this.tx[p] = this.tx[l]; this.tz[p] = this.tz[l]; this.ptgt[p] = this.ptgt[l];
    this.pd[p] = this.pd[l]; this.pspd[p] = this.pspd[l]; this.parea[p] = this.parea[l]; this.pteam[p] = this.pteam[l]; this.pd0[p] = this.pd0[l]; this.parc[p] = this.parc[l];
  }
  projectiles(dt) {
    for (let p = 0; p < this.pn;) {
      const t = this.ptgt[p];
      if (t >= 0 && this.alive[t]) { this.tx[p] = this.x[t]; this.tz[p] = this.z[t]; }
      const dx = this.tx[p] - this.px[p], dz = this.tz[p] - this.pz[p], d = Math.sqrt(dx * dx + dz * dz), st = this.pspd[p] * dt;
      if (d <= st) {
        if (this.parea[p] > 0) { this.area(this.tx[p], this.tz[p], this.parea[p], this.pd[p], this.pteam[p]); if (this.impacts.length < 400) this.impacts.push(this.tx[p], this.tz[p]); }
        else if (t >= 0 && this.alive[t]) this.damage(t, this.pd[p], this.pteam[p]);
        this.removeP(p); continue;
      }
      this.px[p] += dx / d * st; this.pz[p] += dz / d * st; p++;
    }
  }
  area(px, pz, r, d, att) {
    const x0 = this.cx(px - r), x1 = this.cx(px + r), z0 = this.cz(pz - r), z1 = this.cz(pz + r), r2 = r * r;
    for (let gz = z0; gz <= z1; gz++) for (let gx = x0; gx <= x1; gx++)
      for (let j = this.head[gz * GW + gx]; j !== -1; j = this.next[j]) {
        if (this.team[j] === att || !this.alive[j]) continue;
        const a = this.x[j] - px, b = this.z[j] - pz; if (a * a + b * b <= r2) this.damage(j, d, att);
      }
  }
  damage(t, d, att) {
    if (!this.alive[t]) return;
    this.hp[t] -= d; this.hitT[t] = this.time; this.lastHit = this.time; this.forceMarch = false;
    if (this.hp[t] <= 0) {
      this.alive[t] = 0; this.deathT[t] = this.time; this.aliveC[this.team[t]]--; this.deaths++; if (this.events.length < 4000) this.events.push(t);
      if (this.team[t] === 1) this.gold += this.reward[t];
    }
  }

  // ---------------------------------------------------------- Commandement
  setOrder(team, o) { for (let i = 0; i < this.n; i++) if (this.team[i] === team) { this.order[i] = o; this.wait[i] = 0; } }
  volley(px, pz, r, d, k) {
    for (let a = 0; a < k; a++) {
      const ang = Math.random() * 6.2832, rr = Math.sqrt(Math.random()) * r;
      this.spawnP(px + (Math.random() * 10 - 5), pz + 28 + Math.random() * 6, px + Math.cos(ang) * rr, pz + Math.sin(ang) * rr, -1, d, 24 + Math.random() * 8, .8, 0, .4);
    }
  }
  rally(dur) { this.buff[0] = 1.6; this.rallyT = dur; }
}
