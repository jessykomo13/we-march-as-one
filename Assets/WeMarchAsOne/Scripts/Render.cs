using UnityEngine;
using System.Collections.Generic;

namespace WMAO
{
    /// <summary>Meshes et matériaux générés en code (aucun asset requis).</summary>
    public static class Art
    {
        public static Mesh[] unit = new Mesh[Defs.TypeCount];
        public static Mesh box, quad, ring;
        public static Material[] unitMat = new Material[Defs.TypeCount * 2];
        public static Material proj, dead, zoneB, zoneR, line, ringW, ringR, ringGold;
        public static Texture2D[] swatch = new Texture2D[Defs.TypeCount * 2];

        public static readonly Color[] TeamCol =
        {
            new Color(0.30f, 0.60f, 1.00f), new Color(0.35f, 0.88f, 1.00f), new Color(0.22f, 0.38f, 0.95f), new Color(0.60f, 0.55f, 1.00f),
            new Color(1.00f, 0.32f, 0.30f), new Color(1.00f, 0.62f, 0.25f), new Color(0.80f, 0.16f, 0.22f), new Color(1.00f, 0.40f, 0.68f),
        };

        static Shader sh;

        public static void Init()
        {
            if (box != null) return;
            sh = Resources.Load<Shader>("WMAO_Unlit");
            if (sh == null) sh = Shader.Find("WMAO/Unlit");
            if (sh == null) sh = Shader.Find("Sprites/Default");
            if (sh == null) sh = Shader.Find("Unlit/Color");

            const float h = 0.5f;
            unit[0] = Prism(new[] { new Vector2(0.5f, 0.5f), new Vector2(0.5f, -0.5f), new Vector2(-0.5f, -0.5f), new Vector2(-0.5f, 0.5f) }, h);
            unit[1] = Prism(new[] { new Vector2(0.62f, 0f), new Vector2(-0.4f, -0.48f), new Vector2(-0.4f, 0.48f) }, h);
            unit[2] = Prism(Circle(18, 0.5f), h);
            unit[3] = Prism(new[] { new Vector2(0.72f, 0f), new Vector2(0f, -0.42f), new Vector2(-0.72f, 0f), new Vector2(0f, 0.42f) }, h);
            box = Prism(new[] { new Vector2(0.5f, 0.5f), new Vector2(0.5f, -0.5f), new Vector2(-0.5f, -0.5f), new Vector2(-0.5f, 0.5f) }, 1f);
            quad = Quad();
            ring = Ring(0.93f, 1f, 64);

            for (int i = 0; i < unitMat.Length; i++)
            {
                unitMat[i] = Mat(TeamCol[i]);
                var tx = new Texture2D(1, 1); tx.SetPixel(0, 0, TeamCol[i]); tx.Apply();
                swatch[i] = tx;
            }
            proj = Mat(new Color(1f, 0.95f, 0.6f));
            dead = Mat(new Color(0.22f, 0.22f, 0.25f));
            zoneB = Mat(new Color(0.10f, 0.13f, 0.18f));
            zoneR = Mat(new Color(0.17f, 0.11f, 0.11f));
            line = Mat(new Color(0.35f, 0.35f, 0.38f));
            ringW = Mat(new Color(1f, 1f, 1f));
            ringR = Mat(new Color(1f, 0.35f, 0.3f));
            ringGold = Mat(new Color(1f, 0.8f, 0.2f));
        }

        public static Material Mat(Color c)
        {
            var m = new Material(sh);
            m.enableInstancing = true;
            if (m.HasProperty("_Color")) m.SetColor("_Color", c);
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            return m;
        }

        static Vector2[] Circle(int n, float r)
        {
            var v = new Vector2[n];
            for (int i = 0; i < n; i++) { float a = -i * Mathf.PI * 2f / n; v[i] = new Vector2(Mathf.Cos(a) * r, Mathf.Sin(a) * r); }
            return v;
        }

        /// <summary>Prisme extrudé : dessus clair (centre blanc, bords légèrement sombres), côtés plus sombres.</summary>
        static Mesh Prism(Vector2[] o, float h)
        {
            var v = new List<Vector3>(); var c = new List<Color>(); var t = new List<int>();
            int n = o.Length;
            v.Add(new Vector3(0, h, 0)); c.Add(Color.white);
            var edge = new Color(0.82f, 0.82f, 0.82f, 1f);
            for (int i = 0; i < n; i++) { v.Add(new Vector3(o[i].x, h, o[i].y)); c.Add(edge); }
            for (int i = 0; i < n; i++) { t.Add(0); t.Add(1 + i); t.Add(1 + (i + 1) % n); }
            var low = new Color(0.45f, 0.45f, 0.45f, 1f); var high = new Color(0.68f, 0.68f, 0.68f, 1f);
            for (int i = 0; i < n; i++)
            {
                var a = o[i]; var b = o[(i + 1) % n]; int s = v.Count;
                v.Add(new Vector3(a.x, 0, a.y)); v.Add(new Vector3(b.x, 0, b.y));
                v.Add(new Vector3(b.x, h, b.y)); v.Add(new Vector3(a.x, h, a.y));
                c.Add(low); c.Add(low); c.Add(high); c.Add(high);
                t.Add(s); t.Add(s + 2); t.Add(s + 1); t.Add(s); t.Add(s + 3); t.Add(s + 2);
            }
            var m = new Mesh();
            m.SetVertices(v); m.SetColors(c); m.SetTriangles(t, 0);
            m.RecalculateBounds();
            return m;
        }

        static Mesh Quad()
        {
            var m = new Mesh();
            m.SetVertices(new List<Vector3> { new Vector3(-0.5f, 0, -0.5f), new Vector3(-0.5f, 0, 0.5f), new Vector3(0.5f, 0, 0.5f), new Vector3(0.5f, 0, -0.5f) });
            m.SetColors(new List<Color> { Color.white, Color.white, Color.white, Color.white });
            m.SetTriangles(new List<int> { 0, 1, 2, 0, 2, 3 }, 0);
            m.RecalculateBounds();
            return m;
        }

        static Mesh Ring(float inner, float outer, int seg)
        {
            var v = new List<Vector3>(); var c = new List<Color>(); var t = new List<int>();
            for (int i = 0; i <= seg; i++)
            {
                float a = i * Mathf.PI * 2f / seg; float cs = Mathf.Cos(a), sn = Mathf.Sin(a);
                v.Add(new Vector3(cs * inner, 0, sn * inner)); v.Add(new Vector3(cs * outer, 0, sn * outer));
                c.Add(Color.white); c.Add(Color.white);
                if (i < seg) { int b = i * 2; t.Add(b); t.Add(b + 1); t.Add(b + 3); t.Add(b); t.Add(b + 3); t.Add(b + 2); }
            }
            var m = new Mesh();
            m.SetVertices(v); m.SetColors(c); m.SetTriangles(t, 0);
            m.RecalculateBounds();
            return m;
        }
    }

    /// <summary>Regroupe les instances par (équipe, forme) et les dessine en GPU instancing (1023 par appel).</summary>
    public class Batcher
    {
        public const int Proj = Defs.TypeCount * 2, Dead = Proj + 1, Groups = Dead + 1;
        readonly Mesh[] mesh = new Mesh[Groups];
        readonly Material[] mat = new Material[Groups];
        readonly List<Matrix4x4[]>[] buf = new List<Matrix4x4[]>[Groups];
        readonly int[] cnt = new int[Groups];

        public Batcher()
        {
            for (int g = 0; g < Defs.TypeCount * 2; g++) { mesh[g] = Art.unit[g % Defs.TypeCount]; mat[g] = Art.unitMat[g]; }
            mesh[Proj] = Art.box; mat[Proj] = Art.proj;
            mesh[Dead] = Art.box; mat[Dead] = Art.dead;
            for (int g = 0; g < Groups; g++) buf[g] = new List<Matrix4x4[]>();
        }

        public void Begin() { for (int g = 0; g < Groups; g++) cnt[g] = 0; }

        /// <summary>(hx,hz) = direction normalisée vers laquelle pointe l'axe +X du mesh.</summary>
        public void Add(int g, float x, float y, float z, float hx, float hz, float sx, float sy, float sz)
        {
            int c = cnt[g]; int bi = c / 1023, k = c - bi * 1023;
            var list = buf[g];
            if (bi >= list.Count) list.Add(new Matrix4x4[1023]);
            Matrix4x4 m = default(Matrix4x4);
            m.m00 = hx * sx; m.m02 = -hz * sz; m.m03 = x;
            m.m11 = sy; m.m13 = y;
            m.m20 = hz * sx; m.m22 = hx * sz; m.m23 = z;
            m.m33 = 1f;
            list[bi][k] = m;
            cnt[g] = c + 1;
        }

        public void Flush()
        {
            for (int g = 0; g < Groups; g++)
            {
                int c = cnt[g]; var list = buf[g];
                for (int bi = 0; bi * 1023 < c; bi++)
                {
                    int n = Mathf.Min(1023, c - bi * 1023);
                    Graphics.DrawMeshInstanced(mesh[g], 0, mat[g], list[bi], n, null, UnityEngine.Rendering.ShadowCastingMode.Off, false);
                }
            }
        }
    }
}
