import { alert } from '@/lib/alert';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Button, H1, P, Screen } from '@/components/ui';
import { CATEGORY_LABEL, LAYER_LABEL, type Task, type TaskLayer } from '@/lib/types';
import { theme } from '@/lib/theme';

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
      // Marquer "fait" = la couche exécution est à moi.
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
  const ctx = task.context as Record<string, string | undefined>;

  return (
    <ScrollView>
      <Screen>
        <H1>{task.title}</H1>
        <P muted>
          {CATEGORY_LABEL[task.category]}
          {task.due_at ? ` · ${new Date(task.due_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}` : ''}
        </P>

        <View style={styles.card}>
          <Text style={styles.label}>Porté par</Text>
          <Text style={styles.value}>{owner?.display_name ?? 'Personne pour l’instant'}</Text>
          {layers.length > 0 && (
            <>
              <Text style={styles.label}>Qui a fait quoi</Text>
              {layers.map((l) => (
                <Text key={l.id} style={styles.value}>
                  {LAYER_LABEL[l.layer]} · {members.find((m) => m.id === l.member_id)?.display_name}
                </Text>
              ))}
            </>
          )}
        </View>

        {(ctx.contact || ctx.place || ctx.notes) && (
          <View style={styles.card}>
            <Text style={styles.label}>Contexte pour reprendre la main</Text>
            {ctx.contact && <Text style={styles.value}>Contact : {ctx.contact}</Text>}
            {ctx.place && <Text style={styles.value}>Lieu : {ctx.place}</Text>}
            {ctx.notes && <Text style={styles.value}>{ctx.notes}</Text>}
          </View>
        )}

        {task.owner_member_id !== me?.id && <Button title="Je reprends cette tâche" onPress={takeOver} />}
        <Button title="C'est fait" onPress={() => setStatus('done')} variant={task.owner_member_id === me?.id ? 'primary' : 'ghost'} />
        <Button title="Pas une tâche familiale" onPress={() => setStatus('dismissed')} variant="ghost" />
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 16, gap: 6, borderWidth: 1, borderColor: theme.line },
  label: { fontSize: 12, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', marginTop: 6 },
  value: { fontSize: 16, color: theme.text },
});
