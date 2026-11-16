import { alert } from '@/lib/alert';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, P, Pill, Screen } from '@/components/ui';
import { CATEGORY_STYLE, theme } from '@/lib/theme';
import { LAYER_LABEL, type Task, type TaskLayer } from '@/lib/types';

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, me, load } = useStore();
  const [task, setTask] = useState<Task | null>(null);
  const [layers, setLayers] = useState<TaskLayer[]>([]);

  useEffect(() => {
    supabase.from('tasks').select('*').eq('id', id).single().then(({ data }) => setTask(data));
    supabase.from('task_layers').select('*').eq('task_id', id).then(({ data }) => setLayers(data ?? []));
  }, [id]);

  async function setStatus(status: 'done' | 'dismissed') {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (error) return alert('Oups', error.message);
    if (status === 'done' && me) {
      await supabase.from('task_layers').insert({ task_id: id, layer: 'execute', member_id: me.id, weight: 1 });
    }
    await load();
    router.back();
  }

  async function takeOver() {
    const { error } = await supabase.rpc('accept_transfer', { p_task_id: id });
    if (error) return alert('Oups', error.message);
    await load();
    router.back();
  }

  if (!task) return <Screen><P muted>Chargement…</P></Screen>;

  const owner = members.find((m) => m.id === task.owner_member_id);
  const cat = CATEGORY_STYLE[task.category];
  const ctx = task.context as Record<string, string | undefined>;
  const isMine = task.owner_member_id === me?.id;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}>
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={22} color={theme.ink} />
        </Pressable>

        <View style={[styles.heroIcon, { backgroundColor: cat.bg }]}>
          <Text style={{ fontSize: 34 }}>{cat.emoji}</Text>
        </View>
        <Pill bg={cat.bg} fg={cat.fg}>{cat.label}</Pill>
        <Text style={styles.title}>{task.title}</Text>
        {task.due_at && (
          <Text style={styles.when}>
            {new Date(task.due_at).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        <Card>
          <View style={styles.row}>
            {owner ? <Avatar name={owner.display_name} size={36} tone={isMine ? 'primary' : 'sand'} /> : <View style={styles.noOwner} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Porté par</Text>
              <Text style={styles.value}>{owner?.display_name ?? 'Personne pour l’instant'}</Text>
            </View>
          </View>
          {layers.length > 0 && (
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={styles.label}>Qui a fait quoi</Text>
              {layers.map((l) => (
                <Text key={l.id} style={styles.value}>
                  {LAYER_LABEL[l.layer]} · {members.find((m) => m.id === l.member_id)?.display_name}
                </Text>
              ))}
            </View>
          )}
        </Card>

        {(ctx.contact || ctx.place || ctx.notes) && (
          <Card tint>
            <Text style={styles.label}>Pour reprendre la main</Text>
            {ctx.contact && <Text style={styles.value}>📞 {ctx.contact}</Text>}
            {ctx.place && <Text style={styles.value}>📍 {ctx.place}</Text>}
            {ctx.notes && <Text style={styles.value}>{ctx.notes}</Text>}
          </Card>
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          {!isMine && <Button title="Je reprends cette tâche" onPress={takeOver} variant="accent" />}
          <Button title="C'est fait ✓" onPress={() => setStatus('done')} variant={isMine ? 'primary' : 'ghost'} />
          <Button title="Pas une tâche familiale" onPress={() => setStatus('dismissed')} variant="quiet" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.hairline, alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: theme.display, fontSize: 30, color: theme.ink, lineHeight: 36, letterSpacing: -0.5 },
  when: { fontFamily: theme.bodyMedium, fontSize: 15, color: theme.muted, textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noOwner: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.line },
  label: { fontFamily: theme.bodyMedium, fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: theme.body, fontSize: 16, color: theme.ink, lineHeight: 23 },
});
