import { alert } from '@/lib/alert';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { partnerOf, useStore } from '@/lib/store';
import { ScoreBar } from '@/components/ScoreBar';
import { Button, H1, P, Screen } from '@/components/ui';
import { CATEGORY_LABEL, type Category, type WeeklyReport } from '@/lib/types';
import { theme } from '@/lib/theme';

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
    if (!me) return;
    const { error } = await supabase.rpc('accept_transfer', { p_task_id: taskId });
    if (error) return alert('Oups', error.message);
    alert('C’est à toi', 'Les rappels et le contexte de cette tâche sont maintenant chez toi.');
    await load();
  }

  if (!partner) {
    return (
      <Screen>
        <H1>Bilan</H1>
        <P>Le bilan compare l'équipe à deux. Invite ton partenaire depuis l'onglet Foyer, et le premier score arrivera dimanche soir.</P>
        <P muted>En attendant, Tandem garde tout en tête pour toi.</P>
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen>
        <H1>Bilan</H1>
        <P muted>Le premier bilan de l'équipe arrive dimanche à 18h.</P>
      </Screen>
    );
  }

  const meScore = report.scores.total[me!.id] ?? 0;
  const partnerScore = report.scores.total[partner.id] ?? 0;
  const total = meScore + partnerScore;
  const lean = total === 0 ? 50 : Math.round((Math.max(meScore, partnerScore) / total) * 100);
  const who = meScore >= partnerScore ? me!.display_name : partner.display_name;

  return (
    <ScrollView>
      <Screen>
        <H1>Semaine du {new Date(report.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</H1>
        <P>
          {lean <= 60
            ? "Belle semaine : l'équipe est équilibrée."
            : `Cette semaine, l'équipe penche à ${lean} / ${100 - lean}, surtout côté ${who}.`}
        </P>

        <View style={styles.card}>
          {CATEGORIES.map((c) => (
            <ScoreBar
              key={c}
              label={CATEGORY_LABEL[c]}
              left={report.scores.by_category?.[c]?.[me!.id] ?? 0}
              right={report.scores.by_category?.[c]?.[partner.id] ?? 0}
              leftName={me!.display_name}
              rightName={partner.display_name}
            />
          ))}
        </View>

        {report.suggestions.length > 0 && (
          <>
            <Text style={styles.h2}>Pour rééquilibrer la semaine prochaine</Text>
            {report.suggestions.map((s) => {
              const forMe = s.to_member_id === me!.id;
              return (
                <View key={s.task_id} style={styles.card}>
                  <Text style={styles.title}>{s.title}</Text>
                  <P muted>{s.why}</P>
                  {forMe ? (
                    <Button title="Je reprends" onPress={() => accept(s.task_id)} />
                  ) : (
                    <Text style={{ color: theme.muted }}>Proposée à {partner.display_name}</Text>
                  )}
                </View>
              );
            })}
          </>
        )}
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 16, gap: 14, borderWidth: 1, borderColor: theme.line },
  h2: { fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 8 },
  title: { fontSize: 16, fontWeight: '600', color: theme.text },
});
