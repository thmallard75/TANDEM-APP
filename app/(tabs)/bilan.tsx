import { alert } from '@/lib/alert';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { partnerOf, useStore } from '@/lib/store';
import { ScoreBar } from '@/components/ScoreBar';
import { Avatar, Button, Card, Empty, Header, P, Pill, Screen, SectionTitle } from '@/components/ui';
import { CATEGORY_STYLE, GRADIENT, theme } from '@/lib/theme';
import type { Category, WeeklyReport } from '@/lib/types';

const CATEGORIES: Category[] = ['sante', 'ecole', 'logistique', 'maison', 'social', 'admin'];

type Recap = { total: number; mine: number; theirs: number; top: Category | null };

/** Part (en %) portée par `a` dans un bilan ; null s'il n'y a rien eu cette semaine-là. */
function share(report: WeeklyReport, a: string, b: string) {
  const x = report.scores.total[a] ?? 0;
  const y = report.scores.total[b] ?? 0;
  return x + y === 0 ? null : Math.round((x / (x + y)) * 100);
}

/** La météo du foyer : des mots plutôt qu'un verdict chiffré. */
function weather(pct: number | null) {
  if (pct === null) return { label: 'Semaine toute neuve', emoji: '🌱', text: 'Dès que vous gérez quelque chose, le tandem se met en route.' };
  const lean = Math.max(pct, 100 - pct);
  if (lean <= 55) return { label: 'Ça roule droit', emoji: '☀️', text: 'Vous pédalez au même rythme. Continuez comme ça.' };
  if (lean <= 60) return { label: 'Belle allure', emoji: '🌤️', text: 'L’équipe est à l’équilibre, à peu de chose près.' };
  if (lean <= 72) return { label: 'Le tandem penche un peu', emoji: '⛅', text: 'Une ou deux tâches à se repasser, et ça repart droit.' };
  return { label: 'Le tandem penche fort', emoji: '🌧️', text: 'L’un de vous porte beaucoup cette semaine. Voici de quoi rééquilibrer.' };
}

export default function Bilan() {
  const { household, members, me, load, celebrate } = useStore();
  const partner = partnerOf(me, members);
  const [reports, setReports] = useState<WeeklyReport[] | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);

  const refresh = useCallback(async () => {
    if (!household || !me || !partner) return;
    // Le score se recalcule à chaque ouverture : pas besoin d'attendre dimanche.
    await supabase.rpc('generate_my_weekly_report').then(() => {}, () => {});
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const [rep, done] = await Promise.all([
      supabase.from('weekly_reports').select('*').eq('household_id', household.id).order('week_start', { ascending: false }).limit(12),
      supabase.from('tasks').select('category, done_by_member_id').eq('household_id', household.id).eq('status', 'done').gte('done_at', monthStart),
    ]);
    setReports((rep.data as WeeklyReport[]) ?? []);
    const rows = done.data ?? [];
    const counts = new Map<Category, number>();
    for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    setRecap({
      total: rows.length,
      mine: rows.filter((r) => r.done_by_member_id === me.id).length,
      theirs: rows.filter((r) => r.done_by_member_id === partner.id).length,
      top,
    });
  }, [household?.id, me?.id, partner?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function accept(taskId: string) {
    const { error } = await supabase.rpc('accept_transfer', { p_task_id: taskId });
    if (error) return alert('Oups', error.message);
    celebrate('C’est à toi maintenant 🤝');
    await load();
    await refresh();
  }

  async function shareRecap() {
    if (!recap || !partner) return;
    const month = new Date().toLocaleDateString('fr-FR', { month: 'long' });
    const message =
      `Notre mois de ${month} sur Tandem 🚲\n` +
      `${recap.total} choses gérées à deux` +
      (recap.top ? `, surtout côté ${CATEGORY_STYLE[recap.top].label.toLowerCase()}` : '') +
      `.\nOn voit enfin qui porte quoi : https://tandem-app-3big.vercel.app`;
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(message);
      return alert('Récap copié', 'Colle-le où tu veux.');
    }
    await Share.share({ message });
  }

  if (!partner) {
    return (
      <Screen>
        <Header eyebrow="Bilan" title="L'équipe à deux" />
        <Empty emoji="🤝" title="Le bilan se lit à deux" text="Invite ton partenaire depuis l'onglet Foyer : la météo du foyer apparaît dès qu'il ou elle a rejoint." />
      </Screen>
    );
  }

  if (!reports) {
    return (
      <Screen>
        <Header eyebrow="Bilan" title="Météo du foyer" />
        <ActivityIndicator color={theme.mint} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const report = reports[0];
  if (!report) {
    return (
      <Screen>
        <Header eyebrow="Bilan" title="Météo du foyer" />
        <Empty emoji="🌱" title="Rien à mesurer pour l'instant" text="Notez ce que vous gérez, chacun de votre côté : le bilan se construit tout seul." />
      </Screen>
    );
  }

  const pctMe = share(report, me!.id, partner.id);
  const w = weather(pctMe);
  // Le côté le plus chargé descend : à gauche (moi) = rotation négative.
  const tilt = pctMe === null ? 0 : Math.max(-14, Math.min(14, (50 - pctMe) * 0.45));

  let streak = 0;
  for (const r of reports) {
    const p = share(r, me!.id, partner.id);
    if (p !== null && Math.max(p, 100 - p) <= 60) streak++;
    else break;
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Header
          eyebrow={`Semaine du ${new Date(report.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
          title="Météo du foyer"
        />

        <LinearGradient colors={GRADIENT.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>
            {w.emoji}  {w.label}
          </Text>

          <View style={styles.beamZone}>
            <View style={[styles.beamWrap, { transform: [{ rotate: `${tilt}deg` }] }]}>
              <Avatar name={me!.display_name} size={46} tone="dark" />
              <View style={styles.beam} />
              <Avatar name={partner.display_name} size={46} tone="dark" />
            </View>
            <View style={styles.pivot} />
          </View>

          {pctMe !== null && (
            <Text style={styles.heroNum}>
              {pctMe}
              <Text style={styles.heroSep}> / </Text>
              {100 - pctMe}
            </Text>
          )}
          <Text style={styles.heroText}>{w.text}</Text>
        </LinearGradient>

        {streak >= 2 && (
          <Card tint style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Text style={{ fontSize: 30 }}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{streak} semaines d'affilée à l'équilibre</Text>
              <Text style={styles.sub}>Un record d'équipe, pas une compétition.</Text>
            </View>
          </Card>
        )}

        <Card>
          {CATEGORIES.map((c) => (
            <ScoreBar
              key={c}
              emoji={CATEGORY_STYLE[c].emoji}
              label={CATEGORY_STYLE[c].label}
              left={report.scores.by_category?.[c]?.[me!.id] ?? 0}
              right={report.scores.by_category?.[c]?.[partner.id] ?? 0}
            />
          ))}
          <Text style={styles.legend}>
            <Text style={{ color: theme.mint }}>●</Text> {me!.display_name}   <Text style={{ color: theme.peach }}>●</Text> {partner.display_name}
          </Text>
        </Card>

        {report.suggestions.length > 0 && (
          <>
            <SectionTitle>Pour repartir droit</SectionTitle>
            {report.suggestions.map((s) => {
              const forMe = s.to_member_id === me!.id;
              const cat = CATEGORY_STYLE[s.category];
              return (
                <Card key={s.task_id}>
                  <Pill bg={cat.bg} fg={cat.fg}>{cat.emoji} {cat.label}</Pill>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <P muted>{s.why}</P>
                  {forMe ? (
                    <Button title="Je reprends" onPress={() => accept(s.task_id)} variant="accent" />
                  ) : (
                    <Text style={styles.sub}>Proposée à {partner.display_name}</Text>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {recap && recap.total > 0 && (
          <>
            <SectionTitle>Votre mois de {new Date().toLocaleDateString('fr-FR', { month: 'long' })}</SectionTitle>
            <View style={styles.recap}>
              <LinearGradient colors={GRADIENT.me} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.recapStripe} />
              <Text style={styles.recapNum}>{recap.total}</Text>
              <Text style={styles.recapLabel}>choses gérées à deux</Text>
              <View style={styles.recapRow}>
                <View style={styles.recapCell}>
                  <Avatar name={me!.display_name} size={28} />
                  <Text style={styles.recapSmall}>{recap.mine}</Text>
                </View>
                <View style={styles.recapCell}>
                  <Avatar name={partner.display_name} size={28} tone="sand" />
                  <Text style={styles.recapSmall}>{recap.theirs}</Text>
                </View>
                {recap.top && (
                  <View style={styles.recapCell}>
                    <Text style={{ fontSize: 22 }}>{CATEGORY_STYLE[recap.top].emoji}</Text>
                    <Text style={styles.sub}>surtout {CATEGORY_STYLE[recap.top].label.toLowerCase()}</Text>
                  </View>
                )}
              </View>
              <Button title="Partager notre récap" onPress={shareRecap} variant="ghost" />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, padding: 22, gap: 10, alignItems: 'center', ...theme.shadow },
  heroLabel: { fontFamily: theme.display, fontSize: 22, color: theme.onGradient },
  beamZone: { height: 96, width: '100%', alignItems: 'center', justifyContent: 'center' },
  beamWrap: { flexDirection: 'row', alignItems: 'center', width: 250 },
  beam: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.onGradient, marginHorizontal: -4 },
  pivot: { width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: theme.onGradient, marginTop: -8 },
  heroNum: { fontFamily: theme.display, fontSize: 34, color: theme.onGradient, letterSpacing: -1 },
  heroSep: { color: 'rgba(16,23,43,0.45)', fontSize: 24 },
  heroText: { fontFamily: theme.bodyMedium, fontSize: 15, color: 'rgba(16,23,43,0.88)', textAlign: 'center', lineHeight: 22 },
  legend: { fontFamily: theme.body, fontSize: 13, color: theme.muted, textAlign: 'center', marginTop: 4 },
  cardTitle: { fontFamily: theme.display, fontSize: 19, color: theme.ink },
  sub: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  recap: { backgroundColor: theme.card, borderRadius: 28, borderWidth: 1, borderColor: theme.hairline, padding: 22, paddingTop: 28, gap: 8, alignItems: 'center', overflow: 'hidden' },
  recapStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  recapNum: { fontFamily: theme.display, fontSize: 64, color: theme.mint, lineHeight: 68, letterSpacing: -2 },
  recapLabel: { fontFamily: theme.bodyMedium, fontSize: 16, color: theme.inkSoft },
  recapRow: { flexDirection: 'row', gap: 22, alignItems: 'center', marginVertical: 10, flexWrap: 'wrap', justifyContent: 'center' },
  recapCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recapSmall: { fontFamily: theme.display, fontSize: 20, color: theme.ink },
});
