# Notes d'integration futures

Ces notes servent au branchement futur. Rien dans ce dossier ne rend le mode visible aujourd'hui.

## 1. Gate menu Easter

Dans `app/easter-eggs/EasterEggsPageClient.tsx`, la nouvelle entree doit etre affichee seulement si:

```ts
discoveredMap['rythme-dans-la-peau']
```

Le mode ne doit pas etre ajoute dans une liste publique qui reserve une carte verrouillee. Il doit etre absent completement pour les joueurs non eligibles.

Exemple de garde:

```tsx
const canSeeDanceWithClippy = !!discoveredMap[DANCE_WITH_CLIPPY_UNLOCK_EGG_ID]

{canSeeDanceWithClippy ? (
  <DanceWithClippyMenuEntry onOpen={() => setDanceWithClippyOpen(true)} />
) : null}
```

## 2. Message de cadeau apres Fever Night

Dans `components/ClippyDanceBattle.tsx`, le bon endroit est l'overlay `FeverPostGameOverlay`, affiche apres la victoire.

Message propose:

```txt
CADEAU DEBLOQUE
Dance avec Clippy est disponible dans le menu Easter.
```

La sauvegarde serveur existe deja via `unlockFeverNight()`, qui pose `rythme-dans-la-peau`.

## 3. Moteur de jeu

Le futur mode doit reutiliser le gameplay DDR/Fever Night:

- memes lanes;
- memes lasers;
- meme ambiance disco/neon;
- meme logique de jugement;
- mode infini au lieu d'un combat narratif;
- la difficulte vient de la config `DANCE_WITH_CLIPPY_DIFFICULTIES`;
- la musique vient de la config `DANCE_WITH_CLIPPY_TRACKS`.

## 4. Assets requis avant mise en ligne

Ajouter les trois fichiers audio dans:

```txt
public/audio/clippy/dance-with-clippy/
```

Noms reserves:

```txt
neon-office.m4a
paperclip-disco.m4a
midnight-fever.m4a
```

