# Éloquence

Application personnelle d'entraînement à la prise de parole : feedback IA honnête,
conversations en rôle-play et progression adaptative. PWA installable, Next.js (App
Router) + Supabase + Claude.

## Stack

- **Next.js 16** (App Router, TypeScript strict) + Tailwind CSS v4
- **Supabase** — Auth, Postgres (RLS), Storage
- **Anthropic Claude** (`claude-sonnet-4-6`) — feedback et rôle-play
- **Whisper** (API compatible OpenAI) — transcription audio
- PWA — `public/manifest.json` + `public/sw.js`

## Installation locale

1. **Dépendances**

   ```bash
   npm install
   ```

2. **Variables d'environnement** — copiez `.env.example` vers `.env.local` et
   renseignez vos clés Supabase, Anthropic et de transcription.

   ```bash
   cp .env.example .env.local
   ```

3. **Base de données Supabase** — créez un projet sur [supabase.com](https://supabase.com)
   (plan gratuit), puis appliquez les migrations dans l'éditeur SQL (ou via la CLI
   Supabase) dans l'ordre :

   ```bash
   supabase/migrations/0001_init.sql   # schéma + policies RLS (4 par table)
   supabase/migrations/0002_seed.sql   # thèmes + 6 scénarios de conversation
   ```

   Le bucket de stockage privé `recordings` est créé automatiquement par la
   migration, avec des policies limitant chaque utilisateur à son propre dossier
   (`recordings/<user_id>/...`).

4. **Lancer le serveur de développement**

   ```bash
   npm run dev
   ```

   Ouvrez [http://localhost:3000](http://localhost:3000).

## Vérifications qualité

```bash
npx tsc --noEmit   # typage strict
npx eslint .        # lint
npm run build       # build de production
```

## Déploiement sur Vercel

1. Poussez le dépôt sur GitHub/GitLab.
2. Importez le projet dans [Vercel](https://vercel.com/new).
3. Renseignez les variables d'environnement de `.env.example` dans les
   paramètres du projet Vercel (Production + Preview).
4. Ajoutez `NEXT_PUBLIC_SITE_URL` avec l'URL de déploiement (utilisée pour les
   redirections d'authentification Supabase — lien magique, confirmation d'email).
5. Dans Supabase → Authentication → URL Configuration, ajoutez l'URL Vercel aux
   *Redirect URLs* (`https://votre-app.vercel.app/auth/callback`).
6. Déployez.

## Architecture

```
app/                    Pages et routes (App Router)
  onboarding/            Diagnostic initial en 4 étapes
  practice/[type]/       Enregistrement solo (lecture/improvisation) + feedback
  conversation/           Liste des scénarios + salle de rôle-play
  progress/               Historique, courbe de progression, radar, vocabulaire
  settings/               Objectif, rappels, confidentialité, réévaluation
  api/                    Routes serveur (Claude, transcription)
components/              Composants UI, feedback, enregistrement, progression
lib/
  prompts/                Prompts IA littéraux (feedback.ts, conversation.ts)
  audio/                  VAD, enregistreur, synthèse vocale, bruit ambiant
  supabase/                Clients Supabase (browser/serveur/middleware)
  progression.ts           Moyenne mobile de difficulté adaptative
  vocabulaire.ts            Suggestion et suivi du vocabulaire actif
supabase/migrations/      Schéma SQL + policies RLS + seed
types/                    Types Supabase (Database) et types métier (domain)
```

## Points d'attention techniques

- **RLS** : chaque table de données utilisateur a exactement 4 policies
  (`select`/`insert`/`update`/`delete`) filtrées sur `auth.uid()`, y compris
  `feedback` (via jointure sur `sessions`).
- **Voix** : seuil de détection de fin de parole calibré à l'onboarding (2–3s +
  fenêtre de grâce de 700ms), écho annulé via `echoCancellation`, interruption de
  l'IA uniquement sur un signal vocal continu de 300–500ms (jamais un bruit isolé).
- **Mémoire de conversation** : l'historique complet des messages est renvoyé à
  chaque appel à `/api/conversation`, l'API Claude n'ayant pas de mémoire native.
