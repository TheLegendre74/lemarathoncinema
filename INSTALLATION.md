# 🎬 Ciné Marathon — Guide d'installation complet

## Prérequis
- Node.js 18+
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)
- Un compte [GitHub](https://github.com) (gratuit)

---

## Étape 1 — Configurer Supabase (15 min)

### 1.1 Créer le projet
1. Va sur [app.supabase.com](https://app.supabase.com)
2. **New project** → donne un nom (ex: `cinema-marathon`)
3. Choisir un mot de passe DB solide → **Create project**
4. Attendre ~2 min que le projet se crée

### 1.2 Créer le schéma
1. Dans le menu gauche : **SQL Editor** → **New query**
2. Colle le contenu de `supabase/schema.sql`
3. Clique **Run**
4. Faire pareil avec `supabase/functions.sql`
5. Faire pareil avec `supabase/seed.sql` (les 219 films)

### 1.3 Récupérer les clés
Dans **Settings** → **API** :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### 1.4 Activer le Realtime (forum live)
1. **Database** → **Replication**
2. Activer les tables : `posts`, `watched`, `votes`, `profiles`

### 1.5 Créer le compte admin
1. **Authentication** → **Users** → **Add user**
2. Email : `admin@cinemarathon.fr`
3. Password : (ton mot de passe admin)
4. Puis dans **SQL Editor** :
```sql
UPDATE public.profiles SET is_admin = true WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@cinemarathon.fr'
);
```

---

## Étape 2 — Préparer le code (5 min)

```bash
# Cloner ou récupérer le dossier cm-next
cd cm-next

# Copier le fichier d'env
cp .env.example .env.local

# Remplir .env.local avec tes clés Supabase
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
# NEXT_PUBLIC_MARATHON_START=2026-04-10T00:00:00

# Installer les dépendances
npm install

# Lancer en local pour tester
npm run dev
# → http://localhost:3000
```

---

## Étape 3 — Déployer sur Vercel (5 min)

### 3.1 Mettre le code sur GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Créer un dépôt sur github.com puis :
git remote add origin https://github.com/TON-USER/cinema-marathon.git
git push -u origin main
```

### 3.2 Importer sur Vercel
1. Va sur [vercel.com](https://vercel.com) → **Add New Project**
2. **Import** ton dépôt GitHub `cinema-marathon`
3. **Framework Preset** : Next.js (auto-détecté)
4. **Environment Variables** : ajoute toutes les variables de `.env.example`
5. **Deploy** !

Tu as une URL `cinema-marathon.vercel.app` en 2 minutes. ✅

---

## Étape 4 — Mise à jour sans perte de données

Pour modifier le site :
1. Édite le code en local
2. `git add . && git commit -m "Update" && git push`
3. Vercel redéploie automatiquement en ~30 secondes

**Les données joueurs (Supabase) ne sont jamais touchées par un redéploiement.**

### Modifier la config sans toucher au code
Dans **Vercel Dashboard** → ton projet → **Settings** → **Environment Variables** :
- Reporter le marathon : `NEXT_PUBLIC_MARATHON_START=2026-05-10T00:00:00`
- Changer l'EXP : `NEXT_PUBLIC_EXP_FILM=8`
- Passer Saison 2 : `NEXT_PUBLIC_SAISON_NUMERO=2` + `NEXT_PUBLIC_SAISON_LABEL=Saison 2 · 2026`

Puis **Redeploy** (sans push git).

---

## Workflow hebdomadaire admin

| Jour | Action |
|------|--------|
| Lundi | Admin → Générer le duel de la semaine |
| Vendredi | Admin → Clôturer le duel + Définir film de la semaine |
| Vendredi soir | Séance collective Film de la semaine (+10 EXP) |
| Mercredi soir | Séance collective vainqueur du duel (+15 EXP) |

---

## Capacité & performance

| Métrique | Supabase Free | Ce projet |
|----------|--------------|-----------|
| DB size | 500 MB | ~5 MB pour 10k joueurs |
| Requêtes/jour | 50 000 | ~200 par joueur actif |
| Connexions simultanées | 60 | OK jusqu'à ~500 actifs |
| Realtime | Inclus | Forum live, votes live |

Pour plusieurs milliers de joueurs : **Supabase Pro (~25$/mois)** donne 8 GB + connexions illimitées.

---

## Structure du projet

```
cm-next/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx            # Accueil / Dashboard
│   ├── auth/page.tsx       # Login & Register
│   ├── films/              # Liste des films
│   ├── duels/              # Duels & votes
│   ├── semaine/            # Film de la semaine
│   ├── classement/         # Leaderboard joueurs
│   ├── notes/              # Classement films notés
│   ├── profil/             # Profil utilisateur
│   └── admin/              # Panneau admin
├── components/             # Composants réutilisables
│   ├── Sidebar.tsx
│   ├── Countdown.tsx       # Timer temps réel
│   ├── Forum.tsx           # Forum avec realtime
│   ├── Poster.tsx          # Affiche film avec fallback
│   ├── ExpBar.tsx
│   └── ToastProvider.tsx
├── lib/
│   ├── config.ts           # ⚙️ CONFIG CENTRALE (dates, EXP, badges, streaming)
│   ├── actions.ts          # Server Actions (mutations DB)
│   └── supabase/           # Client, server, types
├── supabase/
│   ├── schema.sql          # Schéma DB complet
│   ├── seed.sql            # 219 films
│   └── functions.sql       # Fonctions RPC
├── .env.example            # Template variables d'env
└── INSTALLATION.md         # Ce fichier
```
