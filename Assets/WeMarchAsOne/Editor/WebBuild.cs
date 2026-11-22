using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace WMAO.EditorTools
{
    /// <summary>
    /// Build WebGL en un clic (menu « We March as One ») ou depuis GitHub Actions (GameCI, -executeMethod).
    /// </summary>
    public static class WebBuild
    {
        const string ScenePath = "Assets/Scenes/Main.unity";
        const string LocalOut = "Builds/WebGL";

        [MenuItem("We March as One/Build Web (WebGL)")]
        public static void BuildFromMenu()
        {
            if (Build(LocalOut))
            {
                EditorUtility.RevealInFinder(Path.GetFullPath(Path.Combine(LocalOut, "index.html")));
                EditorUtility.DisplayDialog("We March as One",
                    "Build WebGL terminé dans " + LocalOut + ".\n\nZippe ce dossier et envoie-le sur itch.io (type « HTML »), ou glisse-le sur app.netlify.com/drop.\nUtilise plutôt « Build And Run » pour tester en local.", "OK");
            }
        }

        [MenuItem("We March as One/Build And Run (WebGL)")]
        public static void BuildAndRun()
        {
            Build(LocalOut, BuildOptions.AutoRunPlayer);
        }

        /// <summary>Point d'entrée pour GameCI : buildMethod: WMAO.EditorTools.WebBuild.BuildFromCI</summary>
        public static void BuildFromCI()
        {
            string outPath = Arg("-customBuildPath") ?? "build/WebGL/WeMarchAsOne";
            bool ok = Build(outPath);
            EditorApplication.Exit(ok ? 0 : 1);
        }

        static string Arg(string name)
        {
            var a = Environment.GetCommandLineArgs();
            for (int i = 0; i < a.Length - 1; i++) if (a[i] == name) return a[i + 1];
            return null;
        }

        static void EnsureScene()
        {
            if (!File.Exists(ScenePath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(ScenePath));
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, ScenePath);
                AssetDatabase.Refresh();
            }
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        static bool Build(string outPath, BuildOptions extra = BuildOptions.None)
        {
            EnsureScene();

            PlayerSettings.companyName = "Jessy";
            PlayerSettings.productName = "We March as One";
            PlayerSettings.runInBackground = true;
            // Gzip + décompression JS : fonctionne sur n'importe quel hébergeur (GitHub Pages, itch.io, Netlify…)
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.ExplicitlyThrownExceptionsOnly;

            var opts = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = outPath,
                target = BuildTarget.WebGL,
                targetGroup = BuildTargetGroup.WebGL,
                options = extra,
            };
            BuildReport report = BuildPipeline.BuildPlayer(opts);
            bool ok = report.summary.result == BuildResult.Succeeded;
            Debug.Log("[WMAO] Build WebGL " + (ok ? "réussi" : "échoué") + " → " + outPath + " (" + report.summary.totalSize / (1024 * 1024) + " Mo)");
            return ok;
        }
    }
}
