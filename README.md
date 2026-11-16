# Tandem

L'app qui rend visible la charge mentale du couple parental, et aide à la rééquilibrer. Zéro saisie : calendriers + note vocale + IA.

Cadrage complet : https://claude.ai/artifact/KQ7zHFP3hpJB3vwSCMBYXD

## État au 16/11/2026

En ligne : https://tandem-app-3big.vercel.app (chaque push sur `main` redéploie).

| Brique | État |
| --- | --- |
| Supabase `tandem` (eu-west-3) | Schéma, RLS, RPC, 50 tâches de bibliothèque. |
| Ajout de tâches (« J'ai géré… », calendrier) | Fonctionne. IA si la clé est posée, sinon classement par mots-clés (`ingest_items`). |
| Tâches saisonnières | Fonctionne : proposées à chaque ouverture (`propose_library_tasks`). |
| Bilan hebdo | Fonctionne : calcul SQL, cron dimanche 17:00 UTC, bouton « Voir le bilan maintenant ». |
| Edge function `classify-task` | Déployée, appelle OpenAI. Sans secret `OPENAI_API_KEY`, elle rend la main au classement par mots-clés. |
| Edge function `fetch-ics` | Déployée : lit l'agenda en ligne (lien iCal) du membre connecté. |
| Gmail | v1.1, après validation OAuth Google. |

## Activer l'IA (2 minutes, optionnel)

Supabase → projet tandem → Edge Functions → Secrets → ajouter `OPENAI_API_KEY` (clé créée sur platform.openai.com). Optionnel : `OPENAI_MODEL` pour forcer un modèle.
Les titres deviennent propres (« Rdv pédiatre Tom »), les dates dictées sont comprises et le tri du calendrier est plus fin.

## Réglages Supabase à faire une fois

Authentication → URL Configuration : Site URL `https://tandem-app-3big.vercel.app`, Redirect URLs `https://tandem-app-3big.vercel.app/**`, `tandem://**`, `exp://**`.

## Développement local

```bash
npm install
npx expo start --web        # ou --tunnel pour Expo Go
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
