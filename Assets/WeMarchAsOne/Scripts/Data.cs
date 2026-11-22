using UnityEngine;
using System.Collections.Generic;

namespace WMAO
{
    public enum UType : byte { Soldat = 0, Archer = 1, Bouclier = 2, Cavalier = 3 }
    public enum Order : byte { Marche = 0, Tenir = 1 }

    public struct UnitStats
    {
        public float hp, dmg, range, speed, cooldown, size, projSpeed;
        public bool ranged;
    }

    public static class Defs
    {
        public const int TypeCount = 4;
        public static readonly string[] Names = { "Soldat", "Archer", "Bouclier", "Cavalier" };
        public static readonly string[] Shapes = { "Carré", "Triangle", "Cercle", "Losange" };
        public static readonly int[] RecruitCost = { 1, 3, 6, 5 };
        public static readonly int[] KillReward = { 1, 2, 4, 3 };

        // range = distance bord à bord
        public static readonly UnitStats[] Base =
        {
            new UnitStats { hp = 10f, dmg = 2f,   range = 0.35f, speed = 3.0f, cooldown = 0.7f, size = 0.70f },
            new UnitStats { hp = 5f,  dmg = 1.6f, range = 11f,   speed = 2.6f, cooldown = 1.3f, size = 0.75f, ranged = true, projSpeed = 24f },
            new UnitStats { hp = 45f, dmg = 2.5f, range = 0.35f, speed = 1.8f, cooldown = 0.9f, size = 1.10f },
            new UnitStats { hp = 14f, dmg = 3.5f, range = 0.45f, speed = 6.5f, cooldown = 0.8f, size = 0.95f },
        };
    }

    public class SkillNode
    {
        public string id, name, desc;
        public int baseCost, maxLvl;
        public float growth;
        public string[] prereq;
        public int depth;
        public SkillNode(string id, string name, string desc, int cost, float growth, int max, int depth, params string[] prereq)
        {
            this.id = id; this.name = name; this.desc = desc; baseCost = cost; this.growth = growth; maxLvl = max; this.depth = depth; this.prereq = prereq;
        }
    }

    public static class Skills
    {
        public static readonly SkillNode[] All =
        {
            new SkillNode("sol_hp",     "Armure des carrés",      "+20% PV des Soldats",                             15, 1.45f, 10, 0),
            new SkillNode("unlock_shi", "Recruter des Cercles",   "Débloque les Boucliers (très résistants)",       150, 1f,     1, 1, "sol_hp"),
            new SkillNode("shi_hp",     "Remparts vivants",       "+25% PV des Boucliers",                           60, 1.5f,   8, 2, "unlock_shi"),
            new SkillNode("sol_dmg",    "Lames affûtées",         "+20% dégâts des Soldats",                         15, 1.45f, 10, 0),
            new SkillNode("unlock_cav", "Recruter des Losanges",  "Débloque les Cavaliers (rapides, frappe forte)",  250, 1f,     1, 1, "sol_dmg"),
            new SkillNode("cav_dmg",    "Charge",                 "+20% dégâts des Cavaliers",                       80, 1.5f,   8, 2, "unlock_cav"),
            new SkillNode("cav_spd",    "Destriers",              "+8% vitesse des Cavaliers",                       70, 1.5f,   6, 2, "unlock_cav"),
            new SkillNode("rally",      "Ralliement",             "Capacité : +70% vitesse. +durée par niveau",     200, 1.7f,   4, 2, "unlock_cav"),
            new SkillNode("unlock_arc", "Recruter des Triangles", "Débloque les Archers (tir à distance)",            40, 1f,     1, 0),
            new SkillNode("arc_rate",   "Cadence de tir",         "+12% vitesse de tir des Archers",                 30, 1.5f,   8, 1, "unlock_arc"),
            new SkillNode("arc_range",  "Arcs longs",             "+8% portée des Archers",                          35, 1.5f,   6, 1, "unlock_arc"),
            new SkillNode("volley",     "Pluie de flèches",       "Capacité : volée sur zone. +dégâts par niveau",  120, 1.7f,   5, 1, "unlock_arc"),
            new SkillNode("drill",      "Discipline",             "+6% PV de toutes les unités",                    300, 1.6f,  10, 3, "unlock_shi", "unlock_arc"),
            new SkillNode("drums",      "Tambours de guerre",     "+5% vitesse de toutes les unités",               180, 1.6f,   6, 4, "drill"),
            new SkillNode("command",    "Commandement",           "+6% dégâts de toutes les unités",                300, 1.6f,  10, 3, "unlock_cav", "unlock_arc"),
            new SkillNode("loot",       "Pillage",                "+12% d'or gagné",                                 50, 1.6f,  10, 0),
        };

        static Dictionary<string, int> index;
        public static int Index(string id)
        {
            if (index == null)
            {
                index = new Dictionary<string, int>();
                for (int i = 0; i < All.Length; i++) index[All[i].id] = i;
            }
            int r; return index.TryGetValue(id, out r) ? r : -1;
        }
        public static string NameOf(string id) { int i = Index(id); return i >= 0 ? All[i].name : id; }
    }

    [System.Serializable]
    public class Progress
    {
        const string Key = "wmao_progress_v1";
        public int gold = 0;
        public int level = 1;
        public int bestLevel = 1;
        public int[] roster = { 20, 0, 0, 0 };
        public int[] skill;
        public float[] plx, plz;
        public int[] plt, plo;

        public void Fix()
        {
            if (roster == null || roster.Length != Defs.TypeCount)
            {
                var r = new int[Defs.TypeCount];
                if (roster != null) for (int i = 0; i < Mathf.Min(r.Length, roster.Length); i++) r[i] = roster[i];
                roster = r;
            }
            if (skill == null || skill.Length != Skills.All.Length)
            {
                var s = new int[Skills.All.Length];
                if (skill != null) for (int i = 0; i < Mathf.Min(s.Length, skill.Length); i++) s[i] = skill[i];
                skill = s;
            }
            if (level < 1) level = 1;
            if (bestLevel < level) bestLevel = level;
        }

        public int Lvl(string id) { int i = Skills.Index(id); return i >= 0 ? skill[i] : 0; }

        public bool Unlocked(int t)
        {
            switch (t)
            {
                case 0: return true;
                case 1: return Lvl("unlock_arc") > 0;
                case 2: return Lvl("unlock_shi") > 0;
                case 3: return Lvl("unlock_cav") > 0;
            }
            return false;
        }

        public bool PrereqMet(int i)
        {
            foreach (var p in Skills.All[i].prereq) if (Lvl(p) <= 0) return false;
            return true;
        }

        public int SkillCost(int i)
        {
            var n = Skills.All[i];
            return Mathf.RoundToInt(n.baseCost * Mathf.Pow(n.growth, skill[i]));
        }

        public float GoldMul => 1f + 0.12f * Lvl("loot");

        public UnitStats Stats(int t)
        {
            var s = Defs.Base[t];
            float hpM = 1f + 0.06f * Lvl("drill");
            float dmM = 1f + 0.06f * Lvl("command");
            float spM = 1f + 0.05f * Lvl("drums");
            switch (t)
            {
                case 0: hpM *= 1f + 0.2f * Lvl("sol_hp"); dmM *= 1f + 0.2f * Lvl("sol_dmg"); break;
                case 1: s.cooldown /= 1f + 0.12f * Lvl("arc_rate"); s.range *= 1f + 0.08f * Lvl("arc_range"); break;
                case 2: hpM *= 1f + 0.25f * Lvl("shi_hp"); break;
                case 3: dmM *= 1f + 0.2f * Lvl("cav_dmg"); spM *= 1f + 0.08f * Lvl("cav_spd"); break;
            }
            s.hp *= hpM; s.dmg *= dmM; s.speed *= spM;
            return s;
        }

        public void StorePlacements(List<Placement> list)
        {
            int n = list.Count;
            plx = new float[n]; plz = new float[n]; plt = new int[n]; plo = new int[n];
            for (int i = 0; i < n; i++) { plx[i] = list[i].x; plz[i] = list[i].z; plt[i] = list[i].t; plo[i] = list[i].o; }
        }

        public void RestorePlacements(List<Placement> list)
        {
            list.Clear();
            if (plx == null || plz == null || plt == null || plo == null) return;
            int n = Mathf.Min(Mathf.Min(plx.Length, plz.Length), Mathf.Min(plt.Length, plo.Length));
            for (int i = 0; i < n; i++) list.Add(new Placement(plx[i], plz[i], plt[i], plo[i]));
        }

        public void Save()
        {
            PlayerPrefs.SetString(Key, JsonUtility.ToJson(this));
            PlayerPrefs.Save();
        }

        public static Progress Load()
        {
            Progress p = null;
            string j = PlayerPrefs.GetString(Key, "");
            if (!string.IsNullOrEmpty(j))
            {
                try { p = JsonUtility.FromJson<Progress>(j); } catch { p = null; }
            }
            if (p == null) p = new Progress();
            p.Fix();
            return p;
        }
    }

    [System.Serializable]
    public class MapData
    {
        const string Key = "wmao_sandbox_v1";
        public float[] ax, az, bx, bz;
        public int[] at, ao, bt, bo;

        public static void Save(List<Placement> a, List<Placement> b)
        {
            var m = new MapData();
            Pack(a, out m.ax, out m.az, out m.at, out m.ao);
            Pack(b, out m.bx, out m.bz, out m.bt, out m.bo);
            PlayerPrefs.SetString(Key, JsonUtility.ToJson(m));
            PlayerPrefs.Save();
        }

        public static bool Load(List<Placement> a, List<Placement> b)
        {
            string j = PlayerPrefs.GetString(Key, "");
            if (string.IsNullOrEmpty(j)) return false;
            MapData m;
            try { m = JsonUtility.FromJson<MapData>(j); } catch { return false; }
            if (m == null) return false;
            Unpack(a, m.ax, m.az, m.at, m.ao);
            Unpack(b, m.bx, m.bz, m.bt, m.bo);
            return true;
        }

        static void Pack(List<Placement> l, out float[] x, out float[] z, out int[] t, out int[] o)
        {
            int n = l.Count; x = new float[n]; z = new float[n]; t = new int[n]; o = new int[n];
            for (int i = 0; i < n; i++) { x[i] = l[i].x; z[i] = l[i].z; t[i] = l[i].t; o[i] = l[i].o; }
        }

        static void Unpack(List<Placement> l, float[] x, float[] z, int[] t, int[] o)
        {
            l.Clear();
            if (x == null || z == null || t == null || o == null) return;
            int n = Mathf.Min(Mathf.Min(x.Length, z.Length), Mathf.Min(t.Length, o.Length));
            for (int i = 0; i < n; i++) l.Add(new Placement(x[i], z[i], t[i], o[i]));
        }
    }
}
