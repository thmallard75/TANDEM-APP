# Tandem

L'app qui rend visible la charge mentale du couple parental, et aide à la rééquilibrer. Zéro saisie : calendriers + note vocale + IA.

Cadrage complet : https://claude.ai/artifact/KQ7zHFP3hpJB3vwSCMBYXD

## État au 16/11/2026

| Brique | État |
| --- | --- |
| Supabase `tandem` (eu-west-3) | Créé. Schéma, RLS, RPC et 50 tâches de bibliothèque appliqués. |
| App Expo (Expo Router, TypeScript) | Écrite : login par lien magique, onboarding foyer, Aujourd'hui, Bilan, Tâche, Foyer. |
| Edge functions `classify-task`, `weekly-report` | Écrites, **à déployer** (voir ci-dessous). |
| Cron du dimanche | SQL prêt dans `supabase/migrations/0004`, **à exécuter après déploiement**. |
| Gmail | v1.1 — déposer la demande OAuth chez Google dès maintenant (2 à 4 semaines). |

## Lancer l'app (10 minutes)

```bash
npm install
cp .env.example .env          # clés déjà renseignées (publishable key, pas secrète)
npx expo start                # puis "i" (simulateur iOS) ou scanner avec Expo Go
```

Dans Supabase → Authentication → URL Configuration, ajouter `tandem://` aux Redirect URLs pour que le lien magique rouvre l'app.

## Déployer le backend (15 minutes)

```bash
npm i -g supabase
supabase login
supabase link --project-ref sttsvpqrvzsyqswejrpc

# Clés : Anthropic (console.anthropic.com) et un secret cron au hasard
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set CRON_SECRET=$(openssl rand -hex 16)

supabase functions deploy classify-task
supabase functions deploy weekly-report --no-verify-jwt
```

Puis dans le SQL Editor, coller `supabase/migrations/0004_cron_weekly_report.sql` en remplaçant `<CRON_SECRET>` par la valeur choisie.

Tester le bilan sans attendre dimanche :

```bash
curl -X POST https://sttsvpqrvzsyqswejrpc.supabase.co/functions/v1/weekly-report \
  -H "x-cron-secret: <CRON_SECRET>"
```

## Structure

```
app/
  _layout.tsx          garde de navigation (login → onboarding → tabs)
  (auth)/login.tsx     lien magique par email
  (auth)/onboarding.tsx  créer ou rejoindre un foyer
  (tabs)/index.tsx     Aujourd'hui : tâches par jour + bouton "J'ai géré…"
  (tabs)/bilan.tsx     score de l'équipe par catégorie + tâches à reprendre
  (tabs)/foyer.tsx     membres, enfants, synchro calendrier, invitation
  task/[id].tsx        détail, contexte, reprendre / fait / pas une tâche
lib/
  supabase.ts          client (session dans le Keychain)
  store.ts             état global (zustand)
  calendar.ts          lecture des calendriers du téléphone → classify-task
  voice.ts             phrase dictée → classify-task
  types.ts, theme.ts
components/            TaskCard, ScoreBar, ui
supabase/
  functions/classify-task    Claude Haiku : élément brut → tâche + catégorie + couches
  functions/weekly-report    scores hebdo + Claude Sonnet pour 2-3 suggestions
  migrations/                0001 schéma · 0002 RPC · 0003 seed · 0004 cron
```

## Principes non négociables (voir cadrage)

1. Zéro saisie manuelle.
2. Ton collectif : « l'équipe penche à 70/30 », jamais « X a fait 70 % ».
3. Utilisable en solo ; le score attend le duo.
4. Anticiper (3) pèse plus que décider (2) et faire (1).
5. Reprendre une tâche transfère vraiment les rappels et le contexte.

## Prochaines étapes

- [ ] `npm install` + premier lancement, corriger les éventuelles versions Expo (`npx expo install --fix`)
- [ ] Déployer les deux edge functions et le cron
- [ ] Demande OAuth Gmail (scope `gmail.readonly`) dans Google Cloud Console
- [ ] Déclencheurs de la bibliothèque (fonction `library-propose`, cron quotidien) — semaine 3
- [ ] Push notification du dimanche (expo-notifications) — semaine 4
- [ ] Test sur ton couple, puis 10 couples de l'école
