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
  const { members, me, load, celebrate } = useStore();
  const [task, setTask] = useState<Task | null>(null);
  const [layers, setLayers] = useState<TaskLayer[]>([]);

  useEffect(() => {
    supabase.from('tasks').select('*').eq('id', id).single().then(({ data }) => setTask(data));
    supabase.from('task_layers').select('*').eq('task_id', id).then(({ data }) => setLayers(data ?? []));
  }, [id]);

  async function done() {
    const { error } = await supabase.rpc('complete_task', { p_task_id: id });
    if (error) return alert('Oups', error.message);
    celebrate();
    await load();
    router.back();
  }

  async function dismiss() {
    const { error } = await supabase.from('tasks').update({ status: 'dismissed' }).eq('id', id);
    if (error) return alert('Oups', error.message);
    await load();
    router.back();
  }

  async function assign(memberId: string | null) {
    if (!task || memberId === task.owner_member_id) return;
    const { error } = await supabase.rpc('assign_task', { p_task_id: id, p_member_id: memberId });
    if (error) return alert('Oups', error.message);
    setTask({ ...task, owner_member_id: memberId });
    const { data } = await supabase.from('task_layers').select('*').eq('task_id', id);
    setLayers(data ?? []);
    await load();
  }

  if (!task) return <Screen><P muted>Chargement…</P></Screen>;

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
          <Text style={styles.label}>Qui porte cette tâche ?</Text>
          <View style={styles.chips}>
            {members.map((m) => {
              const on = m.id === task.owner_member_id;
              return (
                <Pressable key={m.id} onPress={() => assign(m.id)} style={[styles.chip, on && styles.chipOn]}>
                  <Avatar name={m.display_name} size={24} tone={m.id === me?.id ? 'primary' : 'sand'} />
                  <Text style={[styles.chipText, on && { color: theme.ink }]}>{m.id === me?.id ? 'Moi' : m.display_name}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => assign(null)} style={[styles.chip, !task.owner_member_id && styles.chipOn]}>
              <Text style={[styles.chipText, !task.owner_member_id && { color: theme.ink }]}>À décider</Text>
            </Pressable>
          </View>
          {members.length < 2 && <Text style={styles.hint}>Invite ton partenaire depuis Foyer pour pouvoir lui attribuer des tâches.</Text>}
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

        {(ctx.contact || ctx.place || ctx.notes || ctx.tip) && (
          <Card tint>
            <Text style={styles.label}>Pour reprendre la main</Text>
            {ctx.contact && <Text style={styles.value}>📞 {ctx.contact}</Text>}
            {ctx.place && <Text style={styles.value}>📍 {ctx.place}</Text>}
            {ctx.notes && <Text style={styles.value}>{ctx.notes}</Text>}
            {ctx.tip && (
              <Text style={styles.value}>
                💡 {ctx.tip}
                {ctx.tip_from ? <Text style={{ color: theme.muted }}> — {ctx.tip_from}</Text> : null}
              </Text>
            )}
          </Card>
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          <Button title="C'est fait ✓" onPress={done} variant={isMine ? 'primary' : 'ghost'} />
          <Button title="Pas une tâche familiale" onPress={dismiss} variant="quiet" />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: theme.line },
  chipOn: { borderColor: theme.mint, backgroundColor: theme.primarySoft },
  chipText: { fontFamily: theme.bodyMedium, fontSize: 14, color: theme.muted },
  hint: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  label: { fontFamily: theme.bodyMedium, fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: theme.body, fontSize: 16, color: theme.ink, lineHeight: 23 },
});
