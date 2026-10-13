# Le Marathon Cinéma — Refonte v2

**Site neutre « Le Mur », quatre thèmes (Action, Comédie, Western, Horreur) avec leurs 12 easter eggs, version téléphone de tout le site, admin refaite, bouton de thème, onglet Vidéoclub.**

Prompt pour Claude Code. Version unique du 10 octobre 2026 : elle remplace toutes les précédentes (le correctif `PROMPT-CORRECTIF.md` dit dans quel ordre finir le travail). Rédigé à partir d'une copie du code datée du 21 septembre 2026 (commit « base »).

---

## 0. Comment travailler avec ce document

Tu es Claude Code. Tu travailles dans le dépôt de **The Legendre**, auteur et administrateur du site. Il ne code pas. Il valide ce qu'il voit.

1. **Ce document est la seule consigne.** Il remplace `PROMPT-refonte-design.md`, `REFONTE-THEMES-SAISON-1.md` et toutes les versions précédentes de ce prompt (dont `PROMPT-2-WESTERN-HORREUR.md`). Si ces anciens fichiers traînent dans le dépôt, ne les suis pas.
2. **Le code gagne.** Tout ce qui est écrit ici a été vérifié dans la copie du 21 septembre. Le dépôt a pu bouger depuis. Si le code ne correspond pas à ce que dit ce document (fichier absent, fonction renommée, comportement différent), **arrête-toi et signale l'écart** au lieu d'inventer.
3. **Les maquettes** sont dans `docs/refonte-v2/maquettes/` (voir le `LISEZMOI.md` du dossier). **Si ce dossier n'est pas dans le dépôt, arrête-toi et demande-le** : sans lui, tu n'as ni le décor ni la structure des écrans, et tu inventerais (c'est arrivé : les décors ont été improvisés). Les fichiers HTML des kits contiennent le balisage et le CSS exacts : lis-les pour les couleurs, les tailles, les formes, les ornements et le décor. L'annexe F donne, pour chaque écran, la section du kit et son image. Les images servent à voir le rendu. **Les chiffres et les noms dans les maquettes sont des exemples** (EXP, pseudos, films, « 09 / 12 en position »…) : le site affiche les vraies données. Il n'existe **aucune maquette téléphone** : la version téléphone est décrite par écrit (§8.9, et une section « Au téléphone » par thème).
4. **Une phase = une branche partie de `main` + une pull request.** Nom : `refonte-v2/phase-N`. Commits petits et nommés en français. **Arrêt après chaque phase** : tu écris le compte rendu (modèle en §4.3) et tu attends la validation de The Legendre avant la phase suivante. Rien n'est fusionné sur `main` sans son accord.
5. **Base de données.** Tu n'as pas accès à Supabase. Chaque changement de schéma est un fichier SQL idempotent dans `supabase/migrations/` (le SQL complet est en annexe D). Tu t'arrêtes et tu demandes à The Legendre de l'exécuter dans Supabase (SQL Editor), dans l'ordre indiqué. Tu ne supposes jamais qu'une migration a été passée.
6. **Les aperçus Vercel utilisent la base de production.** Tout test sur un aperçu écrit dans les vraies données (EXP, œufs trouvés, votes). Les migrations de ce document sont donc **additives** : l'ancien code continue de marcher après leur passage. Deux migrations retirent des droits, et chacune ne se passe **qu'après** la mise en ligne du code qui s'en passe : M2 après la phase 1A, le verrou des œufs de M3 après la phase 1B (voir §4.2).
7. **Environnement.** Tu tournes sous Linux (session cloud). Si tu donnes une commande à lancer sur le PC de The Legendre, donne-la pour Windows `cmd`.
8. **Vérifications minimales après chaque phase :** `npm run build` passe ; `npx tsc --noEmit` et `npm run lint` n'ont **pas plus** d'erreurs qu'au départ (relevé de la phase 0) ; les 25 easter eggs existants se déclenchent encore ; aucun jeu n'a changé ; chaque page touchée est vérifiée au téléphone (§8.9). Le build télécharge les polices Google (`next/font/google`) : si ta session bloque `fonts.googleapis.com` et `fonts.gstatic.com`, il échoue dès la phase 0. Dans ce cas, demande à The Legendre d'autoriser ces deux domaines dans l'accès réseau de ton environnement (phase 11).
9. **Tu écris le code et les textes en français**, comme le reste du site. Pas d'emoji dans les nouvelles interfaces (les contenus des joueurs et les easter eggs gardent les leurs).
10. **Types Supabase.** `lib/supabase/server.ts` utilise un client typé par `lib/supabase/types.ts`, écrit à la main. Chaque nouvelle colonne ou table (M1, M3, M4) y est ajoutée (`Row`, `Insert`, `Update`) dans la même phase : sinon `next build` échoue au contrôle des types. Pas de `as any` pour contourner.
11. **Ne transforme jamais un conteneur de page.** Aucun `transform`, `filter`, `perspective`, `will-change: transform`, `contain`, `z-index`, `isolation`, `opacity` inférieure à 1 ni `mix-blend-mode` sur `#site`, `main` ou un conteneur de page : ils deviendraient le repère des éléments `position: fixed` qu'ils contiennent et casseraient les easter eggs montés dans les pages (Le Parrain, Dun Dun, Inception, forum). Les effets de thème animent des calques à part.
12. **Le téléphone n'est pas une option.** Chaque phase livre l'ordinateur et le téléphone en même temps (§8.9).
13. **La preuve par l'image.** Un écran de thème n'est « fait » que si sa capture ressemble à son image de maquette (annexe F). Pour chaque écran touché, dans chaque thème touché : capture à 1440 × 900 et à 390 × 844 (Playwright, `npm run captures`), rangée dans `docs/refonte-v2/captures/<thème>/<écran>-<largeur>.png`, et mise côte à côte avec l'image de la maquette dans le compte rendu. Les données réelles remplacent les exemples ; le reste (structure, décor, ornements) doit se reconnaître au premier coup d'œil.
14. **Pas de code mort.** Un composant écrit et jamais affiché, ou une règle CSS qui ne s'applique à aucun élément, compte comme non fait. Deux scripts tournent avant chaque compte rendu (`npm run verifier`) : `scripts/verifier-orphelins.mjs` (tout fichier de `components/` est importé quelque part et rendu) et `scripts/verifier-css-mort.mjs` (chaque classe des feuilles de thème `app/styles/themes/*.css` et des modules de `components/theme/` est utilisée par au moins un composant). Le compte rendu donne leur sortie ; zéro alerte, ou chaque exception justifiée.

---

## 1. Le projet en bref

Next.js 16.2 (App Router, `proxy.ts`), React 18 côté paquet, Supabase (`@supabase/ssr` 0.9, `supabase-js` 2.100), Redis via `lib/redis.ts` (client `redis`, facultatif), Vercel. Environ 466 films, des joueurs qui se retrouvent pour deux séances collectives par semaine (le film vainqueur du duel le mercredi à 20 h 30, le film de la semaine le vendredi à 20 h 30) et regardent le reste chacun de leur côté. EXP, niveaux, badges, duels, forum, messages, watchlists, et 25 easter eggs dont plusieurs jeux Phaser.

Une saison dure 4 semaines, un genre par semaine. Le site change d'habillage chaque lundi à 0 h (heure de Paris) selon le genre de la semaine. Hors saison, ou quand aucun thème n'est prévu, le site est **neutre** : anthracite et or, direction « Le Mur ».

Ce chantier livre :

- le site neutre, nouvelle version, sur ordinateur et au téléphone ;
- le moteur de thèmes, avec un bouton dans l'admin pour changer de thème ;
- les thèmes **Action**, **Comédie**, **Western** et **Horreur**, complets, sur ordinateur et au téléphone, avec leurs 12 œufs de thème ;
- l'admin refaite de fond en comble ;
- un onglet **Vidéoclub** vide (« Bientôt »), qui sera rempli plus tard ;
- la correction d'une trentaine de défauts trouvés dans le code, dont deux qui cassent le site à partir du **dimanche 25 octobre 2026** (passage à l'heure d'hiver) ;
- les gains de vitesse (chargement des pages et des affiches).

---

## 2. Règles dures

### 2.1 À ne pas toucher

Toute modification dans ces zones est un bug, sauf les **retouches chirurgicales** listées juste après.

- `app/labo/**`, `src/games/**`, `components/battle/**`, `components/clippy-*/**`
- Les easter eggs et jeux : `components/EasterEggs.tsx`, `components/EasterEggsLoader.tsx`, `components/*Egg*.tsx`, `components/Clippy*.tsx`, `components/FightClubGame.tsx`, `components/KillBillGame.tsx`, `components/SouthParkEggs.tsx`, `components/PandoraBox.tsx`, `components/Jaws*.tsx`, `components/TamagotchiWidget.tsx`, `app/tamagotchi/**`, `app/clippy-revanche/**`, `app/admin/tamagotchi-preview/**`
- Le **comportement** de `app/films/FilmsClient.tsx` : filtres, recherche, tri, film au hasard, fenêtre de fiche, gestion 18+, watchlists, easter eggs Inception / Le Parrain / Dun Dun. Tu changes l'habillage, jamais le comportement ni les données. La grille reste une grille, avec son nombre de colonnes actuel (piloté par la largeur).
- Le **comportement** de `components/Forum.tsx` (forums des films, de la semaine et des duels) : ses œufs (Le Rageux, Le Facehugger, répliques de films, mini-jeu Fight Club). Habillage autorisé.

**Retouches autorisées dans ces zones, et seulement celles-là :**

| Fichier | Retouche | Phase |
|---|---|---|
| `components/EasterEggs.tsx` | ignorer les frappes dans les champs de saisie (D10) ; ne pas déclencher un œuf coupé dans l'admin (D8) ; lire les réglages par une `ref` | 1B |
| `components/EasterEggsLoader.tsx` | transmettre la liste des œufs coupés | 1B |
| `components/Forum.tsx` | texte « Easter egg #11 » → « #16 » (D20) ; ne pas jouer Le Rageux, le Facehugger ni le mini-jeu s'ils sont coupés (D8) ; enveloppe `.egg-legacy` de ses fenêtres d'œufs ; habillage ; `data-destructif` sur « Supprimer » d'un message, `data-destructif-cible` sur le message, `cm:destruction` quand `deletePost` répond sans erreur (§9.6) | 1B, 2, 3, 7, 8, 9, 10 |
| `app/films/FilmsClient.tsx` | saisons en dur (D3) ; ne pas déclencher Inception / Le Parrain / Dun Dun s'ils sont coupés (D8) ; montants d'EXP exacts dans les toasts (D27) ; enveloppe `.egg-legacy` des fenêtres d'œufs ; affiches par `Poster`, `sizes`, `content-visibility`, données de notes (P1 à P4) ; habillage (dont la fiche en feuille plein écran au téléphone, §8.9) ; hooks de « La blanquette » et de « La révérence » ; clé `addToList` (§8.8) ; `data-destructif`, `data-destructif-cible` et émission de `cm:destruction` après le succès de « Retirer des vus » et du retrait d'un film d'une liste (§9.6) ; classe du gros plan sur l'image des cartes (Western, §15.5) ; étiquette « victime » avec la date `watched_at` (Horreur, H2 ; la lecture de `watched_at` s'ajoute dans `app/films/page.tsx`, qui ne lit aujourd'hui que `film_id, pre`) | 1B, 2, 3, 4, 7, 8, 9, 10 |
| `app/profil/page.tsx` | badge Fever Night (D19). Ce fichier n'est pas une zone interdite : il est refait librement en phases 3, 7, 8, 9 et 10 | 1B |
| Tout fichier listé | remplacer `CONFIG.*` par la configuration en base (D6) | 1B |

Si un easter egg ou un jeu casse, la phase est ratée, même si le reste est parfait.

### 2.2 Règles communes à tous les thèmes

1. **Un thème renomme l'unité, jamais le chiffre.** 3 940 EXP s'affichent « 3 940 rappels » en Comédie. Aucun thème n'invente un montant, un horaire ou une règle. Deux exceptions assumées, parce que ce sont des blagues lisibles : la ligne d'ancienneté de la loge en Comédie (§14.7, écran T6), qui affiche le vrai nombre **puis** un faux (« bientôt 32 ») ; et la place vide de la photo de groupe en Horreur (§16.7, écran H9), une place de plus que de joueurs.
2. **Le thème change l'habillage, jamais le comportement ni les données.** Mêmes pages, mêmes filtres, mêmes boutons, mêmes requêtes.
3. **Sécurité et modération restent littérales dans tous les thèmes** : champs et boutons de connexion, « Se connecter », « Mot de passe oublié ? », « Inscription », « Bloquer », « Débloquer », « Supprimer », « Signaler une erreur », « refusée », les bandeaux « 18+ » et « 18+ Étrange », les confirmations, les messages de limite (« 4 films par jour »…). Jamais de jeu de mots dessus.
4. **Un titre habillé, une phrase d'origine.** Dans les bannières, fenêtres et notifications, le titre prend la voix du thème ; la phrase qui explique reste celle du code, mot pour mot. Les états génériques sans information précise (liste vide, chargement, erreur sans détail, 404) peuvent prendre la voix du thème en entier.
5. **Pages hors thème.** `/admin/**`, `/videoclub`, les jeux (`/labo/**`, `/clippy-revanche`, `/tamagotchi`) restent toujours en neutre : seule leur entrée dans le menu est renommée. Les pages légales (`/mentions-legales`, `/confidentialite`) prennent la typographie du thème, texte littéral, sans décor animé. `/auth` prend le thème (titre habillé, formulaire littéral).
6. **Les textes écrits dans l'admin ne sont jamais habillés** (annonces, règles, répliques) : le thème habille le cadre, pas le contenu.
7. **Tous les easter eggs existants marchent dans tous les thèmes** et passent toujours au-dessus du décor et des effets de thème (rideau, poursuite, explosions, fissures, trous de balle, lampe, mouche, ballon, apparition) : les effets restent sous le z-index 500 des fenêtres, les œufs sont au-dessus. Quand un œuf prend l'écran ou le curseur, la voiture de l'Action s'efface (§13.6) et les comportements du Western et de l'Horreur attendent (§11.6).
8. **« Réduire les animations »** (`prefers-reduced-motion: reduce`) coupe tout effet de thème animé : poursuite, trac, révérence, aiguille qui oscille, traînées, explosions, vent, gros plan, vol de la mouche, blanchiment, lampe mobile, forme, ballon qui monte, respiration, apparition. Le thème reste complet et lisible sans eux. Détail par effet dans chaque thème.
9. **Aucune couleur ni police en dur** dans les composants : tout passe par les jetons (annexe A).
10. **Aucun personnage protégé dessiné, aucune affiche reproduite, aucune musique de film.** Les affiches des films viennent de TMDB comme aujourd'hui ; les décors sont originaux.
11. **Accessibilité** : contraste du texte ≥ 4,5:1 sur son fond (les jetons de l'annexe A sont calculés pour ça), focus visible partout, rien sous 12 px, pas plus de trois flashs par seconde, lecteurs d'écran jamais trompés par un effet.
12. **Téléphone** : chaque écran de chaque thème marche de 360 à 430 px de large, sans défilement horizontal, avec des cibles tactiles de 44 × 44 px au moins, et rien qui ne s'atteigne qu'au survol (§8.9).

---

## 3. Décisions prises, et corrections des anciens documents

The Legendre a validé les kits Action et Comédie écran par écran. Les kits Western et Horreur ont été dessinés avant la relecture du code : ils portent les mêmes erreurs, plus quelques-unes à eux. En relisant le code pour ce document, j'ai trouvé ces erreurs dans ce que je lui avais présenté. Voici ce qui change, et pourquoi. Applique la colonne « Maintenant ».

| Sujet | Avant (anciens documents, maquettes) | Maintenant | Pourquoi |
|---|---|---|---|
| Niveaux | 12 paliers inventés (950, 1 800… 17 000 EXP) ; « 3 940 / 5 000 » dans les maquettes | Le code : `levelFromExp` = 1 niveau par tranche de 100 EXP, sans plafond. Les thèmes ont 12 noms de niveau ; au-delà du 12ᵉ, le nom reste celui du 12ᵉ et le numéro continue. La jauge montre `exp` sur le prochain palier (`niveau × 100`) | Les paliers n'existaient nulle part dans le code. Avec 5 EXP par film, personne n'aurait jamais dépassé le niveau 2 |
| Interrupteurs des œufs | « 12 œufs sur 25 ont un interrupteur admin » | **Aucun** œuf n'a d'interrupteur. Douze œufs ont seulement des textes modifiables. Les interrupteurs sont à créer (D8) | Relecture du code |
| Police de titrage du neutre | Archivo Black | **Inter**, graisse 900 | Les images validées ont été rendues en Inter Black |
| Radio | Présente dans les 4 thèmes, avec musique | Présente dans les **quatre thèmes**, sans musique pour l'instant : l'interrupteur « Musique » est grisé tant que la piste n'existe pas. Pas de radio en neutre. En Horreur, le volume reste actif : il règle le son du thème | Aucune piste n'est produite |
| Bloc Vidéoclub dans l'accueil de chaque thème | Dépôt vidéo, Vidéoclub d'en face… | **Pas maintenant.** Seule l'entrée « Vidéoclub » de la barre existe, vers une page « Bientôt » | Le vidéoclub sera fait plus tard |
| Voiture de l'Action | Un curseur-voiture, qui « réapparaît au centre » après un crash | Le **vrai curseur** du navigateur prend l'image d'une voiture (8 orientations). Après un crash, il devient une carcasse pendant 1,5 s, puis redevient une voiture | On ne peut pas déplacer le curseur de quelqu'un au centre de l'écran. Un faux curseur dessiné cacherait le vrai sous les fenêtres des easter eggs |
| Égalité au duel | « à trancher » | Réglage dans l'admin : **meilleure note moyenne** (par défaut), sinon tirage au sort | Choix par défaut ; The Legendre peut le changer à tout moment |
| Anciens thèmes hebdomadaires (13 genres de `weekly-theme.css`) | Conservés | **Retirés** (ils restent dans l'historique git). Ils n'ont jamais été visibles en production | Le nouveau moteur les remplace. Les autres genres seront refaits en profondeur, saison après saison |
| Cron des duels | `"0 18,19 * * 3"` | Échéance enregistrée sur chaque duel + clôture dès qu'une page la voit passée + cron de secours (D1) | Sur le plan Hobby de Vercel, un cron qui tourne deux fois par jour est refusé au déploiement |
| Lieu des maquettes | Pages claude.ai privées | Fichiers dans `docs/refonte-v2/maquettes/` | Tu ne peux pas ouvrir les pages privées |
| Voiture et « réduire les animations » | voiture coupée | la voiture reste (c'est le curseur, il suit la main), sans explosion animée | le mouvement vient du joueur, pas d'une animation |
| Sons de l'Action (douille, squelch, V8, ascenseur) | prévus | **pas dans ce chantier** | aucun son n'est produit |
| La révérence (Comédie) | « trois validations d'affilée » | « trois applaudissements en moins de 10 minutes » | « d'affilée » ne se mesure pas |
| La loge (Comédie, T6) | « Applaudimètres gagnés », « 07 étoiles sur 24 », dates de chaque emploi | retirés | ces données n'existent pas |
| Lien du direct | — | rangé hors de `site_config` (lisible par n'importe qui), montré aux seuls joueurs connectés | la plateforme de diffusion est privée |
| Textes des thèmes (libellés, répliques) | écrits dans le code | valeurs par défaut dans le code, **modifiables dans l'admin** (Contenu → Textes des thèmes) | The Legendre veut tout changer sans repasser par Claude Code |
| « Joueurs de la saison », « présents », « en position » | employés sans définition | définis une fois (§9.1) | ne rien inventer |
| Niveaux du Western | « Les douze montants », de 50 $ à 50 000 $, un montant par rang ; « 3 940 / 5 000 $ » | **La prime, c'est l'EXP, en dollars** : 3 940 EXP s'affichent « 3 940 $ ». Le niveau devient un **rang** nommé par ce qu'on te reproche (12 noms, annexe B.4). Palier du rang *k* = (*k* − 1) × 100 $, comme le code | Les montants n'existaient nulle part. Même correction que pour les niveaux (ligne « Niveaux » plus haut) |
| Niveaux de l'Horreur | Seuils 950, 1 800… 17 000 EXP | Palier du niveau *k* = (*k* − 1) × 100 EXP ; 12 rôles (annexe B.4) | Idem |
| Badges | « 07 entailles sur 24 » ; badges inventés (« A remporté six duels », « La clé », « La bougie »…) | Les vrais badges : `BADGES` et `SPECIAL_BADGES` de `lib/config.ts` (6 + 8 = 14 au 21 septembre), avec leur vrai nom et leur vraie description. Le total est calculé, jamais écrit en dur | Relecture du code |
| Durées, distribution, « dernière apparition » | « 2 H 58 », « AVEC CLINT EASTWOOD… », « Un cimetière du Nouveau-Mexique » | Retirés | Absents de la base |
| Avis des joueurs sur la fiche | Phrases citées sous chaque note (W3) | Retirées : la table `ratings` ne garde qu'une note | Comme la Comédie (T3) |
| Télégraphe de l'accueil | « HazroF passe à 800 $ » | Retiré : l'activité (§9.2) ne connaît pas les changements de rang | Donnée absente |
| Classement et « La bande » | 8 affiches puis « Quatorze autres avis au fond du tiroir » ; « Dix autres portraits au dos du tirage » | **Tout le monde reste affiché** : les affiches, puis une liste compacte pour les suivants | Le thème ne retire pas de données (§2.2, règle 2) |
| Règles inventées | « La bande ne recrute qu'en début de saison » ; « On le reverra la saison prochaine » | Retirées | Aucune règle de ce genre dans le code |
| Filtre « En cavale » (W2) | Un bouton de filtre | **N'existe pas** : pas de nouveau filtre. Les filtres restent ceux de `/films` (recherche, genre, décennie, réalisateur, au hasard, 18+) | Le thème ne change pas le comportement |
| Profil Western | « Duels gagnés 06 », « Premier sur 04 » | Les chiffres de la Comédie (T6) : films vus / catalogue, note moyenne du joueur, films ajoutés par le joueur | Ces deux statistiques n'existent pas |
| Jetons du saloon | Rouges pour ceux qui ont parlé, acier pour ceux qui écoutent | Un seul compteur : le nombre de messages | Le site ne sait pas qui lit |
| Sons d'ambiance de l'Horreur | Vent, plancher, chien ; réglage « Sons d'ambiance » à créer | **Pas dans ce chantier.** Seul son : le bruit de bande du sursaut, fabriqué par le navigateur (Web Audio), sans fichier ; il est **actif par défaut** (ligne « Son de l'Horreur », plus bas) | Aucun son n'est produit, comme pour l'Action |
| Ballon rouge dans le décor de l'accueil (H1) | Un ballon dessiné entre les arbres | Retiré. Un seul ballon : celui de l'œuf #34 | Un ballon qu'on ne peut pas cliquer apprend aux joueurs que le ballon ne se clique pas |
| Trous de balle | Posés en décoration sur plusieurs écrans (W1, W2, W5, W6) ; cachés avec « réduire les animations » | **Seulement** après une action destructive, sur l'avis du perdant d'un duel clos (5 trous) et sur la page 404 (15, dessinés dans la page). Ils restent avec « réduire les animations » : rien n'y est animé | Règle du kit lui-même : un trou qui ne veut rien dire, c'est de la saleté |
| Silhouettes à chapeau dans les avis | Dans chaque affiche | Dans le site : **l'affiche TMDB** du film, ou **l'avatar** du joueur ; silhouette seulement si le joueur n'a pas d'avatar | Les maquettes ne reproduisent aucune affiche ; le site, lui, montre les vraies |
| Fenêtre de 24 h | Titre habillé (« 24 heures pour déclarer tes captures passées ») | Titre du code, comme pour l'Action et la Comédie (annexe B.2) | Même règle pour tous les thèmes |
| Gros plan au téléphone | Appui long | **Pas au toucher** | Au téléphone, toucher une affiche ouvre la fiche : l'appui long entrerait en conflit |
| La possession (#35) | Effet par `transform` | `unicode-bidi: bidi-override` (§16.9) | Un `transform` sur un conteneur de page casse les œufs (§0, règle 11) |
| Jours et heures | « La nuit de vendredi », « mercredi 20 h », « dimanche 20 h 30 » écrits en dur | Lus dans les réglages et dans `closes_at` ; la fin du bonus 48 h = annonce du film de la semaine actif + 48 h (règle de `claimWeekFilmBonus`) | Les réglages peuvent changer |
| L'heure du duel (#33) | « Vérifier l'état du duel toutes les 30 s » | L'échéance `closes_at` est connue : à l'échéance, la page déclenche la clôture paresseuse (§6.2) et joue l'effet | Plus simple et exact |
| Taille des textes | Étiquettes à 9 et 10 px | **12 px minimum** partout | §2.2, règle 11 |
| Prime d'un film | 10 $ pour le film de la semaine et 15 $ pour le vainqueur du duel, sur les cartes de la grille | Le montant que crédite **l'action réellement appelée par le bouton** (§15.3) | Pendant la saison, la carte et la fiche appellent `markWatched`, qui crédite `EXP_FILM` pour tous les films |
| Toast de l'Horreur | « Rayé — Halloween. 55 victimes. » | « Rayé — {titre} » | Les actions ne renvoient pas le nombre de films vus |
| Statistique « Primes encaissées » (W2) | Sur `/films` | Retirée : c'est l'EXP du joueur, affichée partout ailleurs | `/films` garde les chiffres du neutre |
| Lignes sous les rôles de l'Horreur | « Il ne revient jamais tout de suite. »… | Pas affichées : le kit ne les montre sur aucun écran | Documentation du kit, pas du texte d'interface |
| Place vide de H9 | « On a compté douze. Sur la photo, il y a treize places. » | Gardée : **deuxième exception assumée** à la règle 1 de §2.2, comme la loge de la Comédie (le vrai nombre, puis un de trop) | C'est une blague lisible, et le seul endroit où on en parle |
| Horizon | « À mi-hauteur » | À mi-hauteur de la fenêtre, avec les couleurs de §15.4 (le haut du ciel du kit, trop sombre, rend l'encre illisible) | Contraste |
| Textes d'exemple du kit | Tables « la voix », « le ton » | Repris là où un écran les montre (annexe B) ; les autres servent de ton, pas de texte à afficher | Ne pas inventer d'emplacement |
| Semaine Horreur à Halloween | Décision ouverte | Le planning se règle dans l'admin : c'est The Legendre qui choisit la semaine. Pas d'œuf « La nuit des masques » dans ce chantier | Le planning n'est pas du code |
| Son de l'Horreur | Aucun son par défaut (kit) ; puis « muet par défaut » (version précédente de ce prompt) | **Actif par défaut.** Une case « Son », toujours visible en bas à gauche pendant la semaine Horreur sur les pages qui ont des comportements (§11.6), le coupe (§16.8). « Sursauts » (marche / arrêt, dans la radio) coupe l'apparition elle-même. Colonnes `profiles.son_horreur` et `profiles.sursauts` (M3) | Choix de The Legendre, 30 septembre |
| Version téléphone | Aucune maquette téléphone | Règles écrites : le socle (§8.9), les pages neutres (§9.7), chaque thème (§13.8, §14.9, §15.8, §16.10) ; chaque phase livre le téléphone avec l'ordinateur | Demande de The Legendre, 30 septembre |
| Nom et adresse du site | « Ciné Marathon » (logo, titre de l'onglet, mails, bannière de bienvenue, maquettes) ; « Le Marathon Cinéma » (mentions légales, Gmail, Chatango) ; adresse avec accent, en punycode | **« Le Marathon Cinéma »** partout, adresse **`https://lemarathoncinema.fr`** (§7.5, §17 point 4). Les maquettes affichent encore « CINÉ MARATHON » : suis le prompt | Adresse choisie par The Legendre le 1er octobre ; le nom suit l'adresse, pour n'en avoir qu'un |
| Curseurs | Action : réticule, et voiture quand l'œuf est armé ; Comédie : main gantée ; Western : colt ; Horreur : curseur normal et lampe | **Action : la voiture, toujours** (plus de réticule). **Comédie : la chaussure noire** (*Le Grand Blond avec une chaussure noire*), fournie. **Western : le colt, redessiné et fourni.** **Horreur : inchangé**, curseur normal, c'est la lampe qui suit la souris. Comédie et Western ont un état de survol et un état de clic (§11.13) | Choix de The Legendre, 10 octobre. La main gantée (un poing fermé dans le dépôt) et l'ancien colt, méconnaissable, sont remplacés |
| Maquettes dans le dépôt | Le dossier `docs/refonte-v2/` n'avait jamais été ajouté au dépôt : les décors et la structure des écrans ont été improvisés | Le dossier est dans le dépôt ; l'annexe F donne, écran par écran, la section du kit et l'image ; un écran n'est fait qu'avec sa capture comparée (§0, points 13 et 14) | Constat du 10 octobre sur le code en ligne |
| Radio et saison des films (10 octobre, après-midi) | Musique à l'arrêt par défaut, « Piste à venir », poste en bas à gauche ; films de la saison 2 seulement | **Fait par The Legendre** : deux vraies pistes par thème (`public/audio/radio/`), musique active par défaut au premier geste, bouton fixe en bas à droite avec volume ; verrou de saison des films retiré. C'est la référence : les passages du prompt sur la radio qui disent autre chose ne s'appliquent plus (le correctif dit quoi vérifier) | Choix de The Legendre |

**Citations des thèmes.** Les répliques utilisées (OSS 117, Bernie, Le Dîner de cons) ont été écrites de mémoire. The Legendre doit relire leur formulation exacte avant la mise en ligne de la Comédie. Leurs valeurs par défaut sont dans `lib/themes/comedie.ts`, et il peut les corriger lui-même dans l'admin (§12.2, Contenu). Dans le compte rendu de la phase 8, liste-les toutes pour qu'il les relise. Les textes du Western et de l'Horreur sont des phrases originales dans la voix des films ; une seule détourne une réplique (« Au bout du compte, il n'y a que deux sortes de gens… », d'après Le Bon, la Brute et le Truand). Liste-les aussi dans les comptes rendus des phases 9 et 10.

---

## 4. Plan de travail

### 4.1 Les phases

| Phase | Contenu | Migration | Arrêt |
|---|---|---|---|
| 0 | État des lieux, relevés de départ | — | seulement si écart avec ce document |
| **1A** | Défauts urgents : duels l'hiver, EXP, sécurité, heure de Paris | M1 avant, M2 après la mise en ligne | **oui — à mettre en ligne avant le 25 octobre 2026** |
| 1B | Source de vérité (configuration en base partout), saisons en dur, œufs (champs de saisie, interrupteurs), petits défauts, nom et adresse du site (déménagement vers `lemarathoncinema.fr`) | — | oui |
| 2 | Socle : jetons, polices, composants, navigation du haut, onglet Vidéoclub, accessibilité, règles du téléphone | — | oui, validation visuelle |
| 3 | Toutes les pages en version neutre (ordinateur et téléphone), accueil « Le Mur », `/regles`, 404, actions destructives marquées | — | oui, validation visuelle |
| 4 | Performance | — | oui, mesures avant / après |
| 5 | Moteur de thèmes pour les quatre thèmes (jetons, polices, libellés) : planning, thème posé côté serveur, aperçu admin et menu « Tester », réglages du joueur, décor et comportements, œufs de thème | M3 et M4 | oui |
| 6 | L'admin refaite, dont le bouton de thème | — | oui, validation visuelle |
| 7 | Thème Action + ses 2 œufs | — | oui, validation visuelle |
| 8 | Thème Comédie + ses 3 œufs | — | oui, validation visuelle |
| 9 | Thème Western + ses 3 œufs | — | oui, validation visuelle |
| 10 | Thème Horreur + ses 4 œufs | — | oui, validation visuelle |
| 11 | Ce qui n'est pas du code (pour The Legendre) | — | — |

### 4.2 Ordre des migrations

| Migration | Contenu | Quand l'exécuter |
|---|---|---|
| M1 | `duels.closes_at`, `watched.exp_awarded` (+ rattrapage des lignes existantes) | avant les tests de la phase 1A |
| M2 | verrouillage : plus aucune écriture d'EXP ou de visionnage depuis le navigateur | **après** la fusion et la mise en ligne de la phase 1A, puis relancer le rattrapage de M1 |
| M3 | `season_weeks`, réglages du joueur dans `profiles` (radio, œufs du thème, « Sursauts » et « Son » de l'Horreur), verrou de `discovered_eggs` | avant les tests de la phase 5 (la phase 1B, qui écrit les œufs avec la clé service, doit être en production) |
| M4 | `admin_log` (journal de l'admin), `site_prive` (lien du direct) | avant les tests de la phase 5 (les actions de thème de la phase 5 écrivent déjà au journal) |

### 4.3 Compte rendu de fin de phase

À la fin de chaque phase, tu écris dans la pull request, en français simple :

1. Ce qui a été fait (une ligne par point, sans jargon).
2. Les migrations à exécuter, dans l'ordre, avec le nom du fichier.
3. Ce que The Legendre doit regarder sur l'aperçu Vercel : pages, gestes, résultat attendu.
4. Les écarts avec ce document, et pourquoi.
5. Ce qui reste incertain ou non testé.

---

## 5. Phase 0 — État des lieux

1. Crée la branche `refonte-v2/phase-0` si tu dois committer quelque chose ; sinon, pas de branche.
2. Relève l'état de départ : `npm run build`, `npx tsc --noEmit`, `npm run lint`. Sur la copie du 21 septembre : le build passe (s'il échoue sur le téléchargement des polices Google, voir la règle 8 du §0) ; `tsc` donne 4 erreurs dans `src/games/trombone-infini/__tests__/smoke.spec.ts` (types Playwright absents) ; le lint donne 1 erreur (`src/games/trombone-infini/core/world.ts:84`, fonction de jeu nommée `useBomb`) et 45 avertissements. Ces erreurs sont dans des zones interdites : tu ne les corriges pas, tu vérifies seulement qu'il n'y en a pas de nouvelles.
3. Vérifie les points qui ne sont pas dans la copie du 21 septembre et note-les dans le compte rendu :
   - `vercel.json` : planning des trois crons (`close-duels`, `archive-week-film`, `marathon-reminder`). Si `archive-week-film` tourne plusieurs fois le vendredi (par exemple `0 20-23 * * 5`), le compte est en plan Pro : le plan Hobby refuse plus d'un passage par jour ;
   - `supabase/` : fichiers SQL présents (fonctions `increment_exp`, `decrement_exp`, `end_season`, politiques RLS) ;
   - `app/videoclub/` : **s'il existe déjà** (travail en cours ailleurs), tu n'y touches pas et tu **demandes à The Legendre** ce que l'onglet doit ouvrir (§8.6) ;
   - `public/cursors/`, `public/discord.png`.
4. Compare rapidement les fichiers cités dans ce document avec le dépôt (`git log` depuis le 21 septembre). Si un fichier cité a beaucoup changé, signale-le avant la phase 1A.

---
## 6. Phase 1A — Défauts urgents (à mettre en ligne avant le 25 octobre 2026)

Branche `refonte-v2/phase-1a`. Cette phase ne change rien à l'apparence. Elle doit pouvoir partir en production seule, vite : **l'heure d'hiver commence le dimanche 25 octobre 2026**, et deux défauts cassent le jeu à partir de là (D1 dès le mercredi 28, D14 dès le 25).

### 6.1 L'heure de Paris, une seule fois (`lib/time/paris.ts`)

Crée ce module et utilise-le partout où le code calcule une heure ou un jour de Paris (chercher `Europe/Paris`, `+02:00`, `toLocaleDateString('en-CA'`). Code de départ, testé aux changements d'heure de 2026 :

```ts
// lib/time/paris.ts — toutes les dates « métier » du site sont en heure de Paris
const FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', hourCycle: 'h23', weekday: 'short',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

export function parisParts(d = new Date()) {
  const p = Object.fromEntries(FMT.formatToParts(d).map(x => [x.type, x.value]))
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1 // 1 = lundi … 7 = dimanche
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second, dow }
}

/** Décalage de Paris par rapport à UTC, en minutes (60 l'hiver, 120 l'été). */
export function parisOffsetMinutes(d: Date): number {
  const p = parisParts(d)
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s)
  return Math.round((asUtc - d.getTime()) / 60000)
}

/** Heure locale de Paris → instant réel. */
export function fromParis(y: number, m: number, d: number, h = 0, min = 0): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, h, min))
  const off1 = parisOffsetMinutes(guess)
  const t = new Date(guess.getTime() - off1 * 60000)
  const off2 = parisOffsetMinutes(t)
  return off1 === off2 ? t : new Date(guess.getTime() - off2 * 60000)
}

/** Début et fin (exclue) du jour de Paris qui contient `d`. */
export function parisDayRange(d = new Date()) {
  const p = parisParts(d)
  const start = fromParis(p.y, p.m, p.d)
  const next = new Date(Date.UTC(p.y, p.m - 1, p.d) + 86400000)
  const end = fromParis(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())
  return { start, end }
}

/** Lundi 0 h (Paris) de la semaine qui contient `d`. */
export function parisMonday(d = new Date()): Date {
  const p = parisParts(d)
  const monday = new Date(Date.UTC(p.y, p.m - 1, p.d) - (p.dow - 1) * 86400000)
  return fromParis(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate())
}

/** Jour de Paris (AAAA-MM-JJ) qui commence à `debut` heures : avant `debut`, on est encore la veille. */
export function parisJour(d = new Date(), debut = 0): string {
  const p = parisParts(d)
  const base = Date.UTC(p.y, p.m - 1, p.d) - (p.h < debut ? 86400000 : 0)
  return new Date(base).toISOString().slice(0, 10)
}
```

Ajoute des tests Vitest (`lib/time/__tests__/paris.test.ts`) : 30/09/2026 20:00 → 18:00Z ; 28/10/2026 20:00 → 19:00Z ; jour du 25/10/2026 = 25 heures, du 29/03/2026 = 23 heures ; `parisMonday` du dimanche 01/11/2026 23:59 (Paris) → 25/10/2026 23:00Z ; `parisJour` (il sert à l'Horreur, §16.8) : 06/10/2026 03:59 Paris avec `debut = 4` → `2026-10-05`, 06/10/2026 04:00 avec `debut = 4` → `2026-10-06`, 25/10/2026 03:30 Paris (02:30Z, après le retour à l'heure d'hiver) avec `debut = 4` → `2026-10-24`, 25/10/2026 12:00 Paris avec `debut = 0` → `2026-10-25`. Ce code et ces cas ont été vérifiés. **Attention** : `vitest.config.ts` ne lit aujourd'hui que `src/**/__tests__/**/*.test.ts`, et `package.json` n'a pas de script `test`. Ajoute `lib/**/__tests__/**/*.test.ts` à `include` et un script `"test": "vitest run"`.

### 6.2 D1 — Les duels ne se ferment plus l'hiver

**Constat.** `app/api/cron/close-duels/route.ts` ne ferme que si l'heure de Paris est mercredi ≥ 20 h. Le cron (planning dans `vercel.json`, à vérifier) tourne une fois, le mercredi à 18 h UTC : 20 h à Paris l'été, **19 h l'hiver**. Du 28 octobre à fin mars, plus aucun duel ne se ferme, et les votes restent ouverts.

**Correction.**

1. Migration M1 : colonne `duels.closes_at timestamptz` (SQL en annexe D, avec le rattrapage des duels ouverts).
2. `lib/duels.ts` :
   - `nextDuelDeadline(from: Date): Date` = le prochain mercredi 20 h (Paris) strictement après `from`. C'est la règle actuelle du cron, rien de plus. Construis-la avec `lib/time/paris.ts`.
   - `pickWinner(duel, votes, rule)` : le film qui a le plus de voix. En cas d'égalité (0–0 compris) : si la règle est `note`, le film qui a la meilleure note moyenne (table `ratings`) ; si l'égalité persiste, ou si la règle est `hasard`, tirage au sort. La règle vient du réglage `duel_egalite`, `note` par défaut (lu dès cette phase, §6.9).
   - `closeDueDuels({ duringRender })` : ferme tous les duels `closed = false`, `pending = false`, `closes_at <= now()` (ou, si `closes_at` est vide, dont la date limite calculée depuis `created_at` est passée). La mise à jour est conditionnelle (`.eq('closed', false)`) pour qu'une double exécution ne fasse rien. Client service (`createAdminClient`). Après fermeture : `deleteCacheKeys(['duels:list'])` ; `revalidatePath('/duels')`, `('/')` et `('/admin')` **seulement si `duringRender` est faux** (Next interdit `revalidatePath` pendant le rendu d'une page).
3. `closes_at` est posé :
   - à la création d'un duel publié directement (`pending = false`) ;
   - à l'approbation d'un duel en attente (`adminApproveDuel`) : `nextDuelDeadline(maintenant)`.
4. **Clôture « paresseuse »** : `closeDueDuels({ duringRender: true })` en tête des pages `/`, `/duels` et `/semaine`. Et dans les actions `voteDuel` et `markWatchedDuelWinner` : si le duel est échu, on le ferme d'abord, puis `voteDuel` répond « Ce duel est clôturé. ». Plus aucun vote n'est accepté après l'échéance.
5. Le cron appelle `closeDueDuels()` sans condition de jour ni d'heure. Planning dans `vercel.json` :
   - plan **Pro** : `"0 18,19 * * 3"` ;
   - plan **Hobby** : `"0 19 * * 3"` (un seul passage par jour autorisé). Le cron devient un filet de sécurité : la clôture a lieu dès que quelqu'un ouvre le site après 20 h.
   Demande à The Legendre son plan Vercel si tu ne le trouves pas.
6. `adminCloseDuel` utilise `pickWinner` et la même règle d'égalité.
7. Affichage : partout où le site annonce une échéance de duel, il lit `closes_at`.
8. **Le cron `archive-week-film`** a la même garde (vendredi ≥ 22 h Paris). Vérifie son planning dans `vercel.json` : s'il ne passe pas après 22 h Paris **l'hiver** (21 h UTC), corrige-le comme D1 : garde « vendredi à partir de 22 h Paris » dans la route, planning `0 20-23 * * 5` en Pro ou `0 21 * * 5` en Hobby (22 h l'hiver, 23 h l'été).

### 6.3 D11 — L'EXP se gagne en boucle

**Constat** (`lib/actions.ts`, `toggleWatched` et voisines). Retirer un film des vus enlève toujours `EXP_FILM` (5), quel que soit le montant gagné. Marquer le film de la semaine (+10) puis le retirer (−5) : +5 par aller-retour. Marquer le vainqueur du duel (+15) puis le retirer (−5) : +10. La limite de 4 films par jour compte les lignes présentes : retirer une ligne rend une place. Rien n'arrête la boucle.

**Correction.**

1. Migration M1 : colonne `watched.exp_awarded int not null default 0`, et rattrapage des visionnages marathon existants (`pre = false`) avec le montant qu'ils ont réellement rapporté : vainqueur du duel regardé dans les 48 h après la clôture → `EXP_DUEL_WIN` ; film de la semaine regardé dans les 9 jours après son annonce → `EXP_FDLS` ; tous les autres → `EXP_FILM` (SQL en annexe D, c'est une approximation, la meilleure possible avec les données existantes). **Ces montants viennent des variables Vercel** `NEXT_PUBLIC_EXP_FILM`, `NEXT_PUBLIC_EXP_FDLS`, `NEXT_PUBLIC_EXP_DUEL_WIN` (défauts 5, 10, 15), pas de l'admin : c'est `CONFIG` qui crédite aujourd'hui (D6). Demande leurs valeurs à The Legendre et adapte le SQL.
2. Chaque action qui crédite un visionnage écrit le montant exact dans `exp_awarded`. Chaque action qui retire un visionnage, ou qui le repasse en « avant le marathon », retire **exactement** `exp_awarded` puis le remet à 0. Fonctions concernées : `markWatched`, `toggleWatched`, `markWeekFilmWatched`, `markWatchedDuelWinner`. Cherche toutes les autres écritures dans `watched` (`grep -n "from('watched')" lib app`) et traite-les.
   - **Sans course possible** : on crédite seulement si l'insertion a réellement créé la ligne (`insert(…).select()` renvoie une ligne ; la clé unique `(user_id, film_id)` doit exister, l'audit le confirme) ; on débite la valeur renvoyée par la suppression elle-même (`delete(…).select('exp_awarded')`), jamais une valeur lue avant. Aujourd'hui, `markWatched` crédite même quand l'insertion échoue.
3. Toutes les écritures dans `watched` et tous les appels `increment_exp` / `decrement_exp` passent par le client service (`createAdminClient()`), après vérification de l'utilisateur. Liste des appels au 21 septembre : `lib/actions.ts` lignes 594, 606, 613, 653, 664, 719, 775, 826, 889 et 1457 (`adminGrantExp`).
4. Les actions renvoient le montant crédité (`{ action: 'added', exp: 10 }`) pour que l'interface affiche le vrai chiffre (D27, phase 1B).

### 6.4 D12 — Tout joueur peut probablement se donner de l'EXP (à confirmer)

**Constat.** `increment_exp` et `decrement_exp` sont appelées avec la session du joueur, et `adminGrantExp` les appelle avec la session de l'admin pour **un autre** joueur. Donc le rôle `authenticated` a le droit de les exécuter pour n'importe qui. Si le SQL ne vérifie rien, n'importe quel joueur connecté peut s'ajouter 1 000 000 d'EXP depuis la console de son navigateur. Le SQL n'est pas dans la copie : **c'est probable, pas prouvé**. Même question pour `profiles` : si un joueur peut modifier sa propre ligne sans restriction de colonnes, il peut se passer `is_admin = true`. Et l'inscription envoie `saison` depuis le navigateur dans les métadonnées (`AuthPageClient.tsx` ~89) : si le déclencheur d'inscription la recopie, un joueur choisit sa saison (l'audit le dira).

**Correction, en deux temps.**

1. **Audit.** Donne à The Legendre les requêtes « Audit de sécurité » de l'annexe D. Il les exécute dans Supabase et te colle les résultats. Tu en déduis ce qui est réellement ouvert : un droit à `true` (requêtes 2 et 3) n'est un trou que si aucune politique RLS (requête 1) ne le restreint, ou si la RLS est désactivée sur la table. Regarde aussi le corps des fonctions d'EXP (requête 6) : si elles vérifient `auth.uid()`, un appel avec la clé service (où `auth.uid()` est vide) échouerait ; adapte-les alors dans M2.
2. **Verrou (migration M2).** À partir de l'audit, tu écris `supabase/migrations/M2_verrou.sql` sur le modèle de l'annexe D :
   - plus d'exécution de `increment_exp` / `decrement_exp` pour `public`, `anon`, `authenticated` ;
   - plus d'`insert` / `update` / `delete` sur `watched` pour `anon` et `authenticated` ;
   - sur `profiles` : retirer le droit `update` global à `authenticated`, puis le rendre **colonne par colonne**, seulement pour ce que le joueur modifie lui-même. Pour faire la liste, cherche chaque `.from('profiles').update(` exécuté avec la session du joueur (pseudo, bio, avatar, badge actif, tutoriel vu, notification marathon, `clippy_defeats`… à vérifier). `exp`, `is_admin`, `saison`, `marathon_blocked_until`, `pre_marathon_window_until` ne sont jamais modifiables par le joueur.
   - **Avant M2**, toute écriture sur une colonne verrouillée faite aujourd'hui avec la session d'un joueur **ou d'un admin** passe au client service, sinon elle échouera **en silence** (les erreurs ne sont pas vérifiées). Au 21 septembre : `submitMarathonWatchRequest` (`lib/actions.ts` ~504, le joueur écrit `marathon_blocked_until` : le blocage de 24 h cesserait de marcher), `adminReviewMarathonRequest` (~547, `marathon_blocked_until`), `adminSetAdmin` (~1430, `is_admin`). `adminDirectAdmitToMarathon` et `adminReviewSeasonJoinRequest` passent déjà par le client service. Cherche aussi dans `app/api/**`.
   - M2 ne s'exécute **qu'après** la mise en ligne du code de cette phase (sinon l'ancien code en production casse). Ensuite, relancer l'audit : toutes les colonnes « peut modifier » de `exp`, `is_admin`, `saison` et « peut exécuter » des fonctions d'EXP doivent valoir `false` pour `anon` et `authenticated` (requête de contrôle en annexe D). Un `revoke` peut ne rien faire si les droits ont été donnés par un autre rôle : seul ce contrôle le prouve.

Point secondaire, à signaler seulement : `discoverEgg` accepte n'importe quel identifiant d'œuf. Un joueur peut s'attribuer n'importe quel œuf depuis la console. L'enjeu est faible ; on ne le corrige pas dans ce chantier, sauf pour les œufs de thème (§11.8).

### 6.5 D13 — Le diagnostic admin est ouvert à tous

`adminDiagnostic` (`lib/actions.ts` ~1983) ne vérifie pas `is_admin` : tout joueur connecté peut l'appeler, lancer des requêtes avec la clé service et lire les 8 premiers caractères de la clé TMDB. Ajoute la vérification admin comme dans les autres `admin*`, et ne renvoie plus qu'« présente » / « absente » pour les clés.

### 6.6 D14 — La limite de 4 films par jour se décale d'une heure l'hiver

`getMarathonDailyStatus` calcule le jour de Paris avec `+02:00` écrit en dur : faux à partir du 25 octobre. Utilise `parisDayRange()`. Les limites 4 et 8 deviennent les réglages `limite_jour` et `limite_jour_max` (§6.9), avec 4 et 8 par défaut.

### 6.7 D15 — La date de lancement est lue en heure UTC (probable)

`marathon_start` est saisi dans l'admin sous la forme `2026-10-05T20:00`, sans fuseau, puis lu par `new Date()` sur le serveur Vercel, qui tourne en UTC : 20:00 devient 22:00 à Paris. Lis cette valeur comme une heure de Paris (`fromParis`) quand elle n'a pas de fuseau. Même traitement pour la valeur par défaut de `NEXT_PUBLIC_MARATHON_START`. Signale dans le compte rendu que l'heure effective de lancement avance de 1 ou 2 heures par rapport à aujourd'hui (elle devient celle que l'admin a voulu taper). Le formulaire de l'admin préremplit ce champ avec `MARATHON_START.toISOString().slice(0, 16)`, c'est-à-dire en UTC : il doit désormais le préremplir en heure de Paris, sinon un simple « Enregistrer » décale l'heure.

### 6.8 D4 — Mot de passe de 4 caractères minimum

`app/auth/AuthPageClient.tsx:85` et `app/auth/reset/page.tsx:47` : passe à **8**, message identique aux deux endroits : « Mot de passe trop court (8 caractères minimum). ». L'inscription et la réinitialisation se font depuis le navigateur, directement chez Supabase : ce contrôle ne protège rien tout seul. Le vrai minimum se règle dans Supabase (phase 11). L'action serveur `signUp` de `lib/actions.ts` n'est appelée nulle part : laisse-la, signale-la.

### 6.9 Trois réglages lus dès maintenant

`lib/serverConfig.ts` lit dès cette phase `duel_egalite` (`note` | `hasard`, défaut `note`), `limite_jour` (1–50, défaut 4) et `limite_jour_max` (1–50, défaut 8), avec validation (valeur invalide → défaut). Ajoute l'étiquette `tags: ['site-config']` à son `unstable_cache`, et fais **échouer** (lever une erreur) la fonction mise en cache quand Supabase répond une erreur : sinon une panne de quelques secondes met une configuration vide en cache pour 5 minutes. Le reste de la configuration arrive en 1B.

### 6.10 Critères d'acceptation de la phase 1A

- Tests Vitest de `paris.ts` au vert.
- `lib/supabase/types.ts` connaît `duels.closes_at` et `watched.exp_awarded` ; `npm run build` passe.
- Un duel approuvé un lundi a `closes_at` = mercredi suivant 20:00 Paris. Après cette heure, ouvrir `/duels` le ferme, avec la bonne règle d'égalité ; voter répond « Ce duel est clôturé. ».
- Marquer le film de la semaine puis le retirer : l'EXP revient exactement au point de départ. Idem pour le vainqueur du duel.
- `adminDiagnostic` refuse un non-admin.
- Compte rendu avec : résultats de l'audit, fichier M2 prêt, ordre exact de mise en ligne (M1 → fusion → déploiement → M2 → rattrapage).

---

## 7. Phase 1B — Une seule source de vérité, et les petits défauts

Branche `refonte-v2/phase-1b`. Toujours aucun changement d'apparence, sauf le nom du site dans les textes (§7.5).

### 7.1 D6 — La configuration en base, partout

**Constat.** L'admin affiche « Ces réglages écrasent les variables d'environnement sans redéploiement ». C'est faux pour l'essentiel : les montants d'EXP crédités, le numéro de saison, la date de lancement vue par les actions, les jours et heures de séance, le seuil de majorité et le libellé de saison de la barre latérale viennent de `CONFIG` (`lib/config.ts`, variables d'environnement figées au build). Seules quelques pages lisent `getServerConfig()` (table `site_config`). Exemple visible : l'admin dit « Saison 2 - 2026 » pendant que la barre latérale affiche autre chose.

**Correction.**

1. `lib/serverConfig.ts` :
   - le cache `unstable_cache` reçoit l'étiquette `tags: ['site-config']` ;
   - les réglages ajoutés, avec leur valeur par défaut quand la clé n'existe pas en base (aucune insertion en base n'est nécessaire) :

| Clé `site_config` | Type | Défaut | Rôle |
|---|---|---|---|
| `exp_fdls_bonus` | entier 0–1000 | `CONFIG.EXP_FDLS_BONUS` (15) | bonus 48 h, jusqu'ici impossible à régler |
| `limite_jour` | entier 1–50 | 4 | films marathon par jour avant demande (lu dès 1A) |
| `limite_jour_max` | entier 1–50 | 8 | après accord de l'admin (lu dès 1A) |
| `duel_egalite` | `note` \| `hasard` | `note` | règle d'égalité, D2 (lu dès 1A) |
| `theme_mode` | `auto` \| `force` | `auto` | phase 5 |
| `theme_force` | clé de thème | `neutre` | phase 5 |
| `videoclub_mode` | `cache` \| `bientot` | `bientot` | phase 2 |
| `eggs_disabled` | tableau JSON d'identifiants | `[]` | D8 |
| `action_car_speed` | entier 800–6000 (px/s) | 2000 | phase 7 |
| `theme_textes` | objet JSON `{ thème: { clé: texte } }` | `{}` | phase 6 : corrections de libellés et de répliques faites dans l'admin, par-dessus les valeurs du code |
| `accueil_accroche` | texte ≤ 200, une ligne par retour à la ligne ; `{FILMS}` remplacé par le nombre de films s'il est utilisé | `UN MARATHON.\nUNE LISTE.\nTA CULTURE CINÉ.` | phase 3 |
| `accueil_texte` | texte ≤ 300, `{FILMS}` accepté aussi | « Les films qui ont fait le cinéma, réunis dans une seule liste. Coche ceux que tu as déjà vus, rattrape les autres pendant le marathon, et regarde ta culture ciné grandir. » | phase 3 |

   - chaque valeur lue est validée (bornes, liste permise). Une valeur invalide retombe sur le défaut, jamais d'erreur.
   - le lien du direct n'est **pas** dans `site_config` (lisible par tout le monde avec la clé publique) : il sera dans la table `site_prive` (M4, §12.4).
2. `isMarathonLiveFromConfig(cfg)` (existe déjà dans `lib/serverConfig.ts`) remplace `isMarathonLive()` partout. Dans `lib/actions.ts`, chaque action lit `await getServerConfig()` pour les montants d'EXP, `SAISON_NUMERO`, `MARATHON_START`, les jours et heures de séance. Liste au 21 septembre (à revérifier) : EXP aux lignes 594, 606, 613, 653, 663, 719, 775, 826, 889 ; `SAISON_NUMERO` aux lignes 377, 563, 627, 705, 792, 1139, 3775, 3793, 3809, 3826, 3842, 3879, 3899, 3907, 3918 ; `isMarathonLive()` aux lignes 376, 568, 639, 659, 677, 734, 789, 1139, 3766 ; `FDLS_*` à la ligne 1352.
3. Côté client : `components/config/ConfigProvider.tsx` + `useConfig()`, alimenté **une fois** dans `app/layout.tsx` avec un objet sérialisable `PublicConfig` (numéro et libellé de saison, date de lancement en ISO, jours et heures de séance, montants d'EXP, seuil, limites, `eggsDisabled`, `videoclubMode`, `actionCarSpeed`, `themeTextes`). Jamais le lien du direct. Aucun appel Supabase côté client pour ça.
4. Plus aucun composant d'interface n'importe `CONFIG`. Fichiers au 21 septembre : `components/Sidebar.tsx`, `components/Countdown.tsx`, `app/auth/AuthPageClient.tsx` (import inutilisé), `app/page.tsx`, `app/profil/page.tsx`, `app/marathoniens/page.tsx`, `app/films/FilmsClient.tsx`, `app/duels/DuelsClient.tsx`, `app/semaine/SemaineClient.tsx`, `app/admin/AdminClient.tsx`. `CONFIG` ne sert plus que de valeurs par défaut dans `lib/serverConfig.ts`.
5. `adminSetConfig` : ajoute les nouvelles clés à la liste autorisée, avec la même validation qu'à la lecture ; après écriture, `updateTag('site-config')` (Next 16, actions serveur uniquement) à la place de `revalidatePath('/', 'layout')`. Vérifie en vrai que la lecture suivante voit la nouvelle valeur (`updateTag` expire bien les entrées `unstable_cache` étiquetées dans Next 16.2).
6. Le formulaire actuel de l'admin reçoit seulement le champ « Bonus 48 h » en attendant la phase 6.

**Critère.** Changer « Label saison » dans l'admin, recharger n'importe quelle page sans redéployer : la nouvelle valeur apparaît partout, immédiatement. Changer « EXP film » à 6 : le prochain film marqué rapporte 6, le toast dit +6.

### 7.2 D3 — Des saisons écrites en dur

**Principe.** Le catalogue ouvert = les films de la saison courante et des précédentes (`saison <= SAISON_NUMERO`). Un film de saison supérieure est « verrouillé jusqu'à la saison N ».

| Où (21 septembre) | Aujourd'hui | Correction |
|---|---|---|
| `app/notes/page.tsx:15` | `.eq('saison', 1)` | `.lte('saison', cfg.SAISON_NUMERO)` |
| `app/page.tsx:81` | compte des films `.eq('saison', 1)` | catalogue ouvert |
| `app/films/FilmsClient.tsx` 299, 359, 1189, 1319, 1324, 1333, 1341, 1343, 1420, 1447, 1605 | `saison === 1`, `saison === 2`, « S1 », « Saison 2 » | règle ci-dessus, libellés avec le vrai numéro |
| `app/admin/AdminClient.tsx` 586, 1081, 1092, 1150 | choix de films limités à `saison === 1` | catalogue ouvert |
| `app/admin/AdminClient.tsx:1210` | « Accepté S1 » | numéro réel |
| `app/admin/AdminClient.tsx` 420-421 | fiche film : saisons 1 et 2 seulement | saisons 1 à N + 1 |
| `components/JoinMarathonBanner.tsx:48` | « Saison 2 », dans l'état « accepté pour la saison prochaine » | `SAISON_NUMERO + 1` |
| `app/marathoniens/page.tsx` | pourcentage films vus / films de la saison, sur des visionnages de toutes saisons (peut dépasser 100 %) | numérateur et dénominateur sur le même ensemble : films du catalogue ouvert, hors `pending_admin_approval` |

### 7.3 Les easter eggs : champs de saisie et interrupteurs

**D10 — les œufs clavier écoutent les champs.** `components/EasterEggs.tsx` (~ligne 1178) ajoute chaque touche au tampon, même dans un champ : taper « bond » dans la recherche déclenche Bond, écrire « alien » dans un message déclenche le Facehugger. Corrige : la touche n'entre pas dans le tampon quand la cible est un `input` de texte, un `textarea`, un `select`, un élément `contenteditable` ou `role="textbox"`. Les gestionnaires de la touche Échap restent tels quels. Le bouton mobile des œufs (`.ee-mobile-btn`, qui ouvre son propre champ et appelle `checkMobileInput`) doit continuer de marcher : vérifie-le.

**D8 — aucun interrupteur.** Prépare la mécanique ; l'écran viendra en phase 6.
- `eggs_disabled` (tableau d'identifiants) arrive par `PublicConfig` jusqu'à `EasterEggsLoader`, puis `EasterEggs` (dans une `ref`, parce que l'écouteur clavier est installé une seule fois).
- Un œuf coupé ne se déclenche plus du tout : ni effet, ni enregistrement. Ça vaut pour les œufs clavier et horaires de `EasterEggs.tsx`, la boîte fantôme de Clippy (liée à `clippy`), Inception / Le Parrain / Dun Dun dans `FilmsClient.tsx`, Le Rageux et le Facehugger dans les actions serveur (`addPost`, `addForumPost`) **et** dans leurs fenêtres côté navigateur (`components/Forum.tsx` ~480-485, qui les affiche avec sa propre recherche de mots), ainsi que le mini-jeu Fight Club du forum (`Forum.tsx` ~463-470, lié à `fightclub`). `Forum.tsx` lit la liste par `useConfig()`.
- Les 4 œufs « Succès » (#22 à #25) sont calculés : pas d'interrupteur.
- La carte de la galerie ne change pas.

**Écritures d'œufs par le serveur.** Toutes les écritures dans `discovered_eggs` passent au client service (`createAdminClient()`), après vérification de l'utilisateur : `discoverEgg` (qui n'accepte plus que les identifiants connus : les œufs #1 à #25 de l'annexe C et les badges spéciaux, dans une liste écrite en dur et **non dérivée de la galerie** ; jamais un œuf de thème #26 à #37, qui ne s'enregistre que par `discoverThemeEgg`, §11.8), la détection du forum (`addPost`, `addForumPost`), `unlockAgentOfChaos`, `unlockClippyMaster`, `unlockFeverNight`, et toute autre écriture trouvée par `grep -rn "discovered_eggs" lib app components` (hors code mort : `AlienEgg.tsx` n'est importé nulle part). Les erreurs d'écriture sont vérifiées. Cela prépare le verrou de M3 (phase 5).

**D18 — le forum principal ne déclenche ni Le Rageux ni le Facehugger.** Seul `addPost` (forums des films, de la semaine et des duels) cherche les mots. `addForumPost` (pages `/forum/[topicId]`) ne le fait pas. Mets la détection dans une fonction commune et appelle-la dans les deux, en respectant `eggs_disabled`. Au passage, vide la clé Redis `user:<id>:eggs` quand un œuf est trouvé (sinon l'entrée « Pires films » met jusqu'à 5 minutes à apparaître).

### 7.4 Les petits défauts

| N° | Défaut | Correction |
|---|---|---|
| D2 | Égalité au duel : le film 1 gagne toujours (`v1 >= v2`, cron et `adminCloseDuel`) | fait en 6.2 |
| D5 | Pas de page 404 | `app/not-found.tsx` minimal maintenant (texte + lien vers l'accueil), dessiné en phase 3 |
| D16 | Numéro de semaine du duel = `duels.length + 1` alors que l'admin ne charge que 10 duels : bloqué à 11 | compte exact (`count: 'exact'`), comme `adminCreateDuelFromFilms` |
| D17 | L'accueil affiche un duel en attente d'approbation | filtrer `pending = false` |
| D19 | Le badge Fever Night ne peut jamais être débloqué : l'œuf enregistré s'appelle `rythme-dans-la-peau` | dans `app/profil/page.tsx`, cet œuf débloque le badge `fever-night` |
| D20 | `components/Forum.tsx:35` affiche « Easter egg #11 » pour Le Rageux, qui est le #16 | corriger le numéro |
| D23 | `adminGrantExp` accepte n'importe quel montant | entier entre −1 000 et 1 000, non nul |
| D27 | Les toasts affichent toujours `+EXP_FILM`, même pour le film de la semaine | afficher le montant renvoyé par l'action |

### 7.5 Le nom et l'adresse du site

The Legendre achète `lemarathoncinema.fr` (§17, point 4). Le site s'appelle désormais **« Le Marathon Cinéma »** partout. L'adresse actuelle (avec accent, en punycode) et `cinema-marathon.vercel.app` deviennent d'anciennes adresses. Tout ce qui suit se code maintenant et ne change rien tant que les variables d'environnement ne sont pas posées.

1. **Une seule source** : `lib/site.ts` exporte `SITE_NAME = 'Le Marathon Cinéma'` et `SITE_URL` (`process.env.NEXT_PUBLIC_SITE_URL`, sinon `'https://lemarathoncinema.fr'`). Plus aucune adresse du site écrite en dur : le repli `https://cinema-marathon.vercel.app` du cron de rappel disparaît. Les liens construits avec `window.location.origin` (réinitialisation du mot de passe, partage des watchlists) restent tels quels.
2. **Le nom** : `app/layout.tsx` → `metadataBase: new URL(SITE_URL)` et `title: { default: SITE_NAME, template: '%s — ' + SITE_NAME }` ; `app/videoclub/page.tsx` → `title: 'Le Vidéoclub'`. « Ciné Marathon » devient « Le Marathon Cinéma » dans `components/WelcomeBanner.tsx` et `lib/rules.ts` (« Bienvenue au Marathon Cinéma ! »), dans le logo de `app/auth/AuthPageClient.tsx` (sur deux lignes : « Le Marathon » / « Cinéma ») et dans le mail de rappel (`app/api/cron/marathon-reminder/route.ts` : titre, texte, pied ; expéditeur par défaut `Le Marathon Cinéma <noreply@lemarathoncinema.fr>`, toujours remplacé par `FROM_EMAIL` quand elle existe). Accorde l'article : « au Marathon Cinéma », « du Marathon Cinéma », jamais « à Le » ni « de Le ». `components/Sidebar.tsx` disparaît en phase 2 : ne le touche pas. Les zones interdites (§2.1) qui citent l'ancien nom gardent leur texte : liste-les dans le compte rendu. `package.json` garde son `name`.
3. **Les données du navigateur déménagent avec le site.** Une partie de l'état des joueurs ne vit que dans le `localStorage`, qui est lié à l'adresse. Sur la nouvelle, tout repartirait de zéro :
   - la progression de Clippy (`clippy_*`, dont `clippy_defeats`, qui fait apparaître « La revanche de Clippy ») ;
   - les classements et les touches de Fight Club (`fc_*`) et le record du trombone (`trombone_highscore`) ;
   - les réglages du widget du Tamagotchi (`tama_widget_enabled`, `tama_widget_mini`), `joker-agent-of-chaos`, `cinemon_sim_state` ;
   - les clés `cm_*` (fenêtre « inscription acceptée » déjà vue ; après la phase 5, les réglages des visiteurs et l'état des œufs de thème).

   Relève la liste exacte au moment de la phase (`grep -rn "localStorage" app components lib src`) et donne-la dans le compte rendu. Pour que rien ne se perde :
   - **`ANCIENS_DOMAINES`** (variable d'environnement serveur) : les anciens hôtes, séparés par des virgules, **sous leur forme punycode** (`xn--…`), comme le navigateur les envoie, `www` compris s'il sert. Vide ou absente : rien de ce point ne s'applique.
   - **Dans `proxy.ts`, avant toutes les sorties anticipées actuelles**, une fonction pure `routeAncienDomaine({ host, method, pathname, accept, cookieDemenage })` renvoie `'servir'`, `'demenager'` ou `'rediriger'`. Hôte qui n'est pas ancien : `'servir'`. Ancien hôte, navigation de page (`GET`, `Accept` qui contient `text/html`, hors `/api/`, `/_next/` et fichiers) sans le cookie `cm_demenage` : `'demenager'` (réécriture vers `/demenagement/depart`). Ancien hôte, navigation de page avec le cookie : `'rediriger'` (redirection **308** vers le même chemin et les mêmes paramètres sur `SITE_URL`). Ancien hôte, tout le reste (`POST`, actions serveur, `/api/`, fichiers) : `'servir'`, pour qu'un onglet resté ouvert ne casse pas. Hôte comparé en minuscules, sans le port.
   - **`/demenagement/depart`** (page client, `noindex`, sans barre ni pied) : lit les clés de la liste blanche (les préfixes ci-dessus ; **jamais** `clippy_is_admin`, `tama_widget_cache`, ni rien qui touche à une session), pose le cookie `cm_demenage=1` (un an, sur l'ancien hôte), puis `location.replace()` vers `SITE_URL + '/demenagement/arrivee?vers=' + chemin d'origine`, les données en JSON encodé base64url **dans le fragment** (`#…` : il n'est jamais envoyé à un serveur). Aucune clé à transférer : directement `SITE_URL` + chemin d'origine. Ouverte ailleurs que sur un ancien hôte, la page renvoie à l'accueil sans rien faire.
   - **`/demenagement/arrivee`** (même gabarit ; la liste des anciens hôtes lui vient du serveur) : n'accepte les données que si `document.referrer` vient d'un ancien hôte (le site envoie l'origine en navigation d'un site à l'autre : `Referrer-Policy: strict-origin-when-cross-origin` dans `next.config.js`) ; refiltre les clés avec la même liste blanche ; n'écrit que les clés **absentes** (jamais par-dessus ce qui existe déjà sur la nouvelle adresse) ; efface le fragment (`history.replaceState`) ; puis `location.replace(vers)`, avec `vers` accepté seulement s'il commence par `/` et pas par `//` (sinon `/`).
   - **Pas de cookies ni de session** : les joueurs se reconnectent une fois sur la nouvelle adresse (la session est liée à l'adresse, c'est voulu). `guest_mode` et `age18confirmed` ne sont pas transférés : la confirmation d'âge se refait.
   - **Fin du déménagement** (décision de The Legendre, §17 point 4) : il vide `ANCIENS_DOMAINES` et Vercel redirige l'ancienne adresse. Le code reste, inerte.

**Critère de la phase 1B.** Plus aucun import de `CONFIG` depuis `@/lib/config` dans `app/` et `components/`, hors zones interdites ; les 25 œufs marchent ; un œuf mis dans `eggs_disabled` à la main (SQL) ne se déclenche plus après un rechargement complet de la page (la configuration en cache peut mettre jusqu'à 5 minutes à suivre) ; taper « bond » dans la recherche de `/films` ne fait rien, le taper hors d'un champ déclenche Bond. **Nom et adresse (§7.5)** : « Ciné Marathon » n'apparaît plus, hors zones interdites, `Sidebar.tsx` et `package.json` ; aucune adresse du site écrite en dur ; tests Vitest de `routeAncienDomaine` (ancien hôte en `GET` de page sans cookie → déménager, avec cookie → rediriger, `POST` → servir, `/api/` → servir, `/_next/` → servir, nouvel hôte → servir, hôte en majuscules ou avec port → reconnu) et du filtre des clés (`clippy_is_admin`, `tama_widget_cache` et une clé inconnue refusés). Essai en local : `ANCIENS_DOMAINES=ancien.localhost` et `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `clippy_defeats = 2` posé sur `http://ancien.localhost:3000` ; une visite là-bas finit sur `http://localhost:3000` avec `clippy_defeats = 2` et l'entrée « La revanche de Clippy » visible ; une seconde visite redirige directement.

---
## 8. Phase 2 — Le socle : jetons, polices, composants, navigation, onglet Vidéoclub

Branche `refonte-v2/phase-2`. Référence visuelle : `maquettes/neutre/01-accueil-hors-saison.jpg` et `maquettes/neutre/neutre-reference.html` (le tableau `b1` fait foi pour les couleurs ; voir le `LISEZMOI` des maquettes).

### 8.1 Jetons

1. Crée `app/styles/tokens.css` avec le bloc neutre de l'annexe A, sous le sélecteur `:where(:root), [data-theme="neutre"]` (le second sert à forcer le neutre dans une zone : admin, vidéoclub, fenêtres qui en viennent). Fais poser `<html data-theme="neutre">` par `app/layout.tsx` (aujourd'hui l'attribut n'existe pas ; le moteur de la phase 5 changera la valeur). Les feuilles des thèmes sont importées **après** `tokens.css`.
2. **Les anciennes variables sont gelées, pas supprimées.** Les easter eggs et les jeux lisent `--bg2`, `--bg3`, `--bg4`, `--border`, `--border2`, `--border3`, `--text`, `--text2`, `--text3`, `--gold`, `--gold2`, `--gold3`, `--green`, `--red`, `--blue`, `--purple`, `--orange`, `--r`, `--rl`, `--rxl`, `--font-display`, `--font-body` (et leurs variantes `*2`). Déplace-les telles quelles (sauf `--font-display` et `--font-body`, posées par `next/font`, voir plus bas) dans `app/styles/legacy.css`, **avec leurs valeurs actuelles, qu'aucun thème ne redéfinit**. Seule exception : `--bg`, repris par le nouveau jeton du même nom (même valeur en neutre ; aucun œuf ne le lit). Les œufs gardent ainsi exactement leur apparence d'aujourd'hui, dans tous les thèmes. Garde aussi `Playfair_Display` et `Syne` dans `next/font` sous leurs variables actuelles (`--font-display`, `--font-body`), avec `preload: false` : le navigateur ne les télécharge que quand un œuf les affiche.
3. **Les nouveaux composants n'utilisent que les nouveaux jetons** : tous ceux de l'annexe A (couleurs, polices `--f-*`, `--disp-*`, `--ui-*`, `--radius`, `--skew`, `--tex`, `--grit`, `--ease`, `--dur`, `--cursor`, `--cursor-survol`, `--cursor-clic`, échelles `--fs-*`, `--sp-*`, `--z-*`). Les noms de polices commencent par `--f-` pour ne pas écraser les variables gelées.
4. `--accent-fg` existe parce qu'une couleur d'action n'est pas toujours lisible en texte (le rouge rideau de la Comédie fait 2,5:1 sur son fond). Règle : `--accent` pour les **surfaces** (bouton plein, bande d'état), `--accent-fg` pour le **texte et les icônes** posés sur le fond. Même logique pour `--bad` / `--bad-fg`. `--ink3` sert au texte tertiaire (≥ 4,5:1) ; `--ink-ghost` seulement au décor (grands chiffres fantômes, filets), jamais à une information.

### 8.2 Polices

Via `next/font/google`, variables sur `<html>` :

| Rôle | Police | Graisses | Variable | Jeton |
|---|---|---|---|---|
| Titres, chiffres de titrage, boutons | **Inter** | 700, 900 | `--ff-inter` | `--f-display`, `--f-ui` |
| Texte | **Newsreader** | 400, 500, 600 + italique 400 | `--ff-newsreader` | `--f-body` |
| Données (horaires, EXP, compteurs, étiquettes) | **JetBrains Mono** | 400, 700 | `--ff-jetbrains` | `--f-data` |

Chiffres en colonne : `font-variant-numeric: tabular-nums` sur tout ce qui est en `--f-data`. Rien sous 12 px.

**Ne change pas `html` ni `body`.** `html { font-size: 15px }` et la police de `body` restent tels quels : les easter eggs sont dimensionnés en `rem` (plus de 300 occurrences) et héritent de la police de `body` ; y toucher les déformerait tous. Le nouveau site porte sa typographie par une classe commune `.site-base` (`font-family: var(--f-body)`, `font-size: var(--fs-4)` soit 16 px, couleur `--ink`), posée sur `#site` (§8.5), sur la racine des portails de `Modal` et sur le conteneur des toasts. Les nouveaux composants utilisent les tailles en px des jetons, jamais des `rem`.

**Les œufs montés dans les pages** (Le Parrain, Inception, Dun Dun dans `FilmsClient.tsx` ; Le Rageux, le Facehugger et le mini-jeu dans `Forum.tsx`) se retrouvent dans `#site` : enveloppe leurs fenêtres dans une classe `.egg-legacy` (`font-family: var(--font-body)`, `font-size: 15px`, `color: var(--text)`) pour qu'ils gardent leur apparence d'aujourd'hui. Ce sont des retouches autorisées (§2.1).

### 8.3 Tailwind

`tailwind.config.ts` (Tailwind 3.4, **ne pas passer en v4**) pointe vers les jetons : couleurs `bg`, `s1`, `s2`, `s3`, `line`, `ink`, `ink2`, `ink3`, `accent`, `accent-ink`, `accent-fg`, `info`, `ok`, `warn`, `bad`, `bad-fg` en `var(--…)` ; polices `display`, `body`, `data`, `ui` ; tailles et espacements depuis les échelles. Les modificateurs d'opacité (`/50`) ne marchent pas avec des `var()` : ne les utilise pas. Tailwind pour la mise en page et l'espacement, des modules CSS pour les habillages de composants. `style={{…}}` seulement pour une valeur calculée (position, largeur tirée des données, variable CSS injectée).

### 8.4 Composants partagés (`components/ui/`)

Une seule implémentation chacun, sans `style={{…}}` ni couleur en dur : `Button` (variantes `primary`, `ghost`, `danger`, `link` ; tailles ; état chargement), `Panel`, `Field` (libellé, aide, erreur ; input, textarea, select), `Toggle`, `Tabs`, `Tag`, `PageHeader` (titre en display + sous-titre en mono), `StatRow`, `Gauge` (jauge segmentée : EXP, notes), `Divider`, `Ticker`, `Modal` (**rendue dans un portail** sur `document.body`, pour ne plus jamais passer sous la barre : aujourd'hui la fenêtre de `/semaine` est à z-index 80, sous la barre latérale ; la racine du portail recopie le `data-theme` de la zone qui l'ouvre, pour qu'une fenêtre de l'admin reste neutre), `EmptyState`, `Skeleton`, `Countdown`, et `icons/` : pictogrammes SVG au trait de 1,5 px qui remplacent les emoji utilisés comme icônes dans l'interface. Les emoji restent dans les contenus des joueurs et dans les easter eggs.

Échelle de z-index (jetons `--z-*`) : décor de thème 0 (calque `position: fixed`, **premier enfant** de `#site`) ; `main` et le pied en `position: relative` **sans z-index** (ils passent au-dessus du décor par l'ordre du document, et ne créent pas de contexte d'empilement : les fenêtres et les œufs qu'ils contiennent gardent leur z-index réel) ; barre du haut 100 ; tiroir mobile 195 ; barre du bas 200 ; bouton Discord, radio et case « Son » de l'Horreur 210 ; effets de thème 450 (poursuite, explosions, fissures, mouche, ballon, apparition) ; calque du sursaut de l'Horreur 480 ; fenêtres 500 ; toasts 9999 (inchangé). Les trous de balle du Western ont leur calque à part : 90 dans la page (au-dessus du contenu, sous la barre du haut), 501 au-dessus d'une fenêtre ouverte (§15.4). Les easter eggs gardent leurs valeurs (891 à 100000) : ils passent au-dessus du décor, des effets et des fenêtres. Un œuf ouvert dans une fenêtre (Le Parrain dans la fiche film) reste au-dessus des effets parce que ceux-ci sont sous 500.

### 8.5 La navigation

La barre latérale (`components/Sidebar.tsx`, 230 px) disparaît. Elle est remplacée par une **barre en haut** sur ordinateur et, au téléphone, par la barre du bas actuelle et son tiroir.

1. **Une seule source** : `lib/nav.ts` décrit les entrées, leur route, leur catégorie, leur condition d'affichage et leur clé de libellé (`NavKey`, annexe B). La barre du haut, la barre du bas, le tiroir et, plus tard, les thèmes lisent ce fichier.
2. **Entrées** : exactement celles de la barre latérale d'aujourd'hui, avec leurs conditions. Un seul changement voulu : « Mon profil » (réservé aux connectés, avec la pastille des non-lus) et « Administration », aujourd'hui seuls sous Accueil, passent dans le menu du compte.

| Catégorie | Entrées (route) | Condition |
|---|---|---|
| — | Accueil (`/`) | toujours |
| — | **Vidéoclub** (`/videoclub`) | `videoclub_mode = bientot` |
| Évènement collectif | Films de la semaine (`/semaine`), Duels (`/duels`) | — |
| Films | Liste de films (`/films`), Classements films (`/notes`), Pires films (`/notes?tab=pires`), Rattrapages cinéma (`/rattrapage`), Mes watchlists (`/watchlist`) | Pires films : œuf Le Rageux trouvé ; Mes watchlists : connecté |
| Social | Forum (`/forum`), Marathoniens (`/marathoniens`), Classement joueurs (`/classement`), Messages (`/messages`) | Messages : pastille des non-lus |
| Secret | Mon Alien (`/tamagotchi`), La revanche de Clippy (`/clippy-revanche`), Easter eggs (`/easter-eggs`) | Mon Alien : œuf Le Facehugger ; Revanche : `clippy_defeats ≥ 1` dans le `localStorage` (comme aujourd'hui) |
| Compte | Mon profil (`/profil`), Messages, Administration (`/admin`), Déconnexion | Administration : admins |

3. **Ordinateur (≥ 1100 px)** : barre de 56 px, pleine largeur, fixe en haut. De gauche à droite : la marque « LE MARATHON CINÉMA » (« MARATHON » en `--accent-fg`, élément marqué `data-brand-title` : la voiture de l'Action s'y écrase), Accueil, Vidéoclub, les quatre catégories en menus déroulants, puis à droite la puce de semaine en `--f-data` et le compte (avatar carré avec pastille de non-lus → menu Mon profil / Messages / Administration / Déconnexion ; visiteur : bouton « Se connecter » plein). Menus : bouton + liste, ouverture au clic et au clavier, Échap ferme, focus visible, pas d'ouverture au simple survol.
4. **Entre 769 et 1099 px** : marque, Accueil, Vidéoclub, puce de semaine, compte, et un bouton « Menu » qui ouvre un panneau avec les quatre catégories.
5. **Téléphone (≤ 768 px)** : barre du haut réduite (marque, puce de semaine, avatar) ; en bas, les cinq entrées fixes d'aujourd'hui, dans l'ordre où le code les affiche (Accueil, Films, Classements films, Forum, Marathoniens), + « Menu » ; le tiroir reprend tout le reste, **y compris le bouton Coffre / Révoquer de Clippy**, avec la même logique qu'aujourd'hui (événements `clippy:statechange`, `clippy:invoke`, `clippy:revoke`, `localStorage`). Le mot « Coffre » reste réservé à ce bouton.
6. **Puce de semaine** (neutre) : avant le lancement, « SAISON 02 · J-14 » ; saison en cours, « SAISON 02 ». La phase 5 y ajoute la semaine du planning.
7. **Libellé de saison** : `cfg.SAISON_LABEL` (base), plus jamais `CONFIG`.
8. Mise en page : `ClientShell` rend la racine du site, **`<div id="site" class="site-base">`** (elle n'existe pas aujourd'hui : c'est une `div` sans nom), qui contient la barre, `<main id="contenu">` et le pied. Sur `/auth`, `ClientShell` rend aussi `#site`, sans la barre. Sur les routes des jeux (`/labo/**`, `/clippy-revanche`, `/tamagotchi`), `main` porte `data-theme="neutre"` (règle 5 de §2.2 ; leurs dossiers ne sont pas modifiés). Largeur maximale du contenu 1440 px, marges 40 px (16 px au téléphone), lien d'évitement « Aller au contenu ». `ClientShell` garde ses responsabilités actuelles (pas de barre sur `/auth`, widget du Tamagotchi, fenêtre de 24 h). Les œufs de `EasterEggsLoader` restent montés **hors** de `#site`, comme aujourd'hui.
9. **Bouton Discord** : il reste en bas à droite. Quand le widget du Tamagotchi est affiché (même coin, z-index 800), le bouton se décale à gauche du widget au lieu de se cacher dessous.

### 8.6 L'onglet Vidéoclub

- Entrée à part, juste après Accueil, hors des quatre menus. Libellé « Vidéoclub » dans tous les thèmes (en capitales si le thème met sa barre en capitales), précédé d'un point de néon `--neon-vc` (`#E8C46A`) qui **ne change dans aucun thème**. Au téléphone, l'entrée est dans le tiroir.
- **Si `app/videoclub/` existe déjà dans le dépôt** (The Legendre travaille sur le vidéoclub ailleurs) : n'y touche pas, arrête-toi et demande-lui ce que l'onglet doit ouvrir. **Sinon**, crée `app/videoclub/page.tsx`, toujours en neutre (`<div data-theme="neutre">`) : titre « Le Vidéoclub », une phrase (« Chaque film vu sort du rayon et s'use. Ton nom reste sur la boîte que tu as ouverte le premier. »), mention « Ouverture prochaine », lien retour. Rien d'autre : le vrai vidéoclub arrive plus tard, avec son propre prompt, qui ajoutera un mode `ouvert`.
- Réglage `videoclub_mode` : `cache` → l'entrée disparaît et la page répond 404 (`notFound()` dans la page d'attente) ; `bientot` (défaut) → entrée visible, page d'attente.

### 8.7 Accessibilité

- `app/layout.tsx` : retirer `maximumScale: 1` du `viewport` (il empêche de zoomer), garder `viewportFit: 'cover'`.
- Style `:focus-visible` net sur tout élément interactif (contour 2 px `--accent-fg`, décalé de 2 px).
- `@media (prefers-reduced-motion: reduce)` : coupe les transitions et animations **du site** (pas celles des easter eggs).

### 8.8 Le dictionnaire, dès maintenant

Crée dès cette phase `lib/themes/types.ts` et `lib/themes/neutre.ts` avec la forme décrite en §11.2, les tables `NavKey`, `VocabKey` et `RepliqueKey` de l'annexe B (colonne neutre), le type `ThemeEggId` (identifiants #26 à #37 de l'annexe C ; `lib/themes/eggs.ts` le reprendra en phase 5), et les fonctions `t()`, `navLabel()`, `navCourtLabel()` (libellés courts de la barre du bas, annexe B.1), `levelLabel()`, `formatExp()`. La barre, les pages refaites en phase 3 et les toasts lisent leurs libellés par là. Ainsi, les thèmes n'auront plus qu'à fournir leur dictionnaire.

- **Nouvelle clé `addToList`** (annexe B.2) : le bouton « Ajouter à une watchlist » de la fiche (`app/films/FilmsClient.tsx` ~435) passe par `t('addToList')` ; sur la carte, l'étiquette « Watchlist » aussi, quand le film n'est dans aucune liste (« {n} listes » reste tel quel). Neutre, Action, Comédie : « Ajouter à une watchlist ».
- **Variables communes de `t()`** : `{fdlsJour}`, `{fdlsHeure}`, `{seanceJour}`, `{seanceHeure}` sont toujours remplies depuis `useConfig()` (côté serveur, depuis `getServerConfig()`), sans que l'appelant les passe. Les jours sont mis **en minuscules** (les réglages valent « Vendredi », « Mercredi » : « La nuit de vendredi ») ; les heures restent telles que les réglages les écrivent (« 20h30 »). Les capitales des étiquettes viennent du CSS. Une variable inconnue laissée dans un texte est un bug : un test Vitest vérifie qu'aucun libellé de thème ne contient de `{…}` qui ne soit pas rempli (variables communes, ou variables passées là où la clé est utilisée, listées dans l'annexe B).
- **`RepliqueKey`** : les répliques de la Comédie, du Western et de l'Horreur (annexe B.3), toutes modifiables dans l'admin.
- `ThemeDef.citations` : vide pour l'Action, le Western et l'Horreur.
- **Nouvelle clé `eggsIntro`** : la phrase d'introduction de `/easter-eggs` (aujourd'hui en dur dans `EasterEggsPageClient.tsx`, ligne ~221) passe par `t('eggsIntro')`. Valeurs en annexe B.2.
- **Les nombres s'accordent** : tout libellé « {n} … » a sa forme au singulier, utilisée pour 0 et 1 (« 1 balle », « 0 relevé », « 1 de la bande n'a pas encore tiré », « suivi depuis 1 jour »). Une fonction `accorde(n, singulier, pluriel)` écrit les deux formes en entier ; jamais un « s » collé par le code.
- **Zéros et vides**, à écrire au lieu de « 0 … » :
  - W1 : « PERSONNE DE LA BANDE NE L'A ENCORE CAPTURÉ » ; H1 : « PERSONNE NE L'A ENCORE RAYÉ » ;
  - W3 : « PAS ENCORE CAPTURÉ » ; aucune note : « AUCUN RELEVÉ » (pas de balles) ;
  - W4 : quand tout le monde a voté, « TOUTE LA BANDE A TIRÉ » ; aucune voix : pas de pourcentage ; égalité : « À ÉGALITÉ » sous les deux avis, et les deux boutons à filet ; H4 : aucune voix, les deux lumières sont égales et faibles ;
  - une liste vide garde son titre et prend l'état vide du thème (`empty`).
  La clé `playerCountUn` (annexe B.2) donne la forme de `playerCount` après 0 ou 1. Ces phrases s'appliquent dans les écrans du Western et de l'Horreur (§15.6, §16.7), et H6 a les siennes (« SUIVI DEPUIS AUJOURD'HUI », « aucune, pour l'instant »).
- **Les dates d'une semaine** passent par une fonction commune `formatSemaine(lundi)` : « du lundi 5 au dimanche 11 octobre », « du lundi 26 octobre au dimanche 1er novembre » (le mois de gauche seulement s'il change ; « 1er » pour le premier du mois). L'Opération (A8), l'Acte (T8), le Territoire (W8) et les Sept nuits (H8) l'utilisent.

### 8.9 Le téléphone : le socle

The Legendre veut chaque thème en version téléphone. Il n'existe **aucune maquette téléphone** : ces règles, et la section « Au téléphone » de chaque thème (§9.7, §13.8, §14.9, §15.8, §16.10), en tiennent lieu. Elles valent dès cette phase et pour toutes les suivantes : **chaque phase livre l'ordinateur et le téléphone en même temps**.

Ces règles passent par les classes et les jetons du site. Elles ne touchent **jamais** les fichiers entièrement interdits de §2.1 (jeux, œufs, widget du Tamagotchi) ni les fenêtres des œufs (`.egg-legacy`), qui gardent leur apparence ; dans les fichiers à retouches autorisées (`FilmsClient.tsx`, `Forum.tsx`…), elles passent seulement par l'habillage que §2.1 permet ; la feuille plein écran de la fiche de `/films` passe par une classe propre, pas par une règle globale sur `.modal`. Les comportements au toucher (poursuite, lampe, porte, trac, gros plan…) se choisissent par `@media (hover: none)`, **jamais par la largeur** : une tablette tactile les reçoit aussi, un petit écran d'ordinateur garde ceux de la souris.

1. **Tailles** : téléphone ≤ 768 px, vérifié à 360, 390 et 430 px de large en portrait, et à 844 × 390 en paysage ; tablette de 769 à 1099 px ; ordinateur ≥ 1100 px (§8.5). En paysage, 844 px de large donnent la **mise en page tablette** (§8.5, point 4) : vérifie qu'elle tient dans 390 px de haut (barre du haut, panneau « Menu » qui défile à l'intérieur). Outils de développement du navigateur, **et** un vrai téléphone sur l'aperçu Vercel pour chaque validation visuelle (The Legendre).
2. **Zones sûres** (encoche, barre d'accueil de l'iPhone) : `viewportFit: 'cover'` est gardé (§8.7). La barre du haut prend `padding-top: env(safe-area-inset-top)`, la barre du bas `padding-bottom: env(safe-area-inset-bottom)` ; en paysage, les marges latérales (16 px au téléphone, 40 px en tablette) deviennent `max(marge, env(safe-area-inset-left))` et `max(marge, env(safe-area-inset-right))` (barres, contenu, éléments fixes). La barre du bas a une hauteur fixe, le jeton `--barre-bas` (annexe A.1), plus la zone sûre. Un jeton `--bas-libre` (`--barre-bas` + `env(safe-area-inset-bottom)` + 8 px) place **tout élément fixe du bas de l'écran** au téléphone. Empilement, du bas vers le haut : **rangée 1**, à `--bas-libre` : la case « Son » de l'Horreur à gauche (§16.8), le bouton Discord à droite ; chaque élément de cette rangée fait 44 px de haut (le bouton Discord passe à 44 px au téléphone). **Rangée 2**, à `--bas-libre` + 52 px : une **pile** : la carte « prévenu » de l'Horreur en bas, au-dessus la ligne écrite par un œuf de thème, au-dessus les toasts ; quand l'une est affichée, celles d'au-dessus montent d'autant (la carte et la ligne publient leur hauteur dans un jeton `--pile-bas` sur `<html>`, que les toasts ajoutent à leur `bottom`). Rien ne se recouvre, et rien ne se pose sur la barre du bas.
   Le widget du Tamagotchi est une zone interdite (§2.1) : on ne le déplace pas, les autres évitent son coin (§8.5, point 9). Aujourd'hui, au téléphone, il **chevauche la barre du bas** (fixé à 20 px du bas et de la droite, z-index 800) : **ne le corrige pas**, signale-le dans le compte rendu de la phase 2 avec une capture. Si The Legendre le demande, une piste à tester sur un vrai téléphone avant de la proposer : envelopper le widget, dans `ClientShell`, dans un `<div id="tama-slot">` fixe, plein écran, `pointer-events: none` (ses enfants en `auto`), z-index 800, décalé vers le haut de `--bas-libre` par un `transform` (un ancêtre transformé devient le repère des éléments `position: fixed`), sans ouvrir le fichier du widget.
3. **Hauteurs** : `100dvh` et jamais `100vh` pour ce qui prend toute la hauteur (la barre d'adresse du téléphone change de taille).
4. **Cibles tactiles** : 44 × 44 px au moins pour tout ce qui se touche (entrées de barre, boutons, pastilles de filtre, cases, croix de fermeture), 8 px entre deux cibles voisines. Les petits secrets des thèmes (mouche, ballon, ampoule verte, silhouette) gardent leur dessin mais reçoivent une zone tactile de 44 px autour.
5. **Texte** : 16 px pour le texte courant ; rien sous 12 px ; **les champs de saisie à 16 px au moins** (en dessous, l'iPhone zoome dès qu'on touche le champ). Les grands titres en `clamp()` (jamais plus large que l'écran ; `overflow-wrap: anywhere` sur les titres de film).
6. **Aucun survol obligatoire** : sous `@media (hover: none)`, tout ce qui n'apparaît qu'au survol a un équivalent au toucher ou disparaît. Les menus s'ouvrent déjà au toucher (§8.5, point 3).
7. **Pas de défilement horizontal de la page.** Tout tient dans la largeur ; les tableaux larges deviennent des lignes empilées (§9.7). Seules exceptions, dans un conteneur à part avec un bord qui montre qu'il y a une suite : la rangée d'onglets, la rangée de filtres et la bande de photogrammes de l'accueil (§9.7).
8. **Les fenêtres** (`Modal`, et la fenêtre de fiche de `FilmsClient.tsx`, habillage autorisé) deviennent au téléphone une **feuille plein écran** : `100dvh`, défilement à l'intérieur, en-tête collant avec le titre et un bouton « Fermer » de 44 px. Leur comportement ne change pas.
9. **La barre du haut** au téléphone : 52 px plus la zone sûre ; la marque à gauche, **sur deux lignes** (« LE MARATHON » / « CINÉMA », 14 px, interligne 1 ; mesuré, « LE MARATHON » fait de 73 px en Saira Condensed à 112 px en Rye ou en Cormorant), à droite **une seule puce** et l'avatar (ou « Se connecter »). Si la puce ne tient pas à 360 px à côté de « Se connecter », elle part : sa forme longue est déjà en tête du tiroir. La puce est la puce de semaine en forme courte (`weekCourt`, §11.11 : « 03 / 04 » ; en Comédie « II / IV » ; hors planning « J-{n} » avant le lancement, « S{NN} » pendant la saison) ; en Action, c'est la puce « ÉTAGE 06 » (§13.8). La forme longue de la puce de semaine est toujours en tête du tiroir.
10. **La barre du bas** : les cinq entrées d'aujourd'hui, dans l'ordre où le code les affiche (Accueil, Films, Classements films, Forum, Marathoniens), + « Menu », avec leurs **libellés courts** (annexe B.1, tableau des libellés courts), icône au-dessus, 12 px, sur une ligne, `letter-spacing: 0` dans cette barre (même si le thème espace ses capitales ailleurs). La barre n'a ni marge latérale ni espace entre ses entrées : six entrées jointives de même largeur (60 px à 360 px), sans marge intérieure horizontale ; la règle des 8 px entre cibles (point 4) ne s'applique pas à l'intérieur de cette barre. Le libellé y tient **entier**, jamais coupé, jamais rétréci, jamais de points de suspension ; s'il ne tient pas, c'est le libellé qu'on change (annexe B.1), pas la taille. Chaque thème l'habille (couleurs, police, entrée active).
11. **Le tiroir** (« Menu ») reprend les quatre catégories avec leurs noms de thème, la puce de semaine longue, l'entrée « Vidéoclub » (§8.6), la ligne « La radio » dans les thèmes (§11.7), le compte, le bouton Coffre / Révoquer de Clippy (§8.5, point 5) et, pour un admin, le menu « Tester ▾ » (§11.4). Il s'ouvre en plein écran, se ferme par Échap, par « Menu » et par le choix d'une entrée. Tiroir ouvert, le bouton Discord et la case « Son » sont cachés.
12. **Décors et effets des thèmes au téléphone** : plus légers qu'à l'ordinateur (détail dans chaque thème) ; une seule animation continue au plus par écran ; toutes les animations en pause quand l'onglet est caché (`visibilitychange`) ; « réduire les animations » toujours respecté.
13. **L'admin** est utilisable au téléphone (§12.1, point 1) : une colonne, sous-menu en liste déroulante, tableaux en lignes empilées, zone dangereuse en bas.

### 8.10 Critères d'acceptation de la phase 2

- Le site s'affiche avec la barre du haut, les nouvelles polices et les couleurs neutres ; toutes les entrées et conditions d'avant sont là (vérifier Pires films, Mon Alien, Revanche, Administration, pastilles de non-lus).
- Clavier seul : on peut ouvrir chaque menu et atteindre chaque entrée.
- Les 25 œufs ont exactement la même apparence qu'avant (variables gelées, `html` et `body` inchangés).
- `/videoclub` affiche la page d'attente ; `videoclub_mode = cache` la fait disparaître.
- Au téléphone (§8.9), à 360, 390 et 430 px : barre du haut, barre du bas et ses libellés courts, tiroir complet (Coffre de Clippy compris), zones sûres respectées sur un iPhone, aucune page qui défile de côté.

---

## 9. Phase 3 — Toutes les pages en version neutre

Branche `refonte-v2/phase-3` (tu peux la découper en 3a, 3b, 3c si c'est plus lisible pour la validation). Chaque page passe sur les composants de `components/ui/` et les jetons ; ses `style={{…}}` et couleurs en dur disparaissent au passage (compte-les avant / après dans le compte rendu). Les libellés passent déjà par `t()` et `navLabel()` (§8.8) : à cette phase, seul le dictionnaire neutre existe.

### 9.1 L'accueil « Le Mur »

Références : `maquettes/neutre/01-accueil-hors-saison.jpg` (état visiteur et avant saison) et `02-accueil-marathon-mise-en-page.jpg` (mise en page de l'état « saison en cours » ; **ses couleurs rouges sont obsolètes**, prends celles du neutre). Aucune carte arrondie, aucun ornement, titrage très gras.

**Cinq états**, un seul gabarit. L'en-tête garde toujours la même forme ; seul son contenu change. Aucune zone vide, aucun bloc caché.

| État | Condition | En-tête (452 px sur ordinateur) | Bande d'état (fond `--accent`, texte `--accent-ink`) |
|---|---|---|---|
| Visiteur | pas connecté | le mur d'affiches + l'accroche | avant saison : « LA SAISON {NN} OUVRE LE {date} » · J-{n} · {inscrits} marathoniens inscrits · bouton « Rejoindre » (→ `/auth`) ; en cours : « SAISON {NN} EN COURS » · bouton « Rejoindre la saison {NN} » |
| Avant saison | connecté, `now < MARATHON_START` | le mur + l'accroche | ouverture, J-{n}, inscrits, bascule de notification (`MarathonNotifyToggle`), bouton « Cocher mes films déjà vus » (→ `/films`) |
| Saison en cours, sans film de la semaine | connecté, `now ≥ MARATHON_START`, aucun `week_films` actif | le mur + l'accroche | « SAISON {NN} EN COURS », séance suivante si elle est connue, bouton « Voir la liste » (→ `/films`) |
| Saison en cours | connecté, `now ≥ MARATHON_START`, un `week_films` actif | le film de la semaine en grand (affiche TMDB en fond, titre en display, « SÉANCE COLLECTIVE — VENDREDI 20:30 » tiré des réglages, année · réalisateur · genre ; la durée n’est pas en base, ne l’affiche pas), bande de photogrammes (affiches des films de la semaine précédents, tirées des archives `week_films`) ; colonne de droite : « Ce qui se passe » (activité récente de tout le site) et « Ta progression » (films vus / catalogue ouvert, niveau) | séance suivante (compte à rebours), présents / joueurs de la saison, 2ᵉ séance, bouton `t('markSeen')` sur le film de la semaine ; le bouton du direct s'y ajoutera en phase 6 (§12.4) |
| Arrivé en cours de saison | connecté, `now ≥ MARATHON_START` et (`profile.saison > SAISON_NUMERO` ou fenêtre de 24 h ouverte) | comme « saison en cours » | les bannières existantes (`JoinMarathonBanner`, fenêtre de 24 h) restylées, textes et logique inchangés |

**Définitions**, valables partout (accueil, thèmes, admin) : **joueurs de la saison** = profils dont `saison = SAISON_NUMERO` (c'est la règle de l'admin actuelle, « Dans le marathon », sauf qu'on garde les admins qui jouent : demande à The Legendre de confirmer dans le compte rendu) ; **inscrits** = même ensemble, avant le lancement ; **présents** = joueurs de la saison qui ont marqué vu le film de la semaine actif ; **actif cette semaine** = joueur de la saison qui a marqué au moins un film pendant le marathon depuis le lundi 0 h (Paris). Pas d'autre définition, pas d'autre chiffre.

**Le mur d'affiches** : environ 80 affiches du catalogue ouvert (20 colonnes × 4 rangées sur ordinateur, 6 × 5 au téléphone), tirées au sort une fois par jour (même sélection pour tout le monde ce jour-là, en cache), opacité 0,6, voile dégradé de gauche à droite (voir `.veil` dans la référence). Les images sont les petites versions TMDB chargées directement (`w92`, avec `srcSet` `w92 1x, w154 2x` pour les écrans denses), `decoding="async"`, `fetchPriority="low"`. L'accroche est du texte (c'est elle l'élément principal de la page, pas les images).

**L'accroche** (nouvelle, 30 septembre : elle **remplace** « 466 FILMS. DEUX SÉANCES PAR SEMAINE. » des maquettes, que The Legendre a refusée parce qu'elle met les chiffres avant le sens ; le site doit d'abord dire que c'est un marathon cinéma, une liste de films, une culture qu'on se construit en cochant ce qu'on a vu) : au-dessus, en mono, « LE MARATHON CINÉMA — SAISON {NN} » ; puis `accueil_accroche` en Inter 900, 74 px sur ordinateur (`clamp` au téléphone), interligne 0,88, approche −0,035em, une ligne par retour à la ligne :

> **UN MARATHON.**
> **UNE LISTE.**
> **TA CULTURE CINÉ.**

puis `accueil_texte` en Newsreader 21 px, `--ink2` : « Les films qui ont fait le cinéma, réunis dans une seule liste. Coche ceux que tu as déjà vus, rattrape les autres pendant le marathon, et regarde ta culture ciné grandir. » Les deux textes se modifient dans l'admin (Contenu → Accueil) ; `{FILMS}` y est remplacé par le nombre de films du catalogue ouvert si on l'écrit.

**Sous l'en-tête**, trois colonnes séparées par des filets verticaux, numérotées en mono :

| Colonne | Titre | Texte hors saison | En cours de saison |
|---|---|---|---|
| 01 — LA LISTE | Coche tes films | « Tous les films sont dans la liste. Coche ceux que tu as déjà vus : tu sais d'où tu pars. Ceux que tu vois pendant le marathon te font monter de niveau. » Lien « Voir la liste » (→ `/films`) | identique, avec « Ta progression : {vus} / {catalogue} » pour un joueur connecté |
| 02 — LA SEMAINE | Un genre à la fois | « Chaque semaine de la saison a son genre, et le site change d'apparence avec lui. Deux séances collectives : le {SEANCE_JOUR} et le {FDLS_JOUR} à {heure}. » (valeurs des réglages) | le genre de la semaine (planning, dès la phase 5) et le duel en cours (deux titres, pourcentage, échéance) |
| 03 — LE VIDÉOCLUB | L'étagère commune | « Chaque film vu sort du rayon et s'use. Ton nom reste sur la boîte que tu as ouverte le premier. Bientôt. » | identique ; la colonne disparaît en mode `cache` |

**Pied de l'accueil** : les annonces (épinglée en premier, comme aujourd'hui), puis, séparés par un filet, « Les mieux notés » (5 affiches, note en mono) à gauche et le classement (5 premiers, EXP en mono) à droite. Une seule ligne de règles avec un lien « Lire les règles » vers `/regles`.

**Ce qui quitte l'accueil** : les cartes de règles (11 par défaut, → `/regles`), la grille de statistiques (→ profil ; l'accueil garde « Ta progression »), l'`ExpBar` en grand (→ profil). La bannière de bienvenue (`WelcomeBanner`) reste, son bouton « Voir les règles » mène à `/regles`.

**Données** : regroupe les lectures dans `lib/home.ts` ; tout ce qui ne dépend pas du joueur (films, mur, classement, mieux notés, annonces, activité) en cache Redis court ; lectures en parallèle ; le profil et le nombre de films vus passent par les mêmes lectures en cache que le layout (`withCache` sur `user:<id>:profile` et `user:<id>:watched_count`, dans une fonction commune), au lieu d'une seconde requête sans cache.

### 9.2 L'activité récente (« Ce qui se passe »)

`lib/activity.ts` : les 10 derniers évènements du site, en cache 60 s. Version 1 : films marqués vus pendant le marathon (pseudo, titre, `exp_awarded`), notes données (pseudo, titre, note), duels ouverts et clos. Chaque ligne : heure en mono, qui, quoi, montant ou note. Cette même source servira au bandeau de fréquence de l'Action, au cahier de régie de la Comédie, au télégraphe du Western (W1) et aux dernières traces de l'Horreur (H1).

### 9.3 `/regles`

Nouvelle page : le règlement (`MARATHON_RULES` en base, `DEFAULT_RULES` sinon), avec les variables `{EXP_FILM}`, `{SEANCE_JOUR}`… remplacées par les vraies valeurs (comme aujourd'hui sur l'accueil). Mise en page éditoriale, sans cartes. Lien depuis l'accueil, la bannière de bienvenue et le pied de page. La carte « badges » des règles recopie des seuils en dur (`lib/rules.ts:21`) : lis-les dans `BADGES` (`lib/config.ts`).

### 9.4 La page 404

`app/not-found.tsx` : titre `t('notFoundTitle')`, texte `t('notFoundText')`, lien vers l'accueil. Neutre : « Page introuvable ». Les thèmes la redessinent (phases 7 à 10).

### 9.5 Les autres pages

Dans cet ordre : `/films`, `/semaine`, `/duels`, `/classement`, `/notes`, `/profil`, `/marathoniens`, `/forum` et `/forum/[topicId]`, `/messages`, `/watchlist` et `/watchlist/public`, `/rattrapage`, `/easter-eggs`, `/auth` et `/auth/reset`, pages légales, puis les éléments globaux (bienvenue, rejoindre, fenêtre de 24 h, toasts, chargement, compte à rebours, jauge d'EXP, bandeaux 18+).

Règles communes :

- En-tête de page : titre en display, sous-titre en mono. Pas de carte autour.
- Ligne de statistiques : **une seule couleur** (`--accent-fg`) pour tous les chiffres. L'arc-en-ciel actuel (vert, or, blanc, orange) ne dit rien.
- Filtres : boutons à filet, l'actif prend `--accent`. L'emoji 🔍 disparaît du champ de recherche.
- `/films` : référence `03-films-mise-en-page.jpg` (couleurs SF obsolètes). **La grille garde sa structure et son comportement** ; badges « vu » et « film de la semaine » en `--accent`, rayon 1 px.
- Montants d'EXP : partout où un visionnage est listé (activité, profil), afficher `exp_awarded` et non `EXP_FILM` (aujourd'hui l'accueil et le profil affichent +5 pour tout).
- `/easter-eggs` : garde la mécanique (« ??? (#n) », « Pas encore découvert », famille, nombre de joueurs, date). Le numéro devient un champ fixe de chaque œuf (`num`), plus l'index du tableau : les familles de thème (phase 5) s'intercaleront sans décaler les numéros. La famille « Forum » n'a pas de couleur aujourd'hui (`CATEGORY_COLORS`) : donne-lui la sienne.
- `/watchlist/public` : la fenêtre utilise `var(--bg1)`, qui n'existe pas (fond transparent) : corrige.
- `/auth` : page à part, sans menu. Compte à rebours seulement avant la saison, bouton « Rejoindre le Discord », carte Connexion / Inscription. Tout le formulaire reste littéral.
- Chargement (`loading.tsx`, 18 fichiers identiques qui affichent `components/PageLoading.tsx`) : adapte `PageLoading` pour qu'il lise le thème (neutre : squelette sobre ; les thèmes fournissent le leur).

### 9.6 Les actions destructives (préparées pour les thèmes)

Le Western (trou de balle, §15.5) et l'Horreur (le froid, §16.5) réagissent aux mêmes actions. Marque-les dès cette phase, en passant sur les pages ; en neutre, en Action et en Comédie, rien ne se voit.

1. `data-destructif` sur **le bouton qui exécute la suppression** (le bouton de confirmation s'il y en a un). Sur un bouton bascule (cœur, « ✓ Vu », menu de listes), l'attribut n'est présent **que dans l'état qui retire**. Au 21 septembre :
   - « Retirer des vus » (fenêtre de fiche, `app/films/FilmsClient.tsx`) ;
   - retirer un film d'une liste depuis les menus de listes de `/films` (fiche ~435, carte ~1690) ;
   - supprimer une watchlist et retirer un film d'une watchlist (`app/watchlist/WatchlistClient.tsx` ~302 et ~407) ;
   - retirer un coup de cœur (`app/watchlist/public/PublicWatchlistsClient.tsx` ~226, ~313 et ~432) ;
   - supprimer un message de forum (`components/Forum.tsx` ~617, `app/forum/[topicId]/ForumTopicClient.tsx` ~198) ;
   - supprimer un sujet (`ForumTopicClient.tsx` ~148) ;
   - supprimer un message privé (`components/MessagesSection.tsx` ~287) ;
   - supprimer une archive du film de la semaine (`app/semaine/SemaineClient.tsx` ~217, admin).
   Cherche les autres (`grep -rn "Supprimer\|Retirer" app components`, hors admin et zones interdites ; les boutons sans texte, comme les cœurs, ne sortent pas du `grep` : regarde les `title`) et signale-les.
2. `data-destructif-cible` sur l'élément qui disparaît (la ligne, la carte, le message), quand il y en a un.
3. **Après le succès** de l'action (jamais avant, jamais si la confirmation est refusée), le code émet `window.dispatchEvent(new CustomEvent('cm:destruction'))`. Un écouteur global (`click`, phase de capture) retient, pour le dernier clic sur un `[data-destructif]` : le point du clic (au clavier, `event.detail === 0` : le centre du bouton), l'élément `closest('[data-destructif-cible]')`, et la fenêtre qui le contient s'il y en a une (ancêtre `position: fixed` de z-index ≥ 500). Les thèmes s'en servent s'il date de moins de 30 s. **Ne retarde jamais une disparition** pour laisser jouer un effet : si l'élément a déjà disparu, tant pis.

### 9.7 Au téléphone (pages neutres)

Règles du socle en §8.9. Écran par écran :

| Page | Au téléphone |
|---|---|
| `/` Le Mur | Le mur d'affiches en 6 × 5 (§9.1) derrière l'en-tête ; l'accroche en `clamp(32px, 9vw, 74px)` (chaque ligne de l'accroche tient sur une ligne à 360, 390 et 430 px ; sinon, baisse le minimum et le coefficient `vw` ; un texte plus long saisi dans l'admin passe à la ligne entre deux mots) ; le texte `accueil_texte` en 18 px. La bande d'état passe **sous** l'accroche, ses éléments empilés (séance suivante et compte à rebours, présents, bouton `markSeen` pleine largeur, bouton du direct). Saison en cours : l'affiche du film de la semaine en haut (pleine largeur, hauteur 50dvh au plus), puis le titre, la ligne « année · réalisateur · genre », les boutons pleine largeur, la bande de photogrammes (défilement horizontal dans son conteneur), puis « Ce qui se passe » et « Ta progression ». Les trois colonnes s'empilent, chacune avec son numéro. Pied : annonces, puis « Les mieux notés » (affiches sur 2 colonnes), puis le classement |
| `/films` | La grille garde son comportement et son nombre de colonnes actuel : 3 au téléphone (règle `.films-grid` de `app/globals.css`, à garder telle quelle). En-tête : titre, puis les statistiques en 2 × 2 ; recherche pleine largeur ; filtres (genre, décennie, réalisateur) sur une rangée qui défile dans son conteneur ; « Au hasard » et 18+ à la fin de la rangée. La fiche : feuille plein écran (§8.9, point 8) |
| `/semaine` | Une colonne : les séances de la semaine en liste (jour, heure, film, montant), puis la bande de saison en liste verticale, puis les archives |
| `/duels` | Les deux films **l'un sous l'autre**, chacun avec son bouton de vote pleine largeur ; l'échéance en haut |
| `/classement`, `/notes` | Plus de tableau : une ligne par joueur ou par film (rang, nom, chiffre principal à droite), le détail sur une seconde ligne en `--ink2` |
| `/profil` | Une colonne : identité, jauge, chiffres en 2 × 2, badges sur 3 colonnes, réglages |
| `/marathoniens` | Cartes sur 2 colonnes |
| `/forum`, `/forum/[id]` | Sujets en liste pleine largeur ; dans un sujet, les messages pleine largeur. Le champ d'écriture reste dans le flux, sous les messages, comme aujourd'hui (`components/Forum.tsx`, `ForumTopicClient.tsx`) : ne le fixe pas en bas de l'écran |
| `/messages` | Une colonne. Garde la bascule de `MessagesSection` (la liste des conversations, puis la conversation ouverte avec un retour) ; son seuil passe de `innerWidth < 768` à `<= 768` pour coller au téléphone du site (§8.9), sans autre changement |
| `/watchlist`, `/watchlist/public`, `/rattrapage` | Une colonne ; les actions d'une liste (Renommer, Rendre privée, Supprimer) sur une rangée de boutons de 44 px |
| `/easter-eggs` | Cartes sur 2 colonnes |
| `/auth` | La carte pleine largeur (marges 16 px), le compte à rebours au-dessus, le bouton Discord sous la carte |
| `/regles`, pages légales | Texte en une colonne de 16 px, titres en `clamp()` |
| 404 | Le titre en `clamp()`, le lien retour pleine largeur |

### 9.8 Critères d'acceptation de la phase 3

- Les cinq états de l'accueil s'affichent sans zone vide (tester visiteur, avant saison en changeant la date de lancement, saison en cours avec et sans film de la semaine actif, arrivé en cours de saison).
- Aucune carte arrondie sur l'accueil ; aucune couleur en dur ni `style={{…}}` statique dans les pages refaites (compte avant / après).
- `/films` : mêmes filtres, même tri, même hasard, même fenêtre, même 18+, mêmes watchlists, mêmes œufs qu'avant.
- `/regles` affiche les règles de la base avec les vraies valeurs.
- Au téléphone (§9.7), à 360, 390 et 430 px : chaque page sans défilement horizontal ; la fiche film en feuille plein écran ; les tableaux en lignes.
- Les boutons de §9.6 portent `data-destructif`, et `cm:destruction` part après chaque suppression réussie, jamais après une confirmation refusée (vérifier dans la console).

---
## 10. Phase 4 — Performance

Branche `refonte-v2/phase-4`. The Legendre trouve le site lent, et les affiches lentes à venir. **Mesure avant de changer** (sur l'aperçu Vercel, pas en local) : nombre et poids des images au premier affichage de `/films` et de `/`, temps de réponse du serveur (TTFB) de `/`, `/films`, `/duels`, poids du JavaScript (`ANALYZE=true npm run build`, `@next/bundle-analyzer` est déjà installé). Remesure à la fin, même protocole, et mets les deux séries dans le compte rendu.

Ce que j'ai trouvé en lisant le code (21 septembre) :

| N° | Constat | Correction |
|---|---|---|
| P1 | Les affiches sont des URL TMDB en `w500` passées à l'optimiseur d'images de Vercel. Chaque couple affiche × largeur × format est converti à la demande : le premier passage est lent, et le plan Hobby a un quota de transformations | **Chargeur d'images TMDB** : pour les URL `image.tmdb.org`, un `loader` `next/image` qui demande directement à TMDB la taille publiée la plus proche au-dessus de la largeur voulue (`w92`, `w154`, `w185`, `w342`, `w500`, `w780` ; jamais `original`, qui pèse souvent plusieurs Mo), sans passer par l'optimiseur. Les affiches envoyées par l'admin (Supabase Storage) et celles d'OMDB gardent l'optimiseur. Code en annexe E |
| P2 | `components/Poster.tsx` : `sizes` par défaut `(max-width: 768px) 50vw, 200px` alors que la grille fait 3 colonnes au téléphone | `sizes="(max-width: 768px) 33vw, 190px"` pour la grille |
| P3 | `/films` rend les ~466 cartes d'un coup | `content-visibility: auto` + `contain-intrinsic-size: auto <hauteur réelle de la carte>` sur les cartes : le navigateur saute le rendu de ce qui est hors écran. Ce réglage **coupe ce qui dépasse de la carte**, même à l'écran : rubans, halos et animations restent dans son cadre, et la classe est **retirée de la carte dont un menu est ouvert** (menu des watchlists, catégorie admin, rattrapage : `watchlistDropOpen`, `adminCategoryOpen`, `rattrapageOpen`), sinon le menu serait coupé. Retester l'œuf Dun Dun (il lit `document.body.scrollHeight`) et le menu des watchlists au téléphone. **Pas de pagination** : elle changerait le comportement |
| P4 | `/films` envoie au navigateur toutes les notes individuelles (`ratingMap`, `negativeRatingMap`) | si la grille n'utilise que la moyenne et le nombre, n'envoie que ça ; les notes de chaque joueur (utiles aux fiches T3 et W3) se chargent à l'ouverture de la fiche |
| P5 | L'accueil attend les annonces avant de lancer le reste ; profil et nombre de films vus sont relus alors que le layout les a | fait en 9.1 ; vérifie |
| P6 | `/semaine` : trois vagues de requêtes à la suite ; `select('*, films(*)')` | requêtes en parallèle, colonnes utiles seulement |
| P7 | `/marathoniens` : la première page des visionnages est relue à **chaque** requête, hors du cache (le cache ne couvre que la suite) | tout dans le cache |
| P8 | `/films` lit **tous** les duels clos pour trouver les vainqueurs | ne lire que les colonnes et la période utiles |
| P9 | Caches Redis jamais vidés : `news:latest`, `duels:list`, `leaderboard:*` ; `adminSetFilmCategory` ne vide pas `films:list` ; `week_film:active` et `week_film:full` sont vidées mais jamais remplies | vider la bonne clé dans chaque action qui modifie la donnée ; supprimer les clés mortes |
| P10 | `proxy.ts` appelle `auth.getUser()` (aller-retour réseau vers Supabase) à chaque page, puis la page le rappelle | dans `proxy.ts`, `auth.getClaims()` : vérification locale du jeton si le projet Supabase utilise des clés de signature asymétriques (à activer par The Legendre, phase 11) ; sinon même coût qu'avant, aucun risque. Les actions serveur gardent `getUser()` |
| P11 | `weekly-theme.css` (37 Ko) chargé partout pour des thèmes jamais affichés | supprimé en phase 5 ; les décors de thème sont chargés à la demande (`dynamic import`) |
| P12 | `REDIS_URL` : si la variable manque sur Vercel, `withCache` appelle Supabase à chaque fois, sans le dire | ajoute dans l'admin (phase 6, Outils) un indicateur « Cache : actif / absent » ; signale-le dans le compte rendu |

Ne touche ni aux jeux ni aux œufs pour gagner du poids.

**Critère.** Au premier affichage de `/films` sur ordinateur : moins de requêtes d'images qu'avant, aucune image servie par `/_next/image` pour une affiche TMDB, et des affiches visiblement plus rapides. Chiffres avant / après dans le compte rendu.

---
## 11. Phase 5 — Le moteur de thèmes

Branche `refonte-v2/phase-5`. Migrations **M3 et M4** (annexe D) avant les tests. À la fin de cette phase, basculer le site en Action, en Comédie, en Western ou en Horreur change déjà les couleurs, les polices, les formes et tous les libellés ; les décors, comportements et œufs arrivent en phases 7 à 10.

### 11.1 Le modèle

- Une saison = des semaines numérotées (`season_weeks` : `saison`, `semaine` de 1 à 12, `theme`, `date_debut`). `date_debut` est **un lundi** ; la semaine couvre du lundi 0 h au lundi suivant 0 h, **heure de Paris** (`lib/time/paris.ts`).
- Deux réglages dans `site_config` : `theme_mode` (`auto` = suivre le planning, `force` = imposer un thème) et `theme_force` (clé du thème imposé).
- Les cinq thèmes (`neutre`, `action`, `comedie`, `western`, `horreur`) sont prêts dès cette phase pour les jetons, les polices et les libellés ; décor, comportements et œufs arrivent avec leur phase (7 à 10). Une semaine du planning dont le thème n'est pas connu s'affiche en neutre.

### 11.2 Un thème = des jetons + un dictionnaire + un décor + des comportements

```ts
// lib/themes/types.ts
export type ThemeKey = 'neutre' | 'action' | 'comedie' | 'western' | 'horreur'
export const READY_THEMES: ThemeKey[] = ['neutre', 'action', 'comedie', 'western', 'horreur']

export interface ThemeDef {
  key: ThemeKey
  label: string                                  // « Action »
  nav: Partial<Record<NavKey, string>>           // annexe B.1
  navCourt: Partial<Record<NavKey, string>>      // libellés courts de la barre du bas du téléphone (annexe B.1)
  vocab: Partial<Record<VocabKey, string>>       // annexe B
  levels: string[] | null                        // 12 noms de niveau, ou null (numéro seul)
  levelLabel: (level: number) => string          // « Niveau 6 », « Étage 06 », « Emploi 06 · Petit rôle », « Rang 06 · Déserteur », « 06 · Celui qui a entendu un bruit »
  expUnit: string                                // 'EXP' | 'rappels' | '$'
  weekLabel: (w: { saison: number; semaine: number; total: number }) => string   // « SEMAINE 01 / 04 — ACTION », « ACTE II / IV — COMÉDIE », « TERRITOIRE 03 / 04 — WESTERN », « SEMAINE 04 / 04 — HORREUR »
  weekCourt: (w: { saison: number; semaine: number; total: number }) => string   // puce du téléphone : « 03 / 04 », en Comédie « II / IV » (§11.11)
  repliques: Partial<Record<RepliqueKey, string>> // répliques propres au thème, sans équivalent neutre (§14.4, annexe B.3)
  citations: string[]                            // citations courtes tirées au sort (écriture manuscrite de T1, T8)
  eggs: ThemeEggId[]
  radioTrack: string | null                      // null tant que la piste n'existe pas
}
```

- `lib/themes/neutre.ts`, `action.ts`, `comedie.ts`, `western.ts` et `horreur.ts` exportent chacun un `ThemeDef`. Il contient des fonctions : on ne le passe **jamais** en propriété d'un composant serveur à un composant client ; on passe la **clé**, et le client importe lui-même `lib/themes/*`. Les composants (décor, comportements, chargement) sont déclarés à part dans `components/theme/registry.ts`, en `dynamic import`, pour que le neutre ne télécharge jamais les rideaux de la Comédie.
- `t(key, vars?)` renvoie, dans l'ordre : la correction faite dans l'admin (`theme_textes`), le libellé du thème actif, **sinon celui du neutre** : jamais de chaîne vide. Interpolation `{n}`, `{pseudo}`, `{titre}`. Côté client `useT()`. `getT()` côté serveur ne sert qu'aux métadonnées et aux messages renvoyés par les actions (§11.3).
- `levelLabel(level)` : au-delà du dernier nom, le dernier nom reste et le numéro continue (« Emploi 14 · Monstre sacré »).
- `formatExp(n)` : « 3 940 EXP », « 3 940 rappels » (espace fine insécable, `Intl.NumberFormat('fr-FR')`).

### 11.3 Le thème est posé côté serveur

- `lib/themes/resolve.ts`, fonction **pure et testée** (Vitest) :

```ts
resolveTheme({ now, cfg, weeks, previewCookie, isAdmin }) → {
  key: ThemeKey,                 // ce qu'on affiche
  real: ThemeKey,                // ce qu'on afficherait sans aperçu (sert aux œufs)
  source: 'apercu' | 'force' | 'planning' | 'defaut',
  week: { saison: number; semaine: number; total: number; theme: string } | null
}
```
  Ordre : aperçu admin (cookie valide **et** admin) → `theme_mode = force` (si `theme_force` est prêt, sinon neutre) → semaine du planning qui couvre `now` (si son thème est prêt) → `neutre`. `week` est rempli dès qu'une semaine couvre `now`, même si le thème affiché est neutre ou forcé. `total` = nombre de semaines de cette saison dans le planning.
- `getSeasonWeeks()` : lecture de `season_weeks` en cache (`unstable_cache`, étiquette `season-weeks`, 1 h). La comparaison avec la date se fait **à chaque requête**, hors du cache : la bascule a lieu pile le lundi à 0 h.
- `app/layout.tsx` : `<html lang="fr" data-theme={key}>`, calculé au rendu serveur. **Aucun flash** de neutre au chargement.
- Zones toujours neutres : `app/admin/layout.tsx` et `/videoclub` enveloppent leur contenu dans `<div data-theme="neutre">` (la barre du haut garde le thème). Les jeux (`/labo/**`, `/clippy-revanche`, `/tamagotchi`) ne sont pas modifiés : ils utilisent les variables gelées et ont leurs propres couleurs ; le décor et les comportements de thème y sont simplement coupés (§11.6).
- Si `season_weeks` n'existe pas encore (M3 pas passée), le site reste neutre, sans erreur.
- **Un seul thème à l'écran, toujours.** Dans Next, le layout racine n'est pas recalculé quand on clique sur un lien : `<html data-theme>` et le fournisseur client gardent le thème du dernier chargement complet, alors qu'une page serveur recalculerait le thème à chaque requête. Pour ne jamais mélanger deux thèmes : **les pages ne choisissent pas le thème côté serveur**. Les libellés et les variantes de mise en page se décident côté client, avec la clé du fournisseur (`useTheme()`), dans les composants clients qui affichent les pages (les variantes lourdes sont chargées à la demande).
- **Données propres à un thème** (films du genre de la semaine, trafic du forum sur 7 jours, dernier message par sujet, films de la watchlist, créations…) : la page serveur charge ce dont **toutes** les variantes ont besoin (c'est léger), ou le composant client le demande par une action serveur. **Aucune page n'appelle `resolveTheme` pour décider quoi charger.**
- **Bascule du lundi** : le fournisseur reçoit aussi l'instant de la prochaine bascule (lundi 0 h Paris). À cet instant, il appelle `router.refresh()` : Next recalcule tout l'arbre, layout compris, sans démonter les composants ; un œuf en cours n'est pas interrompu.
- **Bouton de l'admin** : l'admin qui clique voit le changement tout de suite (`refresh()` dans l'action). Les autres le voient à leur prochain chargement complet de page, ou à la prochaine bascule.

### 11.4 L'aperçu de l'admin

- Action serveur `setThemePreview(key | null)` (admin seulement) : cookie `cm_theme_apercu`, `httpOnly`, `sameSite: 'lax'`, 8 heures. Puis `refresh()`.
- Tant que l'aperçu est actif, un bandeau fin s'affiche en haut, pour l'admin seul : « Aperçu : Comédie — visible par toi seul · Quitter l'aperçu ».
- En aperçu, les œufs de thème **jouent leurs effets** (pour les tester) mais **ne s'enregistrent pas** ; un toast le dit.
- **Tester sans attendre.** Plusieurs comportements dépendent de l'heure, d'un délai ou du hasard (la mouche, le ballon, l'apparition, la forme, l'heure du duel). Le bandeau d'aperçu reçoit un menu **« Tester ▾ »**, pour un admin seulement, sur les pages du site (jamais dans `/admin`), quand le thème affiché a des comportements testables :
  - Western : « Faire venir la mouche », « Jouer la clôture du duel » (l'effet sur le duel affiché, sans le fermer), « Ouvrir une page introuvable » (lien vers une adresse qui n'existe pas) ;
  - Horreur : « Faire monter le ballon », « Faire venir l'apparition » (sans clic, elle va jusqu'au sursaut), « Faire apparaître la forme », « Jouer la possession », « Jouer Tourner en rond ».

  Chaque entrée émet `cm:tester` avec l'identifiant ; le comportement joue **tout de suite**, sans délai, sans fenêtre horaire, sans limite par jour, sans la carte « prévenu » (§16.8), mais avec la variante « réduire les animations » si elle est active. Un test n'enregistre jamais d'œuf et ne touche pas aux compteurs du jour. Hors aperçu, quand le thème réel est le Western ou l'Horreur, le même menu est un petit bouton « Tester ▾ » en bas à droite, au-dessus du bouton Discord, pour les admins seulement ; au téléphone, il est dans le tiroir.

### 11.5 Feuilles de style et polices des thèmes

- `app/styles/themes/action.css`, `comedie.css`, `western.css` et `horreur.css` : les blocs de jetons de l'annexe A (sélecteurs `[data-theme="action"]`, `[data-theme="comedie"]`, `[data-theme="western"]`, `[data-theme="horreur"]`), importés dans le layout **après** `tokens.css`. Rien d'autre dedans : les décors ont leurs modules CSS, chargés avec leurs composants.
- Polices des thèmes (`next/font/google`, `preload: false`, variables posées sur `<html>`) : Action → Saira Condensed (700, 900). **Cette police n'existe pas en italique chez Google** : demander `style: 'italic'` fait échouer le build. On charge le romain, et `font-style: italic` laisse le navigateur l'incliner (ne désactive pas `font-synthesis`). Comédie → Anton (400), Oswald (400 à 700), Lora (400, 500, 600 + italique), Courier Prime (400, 700), Playfair Display (500, 700, 900 + italiques), Caveat (600). Western → Rye (400, pas d'italique), Alfa Slab One (400), Bitter (400, 500, 600, 700 + italique 400, 600), Courier Prime (déjà chargée pour la Comédie ; ajoute l'italique 400). Horreur → Cormorant Garamond (400, 500, 600 + italiques), Spectral (300, 400, 600 + italique 400 ; pas de police variable : graisses obligatoires), IBM Plex Mono (400, 500), Reenie Beanie (400 ; jeu `latin` seulement : il contient les accents français). Variables : `--ff-rye`, `--ff-alfa`, `--ff-bitter`, `--ff-cormorant`, `--ff-spectral`, `--ff-plex`, `--ff-reenie`. Toutes vérifiées dans la version de Next installée. Le navigateur ne télécharge une police que si un texte l'utilise.

### 11.6 Décor et comportements

- `components/theme/ThemeFrame.tsx` (client) : charge le décor du thème (`dynamic import`), dans un calque fixe à `--z-decor` (0), premier enfant de `#site`, donc **derrière** le contenu (§8.4), entièrement en `pointer-events: none`.
- **Les éléments interactifs du décor ne sont pas dans ce calque** (un enfant d'un calque à 0 ne peut pas passer au-dessus du contenu) : le rail d'étages de l'Action a son propre calque fixe à z-index 2, dans la marge de gauche, sous la barre ; la rampe de la Comédie (et son ampoule verte) est rendue à la fin de `main`, par un emplacement que fournit `ComedieFrame`.
- `components/theme/ThemeBehaviors.tsx` : charge les comportements du thème. Chaque comportement déclare s'il respecte « réduire les animations » et s'il dépend du réglage « Œufs du thème ».
- **Routes sans décor ni comportement** : `/admin*`, `/videoclub`, `/mentions-legales`, `/confidentialite` (typographie du thème seulement), `/labo/**`, `/clippy-revanche`, `/tamagotchi`. **`/auth*`** : décor oui, comportements non.
- Les easter eggs passent au-dessus : décor à 0, contenu sans z-index, rail à 2, trous de balle à 90 (§15.4), effets à `--z-fx` (450), sursaut à 480, fenêtres à 500, œufs à partir de 891. Tous les calques de thème portent l'attribut `data-calque-theme`.
- **`ecranOccupe({ seuilZ, part })`**, dans `lib/themes/ecran.ts` (les calques des thèmes portent l'attribut `data-calque-theme` et ne comptent jamais) : vrai si (a) `body` porte un `style.cursor` en ligne, ou (b) un élément `position: fixed` de z-index ≥ `seuilZ` couvre plus de `part` de la fenêtre, ou (c) le focus est dans un `input`, `textarea`, `select` ou `[contenteditable]`, ou (d) `document.hidden`. La voiture de l'Action (§13.6) l'utilise avec 800 et 1/2 (écris-la ici dès cette phase, la voiture s'en servira en phase 7). Les nouveaux comportements appellent `ecranOccupe({ seuilZ: 500, part: 0.3 })` : les fenêtres du site (z-index 500) comptent aussi.
- **Stockage** : tout accès à `localStorage` et `sessionStorage` est protégé par `try/catch`. Stockage indisponible : le ballon et l'apparition ne viennent pas (on ne pourrait pas tenir leurs limites par jour) ; les autres comportements marchent sans mémoire.
- **`useTempsVisible()`** : le temps passé sur le site pendant la visite, page visible, en secondes. Compteur dans `sessionStorage` (`cm_visite_s`), avancé chaque seconde quand `document.visibilityState === 'visible'`. Une visite = la vie de l'onglet.
- **`parisJour(d, debut)`** (§6.1) donne le « jour » de Paris qui commence à `debut` heures (l'Horreur compte ses jours à partir de 4 h).
- **Routes sans comportement** : celles de la liste plus haut. Aucun comportement ne démarre tant que `ecranOccupe(…)` est vrai : il attend (nouvel essai toutes les 5 s, sauf l'apparition, qui a ses propres règles, §16.8).

### 11.7 Les réglages du joueur et la radio

- M3 ajoute à `profiles` : `radio_music` (booléen, faux), `radio_volume` (0–100, 40), `theme_eggs` (booléen, vrai), et, pour l'Horreur, `sursauts` et `son_horreur` (booléens, vides tant que le joueur n'a rien choisi : le code applique alors « activé », §16.8) ; il donne au joueur le droit de modifier ces cinq colonnes. Visiteurs : `localStorage` (`cm_reglages`), lecture protégée par `try/catch`.
- **La radio** existe dans les quatre thèmes (pas en neutre, pas de piste neutre). Ordinateur : fermée, un petit poste de 48 px en bas à gauche (`--z-fab`) ; ouverte, un panneau d'environ 330 px. Téléphone : une ligne « La radio » dans le tiroir, qui ouvre le même panneau.
- Trois réglages : **Musique** (grisée avec la mention « Piste à venir » tant que `radioTrack` est `null` ; quand une piste existera : arrêt par défaut, un seul `<audio>` pour tout le site, en boucle), **Volume** (0 à 10, stocké 0 à 100 ; grisé sans piste), **Œufs du thème** (marche / arrêt ; arrêt = aucun œuf de thème ne se déclenche et aucun effet d'œuf ne tourne ; les 25 œufs existants ne sont pas concernés). L'Horreur ajoute un quatrième réglage, **Sursauts**, garde le volume actif même sans piste, et a sa case « Son » en bas à gauche (§16.6, §16.8).
- L'habillage de la radio est propre à chaque thème (phases 7 à 10). Enregistrement par action serveur, validé.

### 11.8 Les œufs de thème : mécanique commune

- `lib/themes/eggs.ts` : identifiant, numéro fixe, thème, nom, famille, texte de condition, limite (« sur ordinateur », « pendant la semaine Comédie »). Liste en annexe C.
- Côté client, `useThemeEgg(id)` dit si l'œuf est **armé** : thème réel = thème de l'œuf (ou aperçu admin : effets seulement), réglage « Œufs du thème » activé, œuf absent de `eggs_disabled`, route autorisée, et, pour les œufs animés, pas de « réduire les animations » si l'œuf l'exige.
- **Enregistrement** : action serveur `discoverThemeEgg(id)`. Elle refuse si l'id n'est pas un œuf de thème, si le thème **réel** (sans aperçu) n'est pas le sien, si l'œuf est coupé, si le joueur a coupé les œufs du thème. Sinon, elle écrit dans `discovered_eggs` **avec le client service** et vide `user:<id>:eggs`. Visiteur : l'effet joue, rien n'est enregistré, et un toast propose de se connecter.
- **Verrou (M3)** : aujourd'hui un joueur peut écrire n'importe quelle ligne dans `discovered_eggs` depuis son navigateur, ce qui contournerait ces vérifications (et ferait apparaître les familles de thème). M3 retire à `anon` et `authenticated` le droit d'écrire dans cette table. C'est possible parce que la phase 1B (§7.3) a déjà fait passer toutes les écritures d'œufs par le client service ; vérifie-le avant de demander M3.
- Les œufs déclenchés côté serveur (La hyène) passent par la même vérification.
- Œufs #26 à #37 (annexe C). Une vérification de plus, côté serveur, pour **#33** : un duel a été fermé il y a moins de 2 minutes (`duels.closed_at`), sinon refus. Les autres ne peuvent pas être vérifiés par le serveur ; l'enjeu est faible (§6.4).
- **`constaterClotureDuel(duelId)`**, action serveur commune au Western (W4, #33) et à l'Horreur (H4) : appelée par `/duels` quand l'échéance `closes_at` du duel affiché passe pendant que la page est ouverte. Elle exécute `closeDueDuels()` (§6.2, hors rendu : `revalidatePath` permis) et renvoie le duel fermé (vainqueur, voix), y compris s'il a été fermé par quelqu'un d'autre il y a moins de 2 minutes. Si le duel n'est pas encore échu côté serveur (horloges décalées), elle répond « pas encore » : la page réessaie 2 s plus tard, 3 fois au plus.

### 11.9 La galerie des œufs

- Nouvelles familles, après « Succès » : « Thème — Action » (#26, #27), « Thème — Comédie » (#28 à #30), « Thème — Western » (#31 à #33) et « Thème — Horreur » (#34 à #37).
- Une famille de thème est **visible** si une semaine du planning avec ce thème a déjà commencé, ou si ce thème est le thème réel en ce moment, ou si au moins un joueur a trouvé un de ses œufs. Ensuite elle reste. Le total affiché est celui des familles visibles, jusqu'à 37. L'admin voit toujours tout.
- Chaque carte de thème ajoute une ligne : « Trouvable cette semaine » ou « Revient avec la semaine Action », et sa limite (« sur ordinateur »).

### 11.10 Retrait de l'ancien système

Après avoir vérifié qu'aucun autre fichier ne les importe : supprime `components/WeeklyTheme/WeeklyThemeProvider.tsx`, `components/WeeklyTheme/ThemeOverlay.tsx`, `app/weekly-theme.css`, `lib/weeklyTheme.ts`, le paramètre d'adresse `?theme=`, les curseurs `public/cursors/cursor-*.svg` des anciens thèmes, et la section « Thèmes hebdomadaires — Preview » de l'admin (qui modifiait directement les classes de `body`). Elle est remplacée tout de suite par un bloc provisoire « Thème » (mode, thème forcé, aperçu, planning) qui appelle les actions serveur de §12.3 ; la phase 6 lui donne sa forme définitive.

### 11.11 La semaine et la puce

- Puce de la barre du haut : `theme.weekLabel(week)` quand une semaine du planning couvre aujourd'hui (neutre : « SEMAINE 1 / 4 · SAISON 02 ») ; sinon les formules de la phase 2.
- Au téléphone (§8.9, point 9), la puce prend la forme courte `theme.weekCourt(week)` (« 03 / 04 », en Comédie « II / IV ») ; hors planning, « J-{n} » avant le lancement et « S{NN} » pendant la saison (numéro de saison sur deux chiffres). La forme longue reste en tête du tiroir.
- `/semaine` reçoit une **bande de saison** tirée du planning : les semaines passées, celle en cours mise en avant, les suivantes, avec leur genre et leurs dates. Les thèmes l'habillent (les quatre phases de l'opération, la pièce en quatre actes).

### 11.12 Critères d'acceptation de la phase 5

- Tests Vitest de `resolveTheme` : aperçu non-admin ignoré, forcé prioritaire, bascule exacte le lundi 0 h Paris (été et hiver), thème non prêt → neutre, table vide → neutre.
- Par le bloc provisoire « Thème » de l'admin (qui vide les caches) : une semaine Comédie qui couvre aujourd'hui fait passer le site entier en Comédie (couleurs, polices, libellés) **sans redéploiement et sans flash** ; l'admin et `/videoclub` restent neutres. (Une ligne insérée à la main en SQL n'apparaît qu'après l'expiration du cache, jusqu'à 1 h.)
- Mode imposé sur Action : tout le site passe en Action, quel que soit le planning.
- Bascule en Western ou en Horreur : couleurs, polices et libellés du thème partout (décors, comportements et œufs arrivent en phases 9 et 10).
- Cliquer sur des liens après une bascule ne mélange jamais deux thèmes (couleurs d'un thème, libellés de l'autre).
- Aperçu : seul l'admin le voit ; un autre compte, dans un autre navigateur, voit le thème réel.
- `grep -rn "weekly-theme\|WeeklyTheme\|getCurrentTheme" app components lib` ne trouve plus rien.
- Curseurs (§11.13) : la voiture en Action ; la chaussure noire en Comédie et le colt en Western, avec leurs états de survol et de clic ; le curseur normal en Horreur, avec la lampe. Vérifié sur ordinateur (Chrome, Edge, Firefox, Safari) ; un champ de texte garde le curseur texte ; quand Clippy cache le curseur, aucun curseur de thème ne réapparaît.


### 11.13 Les curseurs des thèmes

Choix de The Legendre (10 octobre). Les images de la Comédie et du Western sont **fournies**, dessins originaux, dans `docs/refonte-v2/curseurs/` (PNG 32 × 32, `@2x` en 64 × 64, et les SVG sources dans `sources/`) : copie-les dans `public/cursors/`, ne les redessine pas. `docs/refonte-v2/curseurs/apercu.png` les montre.

| Thème | Normal | Survol d'un lien ou d'un bouton | Clic (150 ms) | Point chaud (image 32 × 32) |
|---|---|---|---|---|
| Neutre | curseur du système | main du système | — | — |
| Action | **la voiture** (`action-car-0.png` à `-7.png`, déjà dans le dépôt, §13.6) | la voiture | la voiture | 16 16 |
| Comédie | `comedie-chaussure.png` : la chaussure noire, bout pointé vers la gauche (*Le Grand Blond avec une chaussure noire*) | `comedie-chaussure-survol.png` : un éclat doré au bout | `comedie-chaussure-appui.png` : la chaussure tape du bout | 2 12 |
| Western | `western-colt.png` : colt, canon vers le haut à gauche | `western-colt-survol.png` : chien armé, reflet | `western-colt-appui.png` : recul et fumée | 2 2 |
| Horreur | **curseur du système** : c'est la lampe qui suit la souris (§16.4) | main du système | — | — |

1. **Jetons** `--cursor`, `--cursor-survol`, `--cursor-clic` (annexe A). Pour la Comédie et le Western, chacun s'écrit deux fois, l'image simple d'abord, puis la version haute définition : `cursor: url("/cursors/x.png") 2 12, auto; cursor: image-set(url("/cursors/x.png") 1x, url("/cursors/x@2x.png") 2x) 2 12, auto;`. Un navigateur qui ne comprend pas la seconde ligne garde la première : c'est voulu. Vérifie le rendu dans Chrome, Edge, Firefox et Safari.
2. **Où** : `#site` reçoit `cursor: var(--cursor)` ; les éléments cliquables de `#site` (`a`, `button`, `[role="button"]`, `summary`, `label[for]`, `select`, `[tabindex]:not([tabindex="-1"])`) reçoivent `var(--cursor-survol)` ; les champs de texte (`input` de texte, `textarea`, `[contenteditable]`) gardent `cursor: text`, les éléments `:disabled` `not-allowed`. Rien sur `body`. Les zones forcées en neutre (`data-theme="neutre"` : admin, vidéoclub, routes des jeux) retombent d'elles-mêmes sur le curseur du système.
3. **Le clic** (Comédie, Western) : un écouteur `pointerdown` (bouton principal, `pointerType === 'mouse'`) pose `data-clic` sur `#site` pendant 150 ms ; pendant ce temps, `var(--cursor-clic)` s'applique à `#site` et à ses descendants, sauf les fenêtres des œufs (`.egg-legacy`). Ne retarde jamais le clic.
4. **La voiture de l'Action** garde ses propres règles (§13.6) : elle est le curseur de l'Action en permanence sur ordinateur, ses 8 orientations sont posées par le script de l'œuf, et le crash ne joue que si l'œuf est armé.
5. **Les easter eggs gagnent** : même garde que la voiture (§13.6). Dès que `body` porte un `style.cursor` en ligne (Clippy) ou qu'un œuf prend l'écran, `#site` reçoit `data-sans-curseur` et aucune règle de curseur du thème ne s'applique. Un seul `MutationObserver` pour la voiture et les curseurs.
6. **Toucher** : aucun curseur, aucun état. « Réduire les animations » : les curseurs restent (ce sont des images), le clic aussi.

---
## 12. Phase 6 — L'admin, refaite

Branche `refonte-v2/phase-6`. Pas de nouvelle migration (M4 est passée en phase 5).

**Constat.** `app/admin/AdminClient.tsx` fait 2 206 lignes, 377 `style={{…}}`, une seule page qui charge tout d'un coup (tous les films avec leur synopsis, tous les joueurs **avec tous leurs visionnages et votes**, dix duels…). Vingt sections empilées sans ordre, des réglages qui n'ont aucun effet (D6), des choix limités à la saison 1 (D3), un aperçu de thème qui ne change que le navigateur de l'admin. The Legendre la trouve encombrée et obsolète ; il veut **modifier le site en direct depuis l'admin** au lieu de repasser par Claude Code.

### 12.1 Principes

1. **Une page par sujet**, chacune ne charge que ses données (composants serveur). Sous-menu à gauche sur ordinateur, liste déroulante en haut au téléphone.
2. **Tout se voit tout de suite.** Chaque enregistrement passe par une action serveur qui valide, écrit, vide les bons caches (`updateTag` pour `site-config` et `season-weeks`, clés Redis, `revalidatePath` des pages concernées), puis `refresh()`. Message de retour : « Enregistré — en ligne. » avec un lien « Voir sur le site ». Pour le thème : « Chacun le verra au prochain chargement de page. »
3. **Un formulaire modifié mais pas enregistré se voit** : barre d'enregistrement collante, avertissement si on quitte la page.
4. **Les actions irréversibles demandent de taper une confirmation** (supprimer un joueur : son pseudo ; nettoyer tous les duels : « SUPPRIMER » ; clôturer la saison : « CLÔTURER LA SAISON {N} »). Les autres suppressions : une confirmation simple.
5. **Chaque action admin est inscrite au journal** (`admin_log` : qui, quoi, détail, quand).
6. **Neutre, dense, lisible**, composants de `components/ui/`, aucun emoji, aucun `style={{…}}` statique. Utilisable au téléphone.
7. **On réutilise les actions serveur existantes** (elles marchent), en corrigeant leurs défauts ; on n'en réécrit pas sans raison.
8. L'admin n'affiche que des réglages **qui ont un effet**. Les textes d'œufs aujourd'hui sans effet (`joker_phrase`, `fightclub_gameover`, `bond_line` : lus mais jamais affichés par les œufs) sont retirés de l'écran, pas de la base, et signalés dans le compte rendu (les brancher demanderait de toucher aux œufs).

### 12.2 Les pages

`app/admin/layout.tsx` vérifie `is_admin` côté serveur (redirection sinon), enveloppe tout dans `<div data-theme="neutre">` et affiche le sous-menu avec des compteurs (demandes en attente, file d'attente des films, duels à approuver).

| Page | Route | Contenu |
|---|---|---|
| **Tableau de bord** | `/admin` | « À traiter » (seulement ce qui n'est pas vide, chaque ligne mène à sa page) : demandes d'inscription, dépassements de limite, signalements, films 18+ à confirmer, demandes d'ajout manuel, duels à approuver. « Le site maintenant » : thème affiché et sa source (planning, forcé, aperçu) avec un bouton **Changer de thème**, saison et semaine, film de la semaine, duel en cours et son échéance, mode du vidéoclub, lien du direct. « Dernières modifications » : les 10 dernières lignes du journal |
| **Thème & saison** | `/admin/theme` | §12.3 |
| **Séances** | `/admin/seances` | Film de la semaine : actuel + « Retirer » ; choisir un film par **recherche** (plus de liste de 466 options) dans le catalogue ouvert, avec l'horaire (prérempli « {FDLS_JOUR} soir à {FDLS_HEURE} » depuis les réglages) ; archives récentes (suppression d'une archive). Duels : le duel en cours (films, voix, pourcentages, échéance **modifiable**, « Clôturer maintenant ») ; nouveau duel au hasard parmi les films éligibles (catalogue ouvert, moins de `seuil_majority` % de joueurs l'ont vu) → en attente d'approbation ; nouveau duel manuel (deux recherches) → publié ; les 20 derniers duels avec leur état ; règle d'égalité (meilleure note / tirage au sort) ; zone dangereuse « Supprimer tous les duels ». Lien du direct : URL (https seulement) et libellé du bouton, rangés dans `site_prive` (§12.4) |
| **Joueurs** | `/admin/joueurs` | Recherche par pseudo ; liste (pseudo, saison, EXP, films vus, votes, admin) avec les **nombres** (`watched(count)`, `votes(count)`), pas les listes ; ajuster l'EXP (montant de −1 000 à 1 000, motif facultatif, inscrit au journal) ; droits admin (confirmation) ; supprimer (taper le pseudo). Participants de la saison (dans le marathon / hors marathon, « Admettre »). Demandes d'inscription en cours de saison (cette saison / saison prochaine / refuser). Dépassements de la limite quotidienne (accepter / refuser). Statistiques d'avant le marathon (à la demande) |
| **Films** | `/admin/films` | File d'attente en haut, si elle n'est pas vide : demandes d'ajout manuel, films 18+ à confirmer (Normal / 18+ / 18+ Étrange), signalements. Catalogue : recherche, filtres (saison, sans affiche, 18+, étrange), 50 par page côté serveur ; par film : affiche TMDB, envoyer une affiche, modifier (saisons 1 à N + 1), supprimer. Outils du catalogue : affiches manquantes, vérifier les liens cassés puis réparer, affiches françaises (prévenir qu'elles **écrasent** les existantes), synopsis TMDB, scan 18+ TMDB, tester la certification d'un film. Chaque modification vide `films:list` et revalide `/films` |
| **Contenu** | `/admin/contenu` | Accueil : `accueil_accroche` (avec `{FILMS}`), `accueil_texte`, `accueil_sous_titre` (description du site pour les moteurs de recherche), avec un aperçu du titrage. Annonces : créer, **modifier**, épingler / désépingler, supprimer (vide `news:latest`). Règles : l'éditeur actuel (`RulesEditor`), restylé, et un lien vers `/regles`. **Textes des thèmes** : pour chaque thème, la liste de ses libellés (`vocab`, `nav`, et les libellés courts `navCourt` sous les clés `court.<clé>`), de ses répliques (`repliques`) et de ses citations (`citations`, une par ligne), avec la valeur du code et un champ pour la corriger, enregistrés dans `theme_textes` ; bouton « Revenir au texte d'origine » ; les libellés de sécurité (annexe B.2, liste « Jamais habillés ») ne sont pas modifiables. Rattrapages : ajouter, supprimer, par niveau. Forum : liste des sujets, supprimer (sauf les sujets sociaux) |
| **Œufs** | `/admin/oeufs` | Tableau de tous les œufs : numéro, nom, famille, déclencheur en une ligne, nombre de joueurs qui l'ont trouvé, **interrupteur** (sauf les 4 « Succès », calculés). Les œufs de thème sont rangés sous leur thème. Textes des œufs, chacun à côté de son œuf (seulement ceux qui ont un effet). Clippy : répliques personnalisées (l'écran actuel), outils God Mode (préciser « ton navigateur seulement »). Liens Tipiak : le bloc actuel, déplacé tel quel. Action : seuil de vitesse de la voiture (`action_car_speed`, en px/s, avec une phrase d'explication) |
| **Réglages** | `/admin/reglages` | Saison : numéro, libellé, date et heure de lancement (**heure de Paris**, écrit à côté du champ). Séances : jour (liste Lundi… Dimanche) et heure (HH:MM) du duel et du film de la semaine, enregistrés dans les clés actuelles au format actuel (« Mercredi », « 20h30 ») pour ne rien casser. EXP : film, film de la semaine, vainqueur du duel, vote, bonus 48 h. Seuil de majorité (%), limite par jour, limite après accord |
| **Outils** | `/admin/outils` | État : cache Redis actif / absent, clés TMDB, OMDB, service présentes / absentes, version déployée (`VERCEL_GIT_COMMIT_SHA` raccourci). Diagnostic de la base (corrigé en D13). **Vider les caches** (`updateTag('site-config')`, `updateTag('season-weeks')`, clés Redis connues). Lien vers l'aperçu du Tamagotchi. Journal complet (50 dernières lignes). Zone dangereuse : clôture de la saison (confirmation tapée) |

**Correspondance, pour ne rien perdre** : chaque bloc de l'admin actuelle a une place.

| Aujourd'hui (`AdminClient.tsx`) | Demain |
|---|---|
| Bandeau 18+, dépassements de limite, demandes d'inscription, signalements (en tête de page) | Tableau de bord (compteurs) + Joueurs / Films |
| Gestion des duels, Film de la semaine | Séances |
| Joueurs, Participants — saison actuelle, Stats pré-marathon | Joueurs |
| Demandes d'ajout manuel, Validation 18+ (scan, test de certification), Films (affiches, synopsis, modifier, supprimer) | Films |
| Diagnostic de la base | Outils |
| News & annonces, Rattrapage cinéma, Forum — topics | Contenu |
| Configuration du site : marathon, séances, EXP & seuils | Réglages |
| Configuration du site : phrase d'accueil, règles du jeu | Contenu |
| Configuration du site : textes des easter eggs | Œufs |
| Tipiak, Clippy — répliques, Clippy — God Mode (×2) | Œufs |
| Thèmes hebdomadaires — Preview | Thème & saison |
| Clôture de saison | Outils |

### 12.3 Thème & saison — le bouton

C'est **le** bouton demandé par The Legendre.

1. **État actuel**, en une phrase en haut : « En ce moment : Comédie — planning, semaine 2 / 4 (du 12 au 18 octobre). » ou « En ce moment : Action — imposé depuis l'admin. »
2. **Deux modes**, en gros : « Suivre le planning » / « Imposer un thème ».
3. **Les cartes de thème** : Neutre, Action, Comédie, Western, Horreur. Chaque carte montre le nom, trois pastilles de couleur, un échantillon de titrage et deux boutons :
   - **« Mettre tout le site en Comédie »** → fenêtre de confirmation (« Tout le site passe en Comédie. Chacun le verra au prochain chargement de page. ») → `theme_mode = force`, `theme_force = comedie` ;
   - **« Aperçu pour moi »** → cookie d'aperçu (§11.4), rien ne change pour les autres.
   Et, en mode imposé, un bouton « Revenir au planning ».
4. **Le planning de la saison N** : une ligne par semaine (numéro, **lundi** de début avec le jour écrit en toutes lettres et une erreur si ce n'est pas un lundi, thème, dates « du lun. 5 au dim. 11 oct. »). Ajouter une semaine (propose le lundi qui suit la dernière), supprimer une semaine, enregistrer tout d'un coup. Validation : lundis uniques, numéros uniques de 1 à 12, thèmes connus.
5. **Vidéoclub** : Caché / Bientôt.

Actions serveur (admin seulement, validées, journalisées) : `adminSetThemeMode`, `adminSetThemeForce`, `setThemePreview`, `adminSaveSeasonWeeks`, `adminSetVideoclubMode`.

### 12.4 Le lien du direct

Les séances quittent Discord pour une plateforme de diffusion privée (pas encore choisie).

- **Rangement** : `live_url` et `live_label` vont dans la table `site_prive` (M4), que seule la clé service peut lire. Pas dans `site_config`, qui est lisible par n'importe qui avec la clé publique du site.
- **Affichage**, de **30 minutes avant à 3 heures après** chaque séance (jours et heures des réglages, heure de Paris) : « En direct » dans la barre du haut pour tout le monde ; le **lien**, lui, n'est envoyé qu'aux joueurs connectés (le serveur l'ajoute au rendu seulement pour eux). Bouton « {live_label} » (défaut : « Rejoindre la séance ») dans la bande d'état de l'accueil neutre, et dans les héros de l'Action (A1), de la Comédie (T1), du Western (W1) et de l'Horreur (H1). Lien externe, `rel="noopener noreferrer"`.
- Rien ne s'affiche si `live_url` est vide.

### 12.5 Critères d'acceptation de la phase 6

- Chaque ligne du tableau de correspondance est vérifiée à la main sur l'aperçu.
- Cliquer « Mettre tout le site en Comédie » : un autre compte, dans un autre navigateur, voit la Comédie en rechargeant. « Revenir au planning » : il revoit le thème du planning.
- Changer « EXP vote » à 3 : le prochain vote rapporte 3.
- Couper « Bond » : taper « bond » ne fait plus rien ; le rallumer : ça remarche.
- Le journal liste ces quatre actions avec leur auteur.
- `/admin` charge sans la liste complète des films ni des visionnages (vérifier les requêtes).

---
## 13. Phase 7 — Thème Action

Branche `refonte-v2/phase-7`. Maquettes : `maquettes/action/theme-action.html` (le CSS exact) et `maquettes/action/A0-…jpg` à `A19-…jpg`. Jetons : annexe A. Libellés : annexe B.

### 13.1 Le parti pris

Trois films, trois couches. **Heat** donne la structure : froid, précis, professionnel. **Die Hard** donne l'architecture verticale : la tour, les étages, le verre brisé. **Mad Max: Fury Road** donne la surface : chrome, chaleur, orange et cyan.

### 13.2 Couleurs, lettres, formes

- Deux accents qui ne se mélangent jamais : **orange sodium** (`--accent` #FF6B1F) pour tout ce qui agit (boutons, jauges, étage actif, film de la semaine) ; **cyan** (`--info` #17A2C9) pour tout ce qui informe (horaires, fréquences, données). Le rouge (`--bad`) seulement pour le danger réel : supprimer, quitter, erreur. Le fond n'est pas noir : c'est un bleu de béton nocturne.
- **Saira Condensed 900 italique, en capitales** pour les titres, la barre et les boutons. **JetBrains Mono** pour chaque chiffre, horaire et donnée. **Newsreader** seulement pour les synopsis et les textes longs. Rien d'autre.
- **Rayon zéro partout.** Boutons, jauges, compteurs et pastilles sont **biseautés à −11°** (`transform: skewX(var(--skew))` sur le cadre, l'inverse sur le texte) : c'est la signature, on la reconnaît en une demi-seconde. Les panneaux importants portent quatre rivets aux angles.
- Deux textures superposées sur la page : trame chaude en diagonale à 3 % (`--tex`) et grain fin à 5 % (`--grit`).
- Le **chrome** (dégradé métallique à 5 arrêts) est réservé au nom du site et aux titres de page. Nulle part ailleurs.
- Mouvement : 120 ms, courbe sèche, aucun rebond. Le bouton principal donne une **secousse de 2 px** au clic (coupée avec « réduire les animations »).
- Curseur : **la voiture** (§13.6), en permanence sur ordinateur. Plus de réticule : `action-reticle.png` n'est plus utilisé (supprime-le s'il ne sert nulle part ailleurs). Règles communes à tous les thèmes : §11.13.

### 13.3 Les niveaux et le vocabulaire

- Niveaux = **étages** : « ÉTAGE 06 ». Pas de nom par niveau, le numéro suffit : c'est la tour de Die Hard. Au-delà du 12ᵉ, l'étage continue (« ÉTAGE 14 ») et le rail reste en haut.
- EXP reste EXP (représentée comme une jauge de pression).
- Rattrapages : Débutant → **Recrue**, Intermédiaire → **Opérateur**, Confirmé → **Vétéran**. Mêmes listes que dans tous les thèmes.
- Tout le reste : annexe B.

### 13.4 Le décor (`components/theme/action/ActionFrame.tsx`)

| Élément | Où | Détail |
|---|---|---|
| Brume orange | toute la page | halo radial chaud en haut à gauche, froid (cyan) en bas à droite |
| Traînées obliques | toute la page | `--tex` à 104° ; animation lente coupée par « réduire les animations » |
| Rail d'étages | à gauche, ordinateur ≥ 1100 px | 12 → 01, étage du joueur en orange « ▸06 », mot « ÉTAGE » vertical en bas ; visiteur : rail éteint. Interactif : 5 touchers = secours de Nakatomi (§13.7) |
| Bandeau de fréquence | sous la barre du haut, ≥ 769 px | « ● FRÉQUENCE 04 » (numéro de la semaine du planning, 2 chiffres) · dernier évènement de l'activité (heure en cyan, texte en capitales, montant) · à droite « {n} / {total} EN POSITION » : joueurs **actifs cette semaine** / joueurs de la saison (définitions en §9.1) |
| Fêlures de verre | héros de l'accueil, 404, erreurs | SVG fixe qui part d'un point d'impact ; purement visuel (`aria-hidden`) |
| Étalonnage des affiches | toutes les affiches du site | chaud d'un côté, froid de l'autre : calque dégradé orange → cyan en `mix-blend-mode: soft-light` au-dessus de l'image, dans le cadre de `Poster` (pas de filtre sur l'image elle-même) |

Téléphone et tablette (< 1100 px) : rail caché (l'étage passe dans la barre du haut, puce « ÉTAGE 06 »). Téléphone (≤ 768 px) : bandeau de fréquence caché aussi.

### 13.5 Les écrans

« Structure » = la mise en page change ; « habillage » = seuls jetons, libellés et composants changent. Pour chaque écran, suis la maquette ; les données sont les vraies.

| Écran | Route | Nom Action | Ce qui change |
|---|---|---|---|
| A1 | `/` | Accueil | **Structure.** Héros « opération » : ligne mono « HEURE H — {jour} {heure} · FACE-À-FACE {jour} {heure} » (jours et heures des réglages), titre du film de la semaine en chrome, ligne mono (année · réalisateur · genre · « {n} / {total} EN POSITION » : actifs cette semaine / joueurs de la saison, §9.1), boutons « Encaisser » (plein, biseauté) et « Voir la fiche » (filet, biseauté), le bouton du direct pendant sa fenêtre (§12.4), **chrono** mono orange jusqu'à la prochaine séance (« AVANT L'HEURE H »), fêlures. Dessous : journal radio (activité, heures en cyan) ; à droite l'étage et sa jauge (`exp` / prochain palier), le face-à-face en cours (J-n, deux affiches, pourcentage du film en tête), « REPÉRAGES — N EN COURS » (N = films des watchlists du joueur pas encore vus ; on montre les cinq premiers). États hors saison, sans film de la semaine, visiteur : ceux de la phase 3, habillés |
| A2 | `/films` | L'arsenal | Habillage. Grille intacte ; chiffres en jauges biseautées d'une seule couleur ; filtres en pastilles biseautées ; affiches étalonnées |
| A3 | fenêtre de fiche | La fiche | Habillage (le comportement de la fenêtre ne change pas). Ouverture en sas : en-tête orange plein « DOSSIER 047 — ARSENAL » (identifiant réel du film), panneau rivé, note en 10 segments biseautés, les trois onglets existants renommés « Infos / Où regarder / Fréquence » |
| A4 | `/duels` | Face-à-face | **Structure.** Les deux films se font face ; barres de vote en compteurs d'impact biseautés ; halo orange autour du gagnant provisoire ; chrono de clôture mono lu dans `closes_at` ; ligne « CLÔTURE {jour et heure de `closes_at`} — LE VAINQUEUR PASSE À {heure de séance} · +{EXP vainqueur} EXP » |
| A5 | `/classement` | Tableau de chasse | **Structure.** Un relevé, pas un podium : rang, étage, jauge de pression, total ; ta ligne marquée d'un filet orange à gauche |
| A6 | `/profil` | Fiche d'opérateur | **Structure.** Fiche de service (matricule « OP- » + 6 premiers caractères de l'identifiant, étage, plaques = badges) et **la tour** : 12 étages empilés, franchis en orange, l'actuel en pleine lumière |
| A7 | `/forum` | Fréquences | **Structure.** Un scanner : chaque sujet est un canal avec une fréquence (code décoratif stable tiré de l'identifiant du sujet, « 04.7 MHz »), un trafic en barres (messages des 7 derniers jours : 0 → 0 barre, 1-2 → 1, 3-5 → 2, 6-10 → 3, 11-20 → 4, plus de 20 → 5), son nombre de transmissions ; canal actif en orange, les autres en cyan |
| A8 | `/semaine` | L'opération | **Structure.** Plan sur 7 jours (lundi → dimanche de la semaine en cours) : les deux séances en « heures H » orange pleines, la clôture du duel en cyan, la fin du bonus 48 h ; en dessous les phases de la saison (bande de saison, §11.11) ; à droite les objectifs de la semaine et ce qu'ils rapportent (montants des réglages) |
| A9 | `/marathoniens` | L'équipe | **Structure.** Badges d'accès : matricule, étage, voyant « en position » si le joueur est actif cette semaine (§9.1) ; ton badge marqué du filet orange |
| A10 | barre | — | Catégories OPÉRATIONS, ARMURERIE, UNITÉ, CLASSIFIÉ ; barre en Saira capitales |
| A11 | `/notes` | Les relevés | Habillage. Note en 10 barres ; onglets « Meilleurs relevés » et « La casse » (après Le Rageux) |
| A12 | `/rattrapage` | L'entraînement | Habillage. Trois grades (§13.3) |
| A13 | `/watchlist` | Repérages | Habillage. Deuxième onglet : « Repérages de l'unité » (`/watchlist/public`). Renommer, Rendre privée, Supprimer restent littéraux |
| A14 | `/messages` | Transmissions | Habillage. La conversation se lit comme un journal radio : heure, émetteur, message. Bloquer / Débloquer littéraux |
| A15 | `/forum/[id]` | Un canal | Habillage. Chaque message : avatar, étage, heure ; « (toi) » ; Modifier / Supprimer littéraux |
| A16 | `/easter-eggs` | Dossiers classifiés | Habillage. Trouvé = « déclassifié » |
| A17 | `/auth` | Prendre le poste | Titre seulement ; réinitialisation : « Code d'accès perdu » ; formulaire littéral |
| A18 | par-dessus les pages | — | Bannières, fenêtre de 24 h, toasts, Discord, bandeaux 18+ : titres de l'annexe B (« Bienvenue dans l'unité », « Rejoindre l'opération en cours », « En attente du feu vert », « Accrédité — Saison {n} », toast « Encaissé — {titre} »), phrase d'origine ; chargement = **scan** (une ligne qui balaie l'écran, « ACQUISITION DU SIGNAL » en mono ; texte fixe avec « réduire les animations ») |
| A19 | radio | La radio de l'unité | Boîtier tactique noir, écran de fréquence orange, interrupteurs à levier |
| 404 | — | Étage 13 | Fêlures, texte neutre, lien retour |

### 13.6 Œuf #26 — La voiture (`theme-action-voiture`)

- **La voiture est le curseur de l'Action**, toujours, sur ordinateur (`(hover: hover) and (pointer: fine)`), y compris quand l'œuf n'est pas armé : elle suit et tourne, mais ne se crashe pas.
- **Armé** (le crash peut avoir lieu) : thème réel Action (ou aperçu admin), ordinateur, « Œufs du thème » activé, œuf non coupé, route autorisée.
- **Le curseur** : le vrai curseur du navigateur prend l'image d'une petite voiture vue de dessus (dessin original, générique, aucune marque), en **8 orientations** (`public/cursors/action-car-0.png` à `-7.png`, 32 × 32, point chaud au centre), plus une **carcasse** (`action-car-epave.png`). Précharge les 9 images (sinon les premières rotations clignotent). L'orientation suit la direction du mouvement (angle arrondi à 45°, mise à jour seulement au-dessus de 150 px/s, 20 fois par seconde au plus).
- **Où s'applique le curseur** : sur `#site` (§8.5), avec l'attribut `data-car`, **pas sur `body`**. Les liens et boutons imposent leur propre curseur (`cursor: pointer` du navigateur, de Tailwind, ou en ligne) : la règle `#site[data-car] :where(:not(input, textarea, select, [contenteditable])) { cursor: inherit !important }` garde la voiture partout, titre compris, sauf dans les champs.
- **La voiture s'efface** (curseur normal, pas de crash possible) dès qu'un easter egg prend l'écran ou le curseur. Deux signaux, surveillés par un `MutationObserver` seulement quand la voiture est armée : `body` porte un `style.cursor` en ligne (Clippy le met à `none`, par exemple) ; ou un élément en `position: fixed` de z-index ≥ 800 couvre plus de la moitié de l'écran (fenêtres des œufs, y compris celles montées dans les pages : Le Parrain, Dun Dun, Inception, forum). Le widget du Tamagotchi (petit) et les toasts ne comptent pas.
- **Le crash** : on garde les positions des 80 dernières millisecondes. Si la vitesse dépasse `action_car_speed` (2 000 px/s par défaut, réglable dans l'admin) et que le pointeur (a) arrive à moins de 8 px d'un bord de la fenêtre en allant vers lui, ou (b) sort de la page par un bord à cette vitesse, ou (c) entre dans le titre `[data-brand-title]` à cette vitesse, c'est un crash. Pas au-dessus d'un champ de saisie. Pause de 2,5 s entre deux crashs.
- **L'effet** : explosion de 0,6 s au point d'impact (ramené dans la fenêtre), au niveau `--z-fx`, sans bloquer aucun clic ; au plus un flash. Le curseur devient la carcasse pendant 1,5 s, puis redevient une voiture. « Réduire les animations » : pas d'explosion animée, une trace de brûlure fixe pendant 1,5 s.
- **Le premier crash** appelle `discoverThemeEgg('theme-action-voiture')`.
- Non armé (œufs coupés, œuf #26 coupé, route exclue) : la voiture reste le curseur, sans crash possible. Téléphone, autre thème : curseur normal.
- Le seuil de 2 000 px/s est une estimation : à régler en test sur une vraie souris. The Legendre peut le changer dans l'admin sans redéployer.

### 13.7 Œuf #27 — Nakatomi Plaza (`theme-action-nakatomi`)

- **Déclencheur** : taper « nakatomi » hors d'un champ de saisie (écouteur propre au thème, même garde que D10, tampon des 8 derniers caractères imprimables, en minuscules). Secours au toucher : 5 touchers en moins de 3 s sur le rail d'étages (ordinateur) ou sur la puce « ÉTAGE » de la barre (téléphone, tablette).
- **Effet**, 3,2 s en tout, sans bloquer aucun clic : le rail d'étages s'emballe et grimpe jusqu'en haut (1,2 s), les vitres se fissurent sur toute la page (calque SVG, 0,6 s), une seconde d'immobilité, puis tout revient (0,4 s). Sous 1100 px, sans le rail (§13.4), c'est la puce « ÉTAGE » de la barre qui compte jusqu'à « ÉTAGE 12 » en 1,2 s, puis revient à l'étage du joueur. « Réduire les animations » : les fissures apparaissent d'un coup, restent 2 s, disparaissent.
- Premier déclenchement : `discoverThemeEgg('theme-action-nakatomi')`.

### 13.8 Au téléphone

Règles du socle en §8.9 ; ce qui est propre à l'Action :

- **Barre du haut** : la marque en Saira capitales (18 px), la puce « ÉTAGE 06 » (le rail d'étages est caché sous 1100 px, §13.4 ; 5 touchers sur la puce = secours de Nakatomi, §13.7 ; visiteur : « ÉTAGE — », touchable aussi ; `touch-action: manipulation` sur la puce et sur la marque, sinon des touchers rapides zooment ou se perdent), l'avatar. Effet de Nakatomi sans le rail : §13.7. Barre du bas : Saira capitales 12 px, entrée active en orange avec un filet biseauté au-dessus.
- **Décor** : brume et traînées gardées (traînées fixes au téléphone : c'est l'animation continue de trop) ; bandeau de fréquence caché (§13.4) ; fêlures seulement sur le héros de l'accueil et la 404, à 60 % de leur taille ; étalonnage des affiches gardé.
- **Biseaux** : gardés. Un bouton biseauté fait 44 px de haut au moins ; le biseau ne rogne jamais la zone tactile (elle reste rectangulaire, sur l'élément non incliné).
- **La voiture** (#26) n'existe qu'à l'ordinateur (§13.6) ; au toucher, curseur normal. La secousse du bouton principal est gardée (2 px, 120 ms).
- **Radio** : la ligne « La radio » du tiroir ouvre le panneau en feuille plein écran.

| Écran | Au téléphone |
|---|---|
| A1 | Le héros en une colonne : ligne mono des séances, titre en chrome (`clamp(34px, 10vw, 56px)`), ligne mono, boutons « Encaisser » et « Voir la fiche » pleine largeur l'un sous l'autre, le bouton du direct, le chrono. Puis le journal radio (5 lignes), l'étage et sa jauge, le face-à-face (deux affiches côte à côte, 50 % chacune), les repérages (liste de 5) |
| A2 | Grille intacte ; statistiques en 2 × 2 ; pastilles de filtre sur une rangée qui défile |
| A3 | Feuille plein écran : en-tête orange collant « DOSSIER 047 — ARSENAL », onglets en rangée défilante |
| A4 | Les deux films l'un sous l'autre, séparés par un « VS » biseauté ; compteurs d'impact pleine largeur ; chrono de clôture en haut, collant sous la barre |
| A5 | Relevé en lignes : rang, étage, pseudo, total à droite ; la jauge de pression sur une seconde ligne |
| A6 | Fiche de service en haut ; la tour en bande verticale étroite (12 cases de 20 px) à côté des chiffres, pas en grand |
| A7 | Canaux en liste pleine largeur, barres de trafic à droite de chaque ligne |
| A8 | Le plan des 7 jours en liste verticale (un jour par ligne) ; phases de la saison en liste ; objectifs dessous |
| A9 | Badges d'accès sur 2 colonnes |
| A10 | Tiroir : les quatre catégories en blocs, titres en Saira capitales, puce de semaine longue en tête |
| A11 à A17 | Règles du neutre (§9.7), habillées |
| A18 | Toasts au-dessus de la barre du bas (rangée 2, §8.9) ; le scan de chargement traverse l'écran de haut en bas |
| A19 | Radio en feuille plein écran depuis le tiroir |
| 404 | Étage 13 : fêlures réduites, texte et lien pleine largeur |

### 13.9 Critères d'acceptation de la phase 7

- Planning ou bouton admin sur Action : tout le site passe en Action sans redéploiement et sans flash ; l'admin et `/videoclub` restent neutres.
- La barre montre OPÉRATIONS, ARMURERIE, UNITÉ, CLASSIFIÉ avec toutes leurs entrées et conditions ; l'entrée « VIDÉOCLUB » garde son point doré.
- Marquer un film vu : le bouton dit « Encaisser », le toast affiche le vrai montant (+5, +10 ou +15).
- Les deux œufs se déclenchent pendant la semaine Action, jamais en dehors, jamais si « Œufs du thème » est coupé ou si l'œuf est coupé dans l'admin ; en aperçu, ils jouent sans s'enregistrer.
- « Réduire les animations » : plus de traînées animées, plus d'explosion, plus de secousse ; tout reste lisible.
- Les 25 œufs existants passent au-dessus du décor et marchent tous.
- Contraste vérifié sur chaque écran (§2.2, règle 11).
- Au téléphone (§13.8), à 360, 390 et 430 px : chaque écran sans défilement horizontal, cibles de 44 px, puce « ÉTAGE » (5 touchers = Nakatomi), traînées fixes.

---
## 14. Phase 8 — Thème Comédie

Branche `refonte-v2/phase-8`. Maquettes : `maquettes/comedie/theme-comedie.html` (le CSS exact) et `maquettes/comedie/T0-…jpg` à `T19-…jpg`. Jetons : annexe A. Libellés : annexe B.

### 14.1 Le parti pris

Le théâtre de boulevard. Le Dîner de cons est une pièce de Veber avant d'être un film ; le Splendid est né au café-théâtre ; de Funès vient du boulevard, Dupontel du one-man-show. Le site devient une salle de théâtre : rideau rouge, or, poursuite qui suit la souris, rampe allumée. **Le thème fait des choses au lieu d'en représenter.** OSS 117 n'apporte pas de décor : il apporte **la voix** des textes, sûre d'elle, à côté de la plaque, jamais méchante avec le visiteur (c'est le site qui est ridicule, pas lui).

The Legendre a écarté la première version (un classeur de bureau beige) : rien de tout ça ne doit revenir. Aucune référence à The Grand Budapest Hotel.

### 14.2 Couleurs, lettres, formes

- Trois couleurs : le **rouge rideau** pour tout ce qui agit (en **surface** : boutons, frises ; en texte il est illisible, 2,5:1, donc le texte actif est en **or clair**, `--accent-fg`), l'**or** pour ce qui est acquis ou allumé, le **noir de salle** (jamais `#000`) pour le reste. Le **fard** (`--info`) seulement pour les horaires, les dates, les durées.
- **Aucun vert nulle part**, sauf une ampoule cachée (œuf #28). Vérifie qu'aucun jeton ni composant du thème n'en utilise.
- Polices : **Anton** (titres, noms sur l'affiche), **Playfair Display** (nom du théâtre, italiques), **Oswald** (étiquettes, boutons, barre), **Lora** (synopsis, critiques, messages), **Courier Prime** (billets, chiffres, régie), **Caveat** (mots courts écrits à la main sur les portes et citations ; jamais pour un texte long ni un message privé).
- Titres : ombre `--ombre-titre` (rouge profond + halo de poursuite).
- Mouvement : 200 ms avec un léger dépassement ; rideau 420 ms ; trac 400 ms ; retard de la poursuite 140 ms.
- Curseur : **la chaussure noire**, clin d'œil au *Grand Blond avec une chaussure noire* (fournie, §11.13 : `comedie-chaussure.png`, `-survol`, `-appui`). Elle remplace la main gantée du dépôt (un poing fermé), à supprimer.

### 14.3 Les niveaux et le vocabulaire

- EXP → **rappels**. Badge → **étoile**. Note → **critique**.
- Niveaux = **emplois**, affichés « Emploi 06 · Petit rôle » :

| N° | Emploi | N° | Emploi |
|---|---|---|---|
| 01 | Ouvreuse | 07 | Second rôle |
| 02 | Machiniste | 08 | Premier rôle |
| 03 | Figurant | 09 | En haut de l'affiche |
| 04 | Doublure | 10 | Tête d'affiche |
| 05 | Utilité | 11 | Directeur de troupe |
| 06 | Petit rôle | 12 | Monstre sacré |

  Palier de l'emploi *k* = (*k* − 1) × 100 rappels, comme le code. Au-delà de 12 : « Emploi 14 · Monstre sacré ».
- Rattrapages : Débutant → **Première année**, Intermédiaire → **Deuxième année**, Confirmé → **Sociétaire**.
- **Un verbe par action** : « Applaudir » = marquer vu, et rien d'autre. Voter à l'applaudimètre = « donner sa voix » ; bouton « Ma voix aux Bronzés » : article contracté selon le titre (« Les … » → « aux … », « Le … » → « au … », « La … » → « à la … », « L'… » → « à l'… », sinon « à … »).
- Tout le reste : annexe B.

### 14.4 La voix

Pour les états génériques seulement (§2.2, règle 4). Ces répliques sont dans `lib/themes/comedie.ts`, **à faire relire par The Legendre** (écrites de mémoire).

| Situation | Neutre | Comédie |
|---|---|---|
| Champ de recherche des films | Rechercher un titre, un réalisateur… | Consulter le répertoire… ou demander comment est la blanquette |
| Aucun résultat | Aucun résultat. | Personne ce soir. Il s'agirait de grandir, hein. |
| Chargement | Chargement… | Trois coups… Ah ! C'était donc ça tout ce tintouin. |
| Erreur générique | Une erreur est survenue. | Trou de mémoire. Le souffleur n'a rien entendu. |
| Duel écrasé (≥ 70 % des voix, au moins 5 voix) | — | C'est la piquette, Jack. Tu sais pas jouer, Jack. |
| Profil sans film vu | Aucun film vu pour l'instant. | Vous n'avez rien applaudi. Je ne vois pas ce qu'il y a de drôle. |
| Enregistrement réussi (générique) | Enregistré. | Bravo. On me dit le plus grand bien de ce film. |
| Page introuvable | Page introuvable | Le souffleur a un trou. Revenez en coulisses. |
| Déconnexion | À bientôt. | Le rideau tombe. Ne claquez pas la porte de la loge. |

### 14.5 Le décor (`components/theme/comedie/ComedieFrame.tsx`)

| Élément | Détail |
|---|---|
| Rideaux | jambes à gauche et à droite (≈ 110 px sur ordinateur), frise en haut ; velours rouge dégradé (`--accent` et son ombre), embrasses dorées. Fixes, `pointer-events: none` ; le contenu est décalé pour **ne jamais passer dessous**. Téléphone : jambes 14 px, frise 26 px |
| Fronton | sous la barre du haut, une rangée d'ampoules dorées ; le nom « Le Marathon Cinéma » en Playfair italique or |
| Rampe | en bas du contenu de chaque page (pas fixée à l'écran), une rangée d'ampoules allumées sur 44 px ; sur l'accueil, l'une d'elles est verte (œuf #28) |
| Plancher | bande de lattes (`--plancher`) sous la rampe |

### 14.6 Les comportements

| Nom | Où | Ce qui se passe | « Réduire les animations » |
|---|---|---|---|
| **La poursuite** | partout, sauf routes exclues | halo chaud qui suit le curseur avec 140 ms de retard et le dépasse avant de revenir ; `mix-blend-mode: screen`, `pointer-events: none`, `--z-fx`. Téléphone : suit le dernier toucher et s'éteint après 4 s | caché |
| **Le trac** | bouton principal | au survol, tremble de 1,5 px pendant 400 ms puis se calme. Téléphone : au premier toucher | rien |
| **La révérence** | après « Applaudir » réussi (fiche, grille, accueil, semaine) | l'affiche pivote vers l'avant sur son axe horizontal, remonte, « BRAVO » apparaît ; trois applaudissements en moins de 10 minutes : « RAPPEL ! ». Les pages émettent un évènement `cm:film-vu` (id du film, montant) après chaque succès ; le comportement l'écoute | « BRAVO » fixe 1,2 s |
| **Les trois coups** | chargement des pages | trois coups espacés de 400 ms (trois traits qui s'allument), le rideau se lève, la page apparaît | texte fixe « Trois coups… » |
| **Le souffleur** | états vides, 404 | une tête (silhouette générique) dépasse d'un trou au bord du plateau : « … j'ai un trou. » | image fixe |

### 14.7 Les écrans

| Écran | Route | Nom Comédie | Ce qui change |
|---|---|---|---|
| T1 | `/` | À l'affiche | **Structure.** Rideau levé, frise et jambes, rampe allumée. À gauche, l'affiche du film de la semaine encadrée d'or avec le ruban « À l'affiche », et dessous une citation manuscrite (Caveat) : une des `citations` du thème (annexe B.3), tirée au sort une fois par jour. Au centre : « CE VENDREDI, 20 H 30 — NE SOYEZ PAS EN RETARD » (jour et heure des réglages), le titre en Anton crème ombré de rouge, « DE {réalisateur} · {année} », « {n} COMÉDIENS SUR {total} ONT DÉJÀ APPLAUDI », le synopsis (Lora), le bouton-billet « APPLAUDIR » avec sa souche « +10 » (montant réel), « LIRE LE PROGRAMME » (ouvre la fiche), et le bouton du direct pendant sa fenêtre (§12.4). À droite : « Les représentations » (VEN. 20:30 le film de la semaine, MER. 20:30 le vainqueur du duel ou « à l'applaudimètre » s'il n'est pas décidé, MATINÉE → le répertoire), « Rappels — Emploi 06 » (jauge, « Petit rôle → Second rôle »), « Au répertoire cette semaine » (4 films dont `films.genre` vaut « Comédie », tirés au sort chaque jour dans le catalogue ouvert ; en Action, « Action »). En bas : « Le cahier de régie » (activité : heure en fard, pseudo, verbe du thème, titre en or) et « Sur l'affiche ce soir » (4 premiers du classement). La distribution des acteurs de la maquette n'existe pas en base : ne l'affiche pas. États hors saison, sans film de la semaine, visiteur : ceux de la phase 3, habillés (comme A1) |
| T2 | `/films` | Le répertoire | Habillage. Chaque affiche encadrée d'or ; ruban doré en coin sur les films applaudis ; filtres en lettres de fronton ; champ de recherche à la voix du thème |
| T3 | fenêtre de fiche | Le programme | Habillage (comportement inchangé). « Programme — pièce n° {id} » ; moyenne en étoiles (la note reste sur 10 ; les étoiles sur 5 n'en sont que la traduction, avec le chiffre sur 10 à côté) ; « DE {réalisateur} · {année} · {genre} » ; synopsis ; **les notes des autres joueurs en colonnes de presse** : étoiles et signature « {pseudo} — {emploi} ». Les phrases citées dans la maquette n'existent pas en base (la table `ratings` ne garde qu'une note) : pas de citation. Boutons « Applaudir +n », « Remettre au répertoire » (retirer des vus), « Signaler une erreur » littéral. Onglets renommés « Le programme / Où la voir / La loge » |
| T4 | `/duels` | L'applaudimètre | **Structure.** Un cadran et une aiguille qui penche vers le film en tête (−60° à +60° selon la part des voix) et oscille en permanence de ±1,5° (fixe avec « réduire les animations »). « Applaudimètre n° {week_num} — clôture des voix {échéance} », « Laquelle on joue mercredi ? », les deux pièces (affiche, titre, année · réalisateur, pourcentage, voix), les boutons « Ma voix aux… » en souches de billets (rouge d'un côté, or de l'autre). Liste des votants seulement si la page actuelle la montre déjà. Réplique du duel écrasé (§14.4) |
| T5 | `/classement` | L'affiche | **Structure.** Le classement est une affiche de théâtre : « Le Marathon Cinéma présente » / le 1ᵉʳ en Anton 46 px / « dans » / « La saison {libellé} » / 2ᵉ et 3ᵉ en 22 px / 4ᵉ à 8ᵉ en 16 px / « Avec … » (tous les suivants) en 12 px / « Régie : … » (les admins) en 12 px. **Rien sous 12 px** (la maquette descendait à 10). À droite, le tableau « Les rappels » avec les chiffres, et « Encore {écart} rappels et ton nom passe au-dessus du titre » (écart avec le 1ᵉʳ ; si tu es 1ᵉʳ : « Ton nom est au-dessus du titre. ») |
| T6 | `/profil` | Ta loge | **Structure.** Une porte de loge : plaque au nom du joueur, ses étoiles (badges) au-dessus, « Emploi 06 — Petit rôle », « Au club depuis {n} semaines, bientôt {n + 3} » (n calculé depuis `profiles.created_at` ; c'est la seule fausse valeur permise, la blague de Bernie). Le miroir à ampoules : « Rappels de la saison {exp} », « Il en manque {x} pour {emploi suivant} ». À droite, les douze emplois : tenus (cochés, **sans date** : la date n'existe pas en base), actuel « En scène », suivants avec leur palier en rappels. Chiffres : pièces applaudies / catalogue, critique moyenne (moyenne de ses notes), créations (films ajoutés par le joueur). La plaque de l'œuf La hyène (§14.8) |
| T7 | `/forum` | Les coulisses | **Structure.** Un couloir de loges : une porte par sujet, « LOGE {nn} » (nn = rang du sujet dans la liste affichée), étoile allumée s'il y a eu un message depuis moins de 3 jours, état « EN SCÈNE » (message depuis moins d'une heure), « ACTIVE » (moins de 3 jours) ou « FERMÉE » (étoile éteinte) ; le dernier message écrit à la main sur la porte (Caveat, 90 caractères au plus) ; nombre de messages ; bouton « Ouvrir une loge ». Aucune phrase qui annonce une règle inexistante (la maquette disait « Le couloir ferme à minuit » : retiré) |
| T8 | `/semaine` | L'acte | **Structure.** « Acte II » (numéro de la semaine du planning en chiffres romains) et « COMÉDIE — DU LUNDI 21 AU DIMANCHE 27 SEPTEMBRE ». Deux billets avec souche : « {jour} {heure} — la pièce de l'applaudimètre » (+{EXP vainqueur}) et « {jour} {heure} — à l'affiche » (+{EXP film de la semaine}), celui du soir en rouge (jours, heures et montants des réglages). La pièce en quatre actes (planning) : « Rideau · joué », « En scène » sous la poursuite, « En coulisses ». « Les répétitions de la semaine » avec leurs rappels (montants des réglages). « Au répertoire cette semaine » (comme T1) ; une citation manuscrite (Caveat) tirée des `citations` (annexe B.3), une par jour |
| T9 | `/marathoniens` | La troupe | **Structure.** La distribution, comme dans un programme : médaillon doré (avatar ou initiale), nom, emploi, rappels ; ampoule allumée si le joueur a applaudi un film cette semaine ; ton médaillon sous la poursuite. En-tête « LA DISTRIBUTION DE LA SAISON — {n} COMÉDIENS, {m} SUR SCÈNE CETTE SEMAINE » |
| T10 | barre | — | La scène, La bibliothèque, Le foyer, Les cintres ; fronton |
| T11 | `/notes` | La revue de presse | Habillage. Onglets « La revue de presse » et « Les bides » (après Le Rageux) |
| T12 | `/rattrapage` | Le conservatoire | Habillage. Trois classes (§14.3) |
| T13 | `/watchlist` | Mes réservations | Habillage. « Les réservations du foyer » pour `/watchlist/public`. Renommer, Rendre privée, Supprimer, et le message de limite journalière restent littéraux |
| T14 | `/messages` | Les petits mots | Habillage. Texte en Lora, lisible (pas d'écriture manuscrite) ; « Écris un message... » inchangé ; Bloquer / Débloquer littéraux |
| T15 | `/forum/[id]` | Une loge | Habillage. « (toi) » ; Modifier / Supprimer littéraux |
| T16 | `/easter-eggs` | Le magasin d'accessoires | Habillage |
| T17 | `/auth` | L'entrée des artistes | Titre seulement ; réinitialisation : « J'ai oublié mon texte » ; formulaire littéral |
| T18 | par-dessus les pages | Les annonces de la régie | Titres de l'annexe B (« Bienvenue au théâtre », « Rejoindre la troupe en cours d'acte », « La régie examine ta demande », « Engagé — Saison {n} », toast « Bravo — {titre} »), phrase d'origine ; « refusée », « 18+ », « Signalement envoyé » jamais habillés ; chargement = les trois coups ; états vides = le souffleur |
| T19 | radio | Le poste | TSF en bois verni, cadran doré éclairé, touches ivoire |
| 404 | — | Le souffleur a un trou | Le souffleur, « Revenez en coulisses. », lien retour |

### 14.8 Les œufs du thème

**#28 — Le vert interdit** (`theme-comedie-vert`). Le vert porte malheur au théâtre. Il n'y en a nulle part dans le thème, sauf **une ampoule verte** (`--interdit` #1E7A4A) dans la rampe, en bas de la page À l'affiche (l'accueil) seulement. C'est un vrai bouton (`aria-label="Ampoule de la rampe"`). Clic : la rampe clignote 1 s (3 flashs par seconde au plus) et l'ampoule verte grille (grise). Elle reste grillée **pour ce joueur jusqu'à la fin de la semaine Comédie**, et se rallume la semaine Comédie suivante : état gardé dans `localStorage`, avec le lundi de la semaine (pour tout le monde ; `discovered_eggs.found_at` ne change plus après la première découverte, on ne peut pas s'en servir). « Réduire les animations » : pas de clignotement, l'ampoule s'éteint. Enregistrement au clic.

**#29 — La blanquette** (`theme-comedie-blanquette`). Dans la recherche de `/films`, quand la saisie normalisée (espaces retirés, minuscules, sans accents) vaut « blanquette » et reste stable 400 ms : à la place de la grille, **une seule ligne**. La première fois : « Comment est votre blanquette ? » (`localStorage` `cm_blanquette = 1`). Une recherche suivante du même mot (après avoir tapé autre chose, ou lors d'une autre visite) : « Elle est bonne. », enregistrement de l'œuf, `cm_blanquette = 2`. Ensuite, le site n'en reparle plus jamais : « blanquette » redevient une recherche normale (aucun film → état vide habituel). Effacer la recherche rend la grille ; les filtres ne sont jamais touchés.

**#30 — La hyène** (`theme-comedie-hyene`). Déclenché **côté serveur** : dans les actions qui marquent un film vu pendant le marathon, après un succès, si le thème réel est la Comédie, que l'œuf est armé côté serveur (§11.8) et que le joueur a marqué **au moins 3 films aujourd'hui** (jour de Paris, `pre = false`), l'œuf est enregistré et l'action renvoie `egg: 'theme-comedie-hyene'` (toast au titre du thème). Effet : jusqu'à minuit (Paris) du jour de la découverte, la plaque de « Ta loge » affiche « J'aime les hyènes. On n'en parle jamais pourtant. » (attribuée à Bernie, Albert Dupontel, 1996 — **réplique à vérifier par The Legendre**). Si l'admin met `limite_jour` sous 3, l'œuf devient impossible : l'admin l'indique à côté du réglage.

### 14.9 Au téléphone

Règles du socle en §8.9 ; ce qui est propre à la Comédie :

- **Rideaux** : jambes de 14 px et frise de 26 px (§14.5) ; le contenu est décalé d'autant et ne passe jamais dessous. **Fronton** : une ampoule sur deux, ampoules de 6 px. Barre du bas : Oswald capitales 12 px, entrée active en or clair sous une petite ampoule allumée.
- **Rampe** : 32 px de haut en bas de chaque page ; l'ampoule verte de l'accueil (#28) garde son dessin et reçoit une zone tactile de 44 px (§8.9, point 4).
- **La poursuite** suit le dernier toucher et s'éteint après 4 s (§14.6) ; **le trac** joue au premier toucher du billet, au `pointerdown`, sans retarder le clic : le même toucher applaudit ; **la révérence** et **les trois coups** gardés.
- **Radio** : la ligne « La radio » du tiroir ouvre le panneau en feuille plein écran.

| Écran | Au téléphone |
|---|---|
| T1 | L'affiche encadrée d'or en haut (60 % de la largeur, centrée, ruban « À l'affiche »), la citation manuscrite dessous ; puis « CE VENDREDI, 20 H 30 — NE SOYEZ PAS EN RETARD », le titre en Anton (`clamp(34px, 10vw, 60px)`), la ligne du réalisateur, « {n} COMÉDIENS SUR {total} ONT DÉJÀ APPLAUDI », le synopsis, le billet « APPLAUDIR » pleine largeur (souche à droite), « LIRE LE PROGRAMME », le bouton du direct. Puis « Les représentations », « Rappels », « Au répertoire cette semaine » (2 colonnes), « Le cahier de régie », « Sur l'affiche ce soir » |
| T2 | Grille intacte, cadres d'or de 2 px ; filtres en lettres de fronton sur une rangée qui défile |
| T3 | Feuille plein écran ; les critiques des joueurs en une colonne |
| T4 | Le cadran pleine largeur (aiguille gardée), les deux pièces l'une sous l'autre, les billets « Ma voix aux… » pleine largeur |
| T5 | L'affiche de théâtre gardée : 1ᵉʳ en Anton 32 px, 2ᵉ et 3ᵉ en 18 px, 4ᵉ à 8ᵉ en 14 px, « Avec … » et « Régie : … » en 12 px (jamais moins) ; le tableau « Les rappels » dessous, en lignes |
| T6 | La porte de loge en haut (plaque, étoiles, emploi, ancienneté), le miroir à ampoules dessous, les douze emplois en liste ; les chiffres en 2 × 2 |
| T7 | Le couloir devient une colonne de portes, une par ligne (numéro de loge, titre, mot manuscrit, état, nombre de messages) |
| T8 | Les deux billets l'un sous l'autre ; la pièce en quatre actes en liste verticale ; répétitions et répertoire dessous |
| T9 | Médaillons sur 3 colonnes |
| T10 | Tiroir aux couleurs du rideau, catégories en Oswald capitales, puce de semaine longue en tête |
| T11 à T17 | Règles du neutre (§9.7), habillées |
| T18 | Toasts au-dessus de la barre du bas ; les trois coups en plein écran pendant le chargement |
| T19 | Radio en feuille plein écran depuis le tiroir |
| 404 | Le souffleur à 70 % de sa taille, texte et lien pleine largeur |

### 14.10 Critères d'acceptation de la phase 8

- Bascule en Comédie sans redéploiement ni flash ; admin et `/videoclub` neutres.
- « Applaudir » ne sert qu'à marquer vu ; voter dit « Ma voix aux… » avec le bon article.
- La pièce du mercredi est le vainqueur du duel, celle du vendredi le film de la semaine, aux heures des réglages.
- Rideau, fronton et rampe ne cachent jamais un bouton ni un champ ; au téléphone, jambes à 14 px, frise à 26 px.
- Aucun vert ailleurs que l'ampoule (chercher `#1E7A4A` et `green` dans les fichiers du thème).
- Les trois œufs se déclenchent seulement pendant la semaine Comédie, jamais s'ils sont coupés ; en aperçu, effets sans enregistrement.
- « Réduire les animations » : plus de poursuite, de trac, de révérence animée, d'aiguille qui bouge.
- Rien sous 12 px, contraste vérifié (le rouge rideau n'est jamais du texte sur fond sombre).
- Au téléphone (§14.9), à 360, 390 et 430 px : rideaux à 14 et 26 px sans rien cacher, ampoule verte touchable, poursuite au toucher, chaque écran sans défilement horizontal.

---

## 15. Phase 9 — Thème Western

Branche `refonte-v2/phase-9`. Maquettes : `maquettes/western/theme-western.html` (le CSS exact) et `maquettes/western/W0-…jpg` à `W19-…jpg`. Jetons : annexe A.4. Libellés : annexe B.

### 15.1 Le parti pris

Le western spaghetti, pas John Ford : ocre, sueur, gros plans et silences. Trois films de Sergio Leone : **Le Bon, la Brute et le Truand** (la prime, le gros plan), **Il était une fois dans l'Ouest** (la lenteur, l'horizon, la mouche), **Pour une poignée de dollars** (l'homme sans nom qui ne salue personne, le compte à l'envers, une seule couleur froide). Une idée tient tout le thème : **chaque film a une prime sur sa tête, et toi aussi.** Ton profil est un avis de recherche, ton EXP est ta prime en dollars, le classement est le mur du bureau du shérif, tes badges sont des entailles dans la crosse d'un revolver.

### 15.2 Couleurs, lettres, formes

- **Tout est chaud sauf une couleur.** Le **sang** pour ce qui agit : en surface (`--accent`, boutons « Capturer », « Tirer ») ; en texte, le sang est illisible sur le bois (1,9:1 ; 2,7:1 pour le sang vif `--accent-2`, lui non plus jamais du texte), le texte d'action est donc en `--accent-fg`. Le **laiton** pour ce qui est acquis (entailles pleines, montants encaissés). L'**acier** (`--info`), la seule teinte froide, pour ce qui informe : dates, horaires, compteurs. **Aucun bleu, aucun vert** ailleurs (les constantes `--adult`, `--strange` et la couleur du bouton Discord restent ce qu'elles sont). `--impact` (#0D0906) n'existe qu'au cœur des trous de balle.
- Polices : **Rye** pour les titres de page, « WANTED » et les titres de film en grand ; **Alfa Slab One** pour les noms et les montants ; **Bitter** pour l'interface et le texte (boutons et barre en capitales, graisse 600, espacement 0,1em) ; **Courier Prime** pour le télégraphe, les dates, les dossiers et les données.
- **L'avis de recherche** (`.w-av` du kit) : papier jauni (`--papier`), bords déchirés, clous aux coins (`.clou`), légèrement de travers (angle stable tiré de l'identifiant, entre −1,5° et +1,5°), texte en `--encre`. **Le papier, ses bords et son angle sont portés par un pseudo-élément** (`::before` en `position: absolute; inset: 0`, **sans z-index négatif**) ; les enfants de l'avis sont en `position: relative` pour passer au-dessus ; l'élément qui porte l'avis ne reçoit ni `transform`, ni `clip-path`, ni `isolation`, ni z-index (une carte de `/films` contient des menus, qui seraient coupés, inclinés ou recouverts). Montants en sang sur le papier : **24 px au moins** (le contraste n'est que de 3,3:1 sur le bas du papier, suffisant pour du gros texte seulement ; Rye et Alfa Slab One n'ont qu'une graisse, l'exception « gras » ne s'applique pas).
- Rayon zéro. Panneaux « nuit » (`--s1`, opaques : opacité 0,92 au moins) posés sur le bois ou l'horizon, filet `--line`.
- **La lenteur, règle du thème** : tout ce qui n'est pas un clic dure **500 ms** avec une courbe très plate (`--dur`, `--ease`) : survols, apparitions, recadrages. **Le clic est à 0 ms** (`--dur-clic`) : aucune transition sur `:active`, sur le passage à « capturé », sur l'ouverture d'un menu ou d'une fenêtre. Si tout est à 200 ms, le thème disparaît et il ne reste que du marron.
- Titres : ombre `--ombre-titre`.
- Curseur : **colt** (fourni, §11.13 : `western-colt.png`, `-survol`, `-appui`), point chaud au bout du canon. L'image actuelle du dépôt est remplacée.

### 15.3 Les niveaux et le vocabulaire

- **EXP → dollars.** `formatExp(3940)` = « 3 940 $ » ; toast « +10 $ ». Le mot « EXP » n'apparaît jamais dans l'interface du Western, sauf dans les textes repris mot pour mot : textes écrits dans l'admin, règlement (`/regles`), descriptions des badges (« 5 EXP — Le voyage commence »), textes des 25 œufs.
- **La prime d'un joueur = son EXP.**
- **Niveau → rang**, nommé par ce qu'on te reproche : « Rang 06 · Déserteur » (12 noms, annexe B.4). Palier du rang *k* = (*k* − 1) × 100 $. Au-delà de 12 : « Rang 14 · Légende ».
- **La prime d'un film**, sur son avis : **le montant que crédite l'action réellement appelée par le bouton « Capturer » de cet endroit**, jamais un autre. Au 21 septembre, pendant la saison : sur une carte de `/films` et dans la fiche, `markWatched(id, false)`, qui crédite `EXP_FILM` pour **tous** les films, film de la semaine compris ; sur la carte du vainqueur du duel, le bouton en plus « Je l'ai vu pendant le duel » (`markWatchedDuelWinner`) crédite `EXP_DUEL_WIN`, et l'avis montre ce montant tant que ce bouton est proposé ; dans `/semaine`, `markWeekFilmWatched` crédite `EXP_FDLS`. Relis ces actions après la phase 1A (D11) avant d'afficher un montant. Avant le lancement de la saison, un visionnage ne rapporte rien : pas de montant. Dans le duel, les deux avis montrent `EXP_DUEL_WIN` (ce que rapportera le vainqueur à sa séance).
- Badge → **entaille** ; note → **les dix balles** (dix cartouches, pleines ou vides ; la note reste sur 10) ; film pas vu → **en cavale**.
- **Le compte à l'envers** (Pour une poignée de dollars) : là où la maquette le fait (accueil, `/films`), le chiffre mis en avant est « {n} toujours en cavale » (catalogue − vus), à côté du chiffre des captures.
- Rattrapages : Débutant → **Blanc-bec**, Intermédiaire → **Cow-boy**, Confirmé → **Pistolero**.
- **Le silence** : le site ne salue pas et ne remercie pas, il annonce (titres de l'annexe B.2). La phrase d'origine reste, mot pour mot.
- Tout le reste : annexe B.

### 15.4 Le décor (`components/theme/western/WesternFrame.tsx`)

| Élément | Où | Détail |
|---|---|---|
| Les planches | toutes les pages, sauf celles de l'horizon | le bois vertical du kit (`.planches`), assombri : sa partie la plus claire ne dépasse pas #3A2A1B, pour que `--ink3` reste lisible directement dessus |
| L'horizon | `/`, `/duels`, `/auth`, page 404 | ciel brûlé en haut (#D8CBA8 → #B79E6A : les couleurs du jeton `--bg` du kit, pas celles de sa classe `.horizon`, dont le haut du ciel est trop sombre pour l'encre), **ligne d'horizon franche à mi-hauteur de la fenêtre**, terre en bas (#8A6A3C → #4A3620, puis jusqu'à #2A1E12 en bas de l'écran) ; soleil au zénith (`.soleil`) ; mesas en silhouette sur l'horizon (`.mesa`), cachées sous 600 px. **Aucun texte de moins de 24 px posé directement sur le ciel ou la terre** : il est dans un panneau `--s1`. Les grands titres posés sur le ciel sont en `--encre`, sur la terre en `--ink` |
| Le vent | pages de l'horizon | une traînée de poussière dérive de gauche à droite le long de l'horizon, boucle de 40 s, opacité 12 %, animée par `transform` seulement. « Réduire les animations » : fixe |
| La devanture | barre du haut | une planche de bois (`--s3` et le fil du bois), filet sombre en bas, marque « Le Marathon Cinéma » en Rye |
| L'étalonnage | toutes les affiches (`Poster`) | sépia : calque `linear-gradient(#C9A96B, #6B4A28)` en `mix-blend-mode: multiply`, opacité 0,35, dans le cadre de `Poster`. Jamais de filtre sur l'image elle-même (comme l'Action) |
| Le calque des impacts | toutes les pages | **hors du calque de décor** : un enfant de `#site` placé après `main`, `position: absolute` en haut à gauche du document (coordonnées de page), `pointer-events: none`, z-index 90 (au-dessus du contenu, sous la barre du haut à 100 et la barre du bas à 200). Il reçoit les trous et se vide à chaque changement de page. **Bouton dans une fenêtre** (fiche, confirmation : z-index ≥ 500) : le trou va dans un second calque `position: fixed`, z-index 501, en coordonnées d'écran, qui se vide quand cette fenêtre se ferme. Ce second calque **n'existe que tant qu'il contient un trou**, et il est masqué (`visibility: hidden`) tant que `ecranOccupe({ seuilZ: 800, part: 0.5 })` est vrai : les fenêtres d'œufs de la fiche (Le Parrain, Inception, « Note ce film ! ») sont enfants de `.modal-wrap` (z-index 500) et passeraient sinon sous le trou |

### 15.5 Les comportements

| Nom | Où | Ce qui se passe | « Réduire les animations » |
|---|---|---|---|
| **L'impact** | après une action destructive réussie (§9.6) | à l'évènement `cm:destruction`, un trou de balle (`.impact`, annexe A.4) apparaît au point du dernier appui sur le bouton, **sans transition**, et reste jusqu'au changement de page. Douze trous au plus par page (le treizième remplace le plus ancien ; les trous de la 404 et du perdant d'un duel sont dessinés dans la page et ne comptent pas). Aucun pendant qu'un œuf est à l'écran (`ecranOccupe({ seuilZ: 800, part: 0.5 })` : Predator a ses propres trous) | identique (rien n'est animé) |
| **Le gros plan** | affiches des cartes de `/films` et des avis de l'accueil | au survol, l'image se recadre lentement (500 ms) jusqu'à × 1,6 sur le tiers haut (`transform-origin: 50% 32%`) ; en sortant, elle repart aussi lentement. Le `transform` est sur l'`img`, dans son cadre (`overflow: hidden` sur le cadre de l'image, jamais sur la carte). Seulement si `(hover: hover) and (pointer: fine)` | pas de gros plan |
| **La lenteur** | partout | §15.2 | les durées tombent à 0 |
| **Le silence** | accueil, bannières | titres qui annoncent (annexe B.2), phrase d'origine gardée | — |
| **La mouche** | partout, rarement | porteuse de l'œuf #31 (§15.7) : elle ne vit que si l'œuf est armé | posée, immobile |
| **Le barillet** | chargement des pages | six chambres qui se remplissent une par une (0,15 s chacune), « On charge… » en Courier Prime | texte fixe « On charge… » |
| **Rien à l'horizon** | états vides | « Rien à l'horizon. », un vautour immobile (SVG original, `aria-hidden`), la phrase d'origine dessous | — |
| **L'heure du duel** | `/duels`, à l'échéance du duel en cours | §15.7, œuf #33 | sans blanchiment |

### 15.6 Les écrans

« Structure » = la mise en page change ; « habillage » = seuls jetons, libellés et composants changent. Les données sont les vraies ; les maquettes montrent des exemples.

| Écran | Route | Nom Western | Ce qui change |
|---|---|---|---|
| W1 | `/` | Le contrat | **Structure.** L'horizon. À gauche, l'avis du film de la semaine : affiche TMDB étalonnée, « WANTED / MORT OU VIF », titre en Alfa Slab One, la prime du contrat en grand (le montant du bouton « Capturer » de l'accueil, §15.3), « {jour} {heure} — SÉANCE DE LA BANDE » (réglages). Au centre, un panneau nuit : « LE CONTRAT DE LA SEMAINE — TERRITOIRE {nn} / {total} » (planning), le titre en Rye, « DE {réalisateur} · {année} · {genre} », « {n} DE LA BANDE SUR {total} L'ONT DÉJÀ CAPTURÉ » (présents / joueurs de la saison, §9.1), le synopsis, le bouton « Capturer +{n} $ » (sang ; `{n}` = le montant de l'action appelée, §15.3 : `EXP_FDLS` si c'est `markWeekFilmWatched`, comme dans `/semaine`), « Lire le dossier » (ouvre la fiche), le bouton du direct pendant sa fenêtre (§12.4), et la réplique `contratCitation` en Courier Prime. À droite : « TA PRIME — RANG {nn} », `{exp} $` en grand, « {nom du rang} · {x} $ AVANT « {rang suivant} » » (à partir du rang 12 : « {x} $ AVANT LE RANG {nn + 1} ») ; « LES SÉANCES » (le contrat, le vainqueur du duel ou « au duel » s'il n'est pas décidé, « EN SOLO → tous les avis » vers `/films`, jours et heures des réglages) ; « TOUJOURS EN CAVALE » : les 4 premiers films des watchlists du joueur pas encore vus, en petits avis (titre, « EN CAVALE », pas de montant). En bas : « LE TÉLÉGRAPHE » (l'activité, §9.2 : heure en acier, « {pseudo} a capturé {titre} — {exp_awarded} $ », « {pseudo} a chargé {note} balles sur {titre} », « {pseudo} a ouvert un duel : {A} contre {B} », « Duel clos : {vainqueur} l'emporte ») et « LES GROSSES PRIMES » (4 premiers du classement, en $). États hors saison, sans film de la semaine, visiteur : ceux de la phase 3, habillés. Ni distribution, ni durée |
| W2 | `/films` | Les avis de recherche | Habillage. **La grille garde sa structure, son nombre de colonnes et son comportement.** Chaque carte devient un avis (§15.2) : « WANTED / MORT OU VIF », l'affiche, le titre en Alfa Slab One, la prime du film (§15.3) en sang, et « EN CAVALE » ou, pour les films vus par le joueur, le tampon « CAPTURÉ » rouge de travers sur l'affiche (il reste dans le cadre de l'affiche, jamais plus large) et « CAPTURÉ » écrit aussi sous le titre. Statistiques : les chiffres du neutre, avec ces libellés : catalogue → « Avis au mur », films vus → « Capturés » ; une progression, s'il y en a une, devient « Toujours en cavale » (catalogue − vus, en `--accent-fg`). Le filtre de genre s'appelle « Territoire » ; il n'est **jamais** présélectionné. Champ de recherche : `searchFilms`. Pas de filtre « En cavale » (§3). Le gros plan (§15.5) |
| W3 | fenêtre de fiche | Le dossier | Habillage (le comportement de la fenêtre ne change pas). En-tête « DOSSIER N° {id} — BUREAU DU SHÉRIF ». À gauche l'avis (affiche, prime du film, « CAPTURÉ PAR {n} DE LA BANDE »), le tampon « CAPTURÉ » si le joueur l'a vu. À droite : le titre, « FAITS REPROCHÉS — {genre}, {année} », « COMMANDITAIRE — {réalisateur} », le synopsis, « RELEVÉ DE LA BANDE : {moyenne} / 10 SUR {n} RELEVÉS » en dix balles, les notes des autres joueurs (« {pseudo} — {n} balles », sans phrase). Boutons « Capturer +{n} $ », « Remettre en cavale » (retirer des vus, `data-destructif`), « Mettre une prime » (`addToList`), « Signaler une erreur » littéral. Onglets renommés « Le dossier / Où le trouver / Le saloon du film ». Le bouton de la fenêtre de 24 h et la note négative (Le Rageux) restent littéraux |
| W4 | `/duels` | Le duel | **Structure.** L'horizon. En haut, « DUEL N° {week_num} — LE PERDANT RETOURNE EN CAVALE » ; une horloge (`.horloge`, aiguilles à l'heure de Paris) ; le titre « L'heure approche » dans les 24 h qui précèdent `closes_at`, sinon « Le duel » ; « {v} VOIX SUR {total} · CLÔTURE {jour} {heure} » (lu dans `closes_at`, total = joueurs de la saison). Les deux avis face à face (affiche, titre, `EXP_DUEL_WIN` $, année · réalisateur), sous chacun « {nn} VOIX » en grand et « {p} % — MÈNE LE DUEL » ou « SUR LA DÉFENSIVE ». Au centre, la crosse (`.crosse`) : une entaille par voix, sang d'un côté, acier de l'autre ; « {n} DE LA BANDE N'ONT PAS ENCORE TIRÉ » ; la réplique `duelPerdant`. Boutons « Tirer sur {titre} » avec le nombre de voix (le film en tête en sang plein, l'autre à filet). La liste des votants seulement si la page actuelle la montre déjà. Après la clôture : l'avis du perdant criblé de 5 trous, « {vainqueur} L'EMPORTE — SÉANCE {jour} {heure} · +{EXP_DUEL_WIN} $ ». Duel en attente, aucun duel : états actuels, habillés. L'échéance : §15.7 |
| W5 | `/classement` | Le mur des primes | **Structure.** « SAISON {libellé} — {n} HORS-LA-LOI RECHERCHÉS ». Le premier sur un grand avis (quatre fois la surface des autres : 2 colonnes × 2 rangées), avec « {n} CAPTURES · {rang} » ; les sept suivants en avis moyens (avatar étalonné ou silhouette, pseudo, `{exp} $`, nom du rang) ; ton avis cerclé de sang. **Ensuite, tous les autres** en liste compacte (rang, pseudo, nom du rang, prime). Pied : « TOTAL DES PRIMES EN CIRCULATION : {somme} $ » (somme des EXP des joueurs affichés) |
| W6 | `/profil` | Ton avis de recherche | **Structure.** À gauche ton avis : avatar étalonné (ou silhouette et initiale), pseudo, `{exp} $`, « {rang} — AVIS PLACARDÉ LE {date de `created_at`} » ; la crosse « LES ENTAILLES — {obtenus} SUR {total} » (une entaille par badge, pleine s'il est obtenu, §3) ; « FAITS REPROCHÉS » : les badges obtenus, avec leur vrai nom et leur vraie description. À droite, « LES DOUZE RANGS » : les 12 noms et leur palier ((*k* − 1) × 100 $), le rang actuel en sang, les suivants pâlis, sans date ; en tête « {exp} / {palier suivant} $ POUR LE RANG {nn + 1} ». Chiffres : « CAPTURES {vus} / {catalogue} », « RELEVÉ MOYEN {moyenne de ses notes} », « AVIS POSÉS {films ajoutés par le joueur} ». Tout ce que le profil permet de modifier reste là, littéral (pseudo, photo, bio, badge affiché, notifications) |
| W7 | `/forum` | Le saloon | **Structure.** « LE SALOON — {n} TABLES, {m} ENCORE OCCUPÉES ». Une table par sujet : « TABLE {nn} » (rang du sujet dans la liste affichée), le titre, « OUVERTE PAR {pseudo} · {il y a …} », le dernier message entre guillemets (90 caractères au plus), l'état « EN COURS » (message depuis moins de 3 jours) ou « DÉSERTÉE », une pile de jetons et le nombre de messages. Sujets épinglés : « TABLE PERMANENTE ». Le sujet social (« Le Salon ») garde sa place actuelle. Bouton « Ouvrir une table ». Pied : réplique `saloonPied` |
| W8 | `/semaine` | Le territoire | **Structure.** « TERRITOIRE {nn} / {total} — WESTERN · » et les dates de `formatSemaine` (§8.8). La carte de la saison : une piste qui traverse les semaines du planning (bande de saison, §11.11), chaque semaine un lieu nommé d'après son thème (annexe B.5), avec « traversé », « la bande est ici » ou rien. Le tableau des départs de la diligence : les deux séances (jour, heure, film, + montant) et la fin du bonus 48 h (annonce du film de la semaine actif + 48 h), états « ARRIVÉE » (passé), « À QUAI » (aujourd'hui), « EN ROUTE » (à venir). Si la règle de la dernière archive (`canMarkLatestWeekArchiveNow`) existe toujours, sa fenêtre en une ligne d'information. « LES ORDRES DU SHÉRIF » : ce que rapporte chaque geste (montants des réglages : vote, vainqueur du duel, contrat, bonus 48 h, autre capture). « TA PRIME : {exp} $ » |
| W9 | `/marathoniens` | La bande | **Structure.** Une photo de groupe d'époque, « TIRAGE D'ÉPOQUE — WESTERN CITY, TERRITOIRE {nn} » : **tous** les joueurs de la saison en portraits (avatar étalonné ou initiale), pseudo, `{exp} $`, nom du rang ; ceux qui ne sont pas actifs cette semaine (§9.1) pâlis, avec « AUCUNE CAPTURE CETTE SEMAINE » ; ton portrait cerclé de sang. En-tête « SAISON {libellé} — {n} HORS-LA-LOI, {m} EN SELLE CETTE SEMAINE » |
| W10 | barre | La devanture | Catégories La chevauchée, Les avis, La ville, La planque (annexe B.1), toutes les entrées et leurs conditions ; l'entrée « Vidéoclub » garde son point doré |
| W11 | `/notes` | Le carnet de tir | Habillage. La note en dix balles ; onglets « Le carnet de tir » et « Le cimetière » (après Le Rageux) ; « {n} FILMS TIRÉS · CLASSEMENT PONDÉRÉ PAR LE NOMBRE DE TIREURS » ; colonne « TIRS » = nombre de notes |
| W12 | `/rattrapage` | L'école de tir | Habillage. Trois grades (§15.3) |
| W13 | `/watchlist` | Mes cibles | Habillage. « Les cibles de la ville » pour `/watchlist/public`. « {n} FILMS · {m} CAPTURÉS ». Renommer, Rendre privée, Supprimer et le message de limite journalière restent littéraux |
| W14 | `/messages` | Le courrier | Habillage. « ARRIVÉ PAR LA DILIGENCE — SEULS VOUS DEUX LE LISEZ ». Les lettres sur papier (`--papier`, texte `--encre`, Bitter lisible, **jamais d'écriture manuscrite**). « Écris un message... » inchangé ; Bloquer / Débloquer littéraux |
| W15 | `/forum/[id]` | Une table | Habillage. « ← Le saloon · table {nn} ». Chaque message : avatar, pseudo, `{exp} $`, heure ; « (toi) » ; Modifier / Supprimer littéraux (supprimer laisse un trou, §15.5) |
| W16 | `/easter-eggs` | Le butin | Habillage. Introduction `eggsIntro` ; étiquette d'état : trouvé = « Déterré » (`eggFound`), pas trouvé = « Enterré » (réplique `oeufEnterre`), « Pas encore découvert » reste littéral ; « {n} TROUVÉS SUR {total} » |
| W17 | `/auth` | Pousser les portes | Titre seulement, sur l'horizon ; les portes battantes du saloon en décor autour de la carte (`.door`) ; réinitialisation : « Clé perdue » ; compte à rebours : « La diligence arrive dans » ; avertissement de saison en cours : titre « La bande est déjà partie », phrase d'origine. Formulaire littéral |
| W18 | par-dessus les pages | Le télégraphe | Titres de l'annexe B.2 (« Lis les règles avant de dégainer. », « Rejoindre la bande en cours de route », « Le shérif examine ta demande », « Recruté — Saison {n} », toast « Capturé — {titre} » avec « +{n} $ »), phrase d'origine ; fenêtre de 24 h : titre du code ; chargement : le barillet ; états vides : rien à l'horizon ; « refusée », « 18+ », « Signalement envoyé » jamais habillés |
| W19 | radio | Le poste du saloon | Radio de bois à dôme, cadran de laiton (graduations 550 à 1500), leviers de cuivre ; les trois réglages de §11.7 |
| 404 | — | Y a plus personne ici | L'horizon, la page criblée de 15 trous (répartis hors de la ligne de texte et du lien), la seule ligne « Y a plus personne ici. », le lien retour. Œuf #32 |

### 15.7 Les œufs du thème

**#31 — La mouche** (`theme-western-mouche`).

- **Armée** : règles de §11.8. Ordinateur et téléphone (un toucher vaut un clic).
- **La mouche** : une petite mouche vue de dessus (SVG original, 14 px, zone cliquable de 32 px), au niveau `--z-fx`, `pointer-events` sur elle seule, `aria-hidden` (c'est un secret, pas une fonction). Premier vol entre 60 et 120 s de visite (`useTempsVisible`), puis toutes les 4 à 6 minutes. Elle entre par un bord, traverse lentement (10 s, trajet courbe, deux ou trois arrêts en l'air), et se pose sur un point pris au hasard dans la fenêtre, **jamais sur la barre ni sur un élément interactif** (`document.elementFromPoint` au point visé ne doit pas tomber dans `a, button, input, select, textarea, label, [role="button"], [tabindex]`). Posée 20 s, elle repart par un bord. Pas de vol tant que `ecranOccupe({ seuilZ: 500, part: 0.3 })`.
- **Les trois clics** : cliquer la mouche posée la fait s'envoler et se reposer 150 à 300 px plus loin (0,6 s). Au **troisième** clic sur la même mouche (sans qu'elle soit repartie entre-temps) : une ligne s'écrit en bas de l'écran pendant 3 s, la réplique `mouche` (« Elle est toujours là. »), et `discoverThemeEgg('theme-western-mouche')` la première fois. On ne peut pas la tuer : elle reste. Après la découverte, les clics la déplacent toujours, sans message.
- « Réduire les animations » : pas de vol. Elle apparaît posée (fondu), et chaque clic la fait disparaître et réapparaître plus loin.

**#32 — La ville fantôme** (`theme-western-404`).

- **Armée** : règles de §11.8, sur la page 404 (§9.4).
- **L'effet** est la 404 du thème, pour tout le monde (§15.6).
- **Enregistrement** : au premier affichage de la 404 par un joueur connecté pendant la semaine Western, `discoverThemeEgg('theme-western-404')`, toast au titre du thème. Visiteur : l'effet, et le toast qui propose de se connecter (§11.8).

**#33 — L'heure du duel** (`theme-western-duel`).

- **Le moment** : `/duels` est ouverte **au moins 5 s avant** l'échéance `closes_at` du duel en cours, et l'est encore quand l'échéance passe. Le minuteur de la page est recalé sur l'heure du serveur au chargement (la page reçoit l'heure du serveur ; l'horloge de l'ordinateur du joueur peut être fausse).
- **À l'échéance**, la page appelle `constaterClotureDuel(duelId)` (§11.8), qui ferme le duel s'il ne l'est pas déjà et le renvoie (vainqueur, voix).
- **L'effet**, pour tous ceux qui sont sur la page pendant la semaine Western (c'est le comportement « L'heure du duel », œuf armé ou pas) : l'écran « blanchit » 60 ms (calque `--papier` à 85 %, **un seul flash**), l'avis du perdant reçoit 5 trous de balle, **puis** le résultat s'affiche. « Réduire les animations » : pas de blanchiment ; les trous et le résultat apparaissent.
- **Enregistrement**, si l'œuf est armé : `discoverThemeEgg('theme-western-duel')` (le serveur vérifie qu'un duel a été fermé il y a moins de 2 minutes, §11.8).
- **Limite** : une chance par semaine Western, à la clôture du duel. Pas de duel publié, pas d'œuf. Pour tester en vrai, The Legendre peut régler l'échéance du duel dans l'admin (Séances) ; pour l'effet seul, « Tester » (§11.4).

### 15.8 Au téléphone

Règles du socle en §8.9 ; ce qui est propre au Western :

- **Décor** : planches gardées ; sur les pages de l'horizon, l'horizon reste à mi-hauteur de l'écran, le soleil passe à 80 px, les mesas disparaissent sous 600 px (§15.4) ; **le vent est fixe** au téléphone (l'animation continue de trop). La devanture (barre du haut) garde son bois ; barre du bas en Bitter capitales 12 px, entrée active en laiton clair avec une étoile de shérif (`.w-star`) au-dessus.
- **La lenteur** reste la règle : 500 ms pour les apparitions, 0 ms au toucher.
- **Les avis de recherche** penchent moins (entre −1° et +1°) ; clous de 6 px ; montants toujours à 24 px au moins sur le papier (§15.2).
- **Le gros plan** n'existe pas au toucher (§15.5).
- **Les trous de balle** suivent le toucher, comme le clic (§9.6 : le point du dernier appui).
- **La mouche** (#31) : zone tactile de 44 px ; elle ne se pose que si le centre **et** les quatre coins de cette zone sont libres (même test `elementFromPoint` que §15.7, et ni la barre du haut, ni la barre du bas, ni un élément fixe du bas) ; elle ne se touche que posée (en vol, `pointer-events: none`).
- **L'heure du duel** (#33) : même règle ; le blanchiment reste un seul flash.
- **Radio** : la ligne « La radio » du tiroir ouvre le poste du saloon en feuille plein écran.

| Écran | Au téléphone |
|---|---|
| W1 | L'avis du contrat en haut (largeur 80 %, 340 px au plus, centré), puis le panneau nuit en pleine largeur (titre en Rye `clamp(32px, 9vw, 52px)`, ligne mono, « {n} de la bande… », synopsis, « Capturer » et « Lire le dossier » pleine largeur l'un sous l'autre, bouton du direct, réplique) ; puis « TA PRIME », « LES SÉANCES », « TOUJOURS EN CAVALE » (petits avis sur 2 colonnes), « LE TÉLÉGRAPHE » (5 lignes), « LES GROSSES PRIMES » |
| W2 | Grille intacte (3 colonnes au téléphone), un avis par carte (à cette largeur, l'avis garde « WANTED », l'affiche avec le tampon « CAPTURÉ » si le joueur l'a vu, le titre sur 2 lignes au plus et la prime ; le reste est dans la fiche) ; statistiques en 2 × 2 ; le filtre « Territoire » et les autres sur une rangée qui défile |
| W3 | Feuille plein écran : en-tête « DOSSIER N° {id} » collant ; l'avis en haut (60 % de la largeur), le dossier dessous ; onglets en rangée défilante |
| W4 | L'horloge et « L'heure approche » en haut ; les deux avis l'un sous l'autre ; la crosse entre les deux, en bande horizontale ; les boutons « Tirer sur… » pleine largeur sous chaque avis |
| W5 | Le premier sur un grand avis pleine largeur ; les sept suivants sur 2 colonnes ; tous les autres en liste compacte |
| W6 | Ton avis en haut (70 % de la largeur), les entailles, les faits reprochés, puis les douze rangs en liste, puis les chiffres en 2 × 2 |
| W7 | Les tables en liste pleine largeur (numéro, titre, dernier message, état, jetons) |
| W8 | La carte devient une piste verticale (une étape par semaine du planning) ; le tableau des départs devient une liste ; les ordres du shérif dessous |
| W9 | La photo de groupe sur 3 colonnes de portraits |
| W10 | Tiroir en bois, catégories en Bitter capitales, puce de semaine longue en tête |
| W11 à W17 | Règles du neutre (§9.7), habillées ; W17 garde l'horizon, les portes battantes réduites de moitié |
| W18 | Toasts au-dessus de la barre du bas ; le barillet au centre pendant le chargement |
| W19 | Le poste du saloon en feuille plein écran |
| 404 | L'horizon, 8 trous au lieu de 15, la ligne et le lien pleine largeur |

### 15.9 Critères d'acceptation de la phase 9

- Planning ou bouton de l'admin sur Western : tout le site passe en Western sans redéploiement et sans flash ; l'admin et `/videoclub` restent neutres.
- Aucun « EXP » dans l'interface du Western (hors textes repris mot pour mot, §15.3) : tout est en dollars, aux montants que créditent vraiment les boutons ; les rangs ont leurs paliers de 100 $ ; aucune prime inventée.
- La barre montre La chevauchée, Les avis, La ville, La planque avec toutes leurs entrées et conditions ; l'entrée « Vidéoclub » garde son point doré.
- Survols et apparitions à 500 ms ; un clic sur « Capturer » change l'état sans aucune transition.
- Un trou de balle seulement après une suppression **réussie** (au clavier aussi), sur le perdant d'un duel clos et sur la 404 ; rien si la confirmation est refusée ; aucun trou par-dessus la barre du haut ; le trou d'un bouton de la fiche reste visible au-dessus de la fiche ; tous disparaissent au changement de page.
- Aucune couleur froide sauf l'acier, aucun bleu ni vert (chercher dans les fichiers du thème), hors constantes 18+ et bouton Discord.
- `/films` : la grille garde son nombre de colonnes ; aucune carte ne porte de `transform` ni de `clip-path` ; les menus des watchlists ne sont pas coupés ; Inception, Le Parrain et Dun Dun marchent.
- Les trois œufs se déclenchent seulement pendant la semaine Western, jamais s'ils sont coupés (admin ou radio) ; en aperçu, effets sans enregistrement ; « Tester » fait venir la mouche et joue la clôture.
- « Réduire les animations » : plus de vent, de gros plan, de vol de mouche, de blanchiment, de barillet animé ; tout reste lisible.
- Les 25 œufs d'origine passent au-dessus du décor et des effets et marchent tous ; ceux de l'Action et de la Comédie restent muets (hors de leur semaine).
- Contraste vérifié sur chaque écran, rien sous 12 px.
- Au téléphone (§15.8), à 360, 390 et 430 px : chaque écran sans défilement horizontal, cibles de 44 px, mouche et trous au toucher, vent fixe.

---

## 16. Phase 10 — Thème Horreur

Branche `refonte-v2/phase-10`. Ses réglages en base (« Sursauts », « Son ») sont dans M3, passée en phase 5. Maquettes : `maquettes/horreur/theme-horreur.html` (le CSS exact) et `maquettes/horreur/H0-…jpg` à `H20-…jpg`. Jetons : annexe A.5. Libellés : annexe B.

### 16.1 Le parti pris

**Le thème ne montre rien.** Pas de sang, pas de monstre, pas de masque, pas de cri. Il allume une seule lumière et laisse le cerveau remplir le noir. Une règle tient tout : **on suggère, on ne montre jamais**, avec une seule exception voulue par The Legendre et encadrée, l'apparition (§16.8).

Cinq références : **Halloween** (la Forme au fond du décor, la rue normale, la lumière des maisons), **Scream** (le téléphone, les règles pour survivre), **L'Exorciste** (une fenêtre éclairée dans la nuit, le froid, les phrases à l'envers), **Le Projet Blair Witch** (les bandes retrouvées, tourner en rond, ce qu'on ne voit pas), **Ça** (le ballon rouge, un seul rouge).

**Traqueur et traqué.** Pendant cette semaine, le joueur est le tueur : chaque film qu'il regarde est une victime qu'il raye de sa liste. Et pendant qu'il chasse, quelqu'un le suit : une forme dans les arbres, un dossier que quelqu'un tient sur lui. On ne dit jamais qui.

**Interdit partout** : tout autre sursaut que l'apparition ; plus de trois flashs par seconde (y compris pendant l'apparition) ; le sang, le gore, les polices « qui dégoulinent », les squelettes, les citrouilles, les chauves-souris, les toiles d'araignée ; et aucun personnage protégé : ni masque, ni clown, ni figurine de bois, ni Slender Man.

### 16.2 Couleurs, lettres, formes

- **Des tons de nuit, une lumière chaude, un rouge.** La **lueur** (`--accent`, #E3B56A) est la seule chaleur : l'action principale et « maintenant ». Le **rouge** (`--bad` en surface, `--bad-fg` en texte) sert au ballon, à supprimer, refuser, à l'erreur, aux pastilles de non-lus et au cadre de « l'autre dossier » (H6), **et à rien d'autre** (les constantes 18+ mises à part). Le kit en met aussi sur les mentions de condition de la barre (« LE RAGEUX »), sur les `em` des onglets et sur l'aiguille du transistor : là, `--ink3` ou `--info`. Le rouge doit rester rare : s'il se remarque ailleurs que sur ces usages, c'est raté. La **lune** (`--info`) pour l'information : horaires, clôtures, compteurs. Le **vert de caméra de nuit** (`--rec`) seulement sur les horodatages des bandes retrouvées.
- Polices : **Cormorant Garamond** (titres, noms, titres de film en grand), **Spectral** (lecture : synopsis, messages, textes), **IBM Plex Mono** (étiquettes, barre, heures, données, en capitales espacées de 0,18em), **Reenie Beanie** (mots écrits à la main : légende du polaroïd, la phrase sous la photo de groupe ; jamais un texte long ni un message).
- Aucun arrondi, sauf les avatars. Grain à 7 % sur la page, fixe (jamais animé). Vignettage.
- Le bouton principal est **une lumière derrière une fente** : filet et halo lueur, texte lueur, fond `--s1`.
- Mouvement : lent et discret (`--dur` 360 ms), rien ne rebondit.
- Curseur normal : c'est la lampe qui suit la souris.
- **Le ton** : le site parle bas. Phrases courtes, au présent, sans point d'exclamation, sans émoji, sans « frissons garantis ». Il a l'air de savoir quelque chose que tu ne sais pas.

### 16.3 Les niveaux et le vocabulaire

- **EXP reste EXP.** La jauge est une lumière qui avance vers le rôle suivant.
- **Niveaux = rôles de film d'horreur** (annexe B.4), affichés « 06 · Celui qui a entendu un bruit ». Palier du niveau *k* = (*k* − 1) × 100 EXP. Au-delà de 12 : « 14 · La dernière fille ».
- Marquer vu = **« Rayer »**. Un film vu est une **victime** : le compteur de films vus devient « victimes ». Un film pas vu est **« toujours en vie »**. Jamais le verbe « tuer ».
- Badge = **pièce à conviction** ; note = **les griffes** (dix traits griffés, par groupes de cinq ; toujours sur 10) ; message non lu = **appel manqué**.
- Rattrapages : Débutant → **Le premier cercle**, Intermédiaire → **Le deuxième cercle**, Confirmé → **Le troisième cercle**.
- Tout le reste : annexe B.

### 16.4 Le décor (`components/theme/horreur/HorreurFrame.tsx`)

| Élément | Détail |
|---|---|
| La nuit | le fond `--bg` |
| La lisière | une forêt d'arbres sans feuilles en bas de l'écran (`.h-bois`, SVG original), sur 62 % de la hauteur |
| La brume | au bas de l'écran (`.h-brume`) |
| Le grain | 7 % (`.h-grain`), fixe |
| Le vignettage | `.h-vign` |
| **La lampe** | Le décor (lisière, brume) n'est visible que dans un halo de 240 px autour du curseur. **L'interface reste toujours éclairée** : la lampe est un calque d'obscurité **dans** le calque de décor (z-index 0), donc sous le contenu. Réalisation : un grand élément (deux fois la taille de la fenêtre) avec un dégradé radial transparent au centre, déplacé par `transform: translate3d()` à la position du curseur, une fois par image au plus (`requestAnimationFrame`, écouteur `pointermove` passif). Rien n'est repeint, seul ce calque bouge. Téléphone : le halo suit le dernier toucher et s'éteint doucement en 4 s (le décor retourne au noir). « Réduire les animations » : halo fixe, à 70 % de la largeur et 62 % de la hauteur de la fenêtre |
| La forme | §16.5 |

Pas de maison dessinée dans le décor : la porte de l'accueil est du contenu (H1).

### 16.5 Les comportements

| Nom | Où | Ce qui se passe | « Réduire les animations » |
|---|---|---|---|
| **La porte** | accueil (H1) | Au survol, deux ombres passent lentement sous la lumière de la porte, de gauche à droite (2,4 s). Au clic, la porte s'entrouvre de quelques centimètres (rotation du battant, 0,6 s), la lumière déborde sur le perron, puis la fiche du film de la semaine s'ouvre. On ne voit jamais qui est derrière. La porte est un vrai bouton (`aria-label="Ouvrir la jaquette : {titre}"`), dans le héros, pas dans le décor | pas d'ombres ; la fiche s'ouvre tout de suite |
| **La forme** | calque de décor, après 30 s sans geste | Après 30 s sans geste du joueur (souris, clavier, défilement, toucher), une silhouette debout (`.h-forme`, SVG original : proportions humaines, pas de visage, pas d'arme, pas de masque) se tient au bord du halo, du côté où il y a le plus de place. Au premier geste, elle n'y est plus. Jamais deux fois sur la même page pendant une visite. Elle ne fait jamais sursauter. Elle ne dépend pas du réglage « Œufs du thème » | aucune forme |
| **Le froid** | après une action destructive réussie (§9.6) | À `cm:destruction` : la lampe baisse pendant 1 s (un voile sombre uniforme, dans le calque de décor, passe à 60 % d'opacité et revient : une animation d'opacité, rien n'est repeint). Si l'élément `[data-destructif-cible]` retenu (§9.6) est encore affiché, il se décolore en 2 s (`filter: grayscale(1) brightness(.7)` sur cet élément seul ; jamais sur un conteneur de page, **jamais sur une carte de `/films`** : « Retirer des vus » n'a pas de cible). S'il a déjà disparu, seule la lampe baisse. Rien ne casse, rien ne tremble | décoloration immédiate, la lampe ne baisse pas |
| **La respiration** | états vides, 404 | le vignettage de la zone vide se resserre et se relâche sur un cycle lent de 6 s | fixe |
| **Le rembobinage** | chargement des pages | une bande de défilement VHS traverse l'écran de haut en bas, « ▶▶ REMBOBINAGE » en Plex Mono ; remplace toutes les barres de progression | texte fixe |
| **Le silence** | son | aucun son, jamais, sauf le bruit du sursaut (§16.8). Un nouveau message ne fait aucun bruit | — |

### 16.6 La radio — le transistor (H19)

Un poste portable qui grésille dans le noir (le grésillement est visuel, jamais sonore) : cadran FM de 88 à 108, « RADIO · ONDES DU SOIR ». Quatre réglages : **Musique** (grisée, « Piste à venir », comme ailleurs) ; **Volume** (actif même sans piste, avec la mention « Règle le son du thème. ») ; **Œufs du thème** ; **Sursauts** : activés ou coupés (§16.8). Le son se coupe par la case « Son », en bas à gauche de l'écran (§16.8). Ordinateur : fermée, un petit poste en bas à gauche ; téléphone : une ligne « La radio » dans le tiroir (§11.7).

### 16.7 Les écrans

| Écran | Route | Nom Horreur | Ce qui change |
|---|---|---|---|
| H1 | `/` | La porte | **Structure.** Le perron dans le noir : une porte fermée, éclairée par une ampoule ; la lumière passe dessous (`.fente`) et par la serrure ; la porte est le bouton de la fiche (§16.5). À gauche : « LA NUIT DE {jour} · {heure} » (réglages, en lueur), le titre du film de la semaine en Cormorant, « {réalisateur} · {année} », « {n} SUR {total} L'ONT DÉJÀ RAYÉ » (présents / joueurs de la saison, §9.1), le synopsis, les boutons « Rayer +{n} EXP » (`{n}` = le montant de l'action appelée, §15.3) et « Lire la jaquette » (ouvre la fiche), le bouton du direct pendant sa fenêtre (§12.4), la réplique `porteSousTitre` en italique. À droite : « LES DEUX PORTES » (duel en cours : la réplique `duelRegle` et l'échéance ; duel clos depuis moins de 7 jours : « {Jour}, une seule porte est restée éclairée : {vainqueur}. » (jour de `closed_at`, avec sa majuscule) et « {v1} VOIX CONTRE {v2} · +{EXP_DUEL_WIN} EXP ») ; « LES SEPT NUITS » (les séances de la semaine et la fin du bonus 48 h, avec « passée », « ce soir » ou rien). En bas, quatre colonnes : « LES DERNIÈRES TRACES » (l'activité, §9.2 : « {pseudo} a rayé {titre} · +{exp_awarded} », « {pseudo} a griffé {titre} — {note}/10 », duels ouverts et clos), « LES SURVIVANTS » (4 premiers du classement), « TA NUIT · {vus} VICTIMES · NIVEAU {nn} » (le rôle, la jauge `exp` / palier suivant, « {x} AVANT « {rôle suivant} » » ; à partir du niveau 12 : « {x} AVANT LE NIVEAU {nn + 1} »), « LE JOURNAL » (annonces, l'épinglée en premier, texte jamais habillé). Une ligne « LES RÈGLES POUR SURVIVRE » avec les montants des réglages et « Lire toutes les règles » (→ `/regles`). États hors saison, sans film de la semaine, visiteur : ceux de la phase 3, habillés ; la porte reste alors fermée et n'est plus un bouton. Ni durée, ni ballon dessiné |
| H2 | `/films` | Les cassettes | Habillage. **La grille garde sa structure, son nombre de colonnes et son comportement.** Chaque carte devient une boîte VHS du rayon horreur (`.h-cas`) : dos sombre, affiche TMDB assombrie (calque `#07080B` à 40 % dans le cadre de `Poster`, pas de filtre sur l'image), titre en capitales fines. Film vu par le joueur : une étiquette blanche collée en haut, « VICTIME · {jj.mm} » (date de `watched_at`, lue dans `app/films/page.tsx`, §2.1). Pas vu : rien. Pas de tampon rouge, pas de croix. En-tête « LE RAYON HORREUR · {catalogue} CASSETTES · {catalogue − vus} TOUJOURS EN VIE » et « {vus} VICTIMES ». Statistiques : libellés du thème (vus → « Victimes », progression → « Toujours en vie »). Recherche (`searchFilms`), filtres et « Au hasard » à leur place |
| H3 | fenêtre de fiche | La jaquette | Habillage (comportement inchangé). Le dos d'une boîte VHS : « LA JAQUETTE · AU DOS DE LA BOÎTE », l'affiche, le titre, « {année} · {réalisateur} », « FILM DE LA SEMAINE » s'il l'est (sans montant : la fiche crédite `EXP_FILM`, §15.3), le genre, « Toujours en vie » ou « VICTIME · {date} », le synopsis, « Ta note » en griffes, « Où le regarder » (fourni par TMDB), « La veillée de ce film » (l'onglet du forum du film, sans nombre). Boutons « Rayer +{n} EXP » (montant de l'action appelée), « Ajouter à la liste noire » (`addToList`), « Retirer des vus » (`data-destructif`), « Signaler une erreur » littéral. Onglets renommés « La jaquette / Où le regarder / La veillée ». Le bouton de la fenêtre de 24 h et la note négative (Le Rageux) restent littéraux |
| H4 | `/duels` | Les deux portes | **Structure.** Au bout d'un couloir, deux portes fermées. Sous chacune, une lumière dont la largeur et l'intensité suivent sa part des voix : on voit qui mène sans lire un chiffre, mais les chiffres restent affichés. En haut : « CLÔTURE {jour} À {heure} · DANS {h} H {mm} · {v} VOIX SUR {total} » (`closes_at`, joueurs de la saison), la réplique `duelRegle`. Sous chaque porte : le titre, « {réalisateur} · {année} », « {n} VOIX », le bouton « Ouvrir cette porte » (avec « +{EXP_VOTE} EXP » seulement si le joueur n'a pas encore voté : seul le premier vote est crédité). Votants seulement si la page actuelle les montre déjà. À la clôture (vue sur la page grâce à `constaterClotureDuel`, §11.8, ou au chargement après) : la porte perdante s'éteint doucement (1,5 s) et ne se rallume plus ; « {VAINQUEUR} — SA PORTE RESTE ÉCLAIRÉE — SÉANCE {jour} {heure} · +{EXP_DUEL_WIN} EXP ». Duel en attente, aucun duel : états actuels, habillés. « Réduire les animations » : extinction immédiate |
| H5 | `/classement` | Les survivants | **Structure.** Une liste sobre, pas un podium : rang, avatar ou initiale, pseudo, « {nn} · {rôle} », la lumière qui avance vers le rôle suivant (jauge fine), EXP. En tête, si personne n'a atteint le niveau 12 : une ligne « NIVEAU 12 · LA DERNIÈRE FILLE — » et la réplique `classementVide` ; sinon cette ligne disparaît. Ta ligne est la seule éclairée (lueur). « SAISON {n} · CLASSEMENT DES JOUEURS » |
| H6 | `/profil` | Ton dossier | **Structure.** À gauche, un polaroïd punaisé (avatar, ou initiale en Cormorant sur fond brume) et sa légende manuscrite, la réplique `polaroid`. Au centre : « DOSSIER N° {6 premiers caractères de l'identifiant, en capitales} », le pseudo, le rôle en italique lueur, la jauge « EXP · NIVEAU {nn} — {exp} / {palier suivant} », « {x} AVANT « {rôle suivant} » » (à partir du niveau 12 : « {x} AVANT LE NIVEAU {nn + 1} »). Trois chiffres : « VICTIMES » (films vus), « NOTES GRIFFÉES » (nombre de notes), « PORTES OUVERTES » (nombre de votes). **L'autre dossier**, « CELUI QU'ON TIENT SUR TOI » (cadre pointillé rouge : en dehors des pastilles de non-lus et des boutons de suppression de la messagerie du profil, la seule touche de rouge de la page), **uniquement avec les données du joueur lui-même**, formulées comme une filature : « SUIVI DEPUIS {n} jours » (`created_at` ; le jour même : « SUIVI DEPUIS AUJOURD'HUI ») ; « DERNIÈRE TRACE {titre}, le {jj.mm} à {heure} » (son dernier `watched_at` ; aucun visionnage : « aucune, pour l'instant ») ; « TES HEURES surtout {plage} » (la plage où tombent le plus de ses `watched_at`, heure de Paris : le matin 6-12 h, l'après-midi 12-18 h, le soir 18-22 h, après 22 h 22-6 h ; moins de 5 visionnages : « pas encore assez de traces ») ; « CE QU'IL SAIT ton film préféré : {titre} ({note}/10) » (sa meilleure note, la plus récente en cas d'égalité ; aucune note : « rien, pour l'instant »). Jamais le nom d'un autre joueur ; jamais dans les notifications ni dans les messages. Puis la bio entre guillemets et « Modifier la bio » ; « PIÈCES À CONVICTION · CHOISIS CELLE QU'ON VOIT À CÔTÉ DE TON NOM » : les vrais badges (§3), obtenus éclairés, les autres éteints avec « — pas encore ». À droite, « LES DOUZE RÔLES » et leurs paliers, l'actuel marqué d'un filet lueur. Modifier le pseudo, Changer la photo, les notifications : littéraux |
| H7 | `/forum` | La veillée | **Structure.** « {n} HISTOIRES · {m} BOUGIES ENCORE ALLUMÉES ». Chaque sujet est une histoire avec sa bougie : allumée si un message date de moins de 3 jours, éteinte sinon (un filet de fumée). Le titre, « RACONTÉE PAR {pseudo} · {il y a …} », la dernière phrase dite entre guillemets (90 caractères au plus), le nombre de messages. Bouton « Raconter une histoire ». Pied : la réplique `veilleePied`. « Réduire les animations » : flammes fixes |
| H8 | `/semaine` | Les sept nuits | **Structure.** « SEMAINE {nn} / {total} — » et les dates de `formatSemaine` (§8.8). Sept colonnes, une par nuit, du lundi au dimanche : lundi 00:00 « La lumière change » ; en lueur, les deux séances (le vainqueur du duel, « la porte restée éclairée · +{EXP_DUEL_WIN} » ; le film de la semaine, « la nuit de {jour} · +{EXP_FDLS} ») ; en lune, l'information (« Les portes ferment » à l'heure de `closes_at`, la fenêtre de la dernière archive si `canMarkLatestWeekArchiveNow` existe toujours, la fin du bonus 48 h à son vrai moment) ; la nuit en cours mise en avant. « LES {total} SEMAINES DE LA SAISON » : la bande de saison (§11.11), « Semaine I, II… » et le genre de chaque semaine. « CE QU'IL FAUT POUR PASSER LA SEMAINE » : les montants des réglages. « EN RÉSERVE CETTE SEMAINE » : 4 films dont `films.genre` ou `films.sousgenre` vaut « Horreur » (valeur de `lib/tmdb.ts`), tirés au sort chaque jour dans le catalogue ouvert ; bloc caché s'il n'y en a aucun |
| H9 | `/marathoniens` | Ceux qui restent | **Structure.** Une photo de groupe à l'ancienne : **tous** les joueurs de la saison en portraits ovales (avatar ou initiale), pseudo, rôle, EXP. Au bout du dernier rang, une place de plus, vide, à peine visible : c'est du décor (sans nom, sans lien, `aria-hidden`), et l'exception assumée de §3. Dessous, écrite à la main, la réplique `restentPied`. En-tête « SAISON {n} · {total} INSCRITS · PHOTO DE GROUPE, {mois} {année} » |
| H10 | barre | Le plan de la maison | Catégories La nuit, La cave, Le village, La forêt (annexe B.1), toutes les entrées et leurs conditions, en Plex Mono capitales ; l'entrée « Vidéoclub » garde son point doré |
| H11 | `/notes` | Le registre | Habillage. La note en dix griffes, par groupes de cinq ; onglets « Le registre » et « La fosse » (après Le Rageux) ; « {n} FILMS NOTÉS · CLASSEMENT PONDÉRÉ PAR LE NOMBRE DE VOTANTS » |
| H12 | `/rattrapage` | Les cercles | Habillage. Trois cercles (§16.3) |
| H13 | `/watchlist` | La liste noire | Habillage. « Les listes noires du village » pour `/watchlist/public`. « {n} FILMS · {m} RAYÉS ». Renommer, Rendre privée, Supprimer et le message de limite journalière restent littéraux ; supprimer une liste déclenche le froid |
| H14 | `/messages` | Les appels | Habillage. En en-tête, la réplique `appelsManques` (« {n} APPELS MANQUÉS · SEULS VOUS DEUX ENTENDEZ »), `appelsManques1` pour un seul, `appelsManques0` pour aucun ; un non-lu est un appel manqué (pastille rouge) ; le rôle du correspondant sous son nom (il faut son EXP : la messagerie ne lit aujourd'hui que `id, pseudo, avatar_url` des correspondants, `MessagesLoader.tsx` ~88 ; ajoute `exp` à cette lecture). Aucune sonnerie. « Écris un message... » inchangé ; Bloquer / Débloquer littéraux |
| H15 | `/forum/[id]` | Une histoire | Habillage. « ← La veillée · histoire {nn} ». Chaque message : pseudo, « {nn} · {RÔLE} · {heure} » ; « (toi) » ; Modifier / Supprimer littéraux. Le texte se lit comme un livre (Spectral) |
| H16 | `/easter-eggs` | Les bandes retrouvées | Habillage. Introduction `eggsIntro`. Trouvé = « Retrouvée » (`eggFound`), avec l'horodatage vert de caméra de nuit « REC {jj.mm} » (date de découverte, déjà connue de la page) ; pas trouvé = « Disparue » (réplique `oeufEnterre`), « Pas encore découvert » reste littéral. « {n} BANDES RETROUVÉES SUR {total} » |
| H17 | `/auth` | Frapper à la porte | Titre seulement ; réinitialisation : « Tu as perdu la clé » ; compte à rebours : « La nuit tombe dans » ; avertissement de saison en cours : titre « La nuit a déjà commencé », phrase d'origine. Formulaire littéral |
| H18 | par-dessus les pages | Les signes | Titres de l'annexe B.2 (« Entre. Lis les règles d'abord. », « Rejoindre ceux qui restent », « Quelqu'un lit ta demande », « Tu es des nôtres — Saison {n} », toast « Rayé — {titre} » avec « +{n} EXP »), phrase d'origine ; fenêtre de 24 h : titre du code ; chargement : le rembobinage ; états vides : « Personne. Pour l'instant. » et la respiration ; erreur : « Quelque chose a coupé le courant. » puis le message d'origine ; « refusée », « 18+ », « Signalement envoyé » jamais habillés |
| H19 | radio | Le transistor | §16.6 |
| H20 | par-dessus les pages | L'apparition | §16.8 |
| 404 | — | Il n'y a rien derrière cette porte | La respiration, la ligne, le lien retour |

### 16.8 L'apparition, et ses garde-fous (œuf #37)

The Legendre a demandé un sursaut à la Slender Man. Ni le personnage ni son jeu ne sont reproduits (ils sont protégés) : l'apparition utilise **la forme**, la silhouette du thème, aux proportions humaines normales.

**Deux réglages**, enregistrés comme ceux de la radio (action serveur validée) ; colonnes de `profiles` (M3), vides tant que le joueur n'a rien choisi, le code appliquant alors sa valeur par défaut ; `localStorage` (`cm_reglages`) pour les visiteurs :

- **Sursauts** (`profiles.sursauts`), dans la radio : **activés par défaut** ; coupés, plus d'apparition.
- **Son** (`profiles.son_horreur`) : **activé par défaut** (choix de The Legendre). C'est une **case à cocher** toujours visible en bas à gauche de l'écran pendant la semaine Horreur, sur les routes qui ont des comportements (§11.6) : un vrai `<input type="checkbox">` avec son libellé visible « Son » (Plex Mono capitales, 12 px) et le nom accessible « Son du thème », cochée par défaut, zone cliquable de 44 px de haut, niveau `--z-fab`. Ordinateur : juste à droite du petit poste de la radio fermée, sur la même ligne ; radio ouverte, à droite de son panneau, en bas. Téléphone : en bas à gauche, au-dessus de la barre du bas (`--bas-libre`, rangée 1, §8.9) ; cachée quand le tiroir est ouvert. Décochée : le thème ne fait plus aucun son (aujourd'hui, le bruit du sursaut ; plus tard, les sons d'ambiance s'ils sont produits). La musique de la radio garde son propre interrupteur. Le changement est enregistré tout de suite.

**Prévenu, une fois par semaine Horreur** (H20, volet 3). La première fois que le joueur passe 10 s sur une page pendant une semaine Horreur, une petite carte s'ouvre en bas à gauche (au-dessus de la radio ; au téléphone, au-dessus de la barre du bas, rangée 2, §8.9), sans bloquer la page : la réplique `prevenuTitre`, la réplique `prevenuTexte`, et deux boutons, « Compris » et « Couper les sursauts » (qui coupe le réglage « Sursauts »). **Tant que le joueur n'a pas répondu, aucune apparition.** La carte ne s'ouvre pas si l'apparition est déjà coupée (« Sursauts » coupés, « Œufs du thème » éteint, œuf #37 coupé, « réduire les animations »). Réponse gardée dans `localStorage` (`cm_prevenu` = le lundi de la semaine).

**Les règles** (non négociables) :

| Règle | Valeur |
|---|---|
| Quand | de 8 h à 12 h et de 18 h à 4 h, heure de Paris ; jamais en dehors |
| Pas avant | 5 minutes de visite, page visible (`useTempsVisible`) |
| Combien | 2 apparitions au plus par jour ; le jour commence à 4 h (`parisJour(now, 4)`) |
| Écart | 30 minutes au moins entre deux apparitions |
| Après un sursaut | plus rien jusqu'au lendemain, 4 h |
| Coupée si | « Sursauts » coupés, « Œufs du thème » éteint, œuf #37 coupé dans l'admin, « réduire les animations », ou joueur pas encore prévenu |
| Jamais | pendant une saisie, un jeu, un autre œuf, une fenêtre ouverte (`ecranOccupe({ seuilZ: 500, part: 0.3 })`), onglet caché, ni sur les routes sans comportement (§11.6) |
| Le son | oui par défaut ; muet si la case « Son » est décochée ou si le volume de la radio est à 0 |

État gardé dans `localStorage` (`cm_apparition` : jour, nombre, sursaut reçu, heure de la dernière), donc par navigateur ; stockage indisponible : pas d'apparition (§11.6). Écris la décision dans une **fonction pure** `apparitionPermise({ now, tempsVisible, etat, reglages })`, testée (§16.11).

**Le déroulé** :

1. **Le moment** : quand tout est permis, un délai tiré au hasard entre 0 et 20 minutes ; à son terme, si quelque chose bloque, nouvel essai chaque minute.
2. **Elle vient (6 s)** : la forme (même dessin que dans le décor, environ 55 % de la hauteur de la fenêtre) entre lentement par le bord gauche ou droit (1,5 s), puis ne bouge plus. Niveau `--z-fx`, `pointer-events` sur la silhouette seulement (zone cliquable : sa boîte, plus 16 px), `aria-hidden`.
3. **Cliquée (ou touchée) dans les 6 s** : elle disparaît sans un bruit ; une ligne s'écrit en bas de l'écran pendant 3 s, la réplique `apparitionVue` ; la première fois, `discoverThemeEgg('theme-horreur-apparition')`. Pas de sursaut. L'apparition compte dans les deux du jour.
4. **Pas cliquée : le sursaut, 1,2 s.** Un calque plein écran (z-index 480 : au-dessus des effets, sous les fenêtres et les toasts), une neige de bande VHS **sombre** (aucun point plus clair que #4D4D4D, soit une luminance relative de 0,074 ; le motif change 12 fois par seconde au plus : deux images successives diffèrent de moins de 0,1 en luminance, ce n'est jamais un flash ; la neige du kit, `.neige`, est trop claire : assombris-la), la forme tout près, au centre (90 % de la hauteur), le bruit de bande ; puis tout revient en 0,3 s. Le passage à la neige compte pour un flash ; il n'y en a pas d'autre. Ensuite, plus rien jusqu'au lendemain 4 h.
5. **Le bruit** : fabriqué par le navigateur (Web Audio), aucun fichier : 1,2 s de bruit blanc filtré (passe-bande autour de 1 à 3 kHz), attaque de 30 ms, extinction de 200 ms, gain = volume de la radio / 100 × 0,6 (soit 0,24 au volume par défaut, 40), seulement si la case « Son » est cochée. Le contexte audio est créé, ou relancé (`resume()`), **dans le gestionnaire** d'un `pointerup`, `touchend`, `click` ou `keydown` du joueur (écouteurs sur `document`, en phase de capture), à chaque geste tant que son `state` n'est pas `running` : Safari et iOS l'exigent, le faire plus tard, hors de ce gestionnaire, ne marche pas partout, et `pointerdown` seul ne suffit pas sur iOS. Cocher la case « Son » compte aussi comme geste. Sur iOS, joue au même moment un tampon silencieux d'un échantillon (il déverrouille la sortie). Sur iPhone, le mode silencieux coupe normalement ce son : c'est accepté, on ne le contourne pas. Si le contexte n'a pas pu démarrer, le sursaut est muet.
6. **Accessibilité** : calques `aria-hidden`, pas de piège de focus, rien n'est annoncé aux lecteurs d'écran ; la page redevient utilisable au bout de 1,5 s au plus.

Même règles au téléphone (un toucher vaut un clic).

### 16.9 Les autres œufs du thème

**#34 — Le ballon rouge** (`theme-horreur-ballon`).

- **Armé** : règles de §11.8, l'œuf pas encore trouvé (joueur connecté : la liste de ses œufs ; visiteur : `localStorage` `cm_ballon_trouve`), et le stockage disponible (§11.6).
- **Une fois par jour** (`parisJour(now, 4)`), après **2 minutes** de visite (`useTempsVisible`) : un ballon rouge (`.h-ballon` du kit, le seul rouge saturé du thème) monte très lentement depuis le bas de l'écran, à un endroit pris au hasard (entre 10 % et 90 % de la largeur), avec un léger balancement, et sort par le haut en 40 s. Aucun son. Niveau `--z-fx`, `pointer-events` sur le ballon seul, `aria-hidden`. Son calque est découpé sous la barre du haut (`top` = hauteur de la barre + zone sûre, `overflow: hidden`) : le ballon disparaît sous la barre, il ne passe jamais par-dessus.
- **Cliqué ou touché pendant qu'il monte** : il n'éclate pas. La ficelle glisse vers le haut, le ballon sort vite (0,8 s), une ligne s'écrit en bas de l'écran pendant 3 s, la réplique `ballon` ; `discoverThemeEgg('theme-horreur-ballon')`. Il ne revient plus jamais.
- **Pas cliqué** : il revient le lendemain, et chaque jour, jusqu'à ce qu'il le soit (`localStorage` `cm_ballon` = jour où il est passé).
- « Réduire les animations » : il apparaît immobile en haut à droite, sous la barre, pendant 10 s.
- Jamais sur les routes sans comportement, jamais pendant un œuf, une fenêtre ouverte ou une saisie : il attend.

**#35 — La possession** (`theme-horreur-possession`).

- **Déclencheur** : taper « exorciste » hors d'un champ de saisie (écouteur propre au thème, même garde que D10, tampon des 9 derniers caractères imprimables, en minuscules). Secours au toucher : 5 touchers en moins de 3 s sur la marque « Le Marathon Cinéma » (`[data-brand-title]` ; le premier toucher peut ramener à l'accueil, le compte continue).
- **L'effet, 2 s** : la classe `possede` sur `<html>` applique `unicode-bidi: bidi-override; direction: rtl` aux éléments de texte de `#site` (`h1` à `h6`, `p`, `a`, `button`, `label`, `li`, `td`, `th`, `span`, `figcaption`, `blockquote`) : la plupart des textes de la page s'écrivent à l'envers, lettre par lettre, puis se remettent à l'endroit (un texte posé directement dans un `div` reste à l'endroit : c'est accepté). La lampe s'éteint pendant ce temps (le même voile, à 100 %). Pas d'image, pas de son, pas de voix. Le texte du DOM ne change pas : les lecteurs d'écran lisent à l'endroit. Pas de `transform` (§3). Quelques éléments peuvent s'inverser dans leur rangée pendant 2 s : c'est accepté.
- « Réduire les animations » : identique (rien ne bouge).
- Premier déclenchement : `discoverThemeEgg('theme-horreur-possession')`.

**#36 — Tourner en rond** (`theme-horreur-cercle`).

- **Déclencheur** : visiter trois pages différentes dans le même ordre, deux fois de suite (A, B, C, puis A, B, C) pendant la semaine Horreur. Dans `sessionStorage` (`cm_chemin`), les six dernières adresses visitées (chemin seul, sans paramètres) ; deux adresses identiques de suite ne comptent qu'une fois (rechargement, même page). Rien sur le serveur.
- **L'effet** : la page s'assombrit une seconde (calque noir à 60 %, `--z-fx`, fondus de 0,3 s), une ligne s'écrit, la réplique `cercle` ; un petit tas de pierres (SVG original, `aria-hidden`) reste posé en bas du contenu de chaque page jusqu'à la fin de la visite (`sessionStorage` `cm_cairn`), dans un emplacement en fin de `main` (comme la rampe de la Comédie). L'effet joue une fois par visite.
- « Réduire les animations » : l'obscurité apparaît et disparaît sans fondu.
- Premier déclenchement : `discoverThemeEgg('theme-horreur-cercle')`.

**#37 — L'apparition** (`theme-horreur-apparition`) : §16.8.

### 16.10 Au téléphone

Règles du socle en §8.9 ; ce qui est propre à l'Horreur :

- **La lampe** suit le dernier toucher, puis s'éteint doucement en 4 s (§16.4). Elle reste un calque déplacé par `transform` : rien n'est repeint, même au téléphone.
- **Décor** : lisière et brume gardées ; le grain passe à 5 %. Barre du haut et barre du bas en Plex Mono capitales 12 px, entrée active en lueur avec un trait de lumière au-dessus (comme sous une porte).
- **La porte** (H1) : au téléphone, pas de survol : les deux ombres passent **une fois**, toutes seules, quand la porte arrive à l'écran (`IntersectionObserver`) ; un toucher l'entrouvre et ouvre la jaquette, sans attente.
- **La forme** : après 30 s sans toucher ni défilement. Comme la lampe s'est éteinte entre-temps, le halo se rallume doucement (1 s) à sa dernière place, et la forme se tient à son bord ; au premier geste, elle n'y est plus.
- **La case « Son »** (§16.8) : en bas à gauche, au-dessus de la barre du bas (`--bas-libre`, rangée 1), 44 px de haut ; elle ne recouvre jamais une entrée de la barre. **La carte « prévenu »** s'ouvre au-dessus d'elle, pleine largeur moins 16 px de chaque côté.
- **Le ballon** (#34) : un toucher vaut un clic, zone tactile de 44 px au moins ; son calque est découpé entre les deux barres (`top` = hauteur de la barre du haut + zone sûre, `bottom: var(--bas-libre)`, `overflow: hidden`) : le ballon naît au bas de ce calque et disparaît sous la barre du haut, jamais par-dessus une barre.
- **L'apparition** (#37) : un toucher vaut un clic, zone tactile de 44 px au moins autour de la silhouette ; elle entre par le bord gauche ou droit, les pieds à `--bas-libre`, haute d'environ 55 % de l'écran.
- **La possession** (#35) : le secours au toucher (5 touchers sur la marque, `touch-action: manipulation`) est la voie normale au téléphone.
- **Radio** : la ligne « La radio » du tiroir ouvre le transistor en feuille plein écran ; le réglage « Sursauts » y est ; la case « Son » reste en bas à gauche.

| Écran | Au téléphone |
|---|---|
| H1 | La porte en haut (40dvh de haut, centrée), puis « LA NUIT DE {jour} · {heure} », le titre en Cormorant (`clamp(40px, 12vw, 64px)`), la ligne du réalisateur, « {n} sur {total} l'ont déjà rayé », le synopsis, « Rayer » et « Lire la jaquette » pleine largeur, le bouton du direct, la réplique. Puis « Les deux portes », « Les sept nuits », puis les quatre colonnes empilées (traces, survivants, ta nuit, journal), puis la ligne des règles |
| H2 | Grille intacte (3 colonnes au téléphone), une boîte VHS par carte, l'étiquette « VICTIME · {jj.mm} » en 12 px ; l'étiquette passe sur deux lignes si elle ne tient pas |
| H3 | Feuille plein écran, le dos de la boîte en une colonne (affiche à 60 % de la largeur, puis le texte) |
| H4 | Les deux portes restent côte à côte (chacune 45 % de la largeur), leur titre et leur bouton « Ouvrir cette porte » sous chacune, à la largeur de sa porte (texte sur deux lignes permis, 44 px de haut au moins) ; l'échéance en haut |
| H5 | Liste sobre gardée ; la jauge de lumière sur une seconde ligne |
| H6 | Le polaroïd en haut (60 % de la largeur, légèrement de travers), puis le dossier, les trois chiffres sur une ligne, l'autre dossier, la bio, les pièces à conviction sur 2 colonnes, puis les douze rôles en liste |
| H7 | Les histoires en liste pleine largeur, la bougie à gauche de chaque titre, flamme fixe au téléphone (une seule animation continue par écran, §8.9, point 12 : une flamme qui vacille par sujet en ferait des dizaines) |
| H8 | Les sept nuits en liste verticale (une nuit par ligne, la nuit en cours mise en avant) ; puis les semaines de la saison, les objectifs, la réserve (2 colonnes) |
| H9 | Portraits ovales sur 3 colonnes ; la place vide à la fin du dernier rang ; la phrase manuscrite dessous |
| H10 | Tiroir noir, catégories en Plex Mono capitales, puce de semaine longue en tête |
| H11 à H17 | Règles du neutre (§9.7), habillées |
| H18 | Toasts au-dessus de la barre du bas ; le rembobinage traverse l'écran |
| H19 | Le transistor en feuille plein écran |
| H20 | Le calque du sursaut couvre tout l'écran, zones sûres comprises |
| 404 | La respiration, la ligne et le lien pleine largeur |

### 16.11 Critères d'acceptation de la phase 10

- `lib/supabase/types.ts` connaît `profiles.sursauts` et `profiles.son_horreur` (M3) ; `npm run build` passe.
- La case « Son » est visible en bas à gauche sur les pages de la semaine Horreur qui ont des comportements (§11.6), cochée par défaut ; décochée, le sursaut est muet ; l'état est gardé (compte ou navigateur) et suit le joueur d'une page à l'autre.
- Planning ou bouton de l'admin sur Horreur : tout le site passe en Horreur sans redéploiement et sans flash ; l'admin et `/videoclub` restent neutres, sans lampe ni apparition.
- La lampe ne cache jamais l'interface : tout texte et tout bouton restent lisibles partout. Bouger la souris ne repeint pas la page (outils du navigateur : seul le calque de la lampe bouge).
- Aucun rouge hors des usages de §16.2 (bandeaux 18+ mis à part) ; pas de vert ailleurs que sur les horodatages des bandes retrouvées ; aucune image interdite (§16.1).
- « Rayer » ne sert qu'à marquer vu ; le compteur de films vus s'appelle « victimes » ; un film pas vu est « toujours en vie ».
- Les quatre œufs se déclenchent seulement pendant la semaine Horreur, jamais s'ils sont coupés (admin ou radio) ; en aperçu, effets sans enregistrement ; « Tester » (§11.4) joue le ballon, l'apparition (jusqu'au sursaut), la forme, la possession et Tourner en rond.
- Tests Vitest de `apparitionPermise` : 07:59 non, 08:00 oui, 11:59 oui, 12:00 non, 18:00 oui, 03:59 oui, 04:00 non ; moins de 5 minutes de visite : non ; troisième du jour : non ; moins de 30 minutes après la précédente : non ; après un sursaut : non jusqu'à 4 h, oui à 8 h le lendemain ; « Sursauts » coupés, « Œufs du thème » coupés ou « réduire les animations » : non ; pas prévenu : non ; stockage indisponible : non. Et le changement de jour à 4 h le 25 octobre 2026 (retour à l'heure d'hiver).
- « L'autre dossier » n'affiche que les données du joueur lui-même.
- « Réduire les animations » : lampe fixe, pas de forme, ballon immobile, pas de respiration, pas d'apparition, pas d'ombres sous la porte ; tout reste lisible.
- Les 25 œufs d'origine passent au-dessus du décor et des effets et marchent tous ; ceux des trois autres thèmes restent muets.
- Contraste vérifié sur chaque écran, rien sous 12 px.
- Au téléphone (§16.10), à 360, 390 et 430 px : chaque écran sans défilement horizontal, cibles de 44 px, lampe au toucher, case « Son » au-dessus de la barre du bas, apparition et ballon au toucher.
- Sur un vrai iPhone (Safari), mode silencieux désactivé : après un premier toucher sur la page, l'apparition lancée par « Tester » fait son bruit au sursaut ; case « Son » décochée, elle est muette. Même essai sur Chrome Android.

---

## 17. Phase 11 — Ce qui n'est pas du code (pour The Legendre)

Claude Code ne peut pas faire ces points : il les rappelle dans le compte rendu de la phase concernée.

1. **Migrations** : les exécuter dans Supabase (SQL Editor) quand Claude Code le demande, dans l'ordre M1 → (mise en ligne de la phase 1A) → M2 → M3 → M4.
2. **Mot de passe** : dans Supabase, réglages d'authentification par mot de passe → longueur minimale **8**. C'est la seule protection réelle (l'inscription se fait depuis le navigateur).
3. **Vercel** : dire à Claude Code si le compte est en plan Hobby ou Pro (planning du cron) ; vérifier que `REDIS_URL` existe en Production **et** en Preview ; vérifier que les variables Supabase existent aussi pour les aperçus (Preview).
4. **Nom de domaine : `lemarathoncinema.fr`** (libre le 1er octobre d'après le registre du .fr ; seul le bureau d'enregistrement le confirme à l'achat). Dans cet ordre, **après la mise en ligne de la phase 1B** (§7.5), jamais la semaine du 25 octobre ni un jour de séance :
   1. Acheter `lemarathoncinema.fr` chez un bureau d'enregistrement (OVH, Gandi, Cloudflare…).
   2. Vercel → le projet → Settings → Domains : ajouter `lemarathoncinema.fr` et `www.lemarathoncinema.fr` (Vercel propose le second) ; poser chez le bureau d'enregistrement **les enregistrements DNS exacts que Vercel affiche** ; attendre « Valid Configuration ». Adresse principale : `lemarathoncinema.fr`, le `www` y redirige (Vercel conseille plutôt l'inverse pour sa propre souplesse ; les deux marchent).
   3. **Ne pas** mettre tout de suite l'ancienne adresse en redirection dans Vercel : pendant le déménagement, c'est le site qui s'en charge (§7.5), sinon les données du navigateur des joueurs (progression de Clippy, classements de Fight Club…) sont perdues.
   4. Vercel → Environment Variables (Production) : `NEXT_PUBLIC_SITE_URL=https://lemarathoncinema.fr` et `ANCIENS_DOMAINES` = l'ancien domaine **en punycode** (`xn--…`, `www` compris s'il sert ; ajoute `cinema-marathon.vercel.app` si des joueurs l'utilisent), puis redéployer.
   5. Supabase → Authentication → URL Configuration : « Site URL » = `https://lemarathoncinema.fr` ; dans « Redirect URLs », ajouter `https://lemarathoncinema.fr/**` et **garder les anciennes** jusqu'à la fin du déménagement. Vérifier que les modèles de mail (Authentication → Emails) passent par `{{ .SiteURL }}` ou `{{ .RedirectTo }}`, sans l'ancienne adresse écrite en dur.
   6. Resend : ajouter le domaine `lemarathoncinema.fr`, poser les enregistrements DNS qu'il donne, attendre la vérification, puis `FROM_EMAIL=Le Marathon Cinéma <noreply@lemarathoncinema.fr>`. Une adresse en `vercel.app` ne peut pas être vérifiée chez Resend : si `FROM_EMAIL` n'est pas posée aujourd'hui, les mails de rappel ne partent probablement pas.
   7. Prévenir les joueurs (Discord) : nouvelle adresse, une reconnexion à faire, rien d'autre de perdu. Mettre à jour les liens du serveur Discord. Vérifier que le salon Chatango du forum s'affiche sur la nouvelle adresse.
   8. **Fin du déménagement**, à la fin de la saison (ou au plus tôt huit semaines après) : vider `ANCIENS_DOMAINES`, mettre l'ancien domaine en redirection vers `lemarathoncinema.fr` dans Vercel (Domains → Edit → Redirect to), retirer les anciennes adresses des « Redirect URLs » de Supabase. **Garder l'ancien domaine au moins un an** (renouvellement payé) : les vieux liens continuent de marcher et personne ne le récupère.
5. **Plateforme de direct** : choisir la plateforme privée qui remplace le partage d'écran Discord, puis coller le lien dans Admin → Séances.
6. **Musiques** des thèmes (« Heure H », « Entracte », « La piste », « La maison ») : originales ou sous licence vérifiée, en boucle ; déposer `public/audio/themes/action.mp3`, `comedie.mp3`, `western.mp3` et `horreur.mp3`, puis demander à Claude Code de renseigner `radioTrack`.
7. **Citations et répliques** de la Comédie, du Western et de l'Horreur (`lib/themes/*.ts`, annexe B.3) : relire la formulation exacte, corriger au besoin dans l'admin (Contenu → Textes des thèmes).
8. **Polices au build** : autoriser `fonts.googleapis.com` et `fonts.gstatic.com` dans l'accès réseau de l'environnement de Claude Code, sinon `npm run build` échoue chez lui.
9. **Clés de signature Supabase** : pour que la vérification des sessions devienne locale (P10), passer le projet aux clés de signature asymétriques (Supabase → réglages JWT → « JWT Signing Keys »). Facultatif, sans risque pour le site.
10. **Valeurs d'EXP de Vercel** : donner à Claude Code les variables `NEXT_PUBLIC_EXP_FILM`, `NEXT_PUBLIC_EXP_FDLS`, `NEXT_PUBLIC_EXP_DUEL_WIN` (rattrapage de M1).
11. **Pour que Claude Code puisse regarder le site tourner** dans sa session cloud (facultatif) : ajouter dans l'environnement de la session `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clés publiques), et autoriser le domaine Supabase dans l'accès réseau. **Jamais la clé `service_role`.**
12. **Le planning** : placer les semaines des quatre thèmes dans l'admin (Thème & saison). Pour mettre l'Horreur sur la semaine d'Halloween (du lundi 26 octobre au dimanche 1er novembre 2026) : c'est la première semaine d'heure d'hiver, la phase 1A doit être en ligne.
13. **Essayer l'apparition et la case « Son »** sur un vrai téléphone et un vrai ordinateur (menu « Tester », §11.4). Le son est actif par défaut (§16.8) : c'est une valeur du code, la changer ne demande pas de migration.
14. **Valider chaque phase sur un vrai téléphone** (iPhone et Android si possible), sur l'aperçu Vercel, en plus de l'ordinateur.

---

# Annexes

## Annexe A — Les jetons

Noms communs à tous les thèmes : les composants partagés ne lisent que ceux-là. Chaque thème peut ajouter ses jetons à lui (après les communs). Contrastes calculés (WCAG) : `--ink`, `--ink2`, `--ink3`, `--accent-fg`, `--info`, `--bad-fg` font tous au moins 4,5:1 sur `--bg` et `--s2` (en Western, aussi sur la partie la plus claire des planches, #3A2A1B). `--ink-ghost` n'est **jamais** du texte informatif.

### A.1 Neutre (`app/styles/tokens.css`)

```css
:where(:root), [data-theme="neutre"] {
  color-scheme: dark;
  /* surfaces */
  --bg: #08080E;  --s1: #0F0F1A;  --s2: #171726;  --s3: #202032;
  --line: rgba(238,238,248,.10);  --line2: rgba(238,238,248,.20);
  /* texte */
  --ink: #EEEEF8;  --ink2: #9A9ABF;  --ink3: #808098;  --ink-ghost: #5E5E7D;
  /* accent : --accent pour les surfaces, --accent-fg pour le texte et les icônes */
  --accent: #E8C46A;  --accent-ink: #08080E;  --accent-fg: #E8C46A;  --accent-2: #E8C46A;
  --info: #9A9ABF;
  /* états */
  --ok: #4FD98A;  --warn: #E8A05A;  --bad: #E85A5A;  --bad-fg: #E85A5A;
  /* constantes : identiques dans tous les thèmes, aucun thème ne les redéfinit */
  --adult: #E85A5A;  --strange: #A05AE8;  --neon-vc: #E8C46A;
  /* typographie */
  --f-display: var(--ff-inter), system-ui, sans-serif;
  --disp-weight: 900;  --disp-style: normal;  --disp-case: none;  --disp-track: -.035em;
  --f-ui: var(--ff-inter), system-ui, sans-serif;  --ui-case: uppercase;  --ui-track: .14em;
  --f-body: var(--ff-newsreader), Georgia, serif;
  --f-data: var(--ff-jetbrains), ui-monospace, monospace;
  /* formes, textures, mouvement */
  --radius: 2px;  --skew: 0deg;
  --tex: none;  --grit: none;
  --ease: cubic-bezier(.2,.8,.2,1);  --dur: 160ms;
  --cursor: auto;  --cursor-survol: pointer;  --cursor-clic: pointer;
  /* échelles */
  --fs-1: 12px; --fs-2: 13px; --fs-3: 14px; --fs-4: 16px; --fs-5: 18px;
  --fs-6: 21px; --fs-7: 26px; --fs-8: 34px; --fs-9: 48px; --fs-10: 74px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;
  --z-decor: 0; --z-nav: 100; --z-drawer: 195; --z-bottomnav: 200; --z-fab: 210;
  --z-fx: 450; --z-modal: 500; --z-toast: 9999;
}

/* Bas de l'écran (§8.9) : hors du bloc des thèmes, aucun thème ne les redéfinit.
   Valeur par défaut au-dessus de 768 px (pas de barre du bas), pour que bottom: var(--bas-libre) reste valable partout */
:root {
  --barre-bas: 0px;
  --bas-libre: calc(env(safe-area-inset-bottom) + 16px);
}
/* Téléphone : la barre du bas a une hauteur fixe ; tout élément fixe du bas se place à --bas-libre */
@media (max-width: 768px) {
  :root {
    --barre-bas: 64px;   /* sans la zone sûre ; .bottom-nav prend height: calc(var(--barre-bas) + env(safe-area-inset-bottom)) */
    --bas-libre: calc(var(--barre-bas) + env(safe-area-inset-bottom) + 8px);
  }
}
```

### A.2 Action (`app/styles/themes/action.css`)

```css
[data-theme="action"] {
  --bg: #090C11;  --s1: #0F141A;  --s2: #161D25;  --s3: #1E2731;      /* béton de nuit, jamais noir pur */
  --line: rgba(232,237,242,.12);  --line2: rgba(232,237,242,.26);
  --ink: #E8EDF2;  --ink2: #8B99A7;  --ink3: #7B858F;  --ink-ghost: #5A6773;
  --accent: #FF6B1F;  --accent-ink: #0B0E12;  --accent-fg: #FF6B1F;  --accent-2: #FFA23D;   /* orange = agir */
  --info: #17A2C9;                                                                          /* cyan = informer */
  --ok: #5FBF8B;  --warn: #FFA23D;  --bad: #C2201C;  --bad-fg: #D4615E;
  --f-display: var(--ff-saira), var(--ff-inter), sans-serif;
  --disp-weight: 900;  --disp-style: italic;  --disp-case: uppercase;  --disp-track: -.005em;   /* italique incliné par le navigateur : Saira Condensed n'a pas d'italique */
  --f-ui: var(--ff-saira), var(--ff-inter), sans-serif;  --ui-case: uppercase;  --ui-track: .08em;
  --f-body: var(--ff-newsreader), Georgia, serif;
  --f-data: var(--ff-jetbrains), ui-monospace, monospace;
  --radius: 0;  --skew: -11deg;                                                            /* le biseau est la signature */
  --tex: repeating-linear-gradient(104deg, rgba(255,162,61,.035) 0 2px, transparent 2px 13px);
  --grit: radial-gradient(rgba(232,237,242,.05) .9px, transparent 1.1px) 0 0 / 4px 4px;
  --chrome: linear-gradient(176deg, #FFFFFF 0%, #A9B4BD 34%, #F2F5F7 48%, #7C8992 64%, #E4E9ED 100%);
  --chrome-frange: drop-shadow(3px 0 0 rgba(255,107,31,.45)) drop-shadow(0 2px 3px rgba(0,0,0,.7));
  --ease: cubic-bezier(.2,.8,.2,1);  --dur: 120ms;
  --cursor: url("/cursors/action-car-0.png") 16 16, auto;            /* la voiture ; le script de l'œuf #26 pose l'orientation (§13.6) */
  --cursor-survol: var(--cursor);  --cursor-clic: var(--cursor);
}
```

Titres en chrome : `background: var(--chrome); -webkit-background-clip: text; background-clip: text; color: transparent; filter: var(--chrome-frange);` (nom du site et titres de page seulement). Rivets, fêlures, jauges : reprendre les classes `.riv`, `.crack` et suivantes de `maquettes/action/theme-action.html`.

### A.3 Comédie (`app/styles/themes/comedie.css`)

```css
[data-theme="comedie"] {
  --bg: #140E10;  --s1: #1E1416;  --s2: #2A1C1D;  --s3: #34231F;      /* la salle, jamais noire ; le plateau */
  --line: rgba(246,233,206,.16);  --line2: rgba(246,233,206,.30);
  --ink: #F6E9CE;  --ink2: #BFA88C;  --ink3: #98836D;  --ink-ghost: #8A7259;
  --accent: #A6141B;  --accent-ink: #FFF3D0;  --accent-fg: #F0D272;  --accent-2: #D4A62A;   /* rideau en surface, or clair en texte */
  --info: #E0728A;                                                                          /* le fard : horaires, dates, durées */
  --ok: #F0D272;  --warn: #E8A05A;  --bad: #C9232A;  --bad-fg: #D86166;                     /* aucun vert, même pour « ok » */
  --f-display: var(--ff-anton), Impact, sans-serif;
  --disp-weight: 400;  --disp-style: normal;  --disp-case: uppercase;  --disp-track: 0;
  --f-ui: var(--ff-oswald), var(--ff-inter), sans-serif;  --ui-case: uppercase;  --ui-track: .08em;
  --f-body: var(--ff-lora), Georgia, serif;
  --f-data: var(--ff-courier), ui-monospace, monospace;
  --f-theatre: var(--ff-playfair), Georgia, serif;     /* nom du théâtre, italiques */
  --f-main: var(--ff-caveat), cursive;                  /* mots courts écrits à la main */
  --radius: 2px;  --skew: 0deg;
  --tex: none;  --grit: none;
  /* jetons propres */
  --rideau-ombre: #7E0D14;  --rideau-vif: #C9232A;
  --or: #D4A62A;  --or-clair: #F0D272;  --or-eteint: #8A6A12;
  --poursuite: #FFF3D0;  --plancher: #4A3226;
  --interdit: #1E7A4A;                                  /* l'ampoule de l'œuf #28, et nulle part ailleurs */
  --ombre-titre: 2px 3px 0 var(--rideau-ombre), 0 0 26px rgba(255,243,208,.24);
  --ease: cubic-bezier(.34,1.4,.5,1);  --dur: 200ms;
  --dur-rideau: 420ms;  --dur-trac: 400ms;  --retard-poursuite: 140ms;
  --cursor: url("/cursors/comedie-chaussure.png") 2 12, auto;        /* la chaussure noire (§11.13) */
  --cursor-survol: url("/cursors/comedie-chaussure-survol.png") 2 12, pointer;
  --cursor-clic: url("/cursors/comedie-chaussure-appui.png") 2 12, pointer;
}
```

`--s3` n'existait pas dans les maquettes : valeur dérivée du plateau, à ajuster à l'œil si besoin.

### A.4 Western (`app/styles/themes/western.css`)

```css
[data-theme="western"] {
  --bg: #2A1E12;  --s1: #1A1410;  --s2: #211910;  --s3: #3A2A1B;       /* le bois ; la nuit des panneaux ; la devanture */
  --line: rgba(227,207,164,.17);  --line2: rgba(227,207,164,.32);
  --ink: #E3CFA4;  --ink2: #C3AB7E;  --ink3: #A8916A;  --ink-ghost: #6E5E45;  /* la poussière */
  --accent: #8E2216;  --accent-ink: #F2E3C0;  --accent-fg: #E8836E;  --accent-2: #B93222;   /* le sang : surface ; texte d'action clair */
  --info: #9BA8AE;                                                       /* l'acier, la SEULE couleur froide */
  --ok: #D9AE55;  --warn: #E0A64A;  --bad: #8E2216;  --bad-fg: #E07A68;
  --f-display: var(--ff-rye), Georgia, serif;
  --disp-weight: 400;  --disp-style: normal;  --disp-case: none;  --disp-track: 0;
  --f-ui: var(--ff-bitter), Georgia, serif;  --ui-case: uppercase;  --ui-track: .1em;
  --f-body: var(--ff-bitter), Georgia, serif;
  --f-data: var(--ff-courier), ui-monospace, monospace;
  --radius: 0;  --skew: 0deg;
  --tex: none;  --grit: none;
  /* jetons propres */
  --f-num: var(--ff-alfa), Georgia, serif;                               /* noms, montants */
  --papier: #D8C295;  --papier-2: #C6AC78;  --papier-3: #B79A64;         /* les avis de recherche */
  --encre: #3E2D1C;                                                      /* texte sur le papier et sur le ciel */
  --sang: #8E2216;  --sang-vif: #B93222;  --laiton: #C08A2E;  --laiton-clair: #E6BE6C;
  --impact: #0D0906;                                                     /* le cœur des trous de balle, et rien d'autre */
  --ombre-titre: 3px 3px 0 rgba(20,12,7,.85);
  --ease: cubic-bezier(.16,.84,.34,1);  --dur: 500ms;  --dur-clic: 0ms;  /* tout à 500 ms, sauf le clic */
  --cursor: url("/cursors/western-colt.png") 2 2, auto;               /* point chaud au bout du canon */
  --cursor-survol: url("/cursors/western-colt-survol.png") 2 2, pointer;
  --cursor-clic: url("/cursors/western-colt-appui.png") 2 2, pointer;
}

/* Le trou de balle (kit, classe .imp) : posé au point de l'appui, il reste jusqu'au changement de page. */
.impact { position: absolute; width: 17px; height: 17px; margin: -8.5px 0 0 -8.5px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle at 46% 42%, var(--impact) 0 38%, #241810 52%, rgba(36,24,16,0) 72%);
  box-shadow: 0 0 0 1px rgba(255,238,200,.16), 0 1px 2px rgba(0,0,0,.7); }
.impact::before, .impact::after { content: ""; position: absolute; left: 50%; top: 50%;
  width: 22px; height: 1.4px; margin: -.7px 0 0 -11px; background: rgba(20,12,7,.55); }
.impact::before { transform: rotate(28deg); }
.impact::after  { transform: rotate(-64deg); }
```

Le calque des impacts porte le z-index (90 dans la page, 501 au-dessus d'une fenêtre, §15.4) ; le trou lui-même n'en a pas. Avis de recherche, planches, horizon, soleil, mesas, horloge, crosse, balles : reprendre les classes `.w-av`, `.clou`, `.planches`, `.horizon` (sa forme seulement : couleurs de §15.4), `.soleil`, `.mesa`, `.vent`, `.horloge`, `.crosse`, `.w-balles` de `maquettes/western/theme-western.html`, en portant le papier des avis par un pseudo-élément (§15.2). Pastilles de la carte de l'admin (§12.3) : sang, laiton, acier.

### A.5 Horreur (`app/styles/themes/horreur.css`)

```css
[data-theme="horreur"] {
  --bg: #07080B;  --s1: #0D0F13;  --s2: #1A1D23;  --s3: #2A2D33;       /* la nuit ; la brume ; la pierre (traits, jauges vides : jamais un fond de texte) */
  --line: rgba(217,211,196,.10);  --line2: rgba(217,211,196,.22);
  --ink: #D9D3C4;  --ink2: #9A9CA3;  --ink3: #8A8C93;  --ink-ghost: #4E5158;  /* l'os, la cendre */
  --accent: #E3B56A;  --accent-ink: #07080B;  --accent-fg: #E3B56A;  --accent-2: #F4D9A6;   /* la lueur : la seule chaleur */
  --info: #9AA7B8;                                                       /* la lune */
  --ok: #9AA7B8;  --warn: #E3B56A;  --bad: #B0141C;  --bad-fg: #E5646B;  /* le SEUL rouge */
  --f-display: var(--ff-cormorant), Georgia, serif;
  --disp-weight: 500;  --disp-style: normal;  --disp-case: none;  --disp-track: -.01em;
  --f-ui: var(--ff-plex), ui-monospace, monospace;  --ui-case: uppercase;  --ui-track: .18em;
  --f-body: var(--ff-spectral), Georgia, serif;
  --f-data: var(--ff-plex), ui-monospace, monospace;
  --radius: 0;  --skew: 0deg;
  --tex: none;  --grit: none;                                            /* le grain est dans le décor (.h-grain) */
  /* jetons propres */
  --f-main: var(--ff-reenie), cursive;                                   /* mots courts écrits à la main */
  --rec: #8FA89A;                                                        /* horodatages des bandes retrouvées, et nulle part ailleurs */
  --lampe: 240px;  --grain: .07;
  --ease: cubic-bezier(.3,.1,.3,1);  --dur: 360ms;
  --cursor: auto;  --cursor-survol: pointer;  --cursor-clic: pointer;   /* curseur normal : la lampe suit la souris */
}
```

Forêt, brume, grain, vignettage, forme, ballon, cassette, polaroïd, porche, fente, neige : reprendre les classes `.h-bois`, `.h-brume`, `.h-grain`, `.h-vign`, `.h-forme`, `.h-ballon`, `.h-cas`, `.h-gr` (les griffes), `.h-b1` (le bouton fente), `.pola`, `.porche`, `.fente`, `.neige` (assombrie, §16.8) de `maquettes/horreur/theme-horreur.html`. La lampe du kit (`.h-lampe`) est un dégradé fixe : dans le site, c'est le calque déplacé de §16.4. Pastilles de la carte de l'admin : nuit, lueur, rouge.

---

## Annexe B — Les libellés

### B.1 La barre (`NavKey`)

| Clé | Route | Neutre | Action | Comédie | Western | Horreur |
|---|---|---|---|---|---|---|
| `home` | `/` | Accueil | Accueil | À l'affiche | Le contrat | La porte |
| `videoclub` | `/videoclub` | Vidéoclub | Vidéoclub | Vidéoclub | Vidéoclub | Vidéoclub |
| `catEvenement` | — | Évènement collectif | Opérations | La scène | La chevauchée | La nuit |
| `semaine` | `/semaine` | Films de la semaine | L'opération | L'acte | Le territoire | Les sept nuits |
| `duels` | `/duels` | Duels | Face-à-face | L'applaudimètre | Le duel | Les deux portes |
| `catFilms` | — | Films | Armurerie | La bibliothèque | Les avis | La cave |
| `films` | `/films` | Liste de films | L'arsenal | Le répertoire | Les avis de recherche | Les cassettes |
| `notes` | `/notes` | Classements films | Les relevés | La revue de presse | Le carnet de tir | Le registre |
| `pires` | `/notes?tab=pires` | Pires films | La casse | Les bides | Le cimetière | La fosse |
| `rattrapage` | `/rattrapage` | Rattrapages cinéma | L'entraînement | Le conservatoire | L'école de tir | Les cercles |
| `watchlist` | `/watchlist` | Mes watchlists | Repérages | Mes réservations | Mes cibles | La liste noire |
| `watchlistPublic` | `/watchlist/public` | Watchlists publiques | Repérages de l'unité | Les réservations du foyer | Les cibles de la ville | Les listes noires du village |
| `catSocial` | — | Social | Unité | Le foyer | La ville | Le village |
| `forum` | `/forum` | Forum | Fréquences | Les coulisses | Le saloon | La veillée |
| `marathoniens` | `/marathoniens` | Marathoniens | L'équipe | La troupe | La bande | Ceux qui restent |
| `classement` | `/classement` | Classement joueurs | Tableau de chasse | L'affiche | Le mur des primes | Les survivants |
| `messages` | `/messages` | Messages | Transmissions | Les petits mots | Le courrier | Les appels |
| `catSecret` | — | Secret | Classifié | Les cintres | La planque | La forêt |
| `tamagotchi` | `/tamagotchi` | Mon Alien | Mon Alien | Mon Alien | Mon Alien | Mon Alien |
| `clippyRevanche` | `/clippy-revanche` | La revanche de Clippy | La revanche de Clippy | La revanche de Clippy | La revanche de Clippy | La revanche de Clippy |
| `easterEggs` | `/easter-eggs` | Easter eggs | Dossiers classifiés | Le magasin d'accessoires | Le butin | Les bandes retrouvées |
| `profil` | `/profil` | Mon profil | Fiche d'opérateur | Ta loge | Ton avis de recherche | Ton dossier |
| `admin` | `/admin` | Administration | PC sécurité | La régie | Le bureau du shérif | La chaufferie |
| `logout` | — | Déconnexion | Quitter le toit | La sortie des artistes | Quitter la ville | Éteindre la lumière |
| `login` | `/auth` | Se connecter | Se connecter | Se connecter | Se connecter | Se connecter |

Les barres sont mises en capitales par le CSS (`--ui-case`) : les libellés sont écrits en casse normale.

**Libellés courts de la barre du bas** (téléphone, §8.9 ; champ `navCourt` du `ThemeDef`). « — » = le libellé court du neutre. L'entrée « Menu » s'appelle « Menu » dans tous les thèmes.

| Clé (ordre de la barre) | Neutre (code actuel) | Action | Comédie | Western | Horreur |
|---|---|---|---|---|---|
| `home` | Accueil | — | Affiche | Contrat | Porte |
| `films` | Films | Arsenal | Pièces | Avis | Rayon |
| `notes` | Notes | Relevés | Revue | Carnet | Griffes |
| `forum` | Forum | Canaux | Coulisses | Saloon | Veillée |
| `marathoniens` | Joueurs | Équipe | Troupe | Bande | — |

Chaque libellé court tient dans 60 px à 360 px de large, en 12 px, capitales, `letter-spacing: 0`, dans la police de la barre du thème (§8.9, point 10). Mesuré avec les vraies polices : le plus large est « JOUEURS » en Inter 700 (57 px) ; ensuite « CONTRAT » en Bitter 600 (55 px), « COULISSES » en Oswald 600 (52 px), « GRIFFES » et « VEILLÉE » en IBM Plex Mono 500 (50 px), « ARSENAL » en Saira Condensed 900 (40 px). Vérifie-le quand même au rendu. Les libellés courts se corrigent dans l'admin comme les autres (Contenu → Textes des thèmes), sous les clés `court.<clé>` de `theme_textes` (par exemple `court.films`) ; sous le champ, l'aperçu de la barre à 360 px ; un libellé qui dépasse 58 px (mesuré par `measureText` dans la police du thème, en capitales) est refusé avec un message. La fonction `navCourtLabel(clé)` (§8.8) suit le même ordre que `t()` : correction de l'admin, `navCourt` du thème, sinon celui du neutre.

### B.2 Le vocabulaire (`VocabKey`)

« — » = pas de libellé propre : le neutre s'applique. `addToList`, `eggsIntro` et `playerCountUn` sont des clés nouvelles (§8.8).

| Clé | Neutre | Action | Comédie | Western | Horreur |
|---|---|---|---|---|---|
| `markSeen` | Marquer comme vu | Encaisser | Applaudir | Capturer | Rayer |
| `markSeenDone` | Vu | Encaissé | Applaudi | Capturé | Rayé |
| `unmarkSeen` | Retirer des vus | — | Remettre au répertoire | Remettre en cavale | — |
| `notSeen` | Jamais vu | — | Jamais joué | En cavale | Toujours en vie |
| `addToList` | Ajouter à une watchlist | — | — | Mettre une prime | Ajouter à la liste noire |
| `level` | Niveau | Étage | Emploi | Rang | Niveau |
| `badge` | Badge | Plaque | Étoile | Entaille | Pièce à conviction |
| `badges` | Badges | Plaques | Étoiles | Entailles | Pièces à conviction |
| `rating` | Note | Relevé | Critique | Relevé | — |
| `vote` | Voter | Voter | Donner sa voix | Tirer | Ouvrir une porte |
| `weekFilm` | Film de la semaine | Heure H | À l'affiche | Le contrat | La nuit de {fdlsJour} |
| `duelScreening` | Séance du duel | Séance du face-à-face | La pièce de l'applaudimètre | La séance du vainqueur | La porte restée éclairée |
| `bonus48` | Bonus 48 h | Bonus 48 h | Le bonus de 48 h | La prime de 48 h | Le bonus de 48 h |
| `players` (nom du groupe) | Les marathoniens | L'équipe | La troupe | La bande | Ceux qui restent |
| `playerCount` (après un nombre : « 12 … ») | marathoniens | opérateurs | comédiens | hors-la-loi | inscrits |
| `playerCountUn` (après 0 ou 1, clé nouvelle, §8.8) | marathonien | opérateur | comédien | hors-la-loi | inscrit |
| `player` | Marathonien | Opérateur | Comédien | Hors-la-loi | — |
| `week` | Semaine | Opération | Acte | Territoire | — |
| `duel` | Duel | Face-à-face | Applaudimètre | Duel | Les deux portes |
| `forumTopic` | Sujet | Canal | Loge | Table | Histoire |
| `notesBest` | Meilleurs films | Meilleurs relevés | La revue de presse | Le carnet de tir | Le registre |
| `rattrapage1` | Débutant | Recrue | Première année | Blanc-bec | Le premier cercle |
| `rattrapage2` | Intermédiaire | Opérateur | Deuxième année | Cow-boy | Le deuxième cercle |
| `rattrapage3` | Confirmé | Vétéran | Sociétaire | Pistolero | Le troisième cercle |
| `eggFound` | Découvert | Déclassifié | — | Déterré | Retrouvée |
| `eggsIntro` | Des secrets sont cachés dans le site. Trouve-les tous pour les débloquer. Certains nécessitent du courage. (texte actuel) | — | — | Des choses sont enterrées dans la ville. Trouve-les toutes pour les déterrer. Certaines nécessitent du courage. | Des bandes ont été cachées dans le site. Retrouve-les toutes. Certaines nécessitent du courage. |
| `authTitle` | Connexion | Prendre le poste | L'entrée des artistes | Pousser les portes | Frapper à la porte |
| `resetTitle` | Nouveau mot de passe | Code d'accès perdu | J'ai oublié mon texte | Clé perdue | Tu as perdu la clé |
| `empty` | Aucun résultat. | Rien sur le radar. | Personne ce soir. Il s'agirait de grandir, hein. | Rien à l'horizon. | Personne. Pour l'instant. |
| `loading` | Chargement… | Acquisition du signal… | Trois coups… Ah ! C'était donc ça tout ce tintouin. | On charge… | Rembobinage… |
| `errorGeneric` | Une erreur est survenue. | — | Trou de mémoire. Le souffleur n'a rien entendu. | Raté. Le coup n'est pas parti. | Quelque chose a coupé le courant. |
| `notFoundTitle` | Page introuvable | Étage 13 | Le souffleur a un trou | Y a plus personne ici. | Il n'y a rien derrière cette porte |
| `notFoundText` | Cette page n'existe pas. | — | Revenez en coulisses. | — | — |
| `searchFilms` | Rechercher un titre, un réalisateur… | — | Consulter le répertoire… ou demander comment est la blanquette | Fouiller les avis de recherche… | Chercher une cassette… |
| `saved` | Enregistré. | — | Bravo. On me dit le plus grand bien de ce film. | — | — |
| `profileEmpty` | Aucun film vu pour l'instant. | — | Vous n'avez rien applaudi. Je ne vois pas ce qu'il y a de drôle. | — | Aucune victime. Tout le monde est encore en vie. |
| `goodbye` | À bientôt. | — | Le rideau tombe. Ne claquez pas la porte de la loge. | — | — |
| `welcomeTitle` | (titre actuel de `WelcomeBanner`) | Bienvenue dans l'unité | Bienvenue au théâtre | Lis les règles avant de dégainer. | Entre. Lis les règles d'abord. |
| `joinTitle` | (titre actuel de `JoinMarathonBanner`) | Rejoindre l'opération en cours | Rejoindre la troupe en cours d'acte | Rejoindre la bande en cours de route | Rejoindre ceux qui restent |
| `joinPendingTitle` | (titre actuel, état « en attente ») | En attente du feu vert | La régie examine ta demande | Le shérif examine ta demande | Quelqu'un lit ta demande |
| `joinAcceptedTitle` | (titre actuel, état « accepté pour la saison suivante ») | Accrédité — Saison {n} | Engagé — Saison {n} | Recruté — Saison {n} | Tu es des nôtres — Saison {n} |
| `toastSeenTitle` | (texte actuel du toast) | Encaissé — {titre} | Bravo — {titre} | Capturé — {titre} | Rayé — {titre} |

Titres de fenêtres et de bannières : seul le titre change ; la phrase d'explication, les boutons, l'état « refusée » et la fenêtre de 24 h (« Bienvenue dans le Marathon ! ») restent ceux du code.

Unité d'EXP (`expUnit`) : EXP / EXP / rappels / $ / EXP. Libellé de niveau (`levelLabel`) : « Niveau 6 » / « Étage 06 » / « Emploi 06 · Petit rôle » / « Rang 06 · Déserteur » / « 06 · Celui qui a entendu un bruit ». Libellé de semaine (`weekLabel`) : « SEMAINE 1 / 4 · SAISON 02 » / « SEMAINE 01 / 04 — ACTION » / « ACTE II / IV — COMÉDIE » / « TERRITOIRE 03 / 04 — WESTERN » / « SEMAINE 04 / 04 — HORREUR » (en Horreur, les « nuits » sont les jours de la semaine, jamais les semaines de la saison).

Jamais habillés, dans aucun thème : Se connecter, Inscription, Mot de passe oublié ?, Bloquer, Débloquer, Supprimer, Modifier, Renommer, Rendre privée, Signaler une erreur, refusée, 18+, 18+ Étrange, Signalement envoyé, les messages de limite, les confirmations.
### B.3 Les répliques et citations (`repliques`, `citations`)

Propres à un thème, sans équivalent neutre (si le thème n'en a pas, rien ne s'affiche). Toutes modifiables dans l'admin (Contenu → Textes des thèmes). **À faire relire par The Legendre** (écrites de mémoire).

| Clé (`RepliqueKey`) | Où | Comédie |
|---|---|---|
| `duelEcrase` | `/duels`, un film à ≥ 70 % des voix, au moins 5 voix | C'est la piquette, Jack. Tu sais pas jouer, Jack. |
| `blanquetteQuestion` | œuf #29, première fois | Comment est votre blanquette ? |
| `blanquetteReponse` | œuf #29, seconde fois | Elle est bonne. |
| `hyene` | œuf #30, plaque de la loge jusqu'à minuit | J'aime les hyènes. On n'en parle jamais pourtant. |
| `souffleur` | états vides, 404 | … j'ai un trou. |
| `anciennete` | loge (T6) ; `{n}` = vraies semaines, `{m}` = n + 3 | Au club depuis {n} semaines, bientôt {m} |

`citations` de la Comédie (écriture manuscrite de T1 et T8, une tirée au sort par jour) : « Il s'agirait de grandir, hein. » · « Comment est votre blanquette ? » · « Ah ! C'était donc ça tout ce tintouin. » · « On me dit le plus grand bien de ce film. » · « C'est la piquette, Jack. ». L'Action et le neutre n'ont ni répliques ni citations ; le Western et l'Horreur n'ont que des répliques :

| Clé | Où | Western |
|---|---|---|
| `contratCitation` | accueil (W1), sous les boutons | Au bout du compte, il n'y a que deux sortes de gens : ceux qui ont vu ce film, et les autres. |
| `duelPerdant` | duel (W4), au centre | Celui qui tombe repart en cavale. |
| `saloonPied` | forum (W7), en pied | Le saloon ne ferme jamais. Le barman, lui, ne répond plus depuis 1968. |
| `mouche` | œuf #31 | Elle est toujours là. |
| `oeufEnterre` | galerie (W16), étiquette d'un œuf pas trouvé | Enterré |

| Clé | Où | Horreur |
|---|---|---|
| `porteSousTitre` | accueil (H1) | Ta prochaine victime. Et quelqu'un te suit. |
| `duelRegle` | duel (H4), accueil | Deux portes. Une seule restera éclairée. |
| `classementVide` | classement (H5), ligne du niveau 12 | Personne. Pour l'instant. |
| `polaroid` | profil (H6) ; `{pseudo}` | {pseudo} — dernière trace : devant sa télé |
| `veilleePied` | forum (H7), en pied | Une bougie s'éteint quand personne n'a parlé depuis trois jours. |
| `restentPied` | marathoniens (H9) ; `{n}` = joueurs affichés, `{m}` = `{n}` + 1 (exception assumée, §3) | On a compté {n}. Sur la photo, il y a {m} places. |
| `appelsManques0` | messages (H14), aucun non-lu | Aucun appel manqué · seuls vous deux entendez |
| `appelsManques1` | messages (H14), un non-lu | 1 appel manqué · seuls vous deux entendez |
| `appelsManques` | messages (H14) ; `{n}` non-lus | {n} appels manqués · seuls vous deux entendez |
| `prevenuTitre` | carte « prévenu » (§16.8) | Cette semaine, quelque chose peut apparaître. |
| `prevenuTexte` | carte « prévenu » (§16.8) | Si tu ne le vois pas à temps, tu sursauteras. Le son se coupe par la case « Son », en bas à gauche ; les sursauts, dans la radio. |
| `ballon` | œuf #34 | Tu le reverras. |
| `apparitionVue` | œuf #37 | Tu l'as vu avant qu'il te voie. |
| `cercle` | œuf #36 | On est déjà passés par ici. |
| `oeufEnterre` | galerie (H16), étiquette d'un œuf pas trouvé | Disparue |

### B.4 Les niveaux

Palier du niveau *k* = (*k* − 1) × 100, comme le code (`levelFromExp`). Au-delà de 12, le nom du 12ᵉ reste et le numéro continue. Action : pas de nom, « Étage 06 » (§13.3). Comédie : les douze emplois de §14.3. Western et Horreur :

| N° | Western — rang (ce qu'on te reproche) | Horreur — rôle |
|---|---|---|
| 01 | Chapardeur de poules | La première victime |
| 02 | Tricheur au poker | Celui qui dit « je reviens tout de suite » |
| 03 | Voleur de chevaux | Celui qui descend à la cave |
| 04 | Trouble au saloon | Celui qui se sépare du groupe |
| 05 | Braqueur de diligence | Le sceptique |
| 06 | Déserteur | Celui qui a entendu un bruit |
| 07 | Pilleur de banque | Le témoin |
| 08 | Chef de bande | Celui qui a lu le livre |
| 09 | Attaque de train | Le prêtre |
| 10 | Mort ou vif | Celui qui est revenu de la forêt |
| 11 | Recherché dans quatre territoires | Le dernier survivant |
| 12 | Légende | La dernière fille |

### B.5 Les lieux de la carte du Western (W8)

Chaque semaine du planning est un lieu nommé d'après son thème : `action` → Fort Action, `comedie` → Comédie Gulch, `western` → Western City, `horreur` → Horreur Creek, tout autre thème (et `neutre`) → « Territoire {nn} ».

---

## Annexe C — Les easter eggs

Numéros fixes (champ `num`). « Interrupteur » = réglable dans Admin → Œufs (D8). Colonne « Déclencheur » : pour les tests de non-régression après chaque phase.

| N° | Identifiant | Nom | Famille | Déclencheur | Interrupteur |
|---|---|---|---|---|---|
| 1 | `matrix` | La Pilule Rouge | Clavier | taper « red pill » | oui |
| 2 | `joker` | Why So Serious? | Clavier | code Konami | oui |
| 3 | `marvin` | La Réponse Universelle | Clavier | taper « 42 » | oui |
| 4 | `hal` | Je suis désolé, Dave | Clavier | « open the door » / « ouvre la porte » | oui |
| 5 | `nolan` | Le Maître des Rêves | Clavier | « nolan » | oui |
| 6 | `bond` | Shaken, Not Stirred | Clavier | « bond » | oui |
| 7 | `fightclub` | La Première Règle | Clavier | « fight club » (4 fois pour le jeu) | oui |
| 8 | `kenny` | Oh mon Dieu ! | Clavier | « kill kenny » | oui |
| 9 | `southpark` | En route pour South Park | Clavier | « south park » | oui |
| 10 | `randy` | Le Vinomoussage | Clavier | « randy » | oui |
| 11 | `killbill` | Tue Bill | Clavier | « kill bill » (enregistré à la victoire) | oui |
| 12 | `predator` | Le Chasseur | Clavier | « predator » | oui |
| 13 | `tamagotchi` | Le Facehugger | Forum | « alien » dans un message du forum, ou tapé au clavier | oui |
| 14 | `tars` | TARS en ligne | Horaire | être sur le site à 14 h 07 | oui |
| 15 | `noctambule` | Noctambule | Horaire | entre minuit et 0 h 30 | oui |
| 16 | `rageux` | Le Rageux | Forum | un mot bien senti dans un message (débloque Pires films) | oui |
| 17 | `inception` | Tu es encore en train de rêver | Films | 5 clics sur l'image de la fiche d'Inception | oui |
| 18 | `godfather` | Je lui ferai une offre | Films | fiche du Parrain ouverte 30 s | oui |
| 19 | `shark` | Dun Dun... | Films | arriver vite en bas de `/films` | oui |
| 20 | `clippy` | La Boîte de Pandore | Clavier | « boîte de pandore », ou la boîte fantôme | oui |
| 21 | `conway` | Life God Game | Clavier | « codex » (connecté) | oui |
| 22 | `watcher` | Cinéphile Confirmé | Succès | 5 films vus | — (calculé) |
| 23 | `critic` | Critique en Herbe | Succès | 3 films notés | — |
| 24 | `duelist` | Premier Duel | Succès | 1 vote | — |
| 25 | `curator` | Curateur | Succès | 1 film ajouté | — |
| 26 | `theme-action-voiture` | La voiture | Thème — Action | curseur-voiture lancé très vite contre un bord ou le titre (§13.6) | oui |
| 27 | `theme-action-nakatomi` | Nakatomi Plaza | Thème — Action | taper « nakatomi » ; secours : 5 touchers sur les étages (§13.7) | oui |
| 28 | `theme-comedie-vert` | Le vert interdit | Thème — Comédie | cliquer l'ampoule verte de la rampe de l'accueil (§14.8) | oui |
| 29 | `theme-comedie-blanquette` | La blanquette | Thème — Comédie | chercher « blanquette » deux fois dans le répertoire (§14.8) | oui |
| 30 | `theme-comedie-hyene` | La hyène | Thème — Comédie | applaudir 3 films le même jour (§14.8) | oui |
| 31 | `theme-western-mouche` | La mouche | Thème — Western | cliquer trois fois la mouche posée (§15.7) | oui |
| 32 | `theme-western-404` | La ville fantôme | Thème — Western | tomber sur une page introuvable (§15.7) ; enregistré pour un joueur connecté | oui |
| 33 | `theme-western-duel` | L'heure du duel | Thème — Western | être sur le duel quand il se clôture (§15.7) ; limite : une fois par semaine Western | oui |
| 34 | `theme-horreur-ballon` | Le ballon rouge | Thème — Horreur | cliquer le ballon rouge (§16.9) ; limite : une fois par jour, jusqu'à être cliqué | oui |
| 35 | `theme-horreur-possession` | La possession | Thème — Horreur | taper « exorciste » ; secours : 5 touchers sur la marque (§16.9) | oui |
| 36 | `theme-horreur-cercle` | Tourner en rond | Thème — Horreur | trois pages dans le même ordre, deux fois de suite (§16.9) | oui |
| 37 | `theme-horreur-apparition` | L'apparition | Thème — Horreur | cliquer la forme dans les 6 s (§16.8) ; limite : règles de §16.8 | oui |

Non listés dans la galerie et hors de ce chantier (ne pas toucher) : `gomu gomu no tipiak!`, `punchout`, `cinemon`, `fever night` (admin), les répliques de forum (« open the pod bay doors »…), `agent-of-chaos`, `legende-vivante`, `rythme-dans-la-peau`.

**Conflits à respecter** : tout œuf passe au-dessus du thème (Bond, Fight Club, Kill Bill, Predator, Clippy, Jaws devant le rideau et la voiture) ; Inception et Le Parrain restent liés au film (titre) et jamais à une classe CSS que les thèmes changent ; « le bas de la page » de Dun Dun reste la fin de la liste ; le changement de thème du lundi ne recharge rien et n'efface aucun œuf en cours ; Le Rageux débloque le même onglet sous cinq noms (Pires films, La casse, Les bides, Le cimetière, La fosse) ; le mot « Coffre » reste réservé au bouton de Clippy. Et pour le Western et l'Horreur :

- Tout œuf passe au-dessus du thème : la lampe (z-index 0), les effets (`--z-fx`) et le calque du sursaut (480) restent sous les fenêtres des œufs (891 et plus).
- Predator a ses propres trous brûlés : pendant qu'un œuf est à l'écran, le Western ne pose aucun trou (§15.5).
- La mouche, le ballon, l'apparition, la possession et Tourner en rond ne démarrent jamais pendant un autre œuf, une fenêtre ouverte ou une saisie (`ecranOccupe`, §11.6) : ils attendent.
- Le changement de thème du lundi ne recharge rien : une mouche en vol, un ballon qui monte ou une apparition en cours finissent leur course, puis le comportement s'arrête.
- « exorciste » ne contient aucun déclencheur des 25 œufs clavier ; « nakatomi » non plus.

---

## Annexe D — SQL

### D.1 Audit de sécurité (phase 1A) — à exécuter par The Legendre, résultats à coller à Claude Code

```sql
-- 1. Politiques RLS
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, cmd;

-- 2. Droits réels des rôles du navigateur sur chaque table (quelle que soit leur origine)
select c.relname as table_name, r.role,
       has_table_privilege(r.role, c.oid, 'INSERT') as peut_inserer,
       has_table_privilege(r.role, c.oid, 'UPDATE') as peut_modifier_tout,
       has_table_privilege(r.role, c.oid, 'DELETE') as peut_supprimer
from pg_class c join pg_namespace n on n.oid = c.relnamespace
cross join (values ('anon'), ('authenticated')) as r(role)
where n.nspname = 'public' and c.relkind = 'r'
order by 1, 2;

-- 3. Colonnes de profiles modifiables depuis le navigateur
select a.attname as colonne,
       has_column_privilege('anon', 'public.profiles', a.attname, 'UPDATE') as anon,
       has_column_privilege('authenticated', 'public.profiles', a.attname, 'UPDATE') as authenticated
from pg_attribute a
where a.attrelid = 'public.profiles'::regclass and a.attnum > 0 and not a.attisdropped
order by a.attnum;

-- 4. Fonctions : arguments, SECURITY DEFINER, qui peut les exécuter
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments, p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by p.proname;

-- 5. Déclencheurs
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers where trigger_schema = 'public' order by event_object_table, trigger_name;

-- 6. Corps des fonctions d'EXP
select proname, pg_get_functiondef(oid) from pg_proc where proname in ('increment_exp', 'decrement_exp');

-- 7. Unicité des visionnages (il faut une clé unique sur user_id + film_id)
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.watched'::regclass;
```

**Contrôle après M2** (à relancer après chaque verrou ; toutes les colonnes doivent valoir `false`) :

```sql
select r.role,
  has_function_privilege(r.role, 'public.increment_exp(uuid, integer)', 'execute') as increment_exp,
  has_function_privilege(r.role, 'public.decrement_exp(uuid, integer)', 'execute') as decrement_exp,
  has_table_privilege(r.role, 'public.watched', 'INSERT')  as watched_insert,
  has_table_privilege(r.role, 'public.watched', 'DELETE')  as watched_delete,
  has_table_privilege(r.role, 'public.profiles', 'INSERT') as profiles_insert,
  has_column_privilege(r.role, 'public.profiles', 'exp', 'UPDATE')      as profiles_exp,
  has_column_privilege(r.role, 'public.profiles', 'is_admin', 'UPDATE') as profiles_is_admin,
  has_column_privilege(r.role, 'public.profiles', 'saison', 'UPDATE')   as profiles_saison,
  has_column_privilege(r.role, 'public.profiles', 'marathon_blocked_until', 'UPDATE')    as profiles_blocage,
  has_column_privilege(r.role, 'public.profiles', 'pre_marathon_window_until', 'UPDATE') as profiles_fenetre
from (values ('anon'), ('authenticated')) as r(role);
-- (adapter les types de increment_exp / decrement_exp à ceux de l'audit, requête 4)

-- Après M3 : doit valoir false pour les deux rôles
select r.role, has_table_privilege(r.role, 'public.discovered_eggs', 'INSERT') as oeufs_insert
from (values ('anon'), ('authenticated')) as r(role);

-- Après M3 : les cinq doivent valoir true (le joueur règle lui-même sa radio, ses œufs, ses sursauts et son son)
select has_column_privilege('authenticated', 'public.profiles', 'radio_music',  'UPDATE') as radio_music,
       has_column_privilege('authenticated', 'public.profiles', 'radio_volume', 'UPDATE') as radio_volume,
       has_column_privilege('authenticated', 'public.profiles', 'theme_eggs',   'UPDATE') as theme_eggs,
       has_column_privilege('authenticated', 'public.profiles', 'sursauts',     'UPDATE') as sursauts,
       has_column_privilege('authenticated', 'public.profiles', 'son_horreur',  'UPDATE') as son_horreur;
```

### D.2 M1 — duels et EXP (avant les tests de la phase 1A)

```sql
-- M1 : additive, l'ancien code continue de marcher.

-- Échéance des duels : mercredi 20 h (Paris) qui suit la création, pour les duels encore ouverts.
alter table public.duels add column if not exists closes_at timestamptz;

update public.duels d
set closes_at = (
      date_trunc('week', d.created_at at time zone 'Europe/Paris') + interval '2 days 20 hours'
      + case when (d.created_at at time zone 'Europe/Paris')
                  >= date_trunc('week', d.created_at at time zone 'Europe/Paris') + interval '2 days 20 hours'
             then interval '7 days' else interval '0 days' end
    ) at time zone 'Europe/Paris'
where d.closes_at is null and d.closed = false;

create index if not exists duels_ouverts_echeance on public.duels (closes_at) where closed = false;

-- Montant d'EXP réellement crédité pour chaque visionnage.
alter table public.watched add column if not exists exp_awarded int not null default 0;

-- Rattrapage : ce que l'ancien code a réellement crédité (variables Vercel ; défauts 5, 10, 15 : adapter).
-- a) vainqueur d'un duel regardé dans les 48 h après la clôture → EXP_DUEL_WIN
update public.watched w set exp_awarded = 15
from public.duels d
where w.pre = false and w.exp_awarded = 0
  and d.winner_id = w.film_id and d.closed_at is not null
  and w.watched_at >= d.closed_at and w.watched_at < d.closed_at + interval '48 hours';
-- b) film de la semaine regardé dans les 9 jours après son annonce → EXP_FDLS
update public.watched w set exp_awarded = 10
from public.week_films f
where w.pre = false and w.exp_awarded = 0
  and f.film_id = w.film_id
  and w.watched_at >= f.created_at and w.watched_at < f.created_at + interval '9 days';
-- c) tous les autres visionnages marathon → EXP_FILM
update public.watched set exp_awarded = 5 where pre = false and exp_awarded = 0;
```

### D.3 M2 — verrou (APRÈS la mise en ligne de la phase 1A)

Modèle : Claude Code l'adapte aux résultats de l'audit (types d'arguments des fonctions, liste des colonnes de `profiles` que le joueur modifie lui-même). **Avant M2**, toute écriture sur une colonne verrouillée faite avec la session d'un joueur **ou d'un admin** (par exemple `marathon_blocked_until`, écrit par `submitMarathonWatchRequest` et `adminReviewMarathonRequest`, ou `is_admin`, écrit par `adminSetAdmin`) doit déjà passer par le client service.

```sql
-- 1. EXP : seules les actions serveur (clé service) créditent ou retirent.
revoke execute on function public.increment_exp(uuid, integer) from public, anon, authenticated;
revoke execute on function public.decrement_exp(uuid, integer) from public, anon, authenticated;
grant  execute on function public.increment_exp(uuid, integer) to service_role;
grant  execute on function public.decrement_exp(uuid, integer) to service_role;

-- 2. Visionnages : écriture par le serveur seulement (la lecture reste ouverte).
revoke insert, update, delete on public.watched from anon, authenticated;

-- 3. Profils : le joueur ne modifie que ses propres réglages, colonne par colonne.
--    Création et suppression : par le serveur seulement (déclencheur d'inscription, client service),
--    si l'audit confirme qu'aucune page ne crée ni ne supprime un profil avec la session du joueur.
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (pseudo, bio, avatar_url, active_badge /* , … liste établie par Claude Code */)
  on public.profiles to authenticated;

-- 4. Si M3 est déjà passée (M2 relancée plus tard) : rendre au joueur ses réglages de radio et de l'Horreur.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'theme_eggs') then
    grant update (radio_music, radio_volume, theme_eggs) on public.profiles to authenticated;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'son_horreur') then
    grant update (sursauts, son_horreur) on public.profiles to authenticated;
  end if;
end $$;

-- 5. Rattrapage des visionnages créés par l'ancien code entre M1 et la mise en ligne :
--    relancer les trois requêtes a), b), c) de M1, en ajoutant à chacune
--    « and w.watched_at < '<date et heure de la mise en ligne de la phase 1A, avec fuseau>' »
--    (pour c), sans alias : « and watched_at < … »).
```

### D.4 M3 — moteur de thèmes (avant les tests de la phase 5)

```sql
create table if not exists public.season_weeks (
  id         bigserial primary key,
  saison     int  not null check (saison >= 1),
  semaine    int  not null check (semaine between 1 and 12),
  theme      text not null,
  date_debut date not null check (extract(isodow from date_debut) = 1),   -- un lundi
  created_at timestamptz not null default now(),
  unique (saison, semaine),
  unique (date_debut)
);
alter table public.season_weeks enable row level security;
drop policy if exists "season_weeks lisible par tous" on public.season_weeks;
create policy "season_weeks lisible par tous" on public.season_weeks for select using (true);
grant select on public.season_weeks to anon, authenticated;
grant all on public.season_weeks to service_role;
grant usage, select on sequence public.season_weeks_id_seq to service_role;
-- Écriture : actions admin côté serveur (clé service), qui passe outre la RLS.

alter table public.profiles
  add column if not exists radio_music  boolean not null default false,
  add column if not exists radio_volume int     not null default 40,
  add column if not exists theme_eggs   boolean not null default true,
  add column if not exists sursauts     boolean,   -- Horreur : vide = activés (valeur par défaut du code)
  add column if not exists son_horreur  boolean;   -- Horreur : vide = son activé (valeur par défaut du code)
alter table public.profiles drop constraint if exists profiles_radio_volume_bornes;
alter table public.profiles add constraint profiles_radio_volume_bornes check (radio_volume between 0 and 100);

-- Le joueur peut modifier ces cinq réglages (utile si M2 a restreint les colonnes).
grant update (radio_music, radio_volume, theme_eggs, sursauts, son_horreur) on public.profiles to authenticated;

-- Œufs : écriture par le serveur seulement (le code de la phase 5 écrit avec la clé service, §11.8).
revoke insert, update, delete on public.discovered_eggs from anon, authenticated;
```

### D.5 M4 — journal de l'admin et réglages privés (avant les tests de la phase 5)

```sql
create table if not exists public.admin_log (
  id         bigserial primary key,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_recent on public.admin_log (created_at desc);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from anon, authenticated;
grant all on public.admin_log to service_role;
grant usage, select on sequence public.admin_log_id_seq to service_role;
-- Aucune politique : lecture et écriture par la clé service seulement.

-- Réglages que le navigateur ne doit jamais lire (lien du direct).
create table if not exists public.site_prive (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_prive enable row level security;
revoke all on public.site_prive from anon, authenticated;
grant all on public.site_prive to service_role;
```

---

## Annexe E — Le chargeur d'images TMDB (phase 4)

`components/Poster.tsx` est un composant client : il peut passer une fonction `loader` à `next/image`. Toutes les affiches de films du site passent par `Poster` (aujourd'hui, plusieurs pages utilisent `next/image` directement : fenêtre de fiche, `/notes`, admin…).

```ts
// lib/images/tmdb.ts
import type { ImageLoaderProps } from 'next/image'

const TAILLES_TMDB = [92, 154, 185, 342, 500, 780] as const   // tailles d'affiche publiées par TMDB

export function estAfficheTmdb(src: string): boolean {
  return src.startsWith('https://image.tmdb.org/t/p/')
}

/** Demande directement à TMDB la plus petite taille ≥ la largeur voulue (780 au plus), sans l'optimiseur de Vercel. */
export function tmdbLoader({ src, width }: ImageLoaderProps): string {
  const taille = TAILLES_TMDB.find(t => t >= width) ?? 780   // jamais « original » : souvent plusieurs Mo
  return src.replace(/\/t\/p\/[^/]+\//, `/t/p/w${taille}/`)
}
```

Dans `Poster` : `loader={estAfficheTmdb(src) ? tmdbLoader : undefined}`. En développement, Next peut avertir « loader does not implement width » quand la taille demandée retombe sur l'URL d'origine : c'est sans conséquence, ne le « corrige » pas. Les affiches envoyées depuis l'admin (Supabase Storage) et celles d'OMDB (`m.media-amazon.com`) gardent l'optimiseur.

---

## Annexe F — Les maquettes, écran par écran

Chaque kit (`docs/refonte-v2/maquettes/<thème>/theme-<thème>.html`) est une page de présentation : un titre de section (`<h2>`) par écran, sous lequel se trouvent le balisage et, dans le `<style>` du fichier, le CSS exact de l'écran. **Avant de coder un écran, ouvre sa section et son image.** Reproduis sa structure, son décor et ses ornements avec les vraies données, sauf ce que §3 et `maquettes/LISEZMOI.md` corrigent. Les textes d'explication du kit (paragraphes sous chaque titre) font partie de la référence. Les sections « La palette » et « Le bloc de jetons » recoupent l'annexe A : en cas d'écart, l'annexe A gagne.

### F.1 Action (`maquettes/action/theme-action.html`)

| Écran | Où | Section du kit (`<h2>`) | Image |
|---|---|---|---|
| A0 | composants, décor, ornements | « La bibliothèque » | `A0-composants.jpg` |
| A1 | `/` | « Accueil » | `A1-accueil.jpg` |
| A2 | `/films` | « L'Arsenal » | `A2-arsenal.jpg` |
| A3 | fenêtre de fiche | « La fiche film » | `A3-fiche.jpg` |
| A4 | `/duels` | « Le face-à-face » | `A4-duel.jpg` |
| A5 | `/classement` | « Le tableau de chasse » | `A5-chasse.jpg` |
| A6 | `/profil` | « La fiche d'opérateur » | `A6-operateur.jpg` |
| A7 | `/forum` | « Les fréquences » | `A7-frequences.jpg` |
| A8 | `/semaine` | « L'opération — la page Semaine » | `A8-operation.jpg` |
| A9 | `/marathoniens` | « L'équipe — la page Marathoniens » | `A9-equipe.jpg` |
| A10 | barre | « La navigation — les quatre catégories du site » | `A10-navigation.jpg` |
| A11 | `/notes` | « Les relevés — la page Classements films » | `A11-releves.jpg` |
| A12 | `/rattrapage` | « L'entraînement — la page Rattrapages cinéma » | `A12-entrainement.jpg` |
| A13 | `/watchlist` | « Repérages — les pages Mes watchlists et Watchlists publiques » | `A13-reperages.jpg` |
| A14 | `/messages` | « Transmissions — la page Messages » | `A14-transmissions.jpg` |
| A15 | `/forum/[id]` | « Un canal — la page d'un sujet du forum » | `A15-canal.jpg` |
| A16 | `/easter-eggs` | « Dossiers classifiés — la page Easter eggs » | `A16-dossiers.jpg` |
| A17 | `/auth` | « Prendre le poste — les pages Connexion, Inscription et Mot de passe oublié » | `A17-poste.jpg` |
| A18 | par-dessus les pages | « Les messages du système — bannières, fenêtres, notifications » | `A18-systeme.jpg` |
| A19 | radio | « La radio — musique, volume, œufs du thème » | `A19-radio.jpg` |

Autres sections utiles : « La palette » ; « Deux secrets qui n'existent que pendant la semaine Action » ; « Quatre pistes à produire » ; « Le bloc de jetons, prêt à coller ».

### F.2 Comédie (`maquettes/comedie/theme-comedie.html`)

| Écran | Où | Section du kit (`<h2>`) | Image |
|---|---|---|---|
| T0 | composants, décor, ornements | « La boîte à outils » | `T0-composants.jpg` |
| T1 | `/` | « À l'affiche » | `T1-affiche.jpg` |
| T2 | `/films` | « Le répertoire » | `T2-repertoire.jpg` |
| T3 | fenêtre de fiche | « Le programme » | `T3-programme.jpg` |
| T4 | `/duels` | « L'applaudimètre » | `T4-applaudimetre.jpg` |
| T5 | `/classement` | « L'affiche » | `T5-laffiche.jpg` |
| T6 | `/profil` | « Ta loge » | `T6-loge.jpg` |
| T7 | `/forum` | « Les coulisses » | `T7-coulisses.jpg` |
| T8 | `/semaine` | « L'acte — la page Semaine » | `T8-acte.jpg` |
| T9 | `/marathoniens` | « La troupe — la page Marathoniens » | `T9-troupe.jpg` |
| T10 | barre | « La navigation — les quatre catégories du site » | `T10-navigation.jpg` |
| T11 | `/notes` | « La revue de presse — la page Classements films » | `T11-revue.jpg` |
| T12 | `/rattrapage` | « Le conservatoire — la page Rattrapages cinéma » | `T12-conservatoire.jpg` |
| T13 | `/watchlist` | « Mes réservations — les pages Mes watchlists et Watchlists publiques » | `T13-reservations.jpg` |
| T14 | `/messages` | « Les petits mots — la page Messages » | `T14-petits-mots.jpg` |
| T15 | `/forum/[id]` | « Une loge — la page d'un sujet du forum » | `T15-loge.jpg` |
| T16 | `/easter-eggs` | « Le magasin d'accessoires — la page Easter eggs » | `T16-accessoires.jpg` |
| T17 | `/auth` | « L'entrée des artistes — les pages Connexion, Inscription et Mot de passe oublié » | `T17-entree.jpg` |
| T18 | par-dessus les pages | « Les annonces de la régie — bannières, fenêtres, notifications » | `T18-regie.jpg` |
| T19 | radio | « Le poste — musique, volume, œufs du thème » | `T19-poste.jpg` |

Autres sections utiles : « La palette » ; « Ce que le thème fait, et pas ce qu'il montre » ; « Le bloc de jetons ».

### F.3 Western (`maquettes/western/theme-western.html`)

| Écran | Où | Section du kit (`<h2>`) | Image |
|---|---|---|---|
| W0 | composants, décor, ornements | « La boîte à outils » | `W0-composants.jpg` |
| W1 | `/` | « Le contrat » | `W1-contrat.jpg` |
| W2 | `/films` | « Les avis de recherche » | `W2-avis.jpg` |
| W3 | fenêtre de fiche | « Le dossier » | `W3-dossier.jpg` |
| W4 | `/duels` | « Le duel » | `W4-duel.jpg` |
| W5 | `/classement` | « Le mur des primes » | `W5-primes.jpg` |
| W6 | `/profil` | « Ton avis de recherche » | `W6-profil.jpg` |
| W7 | `/forum` | « Le saloon » | `W7-saloon.jpg` |
| W8 | `/semaine` | « Le territoire — la page Semaine » | `W8-territoire.jpg` |
| W9 | `/marathoniens` | « La bande — la page Marathoniens » | `W9-bande.jpg` |
| W10 | barre | « La navigation — les quatre catégories du site » | `W10-navigation.jpg` |
| W11 | `/notes` | « Le carnet de tir — la page Classements films » | `W11-carnet.jpg` |
| W12 | `/rattrapage` | « L'école de tir — la page Rattrapages cinéma » | `W12-ecole.jpg` |
| W13 | `/watchlist` | « Mes cibles — les pages Mes watchlists et Watchlists publiques » | `W13-cibles.jpg` |
| W14 | `/messages` | « Le courrier — la page Messages » | `W14-courrier.jpg` |
| W15 | `/forum/[id]` | « Une table — la page d'un sujet du forum » | `W15-table.jpg` |
| W16 | `/easter-eggs` | « Le butin — la page Easter eggs » | `W16-butin.jpg` |
| W17 | `/auth` | « Pousser les portes — les pages Connexion, Inscription et Mot de passe oublié » | `W17-portes.jpg` |
| W18 | par-dessus les pages | « Le télégraphe — bannières, fenêtres, notifications » | `W18-telegraphe.jpg` |
| W19 | radio | « Le poste du saloon — musique, volume, œufs du thème » | `W19-poste.jpg` |

Autres sections utiles : « La palette » ; « Ce que le thème fait » ; « Trois secrets qui n'existent que pendant la semaine Western » ; « Le bloc de jetons ».

### F.4 Horreur (`maquettes/horreur/theme-horreur.html`)

| Écran | Où | Section du kit (`<h2>`) | Image |
|---|---|---|---|
| H0 | composants, décor, ornements | « La boîte à outils » | `H0-composants.jpg` |
| H1 | `/` | « La porte — l'accueil » | `H1-porte.jpg` |
| H2 | `/films` | « Les cassettes — la liste des films » | `H2-cassettes.jpg` |
| H3 | fenêtre de fiche | « La jaquette — la fiche d'un film » | `H3-jaquette.jpg` |
| H4 | `/duels` | « Les deux portes — le duel » | `H4-portes.jpg` |
| H5 | `/classement` | « Les survivants — le classement des joueurs » | `H5-survivants.jpg` |
| H6 | `/profil` | « Ton dossier — le profil » | `H6-dossier.jpg` |
| H7 | `/forum` | « La veillée — le forum » | `H7-veillee.jpg` |
| H8 | `/semaine` | « Les sept nuits — la page Semaine » | `H8-nuits.jpg` |
| H9 | `/marathoniens` | « Ceux qui restent — la page Marathoniens » | `H9-restent.jpg` |
| H10 | barre | « La navigation — les quatre catégories du site » | `H10-navigation.jpg` |
| H11 | `/notes` | « Le registre — la page Classements films » | `H11-registre.jpg` |
| H12 | `/rattrapage` | « Les cercles — la page Rattrapages cinéma » | `H12-cercles.jpg` |
| H13 | `/watchlist` | « La liste noire — les pages Mes watchlists et Watchlists publiques » | `H13-liste-noire.jpg` |
| H14 | `/messages` | « Les appels — la page Messages » | `H14-appels.jpg` |
| H15 | `/forum/[id]` | « Une histoire — la page d'un sujet du forum » | `H15-histoire.jpg` |
| H16 | `/easter-eggs` | « Les bandes retrouvées — la page Easter eggs » | `H16-bandes.jpg` |
| H17 | `/auth` | « Frapper à la porte — les pages Connexion, Inscription et Mot de passe oublié » | `H17-frapper.jpg` |
| H18 | par-dessus les pages | « Les signes — bannières, fenêtres, notifications » | `H18-signes.jpg` |
| H19 | radio | « La radio — musique, volume, œufs du thème » | `H19-radio.jpg` |
| H20 | par-dessus les pages | « L'apparition — le sursaut, et ses garde-fous » | `H20-apparition.jpg` |

Autres sections utiles : « La palette » ; « Ce que le thème fait, et qu'on ne voit presque pas » ; « Quatre secrets qui n'existent que pendant la semaine Horreur » ; « La musique et trois bruits, tout passe par la radio » ; « Le bloc de jetons ».

### F.5 Neutre (`maquettes/neutre/neutre-reference.html`)

Images : `01-accueil-hors-saison.jpg` (accueil visiteur et avant saison), `02-accueil-marathon-mise-en-page.jpg` (mise en page de la saison en cours, couleurs rouges obsolètes : prends celles du neutre), `03-films-mise-en-page.jpg` (couleurs SF obsolètes). Voir §9.1.

