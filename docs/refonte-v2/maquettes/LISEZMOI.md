# Les maquettes de la refonte v2

**`../PROMPT.md` gagne toujours sur les maquettes.** Les maquettes montrent l'apparence ; le prompt dit ce qui est vrai, ce qui a changé et ce qui a été corrigé depuis (§3 du prompt).

Il n'y a **aucune maquette téléphone** : les maquettes montrent l'ordinateur ; la version téléphone est décrite dans le prompt (§8.9 et une section « Au téléphone » par thème).

Ce qui est **faux** dans toutes les maquettes, à ne pas recopier (et, plus bas, ce qui est faux en plus dans celles du Western et de l'Horreur) :

- **Le nom du site** : les maquettes affichent « CINÉ MARATHON ». Le site s'appelle désormais « Le Marathon Cinéma » (§3 et §7.5 du prompt ; au téléphone, la marque passe sur deux lignes, §8.9).
- **Les chiffres et les noms** (EXP, pseudos, films, « 09 / 12 en position », « 3 940 / 5 000 »…) : ce sont des exemples. Le site affiche les vraies données.
- **Les paliers de niveau** (950, 1 800… 17 000 EXP ; « Les douze montants » de 50 $ à 50 000 $ du Western ; dates de passage d'un niveau à l'autre) : inventés. Le code fait un niveau par tranche de 100 EXP (§3, §14.3 et annexe B.4 du prompt).
- **Les phrases citées par des joueurs** sur une fiche film (Comédie, écran T3) : la base ne garde qu'une note, pas de texte.
- **La distribution des acteurs** (T1, W1, W3) et **les durées** des films (« 2 H 50 », « 1 H 20 », « 2 H 58 », « 1 H 31 » en A1, A3, T1, T3, W1, W3, H1, H3) : absentes de la base, ne pas les afficher.
- **L'accroche « 466 FILMS. DEUX SÉANCES PAR SEMAINE. »** (neutre, 01) : remplacée par « UN MARATHON. UNE LISTE. TA CULTURE CINÉ. » (§9.1 du prompt).
- **« Le couloir ferme à minuit »** (Comédie, T7) : règle inventée, retirée.
- **Le bloc Vidéoclub de l'accueil** (écran 20 des kits, écran 21 de l'Horreur), présent dans les fichiers HTML : pas dans ce chantier. Seule l'entrée « Vidéoclub » de la barre existe. Il n'y a pas de capture de ces écrans.
- **Les textes à 9 ou 10 px** des kits : 12 px minimum partout.

## `neutre/`

| Fichier | À quoi il sert |
|---|---|
| `01-accueil-hors-saison.jpg` | L'accueil « Le Mur » : mur d'affiches, titrage, bande d'état dorée, trois colonnes, pied. **Couleurs et mise en page de référence du neutre** (sauf le texte de l'accroche, voir plus haut) |
| `02-accueil-marathon-mise-en-page.jpg` | Mise en page de l'accueil **en cours de saison** (film de la semaine en grand, colonne de droite, bande d'état). **Ses couleurs rouges viennent d'un ancien thème Horreur : obsolètes** |
| `03-films-mise-en-page.jpg` | En-tête, statistiques et filtres de `/films`. **Couleurs cyan d'un ancien thème SF : obsolètes** ; la grille garde son comportement actuel |
| `neutre-reference.html` | Le CSS des trois images ci-dessus. Seul le bloc `.t-neutre` (tableau `b1`) fait foi pour les couleurs ; `.t-horreur`, `.t-sf` et le tableau `b4` (planche de 13 thèmes) sont obsolètes. Les polices « Inter 18pt », « DejaVu Sans Mono » et « Apple Garamond » étaient des polices locales de rendu : le site utilise Inter, JetBrains Mono et Newsreader (§8.2) |

## `action/` et `comedie/`

- `theme-action.html`, `theme-comedie.html` : les kits complets, avec **le CSS exact** de chaque composant et de chaque écran (couleurs, tailles, biseaux, rivets, rideaux, ampoules…). Ouvre-les dans un navigateur ou lis leur code.
- `A0-…jpg` à `A19-…jpg`, `T0-…jpg` à `T19-…jpg` : les captures des écrans 00 (composants) à 19 (radio). Les numéros correspondent aux tableaux « Les écrans » du prompt (§13.5 et §14.7).

## `western/` et `horreur/`

- `theme-western.html`, `theme-horreur.html` : les kits complets, avec **le CSS exact** de chaque composant et de chaque écran.
- `W0-…jpg` à `W19-…jpg`, `H0-…jpg` à `H20-…jpg` : les captures des écrans 00 (composants) à 19 (radio), et 20 (l'apparition) pour l'Horreur. Les numéros correspondent aux tableaux « Les écrans » du prompt (§15.6 et §16.7).

Ce qui est **faux en plus** dans ces deux kits (détail et raisons en §3 du prompt) :

- **Les silhouettes à chapeau** dans les avis de recherche : à leur place, l'affiche TMDB du film ou l'avatar du joueur (silhouette seulement sans avatar). **Les cassettes sombres** de l'Horreur (H2) : à leur place, l'affiche TMDB assombrie.
- **Les badges** : « 07 entailles sur 24 », les « faits reprochés » (W6), les pièces à conviction « La clé », « La bougie »… (H6) sont inventés. Le site montre ses vrais badges.
- **Les statistiques** « Duels gagnés » et « Premier sur » (W6), les **phrases des joueurs** sur la fiche (W3), la « dernière apparition » (W3), la ligne « HazroF passe à 800 $ » (W1) : n'existent pas.
- **Les listes coupées** (« Quatorze autres avis au fond du tiroir », W5 ; « Dix autres portraits au dos du tirage », W9) : tout le monde reste affiché.
- **Les règles inventées** : « La bande ne recrute qu'en début de saison » (W9), « On le reverra la saison prochaine » (W4). Retirées.
- **Le bouton « En cavale »** des filtres (W2) : n'existe pas, pas de nouveau filtre.
- **Les jetons du saloon** rouges et acier « pour ceux qui écoutent » (W7) : un seul compteur de messages.
- **Les trous de balle posés en décoration** (W1, W2, W5, W6) : un trou n'apparaît qu'après une suppression, sur l'avis du perdant d'un duel clos (5 trous) et en série sur la 404.
- **Le ballon dessiné entre les arbres** de l'accueil (H1) : retiré, le seul ballon est celui de l'œuf.
- **Le titre habillé de la fenêtre de 24 h** (W18, H18) : il reste celui du code.
- **« Sons d'ambiance — à créer »** (H18) et les trois bruits de l'Horreur : hors de ce chantier. La musique de la radio est grisée tant qu'aucune piste n'existe (W19, H19 la montrent allumée).
- **Les dates et les semaines** (« du 5 au 11 octobre », « TERRITOIRE 03 / 04 », « NUIT 04 / 04 ») : des exemples ; le planning de l'admin décide.
- L'écran H20 montre les trois temps de l'apparition et ses règles : **ses règles sont celles du prompt** (§16.8). Le kit ne montre pas la case « Son » : elle est décrite en §16.8 (son actif par défaut).

| Fichier | À quoi il sert |
|---|---|
| `western/theme-western.html` | le kit Western : jetons, avis de recherche (`.w-av`), planches, horizon, soleil, mesas, vent, horloge, crosse, balles, trous de balle (`.imp`) |
| `horreur/theme-horreur.html` | le kit Horreur : jetons, forêt (`.h-bois`), brume, grain, vignettage, lampe, forme, ballon, cassettes (`.h-cas`), polaroïd, porche et fente, neige du sursaut |
