# Le Marathon Cinéma — Correctif de la refonte v2

Prompt pour Claude Code, 10 octobre 2026. Il complète `docs/refonte-v2/PROMPT.md` (version du 10 octobre), qui reste **la** consigne : ce correctif dit ce qui n'a pas été fait, dans quel ordre le faire, et comment prouver que c'est fait.

Tu es Claude Code. Le dernier gros commit (« Phases 3-10 refonte v2 : admin, moteur thèmes, 4 thèmes complets », `c8f5afb`, puis `bb46858`) a branché le moteur de thèmes, les couleurs, les polices, les libellés et la voiture de l'Action. **Les thèmes ne sont pas complets.** Les décors et la structure des écrans manquent presque entièrement. Ce correctif t'oblige à comparer ce qui est en ligne avec le prompt et les maquettes, puis à finir, un thème à la fois, avec des captures à l'appui.

---

## 0. Avant tout

1. **Le dossier `docs/refonte-v2/` doit être dans le dépôt** : `PROMPT.md`, `PROMPT-CORRECTIF.md` (ce fichier), `maquettes/` (kits HTML, images, `LISEZMOI.md`) et `curseurs/` (images fournies). S'il manque, **arrête-toi et demande-le à The Legendre**. C'est l'absence de ce dossier qui a fait improviser les décors la dernière fois. S'il est là mais pas encore suivi par git, ajoute-le dans un commit à part : « Docs : prompt, maquettes et curseurs de la refonte v2 ».
2. **Lis, dans cet ordre** : `PROMPT.md` en entier (en particulier §0, §2, §3, §11, §13 à §16, les annexes A, B, C et la nouvelle **annexe F**, qui associe chaque écran à sa section de kit et à son image), puis `maquettes/LISEZMOI.md`, puis ce correctif.
3. **Une branche** `refonte-v2/correctif`, partie de `main`. Une pull request, mise à jour à chaque arrêt. **Rien n'est fusionné sur `main` sans l'accord de The Legendre.** Des commits petits, un par écran ou par groupe d'écrans proches, nommés en français. Plus de commit « phases 3 à 10 » d'un seul bloc.
4. Toutes les règles de `PROMPT.md` §0 et §2 s'appliquent : zones interdites, easter eggs intacts, aucun usage de la clé `service_role` côté client ni dans le code que tu écris pour le navigateur, migrations demandées et jamais supposées passées, téléphone livré avec l'ordinateur.
5. **Ce que The Legendre a changé après `bb46858` est voulu : ne l'annule pas.** Le 10 octobre après-midi (commits `f874d81` à `6216aa6`) :
   - **la radio** a de vraies musiques (deux pistes par thème dans `public/audio/radio/`), la musique démarre par défaut au premier geste du joueur, et le poste est un bouton fixe en bas à droite avec un curseur de volume ;
   - **le verrou « saison 2 uniquement »** des films a été retiré des actions serveur et de l'interface.

   Pour la radio, ce comportement remplace ce que disait le prompt : « Musique » à l'arrêt par défaut, « Piste à venir », poste en bas à gauche. Garde-le. Vérifie seulement deux choses :
   - le bouton ne recouvre ni le bouton Discord, ni le widget du Tamagotchi, ni la barre du bas au téléphone (§8.9) : s'il gêne, propose une place sans rien changer d'autre ;
   - l'habillage par thème (A19, T19, W19, H19) s'ajoute sans toucher au fonctionnement.

   Dans l'état des lieux, ces points sont notés « Choix de The Legendre », pas « Faux ».
6. **Deux nouvelles règles de `PROMPT.md` §0** gouvernent tout ce correctif :
   - **la preuve par l'image (point 13)** : un écran de thème n'est « fait » que si sa capture ressemble à son image de maquette ;
   - **pas de code mort (point 14)** : un composant jamais affiché ou une règle CSS qui ne s'applique à rien compte comme non fait.

---

## 1. Étape 1 — L'état des lieux : compare ce qui est en ligne avec le prompt et les maquettes

**Aucun changement de comportement à cette étape.** Seuls les outils de vérification (points 1 à 3) sont créés.

1. **`npm run verifier`**, deux scripts en lecture seule :
   - `scripts/verifier-orphelins.mjs` liste tout fichier `.tsx` de `components/` qui n'est importé (import statique, `import()` ou `dynamic()`) par aucun fichier de `app/`, `components/` ou `lib/`, ou qui est importé mais jamais rendu.
   - `scripts/verifier-css-mort.mjs` liste :
     - chaque classe des feuilles `app/styles/themes/*.css` absente de tout `className` des composants ;
     - chaque classe des modules `components/**/*.module.css` jamais référencée (`styles.x`) par le fichier qui importe le module ;
     - toute règle de thème qui combine un sélecteur universel (`*`) et `!important`.
   - Les deux sortent en erreur s'il reste une alerte qui ne figure pas, avec sa raison, dans `scripts/exceptions-verifier.txt`.
2. **`npm run captures`** : un script Playwright qui capture chaque écran listé en annexe F, dans chaque thème, à 1440 × 900 et à 390 × 844. Les fichiers vont dans `docs/refonte-v2/captures/<thème>/<écran>-<largeur>.png`.
   - Pour forcer un thème sans compte admin : la variable `CM_THEME_DEV=<clé>`, lue par `resolveTheme` **uniquement si `process.env.NODE_ENV === 'development'`** (jamais en production : teste-le).
   - Les pages réservées aux connectés sont capturées dans l'état visiteur, et listées comme telles.
   - Si tu ne peux pas lancer le site avec ses données (pas de `.env.local`), dis-le, propose à The Legendre de lancer `npm run captures` sur son PC (commande Windows `cmd`), et ne déclare aucun écran « fait » sans capture.
3. Lance `npm run verifier` et `npm run captures` sur le code actuel. Garde leurs sorties : ce sont les « avant ».
4. Écris **`docs/refonte-v2/ETAT-DES-LIEUX.md`**. Pour chaque ligne, compare **ce qui est implanté sur le site** avec `PROMPT.md` **et** avec la maquette (section du kit et image, annexe F) :

   | Élément | § du prompt | Section du kit | État | Preuve | Ce qui manque |
   |---|---|---|---|---|---|

   - **État** : Fait / Partiel / Absent / Faux.
   - **Preuve** : `fichier:ligne`, ou capture.
   - **Une ligne par élément** : chaque écran A0 à A19, T0 à T19, W0 à W19, H0 à H20 et chaque 404 ; chaque élément de décor, chaque comportement et chaque œuf (#26 à #37) ; chaque ligne des sections « Au téléphone » ; chaque critère d'acceptation des phases 7 à 10.
   - **Pour le neutre et le socle** : une ligne par sous-section et par critère de §7.5, §8, §9, §10, §11 et §12.

   Mets en tête un résumé chiffré (combien de Fait, Partiel, Absent, Faux par thème).
5. Commit, mets la pull request à jour, **puis enchaîne sur l'étape 2 sans attendre**. Exception : si l'état des lieux contredit ce correctif sur un point qui change le travail (par exemple, un décor que ce correctif dit absent existe bien), arrête-toi et signale-le.

---

## 2. Ce qui a déjà été constaté dans le code (à confirmer dans l'état des lieux)

Relevé fait le 10 octobre sur `bb46858`. Vérifie chaque point, ne le recopie pas les yeux fermés.

1. **Les décors ont été improvisés, pas portés des kits.**
   - **Western** (`WesternFrame.tsx`) : des planches à 4 à 6 % d'opacité, quasi invisibles, et un horizon à 30 % d'opacité sur trois routes. Ni avis de recherche, ni étoile `.w-star`, ni clous `.clou`, ni le reste du kit.
   - **Horreur** (`HorreurFrame.tsx`) : un grain, une lampe et un badge « REC » permanent que le prompt ne prévoit pas (le seul « REC » prévu est l'horodatage des bandes retrouvées, H16). **Absents** : la lisière `.h-bois` (la forêt), la brume `.h-brume`, le vignettage `.h-vign`, la forme `.h-forme`.
   - **La lampe de l'Horreur** est à `--z-fx` (450), donc **par-dessus l'interface**, qu'elle assombrit, alors que §16.4 la veut dans le calque de décor (z-index 0), sous le contenu. Elle déplace un dégradé par variables CSS (repeinte à chaque mouvement) au lieu d'un calque déplacé par `transform`. Elle est cachée au téléphone au lieu de suivre le toucher. Le grain est lui aussi à `--z-fx`.
   - **Comédie** (`ComedieFrame.tsx`) : le fronton affiche encore « Ciné Marathon » (§7.5 : « Le Marathon Cinéma »).
   - **Action** : brume, traînées, grain, rail et bandeau existent. Compare-les au kit (section « La bibliothèque » et écran A1).
2. **Douze composants écrits ne sont affichés nulle part** :
   - Action : `PosterGrade` (étalonnage des affiches) ;
   - Comédie : `ComedieAffiche` (T5), `ComedieCadran` (T4), `ComedieSouffleur` (404), `ComedieTroisCoups` (chargement), et `ComedieVertEgg`, c'est-à-dire **l'œuf #28, aujourd'hui introuvable** ;
   - Horreur : `HorreurHomeHero` (H1), `HorreurCassette`, `HorreurVHS` ;
   - Western : `WesternHomeHero` (W1), `WesternBarillet` (chargement), `WesternVautour`.
3. **L'habillage des écrans vise des classes qui n'existent pas.** La plupart des classes de `app/styles/themes/*-screens.css` n'apparaissent dans aucun composant : `.leaderboard-table`, `.profile-card`, `.forum-topic-row`, `.filter-chip`, `.btn-primary`, `.page-header`, `.week-title`…
   - Mesure du 10 octobre : 14 classes mortes sur 18 dans `action-screens.css`, 7 sur 7 dans `action.css`, 28 sur 55 dans `comedie-screens.css`, 19 sur 30 dans `horreur-screens.css`, 20 sur 35 dans `western-screens.css`.
   - Ces règles ne s'appliquent à rien.
4. **La structure des écrans n'existe pas.**
   - Seul `app/page.tsx` change selon le thème, et seulement pour l'Action et la Comédie. L'accueil du Western (le contrat) et celui de l'Horreur (la porte) retombent sur l'accueil neutre.
   - Aucune autre page n'a de structure de thème : `/films`, la fiche, `/duels`, `/classement`, `/profil`, `/forum`, `/semaine`, `/marathoniens`, `/notes`, `/rattrapage`, `/watchlist`, `/messages`, `/easter-eggs`, `/auth`, la 404, le chargement, la radio. Le mot « WANTED » n'apparaît dans aucun fichier : il n'y a pas d'avis de recherche.
5. **Règles violées** :
   - `western-screens.css` impose `[data-theme="western"] * { transition-duration: var(--dur) !important }`, et `*:active` de même. Ces règles ralentissent **tout**, easter eggs et jeux compris (§2.2, règle 7) : supprime-les et applique la lenteur aux seuls composants du thème.
   - `ecranOccupe()` (`lib/themes/ecran.ts`) parcourt **tous** les éléments de la page avec `getComputedStyle` : limite-toi aux éléments `position: fixed` candidats (calques d'œufs, fenêtres), sans balayer le DOM entier.
6. **Les curseurs (choix de The Legendre, `PROMPT.md` §11.13).**
   - Action : la voiture devient le curseur **en permanence** sur ordinateur ; le réticule disparaît. Le crash ne joue toujours que si l'œuf #26 est armé.
   - Comédie : la « main gantée » du dépôt est un poing fermé. Elle est remplacée par **la chaussure noire** fournie.
   - Western : le colt du dépôt est méconnaissable. Il est remplacé par le colt fourni.
   - Horreur : **rien ne change**, curseur normal, c'est la lampe qui suit la souris. C'est la lampe elle-même qu'il faut corriger (point 1).
7. **Le nom et l'adresse du site (§7.5) ne sont pas faits** : pas de `lib/site.ts`, pas de déménagement des données, « Ciné Marathon » encore affiché.

---

## 3. Étape 2 — Le socle des corrections (avant les thèmes)

1. **Curseurs (§11.13)** :
   - copie les images de `docs/refonte-v2/curseurs/` dans `public/cursors/` : la chaussure noire remplace `comedie-gant.png`, le nouveau colt remplace `western-colt.png` ;
   - Action : la voiture en permanence (§13.6), suppression du réticule ;
   - Horreur : aucun curseur, la lampe ;
   - pose les jetons de l'annexe A ;
   - écris les règles de §11.13 : où le curseur s'applique, état de clic, garde des easter eggs fusionnée avec celle de la voiture.
2. **Nom du site (§7.5, points 1 et 2)** : `lib/site.ts`, le nom partout, le fronton de la Comédie compris. Le déménagement des données (point 3) se code aussi, mais il reste inerte tant que `ANCIENS_DOMAINES` est vide.
3. **Règles violées (§2, point 5 ci-dessus)** : supprime les règles universelles du Western ; allège `ecranOccupe()`.
4. **Le mécanisme des écrans de thème.**
   - Quand le tableau des écrans d'un thème dit « **Structure.** », la page rend un composant d'écran propre au thème : `components/theme/<thème>/ecrans/<Écran>.tsx`, par exemple `western/ecrans/AvisFilm.tsx` pour la carte de `/films`, ou `horreur/ecrans/LaPorte.tsx` pour l'accueil. Le composant reçoit **les mêmes données** que la version neutre ; il est choisi côté serveur par la clé du thème réel (ou de l'aperçu admin) et chargé en `dynamic import`.
   - Quand le tableau dit « **Habillage.** », le CSS du thème cible les **vraies** classes des composants existants. Ajoute au besoin des attributs stables (`data-ecran="films-carte"`, `data-role="stat"`…) plutôt que d'inventer des classes que personne ne pose.
   - Dans tous les cas, le comportement et les données ne changent pas ; les zones de §2.1 gardent leur comportement (`FilmsClient.tsx` : habillage et composants de carte seulement).
5. Chaque composant orphelin du §2, point 2 : branche-le là où le prompt le place, ou supprime-le s'il fait doublon avec ce que tu écris maintenant (dis lequel dans le compte rendu).
6. Chaque classe morte : rattache-la à un vrai élément, ou supprime-la.
7. `npm run verifier` passe, à exceptions justifiées près. Commit, puis **enchaîne sur l'étape 3**.

---

## 4. Étapes 3 à 6 — Un thème à la fois

Ordre : **Horreur** (la semaine d'Halloween commence le lundi 26 octobre), puis **Western**, **Action** et **Comédie**. **Arrêt après chaque thème**, pour la validation de The Legendre sur un vrai écran.

Pour chaque thème, dans cet ordre :

1. **Le décor** (`PROMPT.md` §13.4, §14.5, §15.4 ou §16.4) : porte les calques depuis le kit. Ils se trouvent dans la section des composants (A0, T0, W0, H0) et dans les cadres des écrans (par exemple la forêt de H1). Prends le CSS du kit, adapte-le aux jetons, respecte l'échelle de z-index (§8.4) et les règles du téléphone et de « réduire les animations ».
2. **Les écrans**, un par un, dans l'ordre de l'annexe F. Pour chacun :
   - ouvre la section du kit et l'image ;
   - lis la ligne du tableau des écrans du prompt et la ligne « Au téléphone » ;
   - code ;
   - capture ;
   - compare avec la maquette ;
   - commit.

   Les corrections de §3 du prompt et de `LISEZMOI.md` gagnent sur la maquette : pas de chiffres inventés, pas de durées de film, pas de distribution, pas de faux badges, pas de silhouette à chapeau à la place de l'affiche…
3. **Les comportements et les œufs** du thème : vérifie qu'ils sont branchés et qu'ils se déclenchent (menu « Tester ▾ », §11.4).
4. **La radio et le chargement** du thème (A19, T19, W19, H19, et les écrans de chargement).
5. **Le téléphone** : la section « Au téléphone » du thème, ligne par ligne, avec les captures à 390 px.
6. **Les critères d'acceptation** de la phase du thème (§13.9, §14.10, §15.9 ou §16.11) : un par un, cochés avec une preuve.
7. **`npm run verifier`**, `npm run build`, `npx tsc --noEmit`, `npm run lint`, `npx vitest run` : verts, ou pas plus d'erreurs qu'avant.
8. **Mets à jour `ETAT-DES-LIEUX.md`** : les lignes du thème passent à « Fait », preuve à l'appui. Ce qui reste « Partiel » est dit en clair.
9. **Compte rendu et arrêt** (voir §5 ci-dessous).

---

## 5. Le compte rendu, à chaque arrêt

1. **Ce qui a été fait**, écran par écran, avec, pour chaque écran, l'image de la maquette et la capture à 1440 px **côte à côte** (une planche par thème suffit : `docs/refonte-v2/captures/<thème>/planche.png`), puis la capture à 390 px.
2. **Ce qui ne ressemble pas encore à la maquette**, et pourquoi.
3. **Les sorties** de `npm run verifier`, du build, du contrôle des types, du lint et des tests.
4. **Ce que The Legendre doit faire** : une migration à passer, un réglage à mettre, un thème à tester sur son téléphone.
5. **Le résumé chiffré** de l'état des lieux, avant et après.

---

## 6. Interdits de ce correctif

- Déclarer un écran ou un thème « fait » sans capture comparée à sa maquette.
- Inventer un décor, un ornement ou un écran absent du prompt et des kits (comme le badge « REC » permanent de l'Horreur). En cas de doute, demande.
- Redessiner les curseurs fournis.
- Toucher aux zones interdites, aux 25 easter eggs, aux jeux ; poser une règle CSS universelle (`*`) avec `!important` dans une feuille de thème.
- Fusionner sur `main` sans l'accord de The Legendre.
- Utiliser la clé `service_role` en dehors des actions serveur prévues par le prompt.
