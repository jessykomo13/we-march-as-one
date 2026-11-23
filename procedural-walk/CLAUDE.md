# Procedural Walk — brief complet pour Claude Code

Tu reprends un projet en cours. Lis ce fichier en entier avant de toucher au code. Il remplace tout l'historique de conversation précédent.

---

## 0. Qui est l'utilisateur et comment travailler avec lui

- **Jessy**, développeur indé. Il écrit en **français**, court, souvent dicté au téléphone (fautes de dictée fréquentes : « va-si » = « vas-y », « Pro » = « prompt », « dès qu'on action » = « dès qu'on l'active »). Interprète le sens, ne demande pas de reformuler.
- **Réponds toujours en français**, de façon courte et directe. Pas de longues explications, pas de questions inutiles : **agis tout de suite**, puis résume en quelques puces ce qui a été fait.
- Il teste surtout **sur iPhone** (Safari, écran tactile, paysage et portrait) et parfois sur PC. Toute nouvelle UI doit marcher au doigt et ne jamais cacher la vie, l'endurance (sprint) et la mini-carte.
- « Vas-y module suivant » = fais le module suivant du plan (section 4) en entier, teste-le, publie/livre la version jouable.
- Il veut un jeu **façon GTA 6** (Floride, ville côtière), mais **tout est inventé** : aucun nom, marque, logo ou personnage de Rockstar/GTA ni de marque réelle. Noms de lieux, enseignes, tours, quartiers : invente (ex. « Tour Zénith », « Barrio Coral », « Port-Soleil »).
- Passants réalistes, variés, vivants. Il déteste le vide, la répétition (« trop de bâtiments identiques ») et les bugs de PNJ (qui marchent sur la route, restent bloqués, traversent les murs).
- Méthode : un module à la fois → version jouable → il teste → tu corriges tous ses bugs → module suivant. Quand il signale un bug avec une capture, corrige-le d'abord, puis enchaîne.

---

## 1. Le projet en une phrase

Un jeu 3D **dans le navigateur**, en **un seul fichier HTML** (`index.html`, ~500 Ko), fait avec **Three.js r160** (import map via CDN jsdelivr), sans bundler ni assets externes : personnages humains **100 % procéduraux** (corps, visages, tenues, coiffures générés par code) qui marchent avec une **locomotion procédurale** (IK des jambes, pas calculés, pas d'animations), dans une **ville générée par morceaux (chunks)** avec mer, îles, campagne, autoroute, petite ville, police 6 étoiles, combats, missions, mode créatif.

Version publiée actuelle (artefact claude.ai) : la dernière construite par `build.py`, identique à `index.html` fourni.

---

## 2. Structure des fichiers

```
procedural-walk/
  CLAUDE.md          ← ce brief
  build.py           ← assemble tout dans index.html
  shell.html         ← HTML + CSS + HUD + import map ; contient <!--SCRIPT--> remplacé par le JS
  human.js           ← génération des humains (makeHuman, randomPerson) : corps, visage, peau, tenues, coiffures, barbe, lunettes
  src/*.js           ← le jeu, concaténé dans l'ORDRE ALPHABÉTIQUE des noms de fichiers
  index.html         ← build final jouable (ouvrir directement ou servir en http)
  tests/run*.py      ← scripts Playwright de test (voir §6)
```

### Build
```
python3 build.py            # → index.html (+ check.mjs pour vérifier la syntaxe)
node --check check.mjs      # vérifie la syntaxe JS concaténée
python3 build.py --test     # → test/index.html qui charge three depuis /node_modules (tests hors-ligne)
```
Tous les `src/*.js` sont concaténés dans **un seul module** (pas d'import entre eux). Conséquences importantes :
- **L'ordre alphabétique compte** (`0976` < `0977` < `097_` < `097b` ; `023` < `023b` < … < `023h`). Les `function` sont hoistées, mais les `const`/`let` de haut niveau ne le sont pas : utiliser une `const` d'un fichier plus loin **pendant l'évaluation** d'un fichier plus tôt = `ReferenceError` (TDZ) → écran noir. Au runtime (dans tick/update) c'est OK. `node --check` ne détecte PAS ces erreurs : il faut lancer le jeu (test Playwright).
  - Exemple réel : `chunkType()` est appelé à l'évaluation (skyline dans `023g`) → il appelle `inPop()` de `023h` → `inPop` ne doit utiliser que des littéraux, pas la const `POP`.
- Un modèle humain (`buildRig`) est caché jusqu'à sa première pose (`animate`) : sinon une silhouette en T apparaît au point (0,0).
- Pas de doublon de nom global entre fichiers (déjà eu : `CM` en double → renommé `CMP`).
- Attention aux commentaires `//` en fin de ligne : déjà eu un bug où `// commentaire…cars.push(c);return c;` avalait du code. Mets le code sur une nouvelle ligne.
- N'écris jamais un fichier avec `open(f,'w').write(open(f).read()...)` en Python (le fichier est tronqué avant la lecture).

### Rôle de chaque fichier `src/`
| Fichier | Contenu |
|---|---|
| 016_region | **LE MONDE ENTIER (Floralia, 13,6 × 13,6 km)** — données + fonctions pures, évalué très tôt : `W_MIN/W_MAX` (±6800), `C_MIN/C_MAX` (±170 zones), `LAND_Y`=0,15 (sol de campagne), `TOWNS` (11 villes/bourgs à quadrillage avec un `style`), `HWYS` (autoroutes alignées sur la grille : ax "ns" ligne x=k*40-16 / "ew" ligne z=k*40-16, de a à b), `AIRPORT`, `LAKES`, `HILLS`, `BAYOU`, `KEYS` (archipel des Cayos), `REGIONS` (noms). Fonctions : `townAt/cityAt/gridAt/inGridArea/gridDist`, `coastX(z)` (côte est), `inOldSea/oldSeaChunk` (mer du module 16), `newSeaFloor/lakeFloor/bayouFloor`, `hillAt` (relief masqué près des routes/villes/eau), `nodeH/countryFloor` (grille de hauteurs 4 m, mise en cache), `bridgeProfile/bridgeAt` (tabliers au-dessus de l'eau), `countryGround`, `waterAtCountry`, `biomeAt` (champ, prairie, foret, lande, montagne, savane, orangeraie, vigne, ferme, eolien, bayou, plage, cayo, mer, lac), `regionName` |
| 005_utilitaires | V3, clamp, lerp, rand, pick, hash, mulberry (RNG à graine), D2R, helpers |
| 010_reglages | P0 : paramètres de locomotion (vitesses, longueurs de membres, pas…) |
| 015_rendu | renderer, scene, fog, camera (far recalculé par les réglages = fog.far+60), lumières, ombres |
| 020_obstacles | grille d'obstacles 8 m (`obsAt`, `addObstacle`, `removeObstacle`, `obstacleClosest`, `freeSpot`, `pushOutOfObstacles`), matériaux OM, `makeObstacle(kind)` : bench/bin/bollard/lamp/planter |
| 021_boutiques_base | registres `shopSpots/addShop` (points d'achat) et `ambSpots/addAmb` (figurants fixes : panne, autostop, pêcheur, barman, vendeur, domino, marchand, radio) |
| 022_monde | moteur de chunks 40 m : `blockOf`, `groundAt` (trottoir 0,12 ; reliefs ; fond marin ; pont/ponton), `publicOK`, `routeTo` (itinéraire piéton par passages piétons `.xing`), `buildChunk/unloadChunk/streamWorld`, bake des géométries par matériau en 3 groupes base/mid/detail (mid visible ≤2 chunks, detail ≤1) |
| 023_feux | feux tricolores, signal(ix,iz) cycle 28 s, feux piétons, lignes d'arrêt |
| 023b_kit | kit de décor : matériaux KM, textures canvas `cTex`, `signMat` (enseignes), STRIPES, SHOPS, `put/box/walls/wallPlane/gableRoof`, voitures garées `parkedCar/carMesh`, arbres, clôtures, panneaux, arrêts de bus, kiosques, fontaine, statue, terrasses, étals, aires de jeux, panier de basket… |
| 023c_quartiers | `district()`, `chunkType()` (tables de probas `pickT`), SPECIALS (lieux fixes), PRIVATE + publicRects (zones interdites aux passants), noms de rues AV_N/RU_N, **BUILDERS** : un constructeur par type d'îlot (place, parc, immeubles, commerces, maisons, parking, terrain, entrepots, conteneurs, plage, hotels, terrain_vague, jardin, skatepark, foodtrucks, foire, etang_urbain, commissariat, hopital, ecole, station, eglise, supermarche, marche), QUARTIER_NOMS, TYPE_COLOR, maillage de la mer |
| 023d_mer | MODULE 16 : mer (x>588), fond marin, 8 îles (ISLANDS), pont, ponton, échelles, villas, phare, bar de la Grande Île, bateaux décor, bouées, `waterDepth`, éclaboussures |
| 023e_campagne | campagne au nord (z<-560) : champs, fermes, éoliennes, étangs, forêts ; **autoroute A1** (x≈184) ; petite ville **Port-Soleil** ; `turbines[]` = objets animés (rotation, clignotement, grande roue) mis à jour par `updateCountry` |
| 023f_trafic | voitures IA sur l'autoroute (modèle IDM, klaxon, renversent les piétons) |
| 023g_centre | MODULE 15 : centre d'affaires (CBD ±3 chunks), `towerPlan()` déterministe, gratte-ciels variés, **Tour Zénith** 168 m, chariots hot-dogs, **skyline lointaine** (silhouettes ramenées à camera.far-14, même taille apparente) |
| 023h_populaire | MODULE 17 : **Barrio Coral** (cx -9..-4, cz 4..10) : maisons de ville colorées, balcons, linge, boutiques, Mercado Coral, Place des Dominos, fresques, guirlandes, **musique latine procédurale** (WebAudio) autour des « radios » |
| 023j_monde | **constructeurs du monde étendu** : `countryGroundMesh` (sol en relief 4 m, couleurs de biome, eau par zone `CH_WATER`/`BAYOU_WATER`), `buildHighways` (rubans qui suivent le sol, ponts avec piles/parapets, glissières, terre-plein, lampadaires, panneaux de distance, pannes/auto-stoppeurs), `buildCountry` (décor par biome, avec `ok()` qui évite routes/eau/villes), `buildAirport` (piste, taxiways, terminal en morceaux par zone, tour, hangars, avions garés) + `AIRFLY` (avions qui décollent/atterrissent), `ROADSIDE` (stations-service, motels, diners, relais, camping le long des autoroutes, module 22), `TSPEC/townTypeFor` (styles : banlieue, marina, balneaire, bayou, montagne, pecheurs, resort, village), builders `villas` (piscines, haies), `marina_bassin` (yachts), `cabanes` (pilotis), `chalets` ; `FAR` = paysage lointain (maillage 96×96 de 50 m, reconstruit par morceaux, enfoncé sous les zones chargées) ; `updateFar` règle aussi le brouillard (court en ville, ~620 m à la campagne, réglage `SET.farView`) et anime `worldMovers` (bateaux, alligators qui mordent) |
| 023i_port | MODULE 18 : **Port de la Vigie** (îlots cx 12..14, cz -13..-8 + quai sur la mer x 588..652, z -530..-302, h 1,3, rampe x 580..588) : labyrinthes de conteneurs (`portMaze`, obstacles `cont:true` avec `top`), 4 portiques animés, cargos *Marevia Star* / *Balena Aurora*, chalutiers, chariots élévateurs (`portFork`, obstacle mobile), dockers (rôle `docker`, casque `look.hat="hard"`), mouettes, sons (corne, bips). Le quai est découpé en 4 tronçons `PORT_SEC` construits/détruits selon la distance (`updatePortStream`). `portHidden(p)` : l'hélico ne voit pas entre les conteneurs. `waterDepth` = 0 sous le quai |
| 024_traces | traces de pas dans le sable (InstancedMesh) |
| 025_rig | squelette / os du perso |
| 030_marcheur | **class Walker** : locomotion procédurale (pas, IK, buste, bras), `groundStep` (marches 0,4 m, chutes, air), nage, **vol (mode créatif)** `flyStep/setFly`, KO, coups reçus `takeHit`, `setRig(rig,true)` = téléportation (recale sol et lastOk) |
| 035/040/045 | banc d'essai, galerie de persos, partenaire de sparring |
| 050_dialogues | bulles `say()`, voix synthétiques, `bark()` |
| 055_combat | poings/pieds, zones de dégâts, garde, audio() / actx |
| 060/065 | ambulanciers, porte-monnaie à ramasser, ambulance |
| 070_police | recherche 6 étoiles (`wanted`), témoins, caméras, policiers, taser, plaquage, hélico, **minicarte** |
| 075_arrestation-pnj | arrestations |
| 080_reactions | réactions des passants (fuite, curiosité, bagarres) |
| 0855_navigation | **A\* local** sur grille 0,5 m (`localPath`) quand un PNJ est coincé (haies, coins, reliefs) |
| 085_cerveaux | PlayerBrain (clavier/tactile/manette), NpcBrain (balade, feux, passages piétons, bancs, conversations, groupes) |
| 090_population | apparition/disparition des passants (`spawnOne` exige trottoir public libre ; costumes au CBD ; couleurs vives au Barrio) |
| 095_entrees-camera / 096_manette-camera | clavier, souris, tactile, manette, caméra 3e personne avec collision, boutons contextuels |
| 0974_jour-nuit | MODULE 25 : `DAY` (heure, nuit, météo), soleil/lune (`DAYSUN`, utilisé par updateCamera), palette du ciel, environnements `ENV_LV` (r160 n'a pas `scene.environmentIntensity` : on change de texture PMREM), fenêtres allumées (`NIGHT_MATS` : FACADES, houseWall, tower, KT, POP_MAT, phares HEADL/TAILL), étoiles, lune, pluie + son, lumière douce autour du joueur et phares, horloge `#clock`, réglages `SET.cycle`/`SET.weather` |
| 0975_vehicules | MODULE 26 : `VEH` (véhicules libres), `drive` (véhicule conduit), voitures garées volables (`parkedCar` donne un `pcar` à l'obstacle ; `bake` note les plages de sommets → `unbakeParked` les replie ; `TAKEN` sauvegardé), `stepVehicle` (arcade, frein à main/dérapage, relief, sauts, collisions murs/voitures/piétons → `registerCrime`), caméra derrière, son moteur, compteur `#speedo`, `#ctxHint` (PC), `driveCtx` (bouton mobile Conduire/Descendre/Braquer/Piloter) |
| 0975b_bateaux | MODULE 29 : vedettes et hydroglisseurs (`BOAT_SPOTS` fixes + ceux posés par le bayou), `stepBoat` (glisse, hauts-fonds, sillage), débarquer sur la terre la plus proche ou nager |
| 0975c_circulation | MODULE 27 : voitures en ville (`ccars`, un maillage fusionné par voiture `fastCar`), voie de droite, feux `signal()`, virages aux carrefours des `GRIDS`, piétons, bus/taxis, `tryCarjack` (braquer une voiture arrêtée) |
| 0975 (fin) | MODULE 28 : dégâts (fumée grise → noire → flammes, explosion `boom` qui éjecte et blesse, carcasse) |
| 0975d_radio | MODULE 39 (début) : radio de voiture générée (Azur FM, Coral Latino, Vigie Rock), T ou toucher le compteur pour changer |
| 0976_carte | noms de rues `streetAt`, GPS (Dijkstra sur la grille + autoroute), POIS, **grande carte** (Tab) |
| 0977_missions | MODULE 36 (prototype) : contact **Nino** sur la place, 3 missions (colis chronométré, filature, sac sur l'île + semer la police) puis petits boulots infinis, HUD mission, bannières |
| 0978_boutiques | achats avec E devant les boutiques (soin, endurance, salle de sport) |
| 0979b_secrets | 47 **Étoiles de Floralia** (`STARS`, ramassées en passant, +250 €, toutes → la Comète dorée + 25 000 €) et **lieux secrets** `LANDMARKS` construits à l'approche (OVNI écrasé, Cendrebourg le village fantôme, épave du vol AZ-404, trésor de l'Île du Trésor, Tête de Pierre, cercle de pierres, monstre du Lac Miroir) ; coffres avec E (`trySecret`) ; sauvegarde `secretSave/secretLoad` |
| 0979_evenements | événements aléatoires (voleur à rattraper, joggeur qui défie à la course), figurants fixes `AmbientBrain` |
| 097_habits | changer de look = mettre KO quelqu'un puis récupérer ses habits (pas de bouton « nouveau look ») |
| 097b_basket | basket jouable sur les terrains |
| 0980_creatif | **mode créatif** (G ou menu) : vol (double Espace, Espace/Ctrl, Shift très vite, ▲▼ au tactile), téléportation (clic sur la carte ou liste), sans police, invincible, +10 000 €, lancer missions/événements, panneau replié en bouton sur mobile |
| 098_sauvegarde-debug | sauvegarde localStorage (position, argent, look, progression missions…), debug H |
| 099_menu | menu pause ☰/Échap, réglages (qualité, distance d'affichage LOAD_R, foule, volumes) |
| 100_boucle | boucle principale `tick(dt)` qui appelle tous les `update*`, + hooks `window.__*` pour les tests |

### Géographie du monde (Floralia)
- **Le monde fait 13,6 × 13,6 km** (x et z de -6800 à 6800). La ville d'origine **Azuria** (±600 m) est au centre ; tout le reste est généré par `016_region.js` + `023j_monde.js`. Les zones de 40 m existent partout sauf dans l'ancienne mer (`oldSeaChunk` : cx 15..49, cz -32..32), dessinée en un seul morceau.
- Villes à quadrillage (`TOWNS`) : Port-Soleil, Les Jardins (banlieue ouest, villas/piscines), Marina del Sol (sud), Playa Dorada (station balnéaire), Bellefontaine, Les Pins (montagne), Marais-Gris (bayou), Cap-Nord (pêcheurs), Santa Brisa, Punta Esperanza (au bout des Cayos), Ambre-sur-Colline.
- Autoroutes A1 (nord), A2 (ouest), A3 + Route des Cayos (sud puis le long pont vers l'est), A4, A5, A6, A7, A10, Route des Pins, Route du Cap, routes de l'aéroport et d'Ambre. Aéroport international d'Azuria au sud-ouest (i -48..-30, j 20..29).
- Nature : Monts Bleus (jusqu'à ~60 m, neige), Collines d'Ambre, Massif du Nord, Coteaux de Santa Brisa, Bayou des Alligators (ouest), lacs Miroir / des Hérons / Caïman / Étang Bleu, Savane du Sud, orangeraies, vignes, Forêt de Gaïa.
- Ville : chunks de 40 m, grille de -14 à 14 (x et z de -600 à 600). Îlot d'un chunk (cx,cz) = carré [cx*40-12, cx*40+20] ; routes centrées sur i*40-16.
- District : `centre` (|cx|,|cz|≤3, CBD), `commerces` (≤5), `residentiel`, `industrie` (cx≤-10), `plage` (cx≥14, colonne d'hôtels Art déco cx=13), Barrio Coral (cx -9..-4, cz 4..10).
- Nord-est : **Port de la Vigie** (îlots cx 12..14, cz -13..-8 ; capitainerie en (12,-10), parc à camions (12,-13), quai sur la mer x 588..652 / z -530..-302).
- Est : mer à partir de x=588 jusqu'à 1180, 8 îles (Pélicans reliée par un pont, Phare, Corail, Tortues, Grande Île, Mouettes, Sauvage, Trésor), ponton de plongée.
- Nord (z<-560) : campagne, autoroute A1 (x≈177–191, z -598 → -1058), aire de repos, relais, Port-Soleil (cx 1..8, cz -33..-27).
- Départ : place centrale (0,0). Nino est à (-7.5, 9.5).

---

## 3. Contrôles (à garder cohérents)
PC : ZQSD/WASD marcher, Shift courir, Ctrl s'accroupir, Espace garde, clic/F poing, pied, E interagir (s'asseoir, parler, acheter, lâcher le ballon, accepter un défi), Tab grande carte, Échap menu, G mode créatif, H debug, U galerie.
Mobile : joystick gauche, boutons Courir/Garde/Poing/Pied/Accroupi/Épaule/S'asseoir (qui devient Parler/Acheter/Accepter/Lâcher selon le contexte), ☰ menu.

---

## 4. Plan des 40 modules et état

Fait (jouable) : **monde géant (refonte complète de la carte)**, **19 banlieue (villas, piscines, haies)**, **20 marina + Cayos et leur pont**, **21 bayou (alligators, hydroglisseurs, cabanes)**, **22 stations-service/motels/diners/bourgs**, **23 aéroport (avions animés)**, **25 jour/nuit + météo**, **26 conduite**, **27 circulation en ville**, **28 dégâts véhicules**, **29 bateaux**, **39 radio de voiture (début)**, secrets à collectionner ; 1–7 fondations (locomotion, humains, foule, combat, réactions/voix, KO/ambulance, police 6 étoiles), 8 architecture/sauvegarde/debug, 9 chunks, 10 collisions/escaliers/chutes, 11 caméra/manette/mobile, 12 menus/réglages, 13 minicarte/GPS/grande carte, 14 routes/feux/passages piétons, **15 centre-ville d'affaires**, **16 mer/îles/nage**, **17 quartier populaire**, **18 port et docks**, + prototype du **36** (missions Nino), basket (37 partiel), boutiques (32 partiel), campagne/autoroute/Port-Soleil (21–22 partiels), mode créatif.

**Prochain : 24 — intérieurs** (puis 28 dégâts véhicules complets, 30 police en voiture, 31 armes…). Idées en attente : police en voiture qui poursuit (30), plus de stations radio, compteur des étoiles dans le menu.

Ensuite : 20 marina et îles (yachts, ponts vers les îles du large), 21 marais/bayou, 22 petites villes/stations-service/motels, 23 aéroport (avions décor qui décollent/atterrissent), 24 intérieurs (magasins, appartement, commissariat, hôpital, entrée/sortie sans chargement), 25 cycle jour/nuit + pluie/orages (passants qui se couvrent), 26 conduite voiture (monter/descendre animés, physique, dérapage), 27 trafic IA en ville (feux, klaxons, évitement piétons, pas de bouchon infini), 28 dégâts véhicules, 29 motos/vélos/**bateaux** (très attendu : naviguer vers les îles), 30 police v2 en voiture (poursuites, barrages), 31 armes et visée/couverture, 32 économie (banque, distributeurs), 33 garde-robe/coiffeur/tatouages (changer de tenue efface la description police), 34 téléphone (contacts, photos, réseau social parodique), 35 PNJ avec métiers et routines jour/nuit, gangs, 36 histoire complète avec deux personnages jouables, 37 activités (salle de sport, sports, jeux), 38 stats qui progressent, 39 radios originales et sons de quartier, 40 optimisation PC/mobile (60 FPS PC, jouable mobile).

Le plan complet existe aussi dans un Claude Doc « Procedural Walk — Plan des modules » (colonnes Module / Groupe / Statut / Pour valider).

---

## 5. Règles techniques à respecter (leçons apprises)

1. **Tout nouveau contenu d'îlot = un builder dans `BUILDERS`** (signature `(ch,C)` avec `C={type,X,Z,bx0,bz0,bx1,bz1,bcx,bcz,cx,cz,r,base,mid,detail,prop,camAt}`). Utilise `r()` (RNG du chunk) pour que le chunk soit identique à chaque rechargement. Gros volumes → `base` ; détails → `mid`/`detail` (visibles seulement de près). Objets animés : `userData.keep=true` (pas fusionnés au bake) + `turbines.push(obj)` (`userData.ax`, `spd`, `blink`).
2. **Chaque bâtiment/obstacle solide doit avoir `addObstacle`** (`{type:"box",x,z,hx,hz,tall:true,bld:true}` ou `{type:"circle",x,z,r}`), sinon on le traverse. Les types d'îlot fermés vont dans `PRIVATE` (les passants restent sur l'anneau de trottoir de 2,6 m).
3. Hauteur du sol : toujours `groundAt(x,z)` (trottoir = 0,12). Un relief > 0,4 m (`STEP_UP`) est un mur, > 0,45 une chute.
4. **Téléporter le joueur** : `pl.root.set(...)` puis `pl.setRig(pl.rig,true)` (recale `gy`, `lastOk`, annule la chute), sinon il revient à sa dernière position.
5. Passants : apparition seulement sur trottoir public libre ; un PNJ spécial (mission, figurant) a `isMission=true` pour ne pas être supprimé ; créer avec `spawnSpecial(look,brain,pos,yaw)` (0977).
6. Les cerveaux spéciaux héritent de `NpcBrain` et doivent rendre la main à `super.update` quand `fight/flee/react/cuffed/surrender`. Remettre `w.faceYaw=null` avant de marcher (sinon le PNJ avance en crabe très lentement).
7. HUD : nouvelle info = petit élément discret ; sur mobile (`body.touch`, `isTouch()`), ne jamais recouvrir vie/sprint/minicarte ; les panneaux se replient en bouton.
8. Sons : uniquement WebAudio procédural via `audio()`/`sfxOut()`, jamais de fichiers.
9. Textures : canvas procéduraux via `cTex(key,w,h,draw)` (mis en cache) ; couleurs de vertex en sRGB (`c.setRGB(r,g,b,THREE.SRGBColorSpace)`).
10. Distance d'affichage : `LOAD_R` chunks (3 par défaut) ; brouillard far = LOAD_R*40+15 ; `camera.far = fog.far+60`. Tout ce qui doit se voir de plus loin passe par un système d'imposteurs comme la skyline.
11. Perf : surveille `window.__render()` (draw calls, triangles) et `window.__world().maxMs` (temps de construction d'un chunk, viser < 40 ms). Mobile = cible prioritaire.
12. Sauvegarde : ajouter tout nouvel état persistant dans `gatherSave/applySave` (098) avec des bornes (clamp x ∈ [-599, WORLD_E], z ∈ [-WORLD_N, 599]).

---

## 6. Tester (obligatoire avant de livrer)

Les tests utilisent **Playwright + Chrome headless (SwiftShader)**. Le jeu expose des hooks `window.__*` :
`__sim(n,dt)` avance la simulation de n images (avec `__pause=true` pour figer le temps réel), `__walkers` (0 = joueur), `__cam` (yaw/pitch/dist), `__world()`, `__render()`, `__groundAt`, `__blockOf`, `__chunkType`, `__keys` (Set de touches), `__setWP`, `__gps`, `__MIS`, `__startMission`, `__missionTalk`, `__EV`, `__startVoleur`, `__startCourse`, `__acceptEvent`, `__shops`, `__tryBuy`, `__amb`, `__CREA`, `__toggleCreative`, `__toggleFly`, `__teleportTo`, `__wanted`, `__money`, `__saveData`, `__crowd`, `__NAV`, `__localPath`, `__cars`, `__sky`, `__camera`…

Préparation :
```
npm i three@0.160.0 playwright && npx playwright install chromium
python3 build.py --test && cd test && ln -s ../node_modules node_modules && python3 -m http.server 8790
```
Les scripts `tests/run*.py` ont été écrits pour un serveur sur `/tmp/t` et `/usr/bin/google-chrome` : adapte `cwd` et `executable_path` (ou supprime-le pour utiliser le Chromium de Playwright).
- run55 : les 3 missions de Nino de bout en bout. run57/58 : voleur et course. run63 : PNJ coincés par quartier. run67 : mode créatif (vol, téléport, police, invincible). run69/73 : captures du centre-ville et du Barrio Coral. run49 : nage. run51 : autoroute. run41 : passages piétons. run48 : basket. run23 : arrestations/ambulance. run36 : GPS.
- En headless le rendu est très lent (≈3 images/s) : teste la logique avec `__sim`, et prends des **captures d'écran** pour vérifier visuellement chaque nouveau contenu (et regarde-les vraiment).
- Vérifie toujours : 0 erreur console (`pageerror`), pas de PNJ coincé, pas de bâtiment traversable, mise en page mobile (contexte Playwright `is_mobile`, `has_touch`, 844×390 et 390×844).

---

## 7. Livraison
- Le livrable est **`index.html`** (un seul fichier). Après chaque module : build, tests, captures, puis donne-lui le fichier (ou publie-le là où il le demande).
- Réponse finale à Jessy : en français, courte, puces : ce qui a été ajouté (avec les noms inventés), bugs corrigés, et « Prochain module : N — … ». Ne raconte pas les étapes.

---

## 8. Tâche immédiate
Lance-toi sur le **module 24 (intérieurs)** quand il dit « vas-y », ou traite d'abord le bug qu'il te montre. Avant toute chose : `python3 build.py && node --check check.mjs`, ouvre le jeu en test et vérifie que tout tourne sans erreur.
