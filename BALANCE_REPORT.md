# BALANCE REPORT — Le Trombone de l'Infini

Généré le 2026-06-15T14:23:06.863Z

> **Note :** Le bot auto-player tire en continu et esquive de manière basique (fuite densité).
> Un joueur humain esquive mieux mais fait moins de DPS → run réel estimé 18–22 min en Normal.
> Le bot a des continues illimités pour simuler un run complet.

## NORMAL

| Métrique | Valeur | Cible |
|---|---|---|
| Durée totale | 16m34s (994s) | 18–22 min |
| Stage 1 | 3m52s (233s) | ~4–5 min |
| Stage 2 | 5m39s (340s) | ~5 min |
| Stage 3 | 7m01s (421s) | ~9–10 min |
| Boss 1 kill | 1m16s (77s) | ~90s |
| Boss 2 kill | 2m50s (171s) | ~120s |
| Boss 3 kill | 4m38s (278s) | ~360–420s |
| Morts | 55 | — |
| Score final | 106900 | — |
| Terminé | OUI | OUI |
| Soft-lock | NON | NON |
| NaN détecté | NON | NON |
| Max entités | 181 | <500 |
| Boss vaincus | 3/3 | 3/3 |

## HARD

| Métrique | Valeur | Cible |
|---|---|---|
| Durée totale | 23m29s (1410s) | 18–22 min |
| Stage 1 | 5m15s (315s) | ~4–5 min |
| Stage 2 | 5m58s (359s) | ~5 min |
| Stage 3 | 12m15s (736s) | ~9–10 min |
| Boss 1 kill | 2m39s (159s) | ~90s |
| Boss 2 kill | 3m22s (203s) | ~120s |
| Boss 3 kill | 9m43s (584s) | ~360–420s |
| Morts | 89 | — |
| Score final | 112300 | — |
| Terminé | OUI | OUI |
| Soft-lock | NON | NON |
| NaN détecté | NON | NON |
| Max entités | 181 | <500 |
| Boss vaincus | 3/3 | 3/3 |

## Ajustements auto-tuning effectués

| Paramètre | Valeur initiale | Valeur finale | Raison |
|---|---|---|---|
| Boss 1 HP total | 1000 | 700 (200/240/260) | Boss trop long à ~360s, cible ~90s |
| Boss 2 HP total | 1300 | 700 (220/240/240) | Boss trop long à ~250s, cible ~120s |
| Boss 3 gem HP | 250 | 300 | Boss trop rapide à ~160s, cible ~360s |
| Player bullet damage | 1 | 2 | DPS insuffisant pour les cibles de TTK |
| Enemy bullet speed | 180 | 130 | Trop de morts, difficulté excessive |
| Enemy fire rates | 1.5/2/1 | 0.5/0.8/0.5 | Idem |
| Invuln after hit | 0.3s | 1.0s | Joueur se faisait tuer en rafale |
| Player start bombs | 2 | 3 | Plus de survie |
| Boss 1 phase 2 invuln | 2s/5s cycle | 1.2s/5s cycle | Soft-lock — boss imbattable |
| Boss position | x += sin*dt | target+lerp+clamp | Drift hors écran → soft-lock |
| Enemy max age | infini | 30s | Ennemis statiques bloquaient le spawn boss |
| Boss trigger timeout | strict | +15s grace period | Garantit le spawn boss |

