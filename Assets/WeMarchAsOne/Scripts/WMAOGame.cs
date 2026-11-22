using UnityEngine;
using System.Collections.Generic;

namespace WMAO
{
    public struct Placement
    {
        public float x, z; public byte t, o;
        public Placement(float x, float z, int t, int o) { this.x = x; this.z = z; this.t = (byte)t; this.o = (byte)o; }
    }

    /// <summary>
    /// We March as One — recréation Unity. Se lance tout seul : ouvre n'importe quelle scène et appuie sur Play.
    /// </summary>
    public class WMAOGame : MonoBehaviour
    {
        public static WMAOGame Instance;
        enum State { Prep, Battle, Result }
        enum Mode { Campagne, BacASable }
        enum CamMode { Vue2D, Vue3D, Survol }

#if UNITY_WEBGL && !UNITY_EDITOR
        const int MaxUnits = 30000; // le WebGL tourne sur un seul thread
#else
        const int MaxUnits = 60000;
#endif
        const float HalfW = Sim.W * 0.5f, HalfH = Sim.H * 0.5f;
        static readonly int[] SpeedVals = { 1, 2, 4, 8 };
        static readonly int[] EncounterLevel = { 1, 3, 6, 9 };

        State state = State.Prep; Mode mode = Mode.Campagne; CamMode camMode = CamMode.Vue2D;
        Progress prog; Sim sim; Batcher batch; Camera cam;

        readonly List<Placement> campPlayer = new List<Placement>(), campEnemy = new List<Placement>();
        readonly List<Placement> sbPlayer = new List<Placement>(), sbEnemy = new List<Placement>();
        List<Placement> PL { get { return mode == Mode.Campagne ? campPlayer : sbPlayer; } }
        List<Placement> EL { get { return mode == Mode.Campagne ? campEnemy : sbEnemy; } }
        readonly int[] placedP = new int[Defs.TypeCount], placedE = new int[Defs.TypeCount];

        // Pinceau
        int brushType, brushOrder, paintTeam; bool erase; float brushSize = 4f, density = 12f, spawnAcc;
        // Caméra
        Vector3 pivot = new Vector3(0, 0, 0); float ortho = 50f, dist = 110f, yaw;
        Vector3 flyPos; float flyYaw, flyPitch;
        Vector2 lastMouse; bool hasMouseWorld; Vector3 mouseWorld;
        bool touchBlock, hadTwo; Vector2 prevMid; float prevPinch;
        // Bataille
        int speedIdx; bool paused, volleyArmed; float volleyReady, rallyReady;
        bool lastWin; int lastGold, lastBonus, lastLost, lastKilled;
        // UI
        int tab; Vector2 scrollA, scrollS; string toast; float toastT; bool confirmReset; float fps = 60f;
        System.Action pending; // actions UI différées (évite les erreurs de layout IMGUI)
        GUIStyle sTitle, sBig, sLbl, sLblB, sSmall, sDim, sGold, sBtn, sBtnS, sBtnBig, sPanel, sCard;

        // ------------------------------------------------------------------ démarrage
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (Instance != null) return;
            new GameObject("We March as One").AddComponent<WMAOGame>();
        }

        void Awake()
        {
            Instance = this;
#if !UNITY_WEBGL || UNITY_EDITOR
            Application.targetFrameRate = 120;
#endif
            Art.Init();
            batch = new Batcher();

            cam = Camera.main;
            if (cam == null)
            {
                var go = new GameObject("Main Camera"); go.tag = "MainCamera";
                cam = go.AddComponent<Camera>();
            }
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.04f, 0.045f, 0.055f);
            cam.nearClipPlane = 0.3f; cam.farClipPlane = 2000f;

            prog = Progress.Load();
            prog.RestorePlacements(campPlayer);
            ClampRosterPlacements();
            if (campPlayer.Count == 0) AutoPlace(campPlayer, 0, true);
            GenEnemy(prog.level);
            if (!MapData.Load(sbPlayer, sbEnemy)) DemoSandbox();
            Recount();
            Toast("Peins tes troupes sur la moitié bleue, puis lance la bataille !");
        }

        void OnApplicationQuit() { SaveAll(); }

        void SaveAll()
        {
            if (prog == null) return;
            prog.StorePlacements(campPlayer);
            prog.Save();
        }

        void Toast(string s) { toast = s; toastT = 4f; }

        // ------------------------------------------------------------------ boucle
        void Update()
        {
            if (pending != null) { var act = pending; pending = null; act(); }
            float dt = Time.unscaledDeltaTime;
            fps = Mathf.Lerp(fps, 1f / Mathf.Max(dt, 1e-4f), 0.05f);
            if (toastT > 0f) toastT -= dt;

            Vector2 mp = WIn.MousePos;
            bool overUI = OverUI(mp);
            if (WIn.Down(KeyCode.C)) SetCam((CamMode)(((int)camMode + 1) % 3));
            UpdateCamera(dt, mp, overUI);
            hasMouseWorld = MouseWorld(mp, out mouseWorld);

            if (state == State.Prep)
            {
                if (!overUI && hasMouseWorld && !touchBlock) HandlePaint(dt); else spawnAcc = 0f;
                if (WIn.Down(KeyCode.Alpha1)) SelectBrush(0);
                if (WIn.Down(KeyCode.Alpha2)) SelectBrush(1);
                if (WIn.Down(KeyCode.Alpha3)) SelectBrush(2);
                if (WIn.Down(KeyCode.Alpha4)) SelectBrush(3);
            }
            else if (state == State.Battle)
            {
                if (WIn.Down(KeyCode.Space)) paused = !paused;
                if (!paused)
                {
                    float sdt = Mathf.Min(dt, 1f / 30f);
                    int steps = SpeedVals[speedIdx];
                    for (int s = 0; s < steps && !sim.finished; s++) sim.Step(sdt);
                }
                if (volleyArmed && WIn.LMBDown && !overUI && hasMouseWorld && !touchBlock)
                {
                    int lv = Mathf.Max(1, VolleyLevel);
                    sim.Volley(new Vector2(mouseWorld.x, mouseWorld.z), 7f, 6f * (1f + 0.35f * (lv - 1)), 90);
                    volleyReady = sim.time + 12f; volleyArmed = false;
                }
                if (sim.finished) EndBattle();
            }

            Render(overUI);
            lastMouse = mp;
        }

        int VolleyLevel { get { return mode == Mode.BacASable ? 1 : prog.Lvl("volley"); } }
        int RallyLevel { get { return mode == Mode.BacASable ? 1 : prog.Lvl("rally"); } }

        bool TypeAllowed(int t)
        {
            if (mode == Mode.Campagne) return prog.Unlocked(t);
            return prog.Unlocked(t) || prog.bestLevel >= EncounterLevel[t];
        }

        void SelectBrush(int t) { if (TypeAllowed(t)) { brushType = t; erase = false; } }

        // ------------------------------------------------------------------ peinture
        static bool InZone(int team, float x, float z)
        {
            if (z < -HalfH + 1f || z > HalfH - 1f) return false;
            return team == 0 ? (x > -HalfW + 1f && x < -3f) : (x > 3f && x < HalfW - 1f);
        }

        void HandlePaint(float dt)
        {
            bool lmb = WIn.LMB;
            bool rmb = WIn.RMB && camMode != CamMode.Survol;
            if (!lmb && !rmb) { spawnAcc = 0f; return; }

            int team = mode == Mode.BacASable ? paintTeam : 0;
            var list = team == 0 ? PL : EL;
            float mx = mouseWorld.x, mz = mouseWorld.z;

            if (erase || rmb)
            {
                float r2 = brushSize * brushSize;
                int removed = list.RemoveAll(p => (p.x - mx) * (p.x - mx) + (p.z - mz) * (p.z - mz) < r2);
                if (removed > 0) Recount();
                return;
            }
            if (!TypeAllowed(brushType)) return;

            spawnAcc += density * dt * 30f;
            int n = (int)spawnAcc; spawnAcc -= n;
            int[] placed = team == 0 ? placedP : placedE;
            for (int k = 0; k < n; k++)
            {
                if (mode == Mode.Campagne && placed[brushType] >= prog.roster[brushType])
                {
                    if (toastT <= 0f) Toast("Plus de " + Defs.Names[brushType] + " disponibles : recrute-en avec de l'or.");
                    break;
                }
                if (PL.Count + EL.Count >= MaxUnits) { if (toastT <= 0f) Toast("Limite de " + MaxUnits + " unités atteinte."); break; }
                Vector2 r = Random.insideUnitCircle * brushSize;
                float px = mx + r.x, pz = mz + r.y;
                if (!InZone(team, px, pz)) continue;
                list.Add(new Placement(px, pz, brushType, brushOrder));
                placed[brushType]++;
            }
        }

        void Recount()
        {
            for (int t = 0; t < Defs.TypeCount; t++) { placedP[t] = 0; placedE[t] = 0; }
            foreach (var p in PL) placedP[p.t]++;
            foreach (var p in EL) placedE[p.t]++;
        }

        /// <summary>Si des troupes ont été perdues de la réserve (reset, etc.), retire les placements en trop.</summary>
        void ClampRosterPlacements()
        {
            var c = new int[Defs.TypeCount];
            campPlayer.RemoveAll(p =>
            {
                if (p.t >= Defs.TypeCount) return true;
                c[p.t]++;
                return c[p.t] > prog.roster[p.t] || !prog.Unlocked(p.t);
            });
        }

        // ------------------------------------------------------------------ formations
        static void Block(List<Placement> list, int team, float cx, float cz, int n, int t, int o)
        {
            if (n <= 0) return;
            float sp = Defs.Base[t].size * 1.05f;
            int maxW = Mathf.Max(1, Mathf.FloorToInt((Sim.H - 6f) / sp));
            int depth = Mathf.Max(1, Mathf.CeilToInt(Mathf.Sqrt(n / 3f)));
            int width = Mathf.Min(maxW, Mathf.CeilToInt(n / (float)depth));
            depth = Mathf.CeilToInt(n / (float)width);
            float dir = team == 0 ? -1f : 1f;
            for (int k = 0; k < n; k++)
            {
                int r = k / width, c = k % width;
                float px = cx + dir * r * sp;
                float pz = cz + (c - (width - 1) * 0.5f) * sp;
                px = team == 0 ? Mathf.Clamp(px, -HalfW + 1.5f, -3.5f) : Mathf.Clamp(px, 3.5f, HalfW - 1.5f);
                pz = Mathf.Clamp(pz, -HalfH + 1.5f, HalfH - 1.5f);
                list.Add(new Placement(px, pz, t, o));
            }
        }

        void AutoPlace(List<Placement> list, int team, bool useRoster)
        {
            var have = new int[Defs.TypeCount];
            foreach (var p in list) have[p.t]++;
            float s = team == 0 ? -1f : 1f;
            for (int t = 0; t < Defs.TypeCount; t++)
            {
                if (!TypeAllowed(t)) continue;
                int n = useRoster ? prog.roster[t] - have[t] : (t == brushType ? 1000 : 0);
                if (n <= 0) continue;
                switch (t)
                {
                    case 2: Block(list, team, s * 8f, 0f, n, t, (int)Order.Marche); break;
                    case 0: Block(list, team, s * 12f, 0f, n, t, (int)Order.Marche); break;
                    case 3:
                        Block(list, team, s * 14f, 26f, n / 2, t, (int)Order.Marche);
                        Block(list, team, s * 14f, -26f, n - n / 2, t, (int)Order.Marche); break;
                    case 1: Block(list, team, s * 30f, 0f, n, t, (int)Order.Tenir); break;
                }
            }
            Recount();
        }

        void GenEnemy(int L)
        {
            campEnemy.Clear();
            var rng = new System.Random(L * 7919 + 13);
            int total = Mathf.RoundToInt(15f * Mathf.Pow(1.28f, L - 1));
            float[] w = { 1f, L >= 3 ? 0.4f : 0f, L >= 6 ? 0.18f : 0f, L >= 9 ? 0.25f : 0f };
            float sum = 0f; foreach (var v in w) sum += v;
            for (int t = 0; t < Defs.TypeCount; t++)
            {
                int n = Mathf.RoundToInt(total * w[t] / sum);
                if (n <= 0) continue;
                int parts = 1 + rng.Next(0, Mathf.Min(3, 1 + L / 4));
                for (int k = 0; k < parts; k++)
                {
                    int pn = k == parts - 1 ? n - (n / parts) * (parts - 1) : n / parts;
                    float cz = (float)(rng.NextDouble() * 50.0 - 25.0);
                    float cx;
                    switch (t)
                    {
                        case 2: cx = 6f + (float)rng.NextDouble() * 4f; break;
                        case 3: cx = 14f + (float)rng.NextDouble() * 10f; cz = (k % 2 == 0 ? 1f : -1f) * (20f + (float)rng.NextDouble() * 15f); break;
                        case 1: cx = 30f + (float)rng.NextDouble() * 10f; break;
                        default: cx = 10f + (float)rng.NextDouble() * 8f; break;
                    }
                    int o = (int)Order.Marche;
                    if (t == 1 || (L > 4 && rng.NextDouble() < 0.2)) o = (int)Order.Tenir;
                    Block(campEnemy, 1, cx, cz, pn, t, o);
                }
            }
            Recount();
        }

        void DemoSandbox()
        {
            sbPlayer.Clear(); sbEnemy.Clear();
            Block(sbPlayer, 0, -10f, 0f, 2500, 0, 0);
            Block(sbEnemy, 1, 10f, 0f, 3000, 0, 0);
        }

        // ------------------------------------------------------------------ bataille
        void StartBattle()
        {
            var pl = PL; var el = EL;
            if (pl.Count == 0) { Toast("Place au moins une unité !"); return; }
            if (el.Count == 0) { Toast("Il n'y a aucun ennemi sur le terrain."); return; }
            SaveAll();

            sim = new Sim(pl.Count + el.Count);
            bool camp = mode == Mode.Campagne;
            var ps = new UnitStats[Defs.TypeCount]; var es = new UnitStats[Defs.TypeCount];
            float lm = camp ? 1f + 0.05f * (prog.level - 1) : 1f;
            for (int t = 0; t < Defs.TypeCount; t++)
            {
                ps[t] = camp ? prog.Stats(t) : Defs.Base[t];
                es[t] = Defs.Base[t]; es[t].hp *= lm; es[t].dmg *= lm;
            }
            float rewMul = camp ? prog.GoldMul * (1f + 0.08f * (prog.level - 1)) : 0f;
            foreach (var p in pl) sim.Add(p.x, p.z, p.t, p.o, 0, ps[p.t], 0f);
            foreach (var e in el) sim.Add(e.x, e.z, e.t, e.o, 1, es[e.t], Defs.KillReward[e.t] * rewMul);

            state = State.Battle; paused = false; volleyArmed = false; volleyReady = 0f; rallyReady = 0f;
        }

        void EndBattle()
        {
            state = State.Result;
            volleyArmed = false;
            lastWin = sim.winner == 0;
            lastLost = sim.startCount[0] - sim.aliveCount[0];
            lastKilled = sim.startCount[1] - sim.aliveCount[1];
            if (mode == Mode.Campagne)
            {
                lastGold = Mathf.RoundToInt(sim.goldF);
                lastBonus = lastWin ? Mathf.RoundToInt(10 * prog.level * prog.GoldMul) : 0;
                prog.gold += lastGold + lastBonus;
                if (lastWin) { prog.level++; if (prog.level > prog.bestLevel) prog.bestLevel = prog.level; }
                SaveAll();
            }
        }

        void ContinueAfterResult()
        {
            state = State.Prep; sim = null;
            if (mode == Mode.Campagne) GenEnemy(prog.level);
            Recount();
        }

        // ------------------------------------------------------------------ caméra
        void SetCam(CamMode m)
        {
            if (m == CamMode.Survol)
            {
                flyPos = cam.transform.position;
                var e = cam.transform.eulerAngles;
                flyYaw = e.y; flyPitch = e.x > 180f ? e.x - 360f : e.x;
                if (camMode == CamMode.Vue2D) { flyPos = new Vector3(pivot.x - 0f, 35f, pivot.z - 55f); flyYaw = 0f; flyPitch = 35f; }
            }
            camMode = m;
        }

        void UpdateCamera(float dt, Vector2 mp, bool overUI)
        {
            Vector2 md = mp - lastMouse;
            bool fast = WIn.Held(KeyCode.LeftShift);
            float mvx = 0f, mvz = 0f;
            if (WIn.Held(KeyCode.W) || WIn.Held(KeyCode.Z) || WIn.Held(KeyCode.UpArrow)) mvz += 1f;
            if (WIn.Held(KeyCode.S) || WIn.Held(KeyCode.DownArrow)) mvz -= 1f;
            if (WIn.Held(KeyCode.A) || WIn.Held(KeyCode.Q) || WIn.Held(KeyCode.LeftArrow)) mvx -= 1f;
            if (WIn.Held(KeyCode.D) || WIn.Held(KeyCode.RightArrow)) mvx += 1f;
            float scroll = overUI ? 0f : WIn.Scroll;

            // Gestes à deux doigts : pincer = zoom, glisser = déplacer (ou regarder en Survol)
            int tc = WIn.TouchCount;
            if (tc >= 2) touchBlock = true; else if (tc == 0) touchBlock = false;
            Vector2 tMid = Vector2.zero, tDelta = Vector2.zero; float pinch = 1f;
            if (tc >= 2)
            {
                Vector2 a = WIn.TouchPos(0), b = WIn.TouchPos(1);
                tMid = (a + b) * 0.5f; float pd = Mathf.Max(1f, (a - b).magnitude);
                if (hadTwo) { tDelta = tMid - prevMid; pinch = prevPinch / pd; }
                prevMid = tMid; prevPinch = pd; hadTwo = true;
            }
            else hadTwo = false;

            switch (camMode)
            {
                case CamMode.Vue2D:
                {
                    float pan = ortho * 1.2f * dt * (fast ? 2.5f : 1f);
                    pivot += new Vector3(mvx, 0, mvz) * pan;
                    if (WIn.MMB) pivot -= new Vector3(md.x, 0, md.y) * (2f * ortho / Screen.height);
                    pivot -= new Vector3(tDelta.x, 0, tDelta.y) * (2f * ortho / Screen.height);
                    ortho = Mathf.Clamp(ortho * (1f - scroll * 0.12f) * pinch, 6f, 90f);
                    ClampPivot();
                    cam.orthographic = true; cam.orthographicSize = ortho;
                    cam.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
                    cam.transform.position = pivot + Vector3.up * 150f;
                    break;
                }
                case CamMode.Vue3D:
                {
                    if (WIn.Held(KeyCode.R)) yaw -= 60f * dt;
                    if (WIn.Held(KeyCode.F)) yaw += 60f * dt;
                    var yq = Quaternion.Euler(0f, yaw, 0f);
                    float pan = dist * 0.8f * dt * (fast ? 2.5f : 1f);
                    pivot += yq * new Vector3(mvx, 0, mvz) * pan;
                    if (WIn.MMB) pivot -= yq * new Vector3(md.x, 0, md.y) * dist * 0.0018f;
                    pivot -= yq * new Vector3(tDelta.x, 0, tDelta.y) * dist * 0.0018f;
                    dist = Mathf.Clamp(dist * (1f - scroll * 0.12f) * pinch, 10f, 260f);
                    ClampPivot();
                    var rot = Quaternion.Euler(52f, yaw, 0f);
                    cam.orthographic = false; cam.fieldOfView = 50f;
                    cam.transform.rotation = rot;
                    cam.transform.position = pivot - rot * Vector3.forward * dist;
                    break;
                }
                case CamMode.Survol:
                {
                    if (WIn.RMB) { flyYaw += md.x * 0.2f; flyPitch = Mathf.Clamp(flyPitch - md.y * 0.2f, -89f, 89f); }
                    if (tc >= 2) { flyYaw += tDelta.x * 0.15f; flyPitch = Mathf.Clamp(flyPitch - tDelta.y * 0.15f, -89f, 89f); }
                    var rot = Quaternion.Euler(flyPitch, flyYaw, 0f);
                    float sp = 30f * (fast ? 3f : 1f);
                    float up = (WIn.Held(KeyCode.E) ? 1f : 0f) - (WIn.Held(KeyCode.F) ? 1f : 0f);
                    flyPos += (rot * new Vector3(mvx, 0f, mvz) + Vector3.up * up) * sp * dt;
                    flyPos += rot * Vector3.forward * (scroll * 4f + (1f - pinch) * 60f);
                    flyPos.y = Mathf.Max(0.8f, flyPos.y);
                    cam.orthographic = false; cam.fieldOfView = 65f;
                    cam.transform.rotation = rot; cam.transform.position = flyPos;
                    break;
                }
            }
        }

        void ClampPivot()
        {
            pivot.x = Mathf.Clamp(pivot.x, -HalfW, HalfW);
            pivot.z = Mathf.Clamp(pivot.z, -HalfH, HalfH);
            pivot.y = 0f;
        }

        bool MouseWorld(Vector2 mp, out Vector3 w)
        {
            w = Vector3.zero;
            if (cam == null) return false;
            Ray ray = cam.ScreenPointToRay(new Vector3(mp.x, mp.y, 0f));
            if (ray.direction.y > -1e-4f) return false;
            float t = -ray.origin.y / ray.direction.y;
            w = ray.origin + ray.direction * t;
            return true;
        }

        // ------------------------------------------------------------------ rendu
        void Render(bool overUI)
        {
            batch.Begin();
            if (sim != null && state != State.Prep) sim.Render(batch);
            else
            {
                foreach (var p in PL) { float s = Defs.Base[p.t].size; batch.Add(p.t, p.x, 0f, p.z, 1f, 0f, s, s, s); }
                foreach (var p in EL) { float s = Defs.Base[p.t].size; batch.Add(Defs.TypeCount + p.t, p.x, 0f, p.z, -1f, 0f, s, s, s); }
            }
            batch.Flush();

            Graphics.DrawMesh(Art.quad, Matrix4x4.TRS(new Vector3(-HalfW * 0.5f, -0.02f, 0f), Quaternion.identity, new Vector3(HalfW, 1f, Sim.H)), Art.zoneB, 0);
            Graphics.DrawMesh(Art.quad, Matrix4x4.TRS(new Vector3(HalfW * 0.5f, -0.02f, 0f), Quaternion.identity, new Vector3(HalfW, 1f, Sim.H)), Art.zoneR, 0);
            Graphics.DrawMesh(Art.quad, Matrix4x4.TRS(new Vector3(0f, -0.015f, 0f), Quaternion.identity, new Vector3(0.25f, 1f, Sim.H)), Art.line, 0);

            if (hasMouseWorld && !overUI)
            {
                Vector3 p = new Vector3(mouseWorld.x, 0.06f, mouseWorld.z);
                if (state == State.Prep)
                    Graphics.DrawMesh(Art.ring, Matrix4x4.TRS(p, Quaternion.identity, Vector3.one * brushSize), (erase || WIn.RMB) ? Art.ringR : Art.ringW, 0);
                else if (state == State.Battle && volleyArmed)
                    Graphics.DrawMesh(Art.ring, Matrix4x4.TRS(p, Quaternion.identity, Vector3.one * 7f), Art.ringGold, 0);
            }
        }

        // ------------------------------------------------------------------ interface (IMGUI)
        float UIScale { get { return Mathf.Max(0.5f, Mathf.Min(Screen.height / 900f, Screen.width / 1100f)); } }
        float GW { get { return Screen.width / UIScale; } }
        float GH { get { return Screen.height / UIScale; } }
        Rect TopBar { get { return new Rect(0, 0, GW, 46); } }
        Rect PrepPanel { get { return new Rect(0, 46, 350, GH - 46); } }
        Rect BattleBar { get { return new Rect(0, GH - 96, GW, 96); } }

        bool OverUI(Vector2 mp)
        {
            float s = UIScale;
            var g = new Vector2(mp.x / s, (Screen.height - mp.y) / s);
            if (TopBar.Contains(g)) return true;
            if (state == State.Prep && PrepPanel.Contains(g)) return true;
            if (state == State.Battle && BattleBar.Contains(g)) return true;
            if (state == State.Result) return true;
            return false;
        }

        static Texture2D Tex(Color c) { var t = new Texture2D(1, 1); t.SetPixel(0, 0, c); t.Apply(); return t; }

        void InitStyles()
        {
            if (sTitle != null) return;
            sPanel = new GUIStyle(GUI.skin.box); sPanel.normal.background = Tex(new Color(0.06f, 0.07f, 0.09f, 0.92f));
            sCard = new GUIStyle(GUI.skin.box); sCard.normal.background = Tex(new Color(0.12f, 0.13f, 0.16f, 0.95f)); sCard.padding = new RectOffset(8, 8, 6, 6);
            sTitle = new GUIStyle(GUI.skin.label) { fontSize = 20, fontStyle = FontStyle.Bold }; sTitle.normal.textColor = new Color(0.85f, 0.9f, 1f);
            sBig = new GUIStyle(GUI.skin.label) { fontSize = 18, fontStyle = FontStyle.Bold }; sBig.normal.textColor = Color.white;
            sLbl = new GUIStyle(GUI.skin.label) { fontSize = 14 }; sLbl.normal.textColor = new Color(0.9f, 0.9f, 0.92f);
            sLblB = new GUIStyle(sLbl) { fontStyle = FontStyle.Bold };
            sSmall = new GUIStyle(GUI.skin.label) { fontSize = 12, wordWrap = true }; sSmall.normal.textColor = new Color(0.7f, 0.72f, 0.76f);
            sDim = new GUIStyle(sSmall); sDim.normal.textColor = new Color(0.45f, 0.46f, 0.5f);
            sGold = new GUIStyle(sBig); sGold.normal.textColor = new Color(1f, 0.82f, 0.25f);
            sBtn = new GUIStyle(GUI.skin.button) { fontSize = 14 };
            sBtnS = new GUIStyle(GUI.skin.button) { fontSize = 12 };
            sBtnBig = new GUIStyle(GUI.skin.button) { fontSize = 20, fontStyle = FontStyle.Bold };
        }

        void OnGUI()
        {
            InitStyles();
            float s = UIScale;
            GUI.matrix = Matrix4x4.Scale(new Vector3(s, s, 1f));

            DrawTopBar();
            if (state == State.Prep) DrawPrep();
            else if (state == State.Battle) DrawBattle();
            else DrawResult();

            if (toastT > 0f && !string.IsNullOrEmpty(toast))
            {
                var r = new Rect(GW * 0.5f - 260f + (state == State.Prep ? 175f : 0f), 58f, 520f, 34f);
                GUI.Box(r, GUIContent.none, sCard);
                var st = new GUIStyle(sLbl) { alignment = TextAnchor.MiddleCenter };
                GUI.Label(r, toast, st);
            }
        }

        void DrawTopBar()
        {
            GUI.Box(TopBar, GUIContent.none, sPanel);
            GUILayout.BeginArea(new Rect(10, 7, GW - 20, 34));
            GUILayout.BeginHorizontal();
            GUILayout.Label("WE MARCH AS ONE", sTitle, GUILayout.Width(220));
            GUI.enabled = state == State.Prep;
            int m = GUILayout.Toolbar((int)mode, new[] { "Campagne", "Bac à sable" }, sBtn, GUILayout.Width(240), GUILayout.Height(30));
            if (m != (int)mode) { int mm = m; pending += () => { mode = (Mode)mm; tab = 0; erase = false; paintTeam = 0; Recount(); }; }
            GUI.enabled = true;
            GUILayout.Space(16);
            int c = GUILayout.Toolbar((int)camMode, new[] { "2D", "3D", "Survol" }, sBtn, GUILayout.Width(200), GUILayout.Height(30));
            if (c != (int)camMode) SetCam((CamMode)c);
            GUILayout.FlexibleSpace();
            int units = sim != null && state != State.Prep ? sim.aliveCount[0] + sim.aliveCount[1] : PL.Count + EL.Count;
            GUILayout.Label(units.ToString("N0") + " unités   " + fps.ToString("0") + " FPS", sLbl, GUILayout.Width(200));
            if (mode == Mode.Campagne && state == State.Prep)
            {
                if (GUILayout.Button(confirmReset ? "Confirmer ?" : "Réinitialiser", sBtnS, GUILayout.Width(110), GUILayout.Height(30)))
                {
                    if (confirmReset) { pending += ResetProgress; confirmReset = false; } else confirmReset = true;
                }
            }
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        void ResetProgress()
        {
            prog = new Progress(); prog.Fix();
            campPlayer.Clear();
            AutoPlace(campPlayer, 0, true);
            GenEnemy(1);
            SaveAll();
            Toast("Progression réinitialisée.");
        }

        void DrawPrep()
        {
            var r = PrepPanel;
            GUI.Box(r, GUIContent.none, sPanel);
            GUILayout.BeginArea(new Rect(r.x + 12, r.y + 8, r.width - 24, r.height - 16));
            if (mode == Mode.Campagne)
            {
                GUILayout.Label("Bataille " + prog.level + "   (record " + prog.bestLevel + ")", sBig);
                GUILayout.Label("Or : " + prog.gold.ToString("N0"), sGold);
                int nt = GUILayout.Toolbar(tab, new[] { "Armée", "Compétences" }, sBtn, GUILayout.Height(28));
                if (nt != tab) pending += () => tab = nt;
            }
            else
            {
                GUILayout.Label("Bac à sable — éditeur", sBig);
                GUILayout.Label("Peins les deux armées, sauvegarde tes cartes.", sSmall);
                if (tab != 0) pending += () => tab = 0;
            }
            GUILayout.Space(6);
            if (tab == 0) DrawArmyTab(); else DrawSkillTab();

            GUILayout.Space(6);
            if (GUILayout.Button("LANCER LA BATAILLE", sBtnBig, GUILayout.Height(52))) pending += StartBattle;
            GUILayout.Label("Clic G : peindre · Clic D : gommer · 1-4 : forme\nMolette : zoom · ZQSD/WASD : déplacer · C : caméra\nTactile : 1 doigt peint · 2 doigts = pincer / déplacer", sDim);
            GUILayout.EndArea();
        }

        void DrawArmyTab()
        {
            scrollA = GUILayout.BeginScrollView(scrollA);
            bool camp = mode == Mode.Campagne;
            for (int t = 0; t < Defs.TypeCount; t++)
            {
                if (!TypeAllowed(t))
                {
                    GUILayout.Label("Verrouillé : " + Defs.Shapes[t] + " – " + Defs.Names[t] + (camp ? " (voir Compétences)" : " (à rencontrer en campagne)"), sDim);
                    continue;
                }
                GUILayout.BeginVertical(sCard);
                GUILayout.BeginHorizontal();
                GUILayout.Label(Art.swatch[t], GUILayout.Width(16), GUILayout.Height(16));
                if (camp) GUILayout.Label(Defs.Shapes[t] + " · " + Defs.Names[t] + "   " + placedP[t] + " / " + prog.roster[t], sLblB);
                else GUILayout.Label(Defs.Shapes[t] + " · " + Defs.Names[t] + "   bleu " + placedP[t] + " · rouge " + placedE[t], sLblB);
                GUILayout.EndHorizontal();
                if (camp)
                {
                    GUILayout.BeginHorizontal();
                    int[] amts = { 10, 100, 1000 };
                    foreach (int a in amts)
                    {
                        int cost = a * Defs.RecruitCost[t];
                        GUI.enabled = prog.gold >= cost;
                        if (GUILayout.Button("+" + a + " (" + cost + " or)", sBtnS))
                        {
                            prog.gold -= cost; prog.roster[t] += a; SaveAll();
                        }
                        GUI.enabled = true;
                    }
                    GUILayout.EndHorizontal();
                }
                GUILayout.EndVertical();
            }

            GUILayout.Space(8);
            GUILayout.Label("Pinceau", sBig);
            var avail = new List<int>(); var names = new List<string>();
            for (int t = 0; t < Defs.TypeCount; t++) if (TypeAllowed(t)) { avail.Add(t); names.Add(Defs.Shapes[t]); }
            int cur = avail.IndexOf(brushType);
            if (cur < 0) { cur = 0; brushType = avail[0]; }
            int ns = GUILayout.SelectionGrid(cur, names.ToArray(), 4, sBtn, GUILayout.Height(28));
            if (ns != cur) { brushType = avail[ns]; erase = false; }
            GUILayout.Label("Ordre avant la bataille", sSmall);
            brushOrder = GUILayout.Toolbar(brushOrder, new[] { "MARCHE", "TENIR" }, sBtn, GUILayout.Height(28));
            erase = GUILayout.Toolbar(erase ? 1 : 0, new[] { "Peindre", "Gommer" }, sBtn, GUILayout.Height(28)) == 1;
            if (!camp) paintTeam = GUILayout.Toolbar(paintTeam, new[] { "Équipe bleue", "Équipe rouge" }, sBtn, GUILayout.Height(28));
            GUILayout.Label("Taille : " + brushSize.ToString("0.0"), sSmall);
            brushSize = GUILayout.HorizontalSlider(brushSize, 0.5f, 20f);
            GUILayout.Label("Densité : " + density.ToString("0"), sSmall);
            density = GUILayout.HorizontalSlider(density, 1f, 60f);
            GUILayout.Space(4);

            GUILayout.BeginHorizontal();
            var team = camp ? 0 : paintTeam;
            if (GUILayout.Button(camp ? "Auto-placer la réserve" : "Bloc de 1000", sBtnS, GUILayout.Height(26)))
                AutoPlace(team == 0 ? PL : EL, team, camp);
            if (GUILayout.Button(camp ? "Tout retirer" : "Vider l'équipe", sBtnS, GUILayout.Height(26)))
            { (team == 0 ? PL : EL).Clear(); Recount(); }
            GUILayout.EndHorizontal();

            if (!camp)
            {
                GUILayout.BeginHorizontal();
                if (GUILayout.Button("Sauver la carte", sBtnS, GUILayout.Height(26))) { MapData.Save(sbPlayer, sbEnemy); Toast("Carte sauvegardée."); }
                if (GUILayout.Button("Charger", sBtnS, GUILayout.Height(26))) { if (MapData.Load(sbPlayer, sbEnemy)) { Recount(); Toast("Carte chargée."); } else Toast("Aucune carte sauvegardée."); }
                if (GUILayout.Button("Démo", sBtnS, GUILayout.Height(26))) { DemoSandbox(); Recount(); }
                GUILayout.EndHorizontal();
            }
            GUILayout.EndScrollView();
        }

        void DrawSkillTab()
        {
            scrollS = GUILayout.BeginScrollView(scrollS);
            for (int i = 0; i < Skills.All.Length; i++)
            {
                var n = Skills.All[i];
                int lv = prog.skill[i];
                bool req = prog.PrereqMet(i);
                GUILayout.BeginHorizontal();
                GUILayout.Space(n.depth * 14f);
                GUILayout.BeginVertical(sCard);
                GUILayout.Label(n.name + "   " + lv + "/" + n.maxLvl, req ? sLblB : sDim);
                GUILayout.Label(n.desc, req ? sSmall : sDim);
                if (!req)
                {
                    var pn = new List<string>(); foreach (var p in n.prereq) pn.Add(Skills.NameOf(p));
                    GUILayout.Label("Requiert : " + string.Join(", ", pn.ToArray()), sDim);
                }
                else if (lv >= n.maxLvl) GUILayout.Label("MAX", sGold);
                else
                {
                    int c = prog.SkillCost(i);
                    GUI.enabled = prog.gold >= c;
                    if (GUILayout.Button((lv == 0 ? "Débloquer" : "Améliorer") + " (" + c.ToString("N0") + " or)", sBtnS))
                    {
                        int si = i; pending += () => { if (prog.gold >= prog.SkillCost(si) && prog.skill[si] < Skills.All[si].maxLvl) { prog.gold -= prog.SkillCost(si); prog.skill[si]++; SaveAll(); } };
                    }
                    GUI.enabled = true;
                }
                GUILayout.EndVertical();
                GUILayout.EndHorizontal();
            }
            GUILayout.EndScrollView();
        }

        void DrawBattle()
        {
            var r = BattleBar;
            GUI.Box(r, GUIContent.none, sPanel);
            GUILayout.BeginArea(new Rect(r.x + 12, r.y + 10, r.width - 24, r.height - 20));
            GUILayout.BeginHorizontal();

            GUILayout.BeginVertical(GUILayout.Width(230));
            GUILayout.Label("Bleus : " + sim.aliveCount[0].ToString("N0") + " / " + sim.startCount[0].ToString("N0"), sLblB);
            GUILayout.Label("Rouges : " + sim.aliveCount[1].ToString("N0") + " / " + sim.startCount[1].ToString("N0"), sLblB);
            GUILayout.Label((mode == Mode.Campagne ? "Or : +" + Mathf.RoundToInt(sim.goldF) + "   " : "") + sim.time.ToString("0") + " s", sSmall);
            GUILayout.EndVertical();

            GUILayout.BeginVertical(GUILayout.Width(230));
            GUILayout.Label("Vitesse", sSmall);
            speedIdx = GUILayout.Toolbar(speedIdx, new[] { "x1", "x2", "x4", "x8" }, sBtn, GUILayout.Height(28));
            if (GUILayout.Button(paused ? "Reprendre (Espace)" : "Pause (Espace)", sBtnS, GUILayout.Height(22))) paused = !paused;
            GUILayout.EndVertical();

            GUILayout.Space(10);
            GUILayout.BeginVertical(GUILayout.Width(200));
            GUILayout.Label("Ordres en direct", sSmall);
            if (GUILayout.Button("Tous : MARCHE", sBtn, GUILayout.Height(24))) sim.SetOrder(0, Order.Marche);
            if (GUILayout.Button("Tous : TENIR", sBtn, GUILayout.Height(24))) sim.SetOrder(0, Order.Tenir);
            GUILayout.EndVertical();

            GUILayout.Space(10);
            GUILayout.BeginVertical(GUILayout.Width(240));
            GUILayout.Label("Capacités", sSmall);
            if (VolleyLevel > 0)
            {
                bool ready = sim.time >= volleyReady;
                GUI.enabled = ready;
                string lbl = volleyArmed ? "Clique sur la carte…" : (ready ? "Pluie de flèches" : "Pluie (" + (volleyReady - sim.time).ToString("0") + " s)");
                if (GUILayout.Button(lbl, sBtn, GUILayout.Height(24))) volleyArmed = !volleyArmed;
                GUI.enabled = true;
            }
            else GUILayout.Label("Pluie de flèches : à débloquer", sDim);
            if (RallyLevel > 0)
            {
                bool ready = sim.time >= rallyReady;
                GUI.enabled = ready;
                if (GUILayout.Button(ready ? "Ralliement" : "Ralliement (" + (rallyReady - sim.time).ToString("0") + " s)", sBtn, GUILayout.Height(24)))
                {
                    sim.Rally(4f + 1.5f * RallyLevel); rallyReady = sim.time + 20f;
                }
                GUI.enabled = true;
            }
            else GUILayout.Label("Ralliement : à débloquer", sDim);
            GUILayout.EndVertical();

            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Abandonner", sBtnS, GUILayout.Width(110), GUILayout.Height(30)))
            {
                sim.finished = true; sim.winner = 1;
            }
            GUILayout.EndHorizontal();
            GUILayout.EndArea();
        }

        void DrawResult()
        {
            var r = new Rect(GW * 0.5f - 220f, GH * 0.5f - 150f, 440f, 300f);
            GUI.Box(r, GUIContent.none, sPanel);
            GUILayout.BeginArea(new Rect(r.x + 20, r.y + 16, r.width - 40, r.height - 32));
            var big = new GUIStyle(sTitle) { fontSize = 34, alignment = TextAnchor.MiddleCenter };
            big.normal.textColor = lastWin ? new Color(0.45f, 0.75f, 1f) : new Color(1f, 0.4f, 0.35f);
            if (mode == Mode.Campagne) GUILayout.Label(lastWin ? "VICTOIRE !" : "DÉFAITE", big);
            else GUILayout.Label(lastWin ? "VICTOIRE BLEUE" : "VICTOIRE ROUGE", big);
            GUILayout.Space(8);
            GUILayout.Label("Ennemis éliminés : " + lastKilled.ToString("N0"), sLbl);
            GUILayout.Label("Pertes : " + lastLost.ToString("N0") + " (elles reviennent pour la prochaine bataille)", sLbl);
            if (mode == Mode.Campagne)
            {
                GUILayout.Label("Or gagné : " + lastGold.ToString("N0") + (lastBonus > 0 ? "  + bonus " + lastBonus.ToString("N0") : ""), sGold);
                GUILayout.Label(lastWin ? "Prochaine : bataille " + prog.level : "Recrute et améliore ton armée, puis réessaie.", sSmall);
            }
            GUILayout.FlexibleSpace();
            if (GUILayout.Button(mode == Mode.Campagne ? "Continuer" : "Retour à l'éditeur", sBtnBig, GUILayout.Height(48))) pending += ContinueAfterResult;
            GUILayout.EndArea();
        }
    }
}
