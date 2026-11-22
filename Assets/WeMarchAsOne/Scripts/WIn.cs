#if ENABLE_INPUT_SYSTEM && !ENABLE_LEGACY_INPUT_MANAGER
#define WMAO_NEW_INPUT
#endif
using UnityEngine;
#if WMAO_NEW_INPUT
using UnityEngine.InputSystem;
#endif

namespace WMAO
{
    /// <summary>Petite couche d'entrée compatible ancien Input Manager et nouveau Input System.</summary>
    public static class WIn
    {
#if WMAO_NEW_INPUT
        static Key Map(KeyCode k)
        {
            switch (k)
            {
                case KeyCode.W: return Key.W;
                case KeyCode.A: return Key.A;
                case KeyCode.S: return Key.S;
                case KeyCode.D: return Key.D;
                case KeyCode.Z: return Key.Z;
                case KeyCode.Q: return Key.Q;
                case KeyCode.E: return Key.E;
                case KeyCode.C: return Key.C;
                case KeyCode.R: return Key.R;
                case KeyCode.F: return Key.F;
                case KeyCode.Space: return Key.Space;
                case KeyCode.LeftShift: return Key.LeftShift;
                case KeyCode.UpArrow: return Key.UpArrow;
                case KeyCode.DownArrow: return Key.DownArrow;
                case KeyCode.LeftArrow: return Key.LeftArrow;
                case KeyCode.RightArrow: return Key.RightArrow;
                case KeyCode.Alpha1: return Key.Digit1;
                case KeyCode.Alpha2: return Key.Digit2;
                case KeyCode.Alpha3: return Key.Digit3;
                case KeyCode.Alpha4: return Key.Digit4;
                default: return Key.None;
            }
        }
        public static bool Held(KeyCode k)
        {
            var kb = Keyboard.current; var key = Map(k);
            return kb != null && key != Key.None && kb[key].isPressed;
        }
        public static bool Down(KeyCode k)
        {
            var kb = Keyboard.current; var key = Map(k);
            return kb != null && key != Key.None && kb[key].wasPressedThisFrame;
        }
        public static Vector2 MousePos => Mouse.current != null ? Mouse.current.position.ReadValue() : Vector2.zero;
        public static bool LMB => Mouse.current != null && Mouse.current.leftButton.isPressed;
        public static bool LMBDown => Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame;
        public static bool RMB => Mouse.current != null && Mouse.current.rightButton.isPressed;
        public static bool MMB => Mouse.current != null && Mouse.current.middleButton.isPressed;
        public static float Scroll
        {
            get
            {
                if (Mouse.current == null) return 0f;
                float v = Mouse.current.scroll.ReadValue().y;
                if (Mathf.Abs(v) >= 10f) v /= 120f;
                return v;
            }
        }
#else
        public static bool Held(KeyCode k) => Input.GetKey(k);
        public static bool Down(KeyCode k) => Input.GetKeyDown(k);
        public static Vector2 MousePos => Input.mousePosition;
        public static bool LMB => Input.GetMouseButton(0);
        public static bool LMBDown => Input.GetMouseButtonDown(0);
        public static bool RMB => Input.GetMouseButton(1);
        public static bool MMB => Input.GetMouseButton(2);
        public static float Scroll => Input.mouseScrollDelta.y;
#endif

        // Tactile (mobile / navigateur) : 1 doigt = clic gauche simulé par Unity, 2 doigts = caméra
#if WMAO_NEW_INPUT
        public static int TouchCount
        {
            get
            {
                var ts = Touchscreen.current; if (ts == null) return 0;
                int n = 0; foreach (var t in ts.touches) if (t.press.isPressed) n++;
                return n;
            }
        }
        public static Vector2 TouchPos(int i)
        {
            var ts = Touchscreen.current; if (ts == null) return Vector2.zero;
            int n = 0; foreach (var t in ts.touches) if (t.press.isPressed) { if (n == i) return t.position.ReadValue(); n++; }
            return Vector2.zero;
        }
#else
        public static int TouchCount => Input.touchCount;
        public static Vector2 TouchPos(int i) => Input.GetTouch(i).position;
#endif
    }
}
