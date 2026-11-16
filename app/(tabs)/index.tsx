import { alert } from '@/lib/alert';
import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { submitVoiceNote } from '@/lib/voice';
import { TaskCard } from '@/components/TaskCard';
import { Button, H1, Input, P, Screen } from '@/components/ui';
import { theme } from '@/lib/theme';
import type { Task } from '@/lib/types';

function dayKey(t: Task) {
  if (!t.due_at) return 'Sans date';
  const d = new Date(t.due_at);
  const today = new Date();
  const diff = Math.round((d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff < 0) return 'En retard';
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  return new Date(t.due_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Today() {
  const { tasks, members, me, household, load } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const sections = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const k = dayKey(t);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return Array.from(map.entries());
  }, [tasks]);

  async function send() {
    if (!text.trim() || !household || !me) return;
    setSending(true);
    try {
      await submitVoiceNote(household.id, me.id, text.trim());
      setText('');
      setOpen(false);
      await load();
    } catch (e: any) {
      alert('Oups', e.message ?? 'Réessaie dans un instant');
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <H1>Cette semaine</H1>
      {tasks.length === 0 ? (
        <P muted>Rien pour l'instant. Connecte un calendrier dans Foyer, ou dis-moi ce que tu viens de gérer.</P>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={([k]) => k}
          contentContainerStyle={{ gap: 10, paddingBottom: 90 }}
          renderItem={({ item: [day, list] }) => (
            <View style={{ gap: 8 }}>
              <Text style={styles.day}>{day}</Text>
              {list.map((t) => (
                <TaskCard key={t.id} task={t} members={members} />
              ))}
            </View>
          )}
        />
      )}

      <View style={styles.fabWrap}>
        <Button title="🎙  J'ai géré…" onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <P>Qu'est-ce que tu viens de gérer ?</P>
          <P muted>Appuie sur le micro du clavier et dis-le en une phrase.</P>
          <Input
            autoFocus
            placeholder="J'ai pris le rdv pédiatre de Tom pour mardi"
            value={text}
            onChangeText={setText}
            multiline
          />
          <Button title="C'est noté" onPress={send} loading={sending} />
          <Button title="Annuler" onPress={() => setOpen(false)} variant="ghost" />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { fontSize: 13, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  fabWrap: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  sheet: {
    marginTop: 'auto',
    backgroundColor: theme.bg,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
