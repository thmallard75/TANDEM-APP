import { alert } from '@/lib/alert';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Avatar, Button, Card, Input, P, Pill, Screen } from '@/components/ui';
import { dayFromNow, formatDue, nextWeekday, parseFrenchDate } from '@/lib/dates';
import { CATEGORY_STYLE, theme } from '@/lib/theme';
import { LAYER_LABEL, SIZES, type Task, type TaskLayer } from '@/lib/types';

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members, me, load, celebrate } = useStore();
  const [task, setTask] = useState<Task | null>(null);
  const [layers, setLayers] = useState<TaskLayer[]>([]);
  const [customDate, setCustomDate] = useState('');

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

  async function reopen() {
    const { error } = await supabase.rpc('reopen_task', { p_task_id: id });
    if (error) return alert('Oups', error.message);
    await load();
    router.back();
  }

  async function setDue(date: Date | null) {
    if (!task) return;
    const due_at = date ? date.toISOString() : null;
    const { error } = await supabase.from('tasks').update({ due_at }).eq('id', id);
    if (error) return alert('Oups', error.message);
    setTask({ ...task, due_at });
    setCustomDate('');
    await load();
  }

  async function setSize(size: 1 | 2 | 3) {
    if (!task || !me || size === task.size) return;
    const { error } = await supabase.from('tasks').update({ size, size_set_by_member_id: me.id }).eq('id', id);
    if (error) return alert('Oups', error.message);
    setTask({ ...task, size, size_set_by_member_id: me.id });
    await load();
  }

  function applyCustomDate() {
    const d = parseFrenchDate(customDate);
    if (!d) return alert('Date non comprise', 'Écris-la comme 17/11, ou 17/11 14:30 avec une heure.');
    setDue(d);
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
  const isDone = task.status === 'done';
  const sizeSetBy = members.find((m) => m.id === task.size_set_by_member_id);
  const quickDates = [
    { label: "Aujourd'hui", date: dayFromNow(0) },
    { label: 'Demain', date: dayFromNow(1) },
    { label: 'Samedi', date: nextWeekday(6) },
    { label: 'Lundi prochain', date: nextWeekday(1) },
    { label: 'Dans 2 semaines', date: dayFromNow(14) },
  ];

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
        <Text style={styles.when}>{isDone ? 'Fait ✓' : task.due_at ? formatDue(task.due_at) : 'Pas encore de date'}</Text>

        {!isDone && (
          <Card>
            <Text style={styles.label}>{task.due_at ? 'Changer la date' : 'C\u2019est pour quand ?'}</Text>
            <View style={styles.chips}>
              {quickDates.map((q) => (
                <Pressable key={q.label} onPress={() => setDue(q.date)} style={styles.chip}>
                  <Text style={styles.chipText}>{q.label}</Text>
                </Pressable>
              ))}
              {task.due_at && (
                <Pressable onPress={() => setDue(null)} style={styles.chip}>
                  <Text style={styles.chipText}>Sans date</Text>
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input placeholder="Autre date : 17/11 ou 17/11 14:30" value={customDate} onChangeText={setCustomDate} onSubmitEditing={applyCustomDate} />
              </View>
              <Pressable onPress={applyCustomDate} style={styles.okBtn}>
                <Ionicons name="checkmark" size={22} color={theme.onGradient} />
              </Pressable>
            </View>
          </Card>
        )}

        <Card>
          <Text style={styles.label}>Qui porte cette tâche ?</Text>
          <View style={styles.chips}>
            {members.map((m) => {
              const on = m.id === task.owner_member_id;
              return (
                <Pressable key={m.id} onPress={() => assign(m.id)} style={[styles.chip, on && styles.chipOn]}>
                  <Avatar name={m.display_name} uri={m.avatar_url} size={24} tone={m.id === me?.id ? 'primary' : 'sand'} />
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

        <Card>
          <Text style={styles.label}>Quel poids pour cette tâche ?</Text>
          <View style={styles.chips}>
            {SIZES.map((sz) => {
              const on = task.size === sz.value;
              return (
                <Pressable key={sz.value} onPress={() => setSize(sz.value)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={{ fontSize: 15 }}>{sz.emoji}</Text>
                  <Text style={[styles.chipText, on && { color: theme.ink }]}>{sz.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            {sizeSetBy
              ? `Réglé par ${sizeSetBy.id === me?.id ? 'toi' : sizeSetBy.display_name}. `
              : 'Proposé automatiquement. '}
            Une tâche lourde compte trois fois plus dans le bilan qu'une légère.
          </Text>
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
          {isDone ? (
            <Button title="Rouvrir cette tâche" onPress={reopen} variant="ghost" icon={<Ionicons name="arrow-undo" size={16} color={theme.mint} />} />
          ) : (
            <Button title="C'est fait ✓" onPress={done} variant={isMine ? 'primary' : 'ghost'} />
          )}
          <Button title={isDone ? 'Supprimer de la liste' : 'Pas une tâche familiale'} onPress={dismiss} variant="quiet" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { alignSelf: 'flex-end', width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.hairline, alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: theme.display, fontSize: 30, color: theme.ink, lineHeight: 36, letterSpacing: -0.5 },
  when: { fontFamily: theme.bodyMedium, fontSize: 15, color: theme.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: theme.line },
  chipOn: { borderColor: theme.mint, backgroundColor: theme.primarySoft },
  chipText: { fontFamily: theme.bodyMedium, fontSize: 14, color: theme.muted },
  okBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: theme.mint, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  label: { fontFamily: theme.bodyMedium, fontSize: 12, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: theme.body, fontSize: 16, color: theme.ink, lineHeight: 23 },
});
