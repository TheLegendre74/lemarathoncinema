# Dance avec Clippy - preparation

Ce dossier prepare le futur mode infini "Dance avec Clippy" sans le brancher en production.

## Statut

- Non integre au menu Easter pour l'instant.
- Non pousse.
- Invisible pour tous les joueurs tant que l'integration n'est pas faite.
- Pret a etre branche uniquement pour les joueurs qui ont reussi Fever Night.

## Regle de deblocage

Le mode doit apparaitre seulement si le joueur a deja l'egg:

```ts
rythme-dans-la-peau
```

Cet egg est deja pose par `unlockFeverNight()` quand Fever Night est gagne. Il peut donc servir de verrou d'acces pour le menu Easter.

## Comportement attendu plus tard

1. Le joueur gagne Fever Night.
2. Le jeu affiche un message de cadeau:
   "Mode debloque: Dance avec Clippy"
3. Le menu Easter revele une nouvelle entree "Dance avec Clippy".
4. Cette entree reste invisible pour les joueurs qui n'ont pas `rythme-dans-la-peau`.
5. Le mode lance le meme gameplay que DDR/Fever Night, avec la meme esthetique, mais en mode infini.
6. Le joueur choisit une difficulte parmi 3 niveaux et une musique parmi 3 nouvelles musiques.

## Musiques a ajouter plus tard

Les chemins sont reserves dans `danceWithClippyConfig.ts`:

- `/audio/clippy/dance-with-clippy/neon-office.m4a`
- `/audio/clippy/dance-with-clippy/paperclip-disco.m4a`
- `/audio/clippy/dance-with-clippy/midnight-fever.m4a`

Les fichiers audio ne sont pas ajoutes ici. Il faudra les fournir avant l'integration en ligne.

