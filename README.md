# We March as One — recréation Unity

## ▶ Jouer tout de suite
**https://jessykomo13.github.io/we-march-as-one/**

Pour l'installer sur ton téléphone, ouvre le lien puis :
- **iPhone** : bouton Partager → **Sur l'écran d'accueil**
- **Android** : menu ⋮ → **Installer l'application**

La version web (dossier `web/`, Three.js, sans build) est en 3D et reprend le jeu au plus près :
- **11 formes** : Cercle, Carré, Triangle, Losange, Pentagone, Hexagone (tir), Rhombe, Étoile (assassin), Octogone (colosse à frappe de zone), Croix (soigneur), Croissant (tireur d'élite)
- **Objets** (Améliorations > Objets, puis double-tap sur une unité) : Couronne, Char, Canon, Étendard, Chevalier, Bastion, Médecin, Ombre, Titan
- **Peinture sur grille** : une unité par case, pinceaux 1×1 / 3×3 / 7×7 / 8×8, ANNULER, EFFACER, AUTO, ordres MARCHE / TENIR
- **Collisions dures** entre soldats, bâtiments, arbres, rivières (lentes) et ponts
- **Campagne de 100 niveaux** avec notes VICTOIRE / DÉCISIVE / HÉROÏQUE, cités et boss (sans limite de troupes)
- **Arbre d'améliorations** sur 3 paliers (250 → 1 050 or) et panneau de recrutement, avec **le Roi** (touche deux fois un Cercle : ×10 PV et dégâts, alliés proches +30 % de vitesse)
- **Modes** Commandement (ordres et pouvoirs en direct), Tactique (armée fixe), Rassemblement (armée libre) et Bac à sable (éditeur de terrain)
- **Caméras** 2D, 3D et FLY, caméra automatique qui suit le front, jusqu'à 30 000 troupes, succès, sauvegarde locale et mode hors ligne
- **Navigation intelligente** : les troupes contournent les bâtiments et prennent les ponts pour atteindre l'ennemi le plus proche ; une règle anti-blocage relance toute bataille figée
- **Graphismes** : ombres douces, sable texturé, eau animée, maisons avec toits et fenêtres, éclats à chaque mort, flash quand une unité est touchée, bataille en direct derrière le menu
- **Sons synthétisés** (tambours, mêlée, flèches, victoire), avec un bouton pour couper le son
- **Améliorations** : arbre de 20 nœuds en cartes lisibles sur téléphone, plus le recrutement et l'entraînement de chaque forme (+10 % de PV et de dégâts par niveau)

---

Auto-battler incrémental : tu peins une armée de formes sur le champ de bataille, tu donnes tes ordres, et des milliers de soldats s'affrontent. Chaque soldat et chaque flèche est simulé individuellement.

## Jouer sur le Web (build Unity WebGL)

Ce dossier est un projet Unity complet (**Unity 2022.3.62f1 LTS**, Built-in). On le compile en WebGL avec Unity, puis on l'héberge comme un site web.

### Option A — automatique : GitHub Actions + GitHub Pages
Chaque push compile le jeu avec Unity (via GameCI) et le met en ligne sur `https://<ton-pseudo>.github.io/<repo>/`.

1. Crée un dépôt GitHub et envoies-y **tout** le contenu de ce dossier : `Assets`, `Packages`, `ProjectSettings`, `.github` et `.gitignore`. Le dossier `.github` est caché : vérifie qu'il est bien parti.
2. **Licence Unity**, à faire une seule fois sur un PC ou un Mac :
   - Installe Unity Hub et connecte-toi : la licence Personal gratuite s'active toute seule.
   - Ouvre le fichier de licence `Unity_lic.ulf` :
     - Windows : `C:\ProgramData\Unity\Unity_lic.ulf`
     - macOS : `/Library/Application Support/Unity/Unity_lic.ulf`
   - Sur GitHub, va dans **Settings → Secrets and variables → Actions** et ajoute ces trois secrets :
     - `UNITY_LICENSE` : tout le contenu du fichier `.ulf`
     - `UNITY_EMAIL` : l'adresse e-mail de ton compte Unity
     - `UNITY_PASSWORD` : le mot de passe de ce compte
3. Va dans **Settings → Pages → Source** et choisis **GitHub Actions**.
4. Fais un push sur `main`, ou lance le workflow à la main depuis l'onglet **Actions**. Le premier build prend environ 15 à 25 minutes, puis le lien du jeu s'affiche dans le job `deploy`.

### Option B — depuis ton Unity
1. Dans Unity Hub, installe **2022.3 LTS** avec le module **WebGL Build Support**, puis ouvre ce dossier comme projet.
2. Choisis le menu **We March as One → Build Web (WebGL)**. La scène et les réglages se créent tout seuls, et le build sort dans `Builds/WebGL`.
3. Pour le mettre en ligne :
   - **itch.io** : zippe le dossier, crée un projet de type « HTML » et coche « This file will be played in the browser ».
   - **Netlify** : glisse le dossier sur app.netlify.com/drop.
4. Pour tester en local, choisis **We March as One → Build And Run** : ouvrir `index.html` en double-cliquant ne marche pas.

Le build utilise la compression Gzip avec décompression en JavaScript : il marche sur n'importe quel hébergeur, sans configuration du serveur.

### Ajouter les scripts à un autre projet
Copie `Assets/WeMarchAsOne` dans ton projet (Built-in ou URP, Unity 2021.3+), ouvre n'importe quelle scène et appuie sur Play. Attention : le jeu se lance alors automatiquement dans toutes les scènes du projet.

## Contenu
- **Campagne** : des batailles de plus en plus grosses. Tu gagnes de l'or en tuant des ennemis, même si tu perds. Tes pertes reviennent pour la bataille suivante, et ta disposition est gardée.
- **4 formes** : Carré (Soldat), Triangle (Archer, tir à distance), Cercle (Bouclier, tank), Losange (Cavalier, rapide).
- **Pinceau** : peindre ou gommer, avec une taille et une densité réglables, et un ordre MARCHE ou TENIR pour chaque coup de pinceau.
- **Arbre de compétences** (16 nœuds) : débloque les unités, les bonus de PV, de dégâts, de cadence, de portée et de vitesse, le pillage, et deux capacités.
- **Mode Commandement** en bataille : ordres à toute l'armée en direct (MARCHE / TENIR), *Pluie de flèches* (tu cliques sur une zone) et *Ralliement*. Vitesse x1 à x8 et pause.
- **Bac à sable / éditeur** : peins les deux armées et sauvegarde ou charge ta carte. Les formes se débloquent quand tu les croises en campagne.
- **Caméras** : 2D vue de dessus, 3D orbitale, ou Survol libre.
- Sauvegarde automatique (PlayerPrefs).

## Contrôles
| Action | Touche |
|---|---|
| Peindre / gommer | Clic gauche / clic droit |
| Choisir une forme | 1 – 4 |
| Déplacer la caméra | ZQSD / WASD / flèches, clic molette glissé |
| Zoom | Molette |
| Changer de caméra | C |
| 3D : tourner | R / F |
| Survol : regarder / monter / descendre | Clic droit glissé / E / F |
| Pause | Espace |
| Aller plus vite | Maj (Shift) |
| Mobile | 1 doigt : peindre / cliquer · 2 doigts : pincer = zoom, glisser = déplacer |

## Fichiers
- `Scripts/WMAOGame.cs` : boucle de jeu, peinture, caméra, interface, campagne
- `Scripts/Sim.cs` : simulation (grille spatiale, ciblage, séparation, projectiles, capacités)
- `Scripts/Render.cs` : meshes procéduraux et rendu en GPU instancing
- `Scripts/Data.cs` : stats des unités, arbre de compétences, sauvegardes
- `Scripts/WIn.cs` : entrées compatibles avec les deux systèmes d'input
- `Resources/WMAO_Unlit.shader` : shader instancié
- `Editor/WebBuild.cs` : build WebGL (menu + point d'entrée pour la CI)
- `.github/workflows/web.yml` : build Unity + déploiement GitHub Pages

## Équilibrage
Tout se règle dans `Data.cs` (`Defs.Base`, les coûts, `Skills.All`) et dans `GenEnemy()` de `WMAOGame.cs`, qui fixe la taille des vagues : 15 × 1,28^(niveau−1).
