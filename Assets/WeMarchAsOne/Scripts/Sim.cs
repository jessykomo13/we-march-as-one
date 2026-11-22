using UnityEngine;

namespace WMAO
{
    /// <summary>
    /// Simulation data-oriented : chaque soldat et chaque projectile est simulé individuellement.
    /// Grille spatiale (listes chaînées) pour la recherche de cible, la séparation et les dégâts de zone.
    /// </summary>
    public class Sim
    {
        public const float W = 160f, H = 90f, Cell = 2f;
        const int PCap = 40000;
        public const float TimeLimit = 300f;

        public readonly int cap;
        public int count;
        public float[] x, z, hx, hz, hp, cd, dmg, range, speed, cool, size, projSpd, reward, deathT;
        public byte[] team, type, order;
        public bool[] alive, ranged;
        public int[] target;
        int[] wait;

        readonly int gw, gh;
        readonly int[] head;
        readonly int[] next;

        public readonly int[] aliveCount = new int[2], startCount = new int[2];
        public float goldF, time;
        public readonly float[] speedBuff = { 1f, 1f };
        float rallyT;
        public bool finished; public int winner = -1;
        readonly Vector2[] cen = new Vector2[2];

        // projectiles
        public int pCount;
        readonly float[] ppx = new float[PCap], ppz = new float[PCap], ptx = new float[PCap], ptz = new float[PCap];
        readonly float[] pdmg = new float[PCap], pspd = new float[PCap], parea = new float[PCap], pd0 = new float[PCap], parc = new float[PCap];
        readonly int[] ptgt = new int[PCap];
        readonly byte[] pteam = new byte[PCap];

        public Sim(int capacity)
        {
            cap = Mathf.Max(1, capacity);
            x = new float[cap]; z = new float[cap]; hx = new float[cap]; hz = new float[cap];
            hp = new float[cap]; cd = new float[cap]; dmg = new float[cap]; range = new float[cap];
            speed = new float[cap]; cool = new float[cap]; size = new float[cap]; projSpd = new float[cap];
            reward = new float[cap]; deathT = new float[cap];
            team = new byte[cap]; type = new byte[cap]; order = new byte[cap];
            alive = new bool[cap]; ranged = new bool[cap];
            target = new int[cap]; wait = new int[cap]; next = new int[cap];
            gw = Mathf.CeilToInt(W / Cell) + 1; gh = Mathf.CeilToInt(H / Cell) + 1;
            head = new int[gw * gh];
        }

        public void Add(float px, float pz, int t, int o, int tm, UnitStats s, float rew)
        {
            if (count >= cap) return;
            int i = count++;
            x[i] = px; z[i] = pz; hx[i] = tm == 0 ? 1f : -1f; hz[i] = 0f;
            hp[i] = s.hp; cd[i] = Random.value * s.cooldown; dmg[i] = s.dmg; range[i] = s.range;
            speed[i] = s.speed * (0.92f + 0.16f * Random.value); cool[i] = s.cooldown; size[i] = s.size;
            ranged[i] = s.ranged; projSpd[i] = s.projSpeed; reward[i] = rew;
            team[i] = (byte)tm; type[i] = (byte)t; order[i] = (byte)o;
            alive[i] = true; target[i] = -1; wait[i] = i % 8;
            aliveCount[tm]++; startCount[tm]++;
        }

        int CX(float px) { int c = (int)((px + W * 0.5f) / Cell); return c < 0 ? 0 : (c >= gw ? gw - 1 : c); }
        int CZ(float pz) { int c = (int)((pz + H * 0.5f) / Cell); return c < 0 ? 0 : (c >= gh ? gh - 1 : c); }

        void BuildGrid()
        {
            for (int c = 0; c < head.Length; c++) head[c] = -1;
            for (int i = 0; i < count; i++)
            {
                if (!alive[i]) continue;
                int c = CZ(z[i]) * gw + CX(x[i]);
                next[i] = head[c]; head[c] = i;
            }
        }

        void Centroids()
        {
            float sx0 = 0, sz0 = 0, sx1 = 0, sz1 = 0; int n0 = 0, n1 = 0;
            for (int i = 0; i < count; i++)
            {
                if (!alive[i]) continue;
                if (team[i] == 0) { sx0 += x[i]; sz0 += z[i]; n0++; } else { sx1 += x[i]; sz1 += z[i]; n1++; }
            }
            if (n0 > 0) cen[0] = new Vector2(sx0 / n0, sz0 / n0);
            if (n1 > 0) cen[1] = new Vector2(sx1 / n1, sz1 / n1);
        }

        public void Step(float dt)
        {
            if (finished) return;
            time += dt;
            if (rallyT > 0f) { rallyT -= dt; if (rallyT <= 0f) speedBuff[0] = 1f; }

            BuildGrid();
            Centroids();
            for (int i = 0; i < count; i++) if (alive[i]) UpdateUnit(i, dt);
            Separate();
            UpdateProjectiles(dt);

            if (aliveCount[0] <= 0 || aliveCount[1] <= 0)
            {
                finished = true; winner = aliveCount[0] > 0 ? 0 : 1;
            }
            else if (time >= TimeLimit)
            {
                finished = true;
                float r0 = aliveCount[0] / (float)Mathf.Max(1, startCount[0]);
                float r1 = aliveCount[1] / (float)Mathf.Max(1, startCount[1]);
                winner = r0 > r1 ? 0 : 1;
            }
        }

        int FindTarget(int i, float maxR)
        {
            int cx = CX(x[i]), cz = CZ(z[i]);
            int rings = Mathf.CeilToInt(maxR / Cell);
            int best = -1; float bestD = maxR * maxR; byte my = team[i];
            float xi = x[i], zi = z[i];
            for (int r = 0; r <= rings; r++)
            {
                for (int dz = -r; dz <= r; dz++)
                {
                    int gz = cz + dz; if (gz < 0 || gz >= gh) continue;
                    bool edgeRow = dz == -r || dz == r;
                    int step = edgeRow ? 1 : 2 * r; if (step == 0) step = 1;
                    for (int dx = -r; dx <= r; dx += step)
                    {
                        int gx = cx + dx; if (gx < 0 || gx >= gw) continue;
                        for (int j = head[gz * gw + gx]; j != -1; j = next[j])
                        {
                            if (team[j] == my || !alive[j]) continue;
                            float ddx = x[j] - xi, ddz = z[j] - zi; float d = ddx * ddx + ddz * ddz;
                            if (d < bestD) { bestD = d; best = j; }
                        }
                    }
                }
                float ringDist = r * Cell;
                if (best != -1 && bestD <= ringDist * ringDist) break;
            }
            return best;
        }

        void UpdateUnit(int i, float dt)
        {
            cd[i] -= dt;
            int t = target[i];
            bool lost = t >= 0 && !alive[t];
            if (lost) t = -1;
            if (lost || --wait[i] <= 0)
            {
                float r = order[i] == (byte)Order.Tenir ? Mathf.Max(range[i] + 4f, 8f) : Mathf.Max(range[i] + 2f, 16f);
                t = FindTarget(i, r);
                wait[i] = t >= 0 ? 6 + (i & 3) : 10 + (i & 7);
            }
            target[i] = t;

            float spd = speed[i] * speedBuff[team[i]];
            float mx = 0f, mz = 0f;
            if (t >= 0)
            {
                float dx = x[t] - x[i], dz = z[t] - z[i];
                float d = Mathf.Sqrt(dx * dx + dz * dz) + 1e-5f;
                float reach = range[i] + (size[i] + size[t]) * 0.5f;
                hx[i] = dx / d; hz[i] = dz / d;
                if (d <= reach)
                {
                    if (cd[i] <= 0f)
                    {
                        cd[i] = cool[i];
                        if (ranged[i]) Fire(i, t); else Damage(t, dmg[i], team[i]);
                    }
                }
                else { mx = hx[i]; mz = hz[i]; }
            }
            else if (order[i] == (byte)Order.Marche)
            {
                int et = 1 - team[i];
                if (aliveCount[et] > 0)
                {
                    float dx = cen[et].x - x[i], dz = (cen[et].y - z[i]) * 0.35f;
                    float d = Mathf.Sqrt(dx * dx + dz * dz);
                    if (d > 0.5f) { mx = dx / d; mz = dz / d; hx[i] = mx; hz[i] = mz; }
                }
            }
            if (mx != 0f || mz != 0f) { x[i] += mx * spd * dt; z[i] += mz * spd * dt; }
        }

        void Separate()
        {
            const float hw = W * 0.5f - 0.3f, hh = H * 0.5f - 0.3f;
            for (int i = 0; i < count; i++)
            {
                if (!alive[i]) continue;
                int cx = CX(x[i]), cz = CZ(z[i]); int checks = 0;
                float ox = 0f, oz = 0f; float si = size[i];
                for (int gz = cz - 1; gz <= cz + 1 && checks < 12; gz++)
                {
                    if (gz < 0 || gz >= gh) continue;
                    for (int gx = cx - 1; gx <= cx + 1 && checks < 12; gx++)
                    {
                        if (gx < 0 || gx >= gw) continue;
                        for (int j = head[gz * gw + gx]; j != -1 && checks < 12; j = next[j])
                        {
                            if (j == i || !alive[j]) continue;
                            float dx = x[i] - x[j], dz = z[i] - z[j];
                            float md = (si + size[j]) * 0.48f;
                            float d2 = dx * dx + dz * dz;
                            if (d2 >= md * md) continue;
                            checks++;
                            if (d2 < 1e-6f) { dx = ((i * 7919) % 13 - 6) * 0.01f + 0.001f; dz = ((i * 104729) % 11 - 5) * 0.01f; d2 = dx * dx + dz * dz; }
                            float d = Mathf.Sqrt(d2);
                            float w = size[j] / (si + size[j]);
                            float push = (md - d) / d * w;
                            ox += dx * push; oz += dz * push;
                        }
                    }
                }
                float nx = x[i] + ox, nz = z[i] + oz;
                x[i] = nx < -hw ? -hw : (nx > hw ? hw : nx);
                z[i] = nz < -hh ? -hh : (nz > hh ? hh : nz);
            }
        }

        void Fire(int i, int t)
        {
            if (pCount >= PCap) { Damage(t, dmg[i], team[i]); return; }
            SpawnProj(x[i], z[i], x[t], z[t], t, dmg[i], projSpd[i], 0f, team[i], 0.12f);
        }

        void SpawnProj(float sx, float sz, float tx, float tz, int tgt, float d, float spd, float area, byte tm, float arc)
        {
            if (pCount >= PCap) return;
            int p = pCount++;
            ppx[p] = sx; ppz[p] = sz; ptx[p] = tx; ptz[p] = tz; ptgt[p] = tgt; pdmg[p] = d; pspd[p] = spd;
            parea[p] = area; pteam[p] = tm; parc[p] = arc;
            float dx = tx - sx, dz = tz - sz; pd0[p] = Mathf.Sqrt(dx * dx + dz * dz) + 0.01f;
        }

        void RemoveProj(int p)
        {
            int l = --pCount;
            if (p == l) return;
            ppx[p] = ppx[l]; ppz[p] = ppz[l]; ptx[p] = ptx[l]; ptz[p] = ptz[l]; ptgt[p] = ptgt[l];
            pdmg[p] = pdmg[l]; pspd[p] = pspd[l]; parea[p] = parea[l]; pteam[p] = pteam[l]; pd0[p] = pd0[l]; parc[p] = parc[l];
        }

        void UpdateProjectiles(float dt)
        {
            for (int p = 0; p < pCount;)
            {
                int t = ptgt[p];
                if (t >= 0 && alive[t]) { ptx[p] = x[t]; ptz[p] = z[t]; }
                float dx = ptx[p] - ppx[p], dz = ptz[p] - ppz[p];
                float d = Mathf.Sqrt(dx * dx + dz * dz);
                float st = pspd[p] * dt;
                if (d <= st)
                {
                    if (parea[p] > 0f) DamageArea(ptx[p], ptz[p], parea[p], pdmg[p], pteam[p]);
                    else if (t >= 0 && alive[t]) Damage(t, pdmg[p], pteam[p]);
                    RemoveProj(p);
                    continue;
                }
                ppx[p] += dx / d * st; ppz[p] += dz / d * st;
                p++;
            }
        }

        void DamageArea(float px, float pz, float r, float d, byte att)
        {
            int x0 = CX(px - r), x1 = CX(px + r), z0 = CZ(pz - r), z1 = CZ(pz + r);
            float r2 = r * r;
            for (int gz = z0; gz <= z1; gz++)
                for (int gx = x0; gx <= x1; gx++)
                    for (int j = head[gz * gw + gx]; j != -1; j = next[j])
                    {
                        if (team[j] == att || !alive[j]) continue;
                        float dx = x[j] - px, dz = z[j] - pz;
                        if (dx * dx + dz * dz <= r2) Damage(j, d, att);
                    }
        }

        void Damage(int t, float d, byte att)
        {
            if (!alive[t]) return;
            hp[t] -= d;
            if (hp[t] <= 0f)
            {
                alive[t] = false; deathT[t] = time;
                aliveCount[team[t]]--;
                if (team[t] == 1) goldF += reward[t];
            }
        }

        // ---------- Commandes en temps réel ----------
        public void SetOrder(int tm, Order o)
        {
            for (int i = 0; i < count; i++) if (team[i] == tm) { order[i] = (byte)o; if (o == Order.Marche) wait[i] = 0; }
        }

        public void Volley(Vector2 p, float r, float d, int arrows)
        {
            for (int k = 0; k < arrows; k++)
            {
                Vector2 o = Random.insideUnitCircle * r;
                float sx = p.x - 30f + Random.Range(-4f, 4f), sz = p.y + Random.Range(-8f, 8f);
                SpawnProj(sx, sz, p.x + o.x, p.y + o.y, -1, d, Random.Range(26f, 34f), 1.0f, 0, 0.35f);
            }
        }

        public void Rally(float dur) { speedBuff[0] = 1.7f; rallyT = dur; }

        // ---------- Rendu ----------
        public void Render(Batcher b)
        {
            for (int i = 0; i < count; i++)
            {
                float s = size[i];
                if (alive[i]) b.Add(team[i] * Defs.TypeCount + type[i], x[i], 0f, z[i], hx[i], hz[i], s, s, s);
                else if (time - deathT[i] < 3f) b.Add(Batcher.Dead, x[i], 0f, z[i], hx[i], hz[i], s * 0.8f, 0.04f, s * 0.8f);
            }
            for (int p = 0; p < pCount; p++)
            {
                float dx = ptx[p] - ppx[p], dz = ptz[p] - ppz[p];
                float d = Mathf.Sqrt(dx * dx + dz * dz) + 1e-5f;
                float f = 1f - Mathf.Clamp01(d / pd0[p]);
                float y = 0.4f + parc[p] * pd0[p] * 4f * f * (1f - f);
                b.Add(Batcher.Proj, ppx[p], y, ppz[p], dx / d, dz / d, 0.75f, 0.1f, 0.1f);
            }
        }
    }
}
