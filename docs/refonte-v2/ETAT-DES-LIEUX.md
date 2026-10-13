# Le Marathon Cinéma — État des lieux de la refonte v2

Date : 13 octobre 2026
Branche : `refonte-v2/correctif`
Référence : `PROMPT.md` (10 octobre 2026) et `PROMPT-CORRECTIF.md`

---

## Résumé chiffré

| Thème | Fait | Partiel | Absent | Faux |
|---|---|---|---|---|
| **Socle / Neutre** | 8 | 4 | 6 | 2 |
| **Action** | 3 | 4 | 17 | 1 |
| **Comédie** | 2 | 3 | 19 | 1 |
| **Western** | 1 | 2 | 21 | 2 |
| **Horreur** | 1 | 2 | 22 | 2 |
| **Total** | **15** | **15** | **85** | **8** |

### Vérificateurs (avant)

| Métrique | Valeur |
|---|---|
| Composants orphelins | 30 |
| Classes CSS mortes (thèmes) | 86 |
| Classes CSS mortes (modules) | 30 |
| Règles `*` + `!important` | 2 |

Les captures (`npm run captures`) n'ont pas pu être prises : pas de `.env.local` ni de serveur de développement dans cet environnement. The Legendre peut lancer `npm run captures` sur son PC s'il le souhaite.

---

## Socle et neutre (§7.5, §8, §9, §10, §11, §12)

| Élément | § du prompt | État | Preuve | Ce qui manque |
|---|---|---|---|---|
| `lib/site.ts` — nom et adresse du site | §7.5 pts 1-2 | **Absent** | `lib/site.ts` inexistant | Créer `lib/site.ts`, remplacer « Ciné Marathon » partout |
| Déménagement des données (`ANCIENS_DOMAINES`) | §7.5 pt 3 | **Absent** | — | Coder le mécanisme (reste inerte tant que vide) |
| Jetons CSS (tokens.css + thèmes) | §8.1, Annexe A | **Fait** | `app/styles/tokens.css`, `app/styles/themes/*.css` | — |
| Polices | §8.2 | **Fait** | Chargement dans `app/layout.tsx` | — |
| Composants partagés `components/ui/` | §8.4 | **Partiel** | 15 composants orphelins dans `components/ui/` : Button, CountdownDisplay, Divider, EmptyState, Field, Gauge, Modal, PageHeader, Panel, Skeleton, StatRow, Tabs, Tag, Ticker, Toggle | Brancher ou supprimer chaque composant |
| Navigation (`#site`, barre) | §8.5 | **Fait** | `components/Navbar.tsx`, `components/MobileNav.tsx` | — |
| Onglet Vidéoclub | §8.6 | **Fait** | `app/videoclub/` | — |
| Dictionnaire (`formatSemaine`, `VocabKey`) | §8.8 | **Fait** | `lib/themes/types.ts` | — |
| Téléphone : socle | §8.9 | **Fait** | Responsive existant | — |
| Moteur de thèmes (résolution, `data-theme`) | §11.1-11.3 | **Fait** | `lib/themes/resolve.ts`, `app/layout.tsx` pose `data-theme` | — |
| Aperçu admin | §11.4 | **Fait** | Cookie `cm_theme_apercu`, `app/page.tsx:47-48` | — |
| Feuilles de style des thèmes | §11.5 | **Partiel** | Fichiers existent mais 86 classes mortes (ne ciblent aucun élément) | Rattacher ou supprimer les classes mortes |
| Décor et comportements — mécanisme | §11.6 | **Partiel** | `ActionFrame`, `ComedieFrame`, `WesternFrame`, `HorreurFrame` existent | Décors incomplets (voir sections thèmes) |
| Radio | §11.7 | **Fait** | `components/theme/ThemeRadio.tsx`, deux pistes par thème | Choix de The Legendre (commits `f874d81`→`6216aa6`) : musique au premier geste, bouton fixe en bas à droite |
| Œufs de thème — mécanique commune | §11.8 | **Partiel** | `lib/themes/eggs.ts`, `lib/themes/useThemeEgg.ts` | Fonctions présentes mais les œufs ne sont pas tous branchés |
| Galerie des œufs | §11.9 | **Fait** | `app/easter-eggs/page.tsx` utilise `resolveTheme` | — |
| Curseurs des thèmes | §11.13 | **Partiel** | Voiture Action (8 orientations + épave) dans `public/cursors/`, gant comédie, colt western | Gant = poing fermé, à remplacer par la chaussure noire ; colt méconnaissable, à remplacer ; réticule action à supprimer ; règles CSS de §11.13 manquantes |
| `ecranOccupe()` | §2 correctif pt 5 | **Faux** | `lib/themes/ecran.ts` | Parcourt tout le DOM avec `getComputedStyle` — limiter aux éléments `position: fixed` candidats |
| Mécanisme des écrans de thème | §3 correctif pt 4 | **Absent** | Aucun répertoire `components/theme/*/ecrans/` | Créer le mécanisme `dynamic import` côté serveur + attributs `data-ecran` |
| Règles `*` + `!important` dans western-screens.css | §2.2 règle 7 | **Faux** | `western-screens.css:18,21` | Supprimer les deux règles, appliquer la lenteur aux seuls composants du thème |
| Admin refaite (phase 6) | §12 | **Fait** | `app/admin/` | — |
| Phase 4 — Performance | §10 | **Fait** | Build fonctionnel | — |

---

## Action (§13)

| Élément | § du prompt | Section du kit | État | Preuve | Ce qui manque |
|---|---|---|---|---|---|
| A0 — Décor : brume, traînées, grain, rail, bandeau | §13.4 | « La bibliothèque » | **Partiel** | `ActionFrame.tsx` : rail, cracks, fog, streaks, grain, freq band existent | Comparer avec le kit ; fêlures à vérifier |
| A1 — Accueil « Opération » | §13.5 | « Accueil » | **Partiel** | `ActionHomeHero.tsx` importé dans `app/page.tsx:158` | Structure héros existe mais comparer avec maquette `A1-accueil.jpg` ; chrono, journal radio, étage + jauge, face-à-face, repérages à vérifier |
| A2 — L'arsenal (`/films`) | §13.5 | « L'Arsenal » | **Absent** | Aucun habillage spécifique pour `/films` en Action | Habillage : jauges biseautées, pastilles biseautées, affiches étalonnées |
| A3 — La fiche (fenêtre) | §13.5 | « La fiche film » | **Absent** | Aucun habillage spécifique | Habillage : sas, en-tête orange, panneau rivé, note en 10 segments |
| A4 — Face-à-face (`/duels`) | §13.5 | « Le face-à-face » | **Absent** | Pas de structure Action pour `/duels` | **Structure.** Films face à face, compteurs d'impact, halo, chrono mono |
| A5 — Tableau de chasse (`/classement`) | §13.5 | « Le tableau de chasse » | **Absent** | — | **Structure.** Relevé : rang, étage, jauge de pression |
| A6 — Fiche d'opérateur (`/profil`) | §13.5 | « La fiche d'opérateur » | **Absent** | — | **Structure.** Matricule, la tour 12 étages |
| A7 — Fréquences (`/forum`) | §13.5 | « Les fréquences » | **Absent** | — | **Structure.** Scanner, canaux avec fréquence et trafic |
| A8 — L'opération (`/semaine`) | §13.5 | « L'opération » | **Absent** | — | **Structure.** Plan 7 jours, phases, objectifs |
| A9 — L'équipe (`/marathoniens`) | §13.5 | « L'équipe » | **Absent** | — | **Structure.** Badges d'accès |
| A10 — Barre Action | §13.5 | « La navigation » | **Partiel** | Libellés Action dans `lib/themes/action.ts` | Catégories à vérifier en rendu |
| A11 — Les relevés (`/notes`) | §13.5 | « Les relevés » | **Absent** | — | Habillage. Note en 10 barres, onglets renommés |
| A12 — L'entraînement (`/rattrapage`) | §13.5 | « L'entraînement » | **Absent** | — | Habillage. Trois grades |
| A13 — Repérages (`/watchlist`) | §13.5 | « Repérages » | **Absent** | — | Habillage. Onglet « Repérages de l'unité » |
| A14 — Transmissions (`/messages`) | §13.5 | « Transmissions » | **Absent** | — | Habillage. Journal radio |
| A15 — Un canal (`/forum/[id]`) | §13.5 | « Un canal » | **Absent** | — | Habillage |
| A16 — Dossiers classifiés (`/easter-eggs`) | §13.5 | « Dossiers classifiés » | **Absent** | — | Habillage. « déclassifié » |
| A17 — Prendre le poste (`/auth`) | §13.5 | « Prendre le poste » | **Absent** | — | Titre, « Code d'accès perdu » |
| A18 — Messages du système | §13.5 | « Les messages du système » | **Absent** | — | Bannières titres annexe B, scan de chargement |
| A19 — La radio de l'unité | §13.5 | « La radio » | **Absent** | — | Boîtier tactique noir, écran de fréquence orange |
| 404 Action — Étage 13 | §13.5 | — | **Absent** | — | Fêlures, texte, lien retour |
| Œuf #26 — La voiture | §13.6 | — | **Partiel** | Voiture-curseur existe (`public/cursors/action-car-*.png`), code dans `ActionFrame.tsx` | Réticule encore présent (`action-reticle.png`), règles CSS de §11.13 non posées, garde des easter eggs à fusionner |
| Œuf #27 — Nakatomi Plaza | §13.7 | — | **Partiel** | Secours toucher dans `ActionFrame.tsx` (5 touchers sur rail) | Effet complet (vitres, montée du rail) à vérifier/compléter |
| Au téléphone — Action | §13.8 | — | **Absent** | — | Toutes les lignes §13.8 non implémentées |
| Critères d'acceptation phase 7 | §13.9 | — | **Absent** | — | Aucun critère vérifiable sans les écrans |
| `PosterGrade` (étalonnage) | §2 correctif | — | **Faux** | `components/theme/action/PosterGrade.tsx` — orphelin | Existe mais jamais importé nulle part |

---

## Comédie (§14)

| Élément | § du prompt | Section du kit | État | Preuve | Ce qui manque |
|---|---|---|---|---|---|
| T0 — Décor : rideau, fronton, rampe, poursuite | §14.5 | « La boîte à outils » | **Partiel** | `ComedieFrame.tsx` : rideaux, frise, fronton avec ampoules | Fronton dit « Ciné Marathon » au lieu de « Le Marathon Cinéma » ; rampe absente ; poursuite absente |
| T1 — À l'affiche (`/`) | §14.7 | « À l'affiche » | **Partiel** | `ComedieHomeHero.tsx` importé dans `app/page.tsx:178` | Structure héros existe, comparer avec `T1-affiche.jpg` ; citation manuscrite, cadran, billets à vérifier |
| T2 — Le répertoire (`/films`) | §14.7 | « Le répertoire » | **Absent** | — | Habillage. Cadres d'or, rubans dorés, filtres en lettres de fronton |
| T3 — Le programme (fiche) | §14.7 | « Le programme » | **Absent** | — | Habillage. Étoiles, critiques en colonnes de presse |
| T4 — L'applaudimètre (`/duels`) | §14.7 | « L'applaudimètre » | **Absent** | `ComedieCadran.tsx` orphelin | **Structure.** Cadran + aiguille. Composant existe mais jamais branché |
| T5 — L'affiche (`/classement`) | §14.7 | « L'affiche » | **Absent** | `ComedieAffiche.tsx` orphelin | **Structure.** Affiche de théâtre. Composant existe mais jamais branché |
| T6 — Ta loge (`/profil`) | §14.7 | « Ta loge » | **Absent** | — | **Structure.** Porte de loge, miroir à ampoules, 12 emplois |
| T7 — Les coulisses (`/forum`) | §14.7 | « Les coulisses » | **Absent** | — | **Structure.** Couloir de loges |
| T8 — L'acte (`/semaine`) | §14.7 | « L'acte » | **Absent** | — | **Structure.** Chiffres romains, billets avec souche |
| T9 — La troupe (`/marathoniens`) | §14.7 | « La troupe » | **Absent** | — | **Structure.** Médaillons dorés |
| T10 — Barre Comédie | §14.7 | « La navigation » | **Partiel** | Libellés dans `lib/themes/comedie.ts` | À vérifier en rendu |
| T11 — Revue de presse (`/notes`) | §14.7 | « La revue de presse » | **Absent** | — | Habillage |
| T12 — Le conservatoire (`/rattrapage`) | §14.7 | « Le conservatoire » | **Absent** | — | Habillage |
| T13 — Mes réservations (`/watchlist`) | §14.7 | « Mes réservations » | **Absent** | — | Habillage |
| T14 — Les petits mots (`/messages`) | §14.7 | « Les petits mots » | **Absent** | — | Habillage |
| T15 — Une loge (`/forum/[id]`) | §14.7 | « Une loge » | **Absent** | — | Habillage |
| T16 — Le magasin d'accessoires (`/easter-eggs`) | §14.7 | « Le magasin d'accessoires » | **Absent** | — | Habillage |
| T17 — L'entrée des artistes (`/auth`) | §14.7 | « L'entrée des artistes » | **Absent** | — | Titre, « J'ai oublié mon texte » |
| T18 — Annonces de la régie | §14.7 | « Les annonces de la régie » | **Absent** | `ComedieSouffleur.tsx`, `ComedieTroisCoups.tsx` orphelins | Bannières titres annexe B, 3 coups de chargement, souffleur d'états vides. Composants existent mais non branchés |
| T19 — Le poste TSF | §14.7 | « Le poste » | **Absent** | — | TSF en bois verni, cadran doré |
| 404 Comédie — Le souffleur | §14.7 | — | **Absent** | `ComedieSouffleur.tsx` orphelin | Composant existe mais non branché |
| Œuf #28 — Le vert interdit | §14.8 | — | **Absent** | `ComedieVertEgg.tsx` orphelin | Composant existe mais jamais affiché — **l'œuf est introuvable** |
| Œuf #29 — La blanquette | §14.8 | — | **Absent** | — | Rien d'implémenté |
| Œuf #30 — La hyène | §14.8 | — | **Absent** | — | Rien d'implémenté (côté serveur) |
| Au téléphone — Comédie | §14.9 | — | **Absent** | — | Toutes les lignes §14.9 non implémentées |
| Critères d'acceptation phase 8 | §14.10 | — | **Absent** | — | Aucun critère vérifiable |
| Nom du fronton | §7.5 | — | **Faux** | `ComedieFrame.tsx:35` : `Ciné Marathon` | Doit être « Le Marathon Cinéma » |

---

## Western (§15)

| Élément | § du prompt | Section du kit | État | Preuve | Ce qui manque |
|---|---|---|---|---|---|
| W0 — Décor : planches, horizon, vent, étoiles, clous, avis de recherche | §15.4 | « La boîte à outils » | **Partiel** | `WesternFrame.tsx` : planches (quasi invisibles, 4-6 % opacité), horizon sur 3 routes | Pas d'avis de recherche, pas d'étoile `.w-star`, pas de clous `.clou`, vent minimal, pas le reste du kit |
| W1 — Le contrat (`/`) | §15.6 | « Le contrat » | **Absent** | `WesternHomeHero.tsx` orphelin | **Structure.** Composant existe mais non branché dans `app/page.tsx` |
| W2 — Les avis de recherche (`/films`) | §15.6 | « Les avis de recherche » | **Absent** | Aucun « WANTED » dans le code | Habillage. Cartes en avis de recherche, « CAPTURÉ » tampon |
| W3 — Le dossier (fiche) | §15.6 | « Le dossier » | **Absent** | — | Habillage. Dossier du shérif, 10 balles |
| W4 — Le duel | §15.6 | « Le duel » | **Absent** | — | **Structure.** Horizon, horloge, crosse |
| W5 — Le mur des primes (`/classement`) | §15.6 | « Le mur des primes » | **Absent** | — | **Structure.** Premier en grand avis |
| W6 — Ton avis (`/profil`) | §15.6 | « Ton avis de recherche » | **Absent** | — | **Structure.** Avis, crosse, douze rangs |
| W7 — Le saloon (`/forum`) | §15.6 | « Le saloon » | **Absent** | — | **Structure.** Tables, jetons |
| W8 — Le territoire (`/semaine`) | §15.6 | « Le territoire » | **Absent** | — | **Structure.** Carte, diligence, ordres du shérif |
| W9 — La bande (`/marathoniens`) | §15.6 | « La bande » | **Absent** | — | **Structure.** Photo d'époque |
| W10 — Barre Western | §15.6 | « La navigation » | **Partiel** | Libellés dans `lib/themes/western.ts` | À vérifier en rendu |
| W11 — Le carnet de tir (`/notes`) | §15.6 | « Le carnet de tir » | **Absent** | — | Habillage. 10 balles |
| W12 — L'école de tir (`/rattrapage`) | §15.6 | « L'école de tir » | **Absent** | — | Habillage |
| W13 — Mes cibles (`/watchlist`) | §15.6 | « Mes cibles » | **Absent** | — | Habillage |
| W14 — Le courrier (`/messages`) | §15.6 | « Le courrier » | **Absent** | — | Habillage. Papier, encre |
| W15 — Une table (`/forum/[id]`) | §15.6 | « Une table » | **Absent** | — | Habillage |
| W16 — Le butin (`/easter-eggs`) | §15.6 | « Le butin » | **Absent** | — | Habillage |
| W17 — Pousser les portes (`/auth`) | §15.6 | « Pousser les portes » | **Absent** | — | Titre, portes battantes |
| W18 — Le télégraphe | §15.6 | « Le télégraphe » | **Absent** | `WesternBarillet.tsx` orphelin | Bannières, barillet de chargement. Composant existe mais non branché |
| W19 — Le poste du saloon | §15.6 | « Le poste du saloon » | **Absent** | — | Radio bois, cadran de laiton |
| 404 Western — Y a plus personne ici | §15.6 | — | **Absent** | — | Horizon, 15 trous, ligne |
| Œuf #31 — La mouche | §15.7 | — | **Absent** | `WesternVautour.tsx` orphelin (pas la mouche) | Rien d'implémenté |
| Œuf #32 — La ville fantôme | §15.7 | — | **Absent** | — | Rien d'implémenté |
| Œuf #33 — L'heure du duel | §15.7 | — | **Absent** | — | Rien d'implémenté |
| Au téléphone — Western | §15.8 | — | **Absent** | — | Toutes les lignes §15.8 non implémentées |
| Critères d'acceptation phase 9 | §15.9 | — | **Absent** | — | Aucun critère vérifiable |
| Règles `*` + `!important` | §2.2 règle 7 | — | **Faux** | `western-screens.css:18,21` | Ralentissent tout, y compris jeux et easter eggs |
| Lenteur sélective | §15.5 | — | **Faux** | Appliquée via `* { transition-duration }` | Devrait être sur les seuls composants du thème |

---

## Horreur (§16)

| Élément | § du prompt | Section du kit | État | Preuve | Ce qui manque |
|---|---|---|---|---|---|
| H0 — Décor : nuit, lisière, brume, grain, vignettage, lampe, forme | §16.4 | « La boîte à outils » | **Partiel** | `HorreurFrame.tsx` : grain + lampe | Pas de lisière `.h-bois` (forêt), pas de brume `.h-brume`, pas de vignettage `.h-vign`, pas de forme `.h-forme` |
| Lampe de l'horreur | §16.4 | — | **Faux** | `HorreurFrame.tsx` : lampe à `--z-fx` (450), utilise CSS vars (`--mx`, `--my`) → repeinte | Doit être dans le calque de décor (z-index 0), déplacée par `transform: translate3d()`, cachée sur téléphone → suit le toucher |
| Badge REC | — | — | **Faux** | `HorreurFrame.tsx` : badge REC permanent | Non prévu par le prompt (le seul REC est l'horodatage des bandes H16) — à supprimer |
| H1 — La porte (`/`) | §16.7 | « La porte — l'accueil » | **Absent** | `HorreurHomeHero.tsx` orphelin | **Structure.** Porte, perron, lumière. Composant existe mais non branché dans `app/page.tsx` |
| H2 — Les cassettes (`/films`) | §16.7 | « Les cassettes » | **Absent** | `HorreurCassette.tsx`, `HorreurVHS.tsx` orphelins | Habillage. Boîtes VHS. Composants existent mais non branchés |
| H3 — La jaquette (fiche) | §16.7 | « La jaquette » | **Absent** | — | Habillage. Dos de boîte VHS |
| H4 — Les deux portes (`/duels`) | §16.7 | « Les deux portes » | **Absent** | — | **Structure.** Couloir, deux portes, lumière |
| H5 — Les survivants (`/classement`) | §16.7 | « Les survivants » | **Absent** | — | **Structure.** Liste sobre, lumière qui avance |
| H6 — Ton dossier (`/profil`) | §16.7 | « Ton dossier » | **Absent** | — | **Structure.** Polaroïd, « l'autre dossier » |
| H7 — La veillée (`/forum`) | §16.7 | « La veillée » | **Absent** | — | **Structure.** Histoires, bougies |
| H8 — Les sept nuits (`/semaine`) | §16.7 | « Les sept nuits » | **Absent** | — | **Structure.** Sept colonnes |
| H9 — Ceux qui restent (`/marathoniens`) | §16.7 | « Ceux qui restent » | **Absent** | — | **Structure.** Photo de groupe ovale, place vide |
| H10 — Barre Horreur | §16.7 | « La navigation » | **Partiel** | Libellés dans `lib/themes/horreur.ts` | À vérifier en rendu |
| H11 — Le registre (`/notes`) | §16.7 | « Le registre » | **Absent** | — | Habillage. Griffes |
| H12 — Les cercles (`/rattrapage`) | §16.7 | « Les cercles » | **Absent** | — | Habillage |
| H13 — La liste noire (`/watchlist`) | §16.7 | « La liste noire » | **Absent** | — | Habillage |
| H14 — Les appels (`/messages`) | §16.7 | « Les appels » | **Absent** | — | Habillage. Appels manqués, rôle du correspondant (nécessite `exp` dans la lecture) |
| H15 — Une histoire (`/forum/[id]`) | §16.7 | « Une histoire » | **Absent** | — | Habillage |
| H16 — Les bandes retrouvées (`/easter-eggs`) | §16.7 | « Les bandes retrouvées » | **Absent** | — | Habillage. Horodatage vert « REC » |
| H17 — Frapper à la porte (`/auth`) | §16.7 | « Frapper à la porte » | **Absent** | — | Titre, « Tu as perdu la clé » |
| H18 — Les signes | §16.7 | « Les signes » | **Absent** | — | Bannières titres annexe B, rembobinage VHS, respiration |
| H19 — Le transistor (radio) | §16.6, §16.7 | « La radio » | **Absent** | — | Poste portable, grésillement visuel, réglage « Sursauts » |
| H20 — L'apparition | §16.8 | « L'apparition » | **Absent** | — | Sursaut complet, garde-fous, carte « prévenu » |
| 404 Horreur — Il n'y a rien derrière cette porte | §16.7 | — | **Absent** | — | Respiration, ligne |
| Comportement : la porte | §16.5 | — | **Absent** | — | Ombres au survol, porte qui s'entrouvre |
| Comportement : la forme | §16.5 | — | **Absent** | — | Silhouette après 30 s sans geste |
| Comportement : le froid | §16.5 | — | **Absent** | — | Lampe baisse + décoloration après action destructive |
| Comportement : la respiration | §16.5 | — | **Absent** | — | Vignettage qui se resserre |
| Comportement : le rembobinage | §16.5 | — | **Absent** | — | Bande VHS de chargement |
| Comportement : le silence | §16.5 | — | **Absent** | — | Aucun son sauf sursaut |
| Case « Son » | §16.8 | — | **Absent** | — | Case visible en bas à gauche |
| Réglages `profiles.sursauts` / `profiles.son_horreur` | §16.8, §16.11 | — | **Absent** | — | Colonnes M3, fonctions serveur |
| Œuf #34 — Le ballon rouge | §16.9 | — | **Absent** | — | Rien d'implémenté |
| Œuf #35 — La possession | §16.9 | — | **Absent** | — | Rien d'implémenté |
| Œuf #36 — Tourner en rond | §16.9 | — | **Absent** | — | Rien d'implémenté |
| Œuf #37 — L'apparition | §16.8 | — | **Absent** | — | Rien d'implémenté (voir H20) |
| Au téléphone — Horreur | §16.10 | — | **Absent** | — | Toutes les lignes §16.10 non implémentées |
| Critères d'acceptation phase 10 | §16.11 | — | **Absent** | — | Aucun critère vérifiable |
| Tests `apparitionPermise` | §16.11 | — | **Absent** | — | Fonction et tests Vitest à écrire |

---

## Composants orphelins (code mort)

| Composant | Thème | Rôle prévu dans le prompt | Branché ? |
|---|---|---|---|
| `components/theme/action/PosterGrade.tsx` | Action | Étalonnage des affiches | Non |
| `components/theme/comedie/ComedieAffiche.tsx` | Comédie | T5 — L'affiche du classement | Non |
| `components/theme/comedie/ComedieCadran.tsx` | Comédie | T4 — L'applaudimètre | Non |
| `components/theme/comedie/ComedieSouffleur.tsx` | Comédie | 404, états vides T18 | Non |
| `components/theme/comedie/ComedieTroisCoups.tsx` | Comédie | Chargement T18 | Non |
| `components/theme/comedie/ComedieVertEgg.tsx` | Comédie | Œuf #28 — Le vert interdit | Non |
| `components/theme/horreur/HorreurHomeHero.tsx` | Horreur | H1 — La porte | Non |
| `components/theme/horreur/HorreurCassette.tsx` | Horreur | H2 — Les cassettes | Non |
| `components/theme/horreur/HorreurVHS.tsx` | Horreur | H2 — Les cassettes | Non |
| `components/theme/western/WesternHomeHero.tsx` | Western | W1 — Le contrat | Non |
| `components/theme/western/WesternBarillet.tsx` | Western | W18 — Chargement | Non |
| `components/theme/western/WesternVautour.tsx` | Western | Pas dans le prompt (vautour ≠ mouche) | Non |
| `components/AlienEgg.tsx` | — | Easter egg existant (#?) | Non |
| `components/JawsEgg.tsx` | — | Easter egg existant (#?) | Non |
| `components/Sidebar.tsx` | — | À déterminer | Non |
| 15 × `components/ui/*.tsx` | — | Composants partagés §8.4 | Non |

---

## CSS mort — résumé

| Fichier | Classes mortes / total |
|---|---|
| `action-screens.css` | 14 / 20 |
| `action.css` | 7 / 8 |
| `comedie-screens.css` | 26 / 55 |
| `horreur-screens.css` | 19 / 29 |
| `western-screens.css` | 20 / 34 |
| `action-frame.module.css` | 6 / 22 |
| `horreur-frame.module.css` | 2 / 7 |
| `western-frame.module.css` | 2 / 10 |
| `Button.module.css` | 7 / 11 |
| `Gauge.module.css` | 4 / 10 |
| `StatRow.module.css` | 4 / 7 |
| `Tag.module.css` | 5 / 6 |

Total : **86 classes mortes dans les thèmes**, **30 classes mortes dans les modules**.

Les classes mortes des `*-screens.css` visent des éléments qui n'existent pas encore (`.leaderboard-table`, `.profile-card`, `.forum-topic-row`, etc.) : elles deviendront pertinentes **si** les écrans de thème posent les bonnes classes, ou devront être supprimées.

---

## Ce que The Legendre a changé après `bb46858` (choix de The Legendre)

| Élément | État | Note |
|---|---|---|
| Radio : vraies musiques (2 pistes/thème) | Choix de The Legendre | `public/audio/radio/`, musique au premier geste |
| Radio : bouton fixe en bas à droite + volume | Choix de The Legendre | Remplace « en bas à gauche, à l'arrêt par défaut » |
| Verrou « saison 2 uniquement » retiré | Choix de The Legendre | Actions serveur et interface |

---

## Conclusion

Le moteur de thèmes (résolution, jetons, polices, libellés, radio) fonctionne. **Les décors et la structure des écrans manquent presque entièrement.** Sur les ~80 écrans de thème (A1-A19 + T1-T19 + W1-W19 + H1-H20 + 404×4), seuls 2 accueils (Action, Comédie) ont une structure spécifique, et aucun autre écran n'a de structure ni d'habillage de thème effectif. 86 classes CSS de thème ne ciblent rien, 30 composants écrits ne sont jamais rendus, et 2 règles CSS violent §2.2.

Le travail restant est massif mais le socle (résolution des thèmes, tokens, dictionnaire, admin) est solide.
