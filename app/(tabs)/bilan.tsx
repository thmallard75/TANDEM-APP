import { alert } from '@/lib/alert';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { partnerOf, useStore } from '@/lib/store';
import { ScoreBar } from '@/components/ScoreBar';
import { Avatar, Button, Card, Empty, Header, P, Pill, Screen, SectionTitle } from '@/components/ui';
import { CATEGORY_STYLE, theme } from '@/lib/theme';
import type { Category, WeeklyReport } from '@/lib/types';

const CATEGORIES: Category[] = ['sante', 'ecole', 'logistique', 'maison', 'social', 'admin'];

export default function Bilan() {
  const { household, members, me, load } = useStore();
  const partner = partnerOf(me, members);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!household) return;
      supabase
        .from('weekly_reports')
        .select('*')
        .eq('household_id', household.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          setReport(data);
          if (data && !data.opened_at) {
            supabase.from('weekly_reports').update({ opened_at: new Date().toISOString() }).eq('id', data.id).then();
          }
        });
    }, [household?.id]),
  );

  async function accept(taskId: string) {
    const { error } = await supabase.rpc('accept_transfer', { p_task_id: taskId });
    if (error) return alert('Oups', error.message);
    alert('C’est à toi', 'Les rappels et le contexte de cette tâche sont maintenant chez toi.');
    await load();
  }

  if (!partner) {
    return (
      <Screen>
        <Header eyebrow="Bilan" title="L'équipe à deux" />
        <Empty emoji="🤝" title="Le bilan compare l'équipe à deux" text="Invite ton partenaire depuis l'onglet Foyer. Le premier score arrive dimanche soir." />
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen>
        <Header eyebrow="Bilan" title="Dimanche soir" />
        <Empty emoji="🕯️" title="Le premier bilan arrive dimanche à 18h" text="D'ici là, Tandem note tout ce que vous gérez, chacun de votre côté." />
      </Screen>
    );
  }

  const meScore = report.scores.total[me!.id] ?? 0;
  const partnerScore = report.scores.total[partner.id] ?? 0;
  const total = meScore + partnerScore;
  const pctMe = total === 0 ? 50 : Math.round((meScore / total) * 100);
  const lean = Math.max(pctMe, 100 - pctMe);
  const heavier = pctMe >= 50 ? me! : partner;
  const balanced = lean <= 60;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Header
          eyebrow={`Semaine du ${new Date(report.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
          title={balanced ? 'Belle semaine' : 'L’équipe penche'}
        />

        <View style={[styles.hero, balanced && { backgroundColor: theme.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar name={me!.display_name} size={44} />
            <Text style={styles.heroNum}>
              {pctMe}<Text style={styles.heroSep}> / </Text>{100 - pctMe}
            </Text>
            <Avatar name={partner.display_name} size={44} tone="sand" />
          </View>
          <Text style={styles.heroText}>
            {balanced
              ? 'Vous êtes à l’équilibre. Continuez comme ça.'
              : `Cette semaine, la charge penche à ${lean} % côté ${heavier.display_name}. Voici de quoi rééquilibrer.`}
          </Text>
        </View>

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
            <Text style={{ color: theme.primary }}>●</Text> {me!.display_name}   <Text style={{ color: theme.sandDeep }}>●</Text> {partner.display_name}
          </Text>
        </Card>

        {report.suggestions.length > 0 && (
          <>
            <SectionTitle>Pour la semaine prochaine</SectionTitle>
            {report.suggestions.map((s) => {
              const forMe = s.to_member_id === me!.id;
              const cat = CATEGORY_STYLE[s.category];
              return (
                <Card key={s.task_id}>
                  <Pill bg={cat.bg} fg={cat.fg}>{cat.emoji} {cat.label}</Pill>
                  <Text style={styles.sugTitle}>{s.title}</Text>
                  <P muted>{s.why}</P>
                  {forMe ? (
                    <Button title="Je reprends" onPress={() => accept(s.task_id)} variant="accent" />
                  ) : (
                    <Text style={styles.proposed}>Proposée à {partner.display_name}</Text>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: theme.primaryDeep, borderRadius: 28, padding: 24, gap: 16, alignItems: 'center', ...theme.shadow },
  heroNum: { fontFamily: theme.display, fontSize: 48, color: '#fff', letterSpacing: -1 },
  heroSep: { color: 'rgba(255,255,255,0.5)', fontSize: 32 },
  heroText: { fontFamily: theme.body, fontSize: 16, color: 'rgba(255,255,255,0.92)', textAlign: 'center', lineHeight: 24 },
  legend: { fontFamily: theme.body, fontSize: 13, color: theme.muted, textAlign: 'center', marginTop: 4 },
  sugTitle: { fontFamily: theme.display, fontSize: 20, color: theme.ink },
  proposed: { fontFamily: theme.bodyMedium, fontSize: 13, color: theme.muted },
});
