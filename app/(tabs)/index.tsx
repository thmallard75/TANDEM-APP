import { alert } from '@/lib/alert';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { partnerOf, useStore } from '@/lib/store';
import { submitVoiceNote } from '@/lib/voice';
import { TaskCard } from '@/components/TaskCard';
import { Avatar, Button, Card, Empty, Header, Input, P, Screen } from '@/components/ui';
import { GRADIENT, theme } from '@/lib/theme';
import type { Task } from '@/lib/types';

function dayKey(t: Task) {
  if (!t.due_at) return 'Sans date';
  const d = new Date(t.due_at);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (diff < 0) return 'En retard';
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
}

export default function Today() {
  const { tasks, members, me, household, load } = useStore();
  const partner = partnerOf(me, members);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const sections = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) map.set(dayKey(t), [...(map.get(dayKey(t)) ?? []), t]);
    return Array.from(map.entries());
  }, [tasks]);

  const mine = tasks.filter((t) => t.owner_member_id === me?.id).length;

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
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Header
          eyebrow={`${greeting()}, ${me?.display_name ?? ''}`}
          title="Cette semaine"
          right={
            <View style={{ flexDirection: 'row' }}>
              {me && <Avatar name={me.display_name} size={36} />}
              {partner && <View style={{ marginLeft: -10 }}><Avatar name={partner.display_name} size={36} tone="sand" /></View>}
            </View>
          }
        />

        <Card tint style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statNum}>{tasks.length}</Text>
            <Text style={styles.statLabel}>à venir pour l'équipe</Text>
          </View>
          <View style={styles.vline} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statNum}>{mine}</Text>
            <Text style={styles.statLabel}>que tu portes</Text>
          </View>
        </Card>

        {tasks.length === 0 ? (
          <Empty emoji="🌿" title="Rien dans la tête pour l'instant" text="Connecte un calendrier dans Foyer, ou dis-moi ce que tu viens de gérer avec le bouton en bas." />
        ) : (
          sections.map(([day, list]) => (
            <View key={day} style={{ gap: 10 }}>
              <Text style={[styles.day, day === 'En retard' && { color: theme.accent }]}>{day}</Text>
              {list.map((t) => (
                <TaskCard key={t.id} task={t} members={members} meId={me?.id} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.fabWrap, pressed && { transform: [{ scale: 0.97 }] }]}>
        <LinearGradient colors={GRADIENT.me} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="mic" size={22} color={theme.onGradient} />
          <Text style={styles.fabText}>J'ai géré…</Text>
        </LinearGradient>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Qu'est-ce que tu viens de gérer ?</Text>
          <P muted>Appuie sur le micro du clavier et dis-le en une phrase. Tandem range le reste.</P>
          <Input
            autoFocus
            placeholder="J'ai pris le rdv pédiatre de Tom pour mardi"
            value={text}
            onChangeText={setText}
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Button title="C'est noté" onPress={send} loading={sending} />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statNum: { fontFamily: theme.display, fontSize: 38, color: theme.mint, lineHeight: 38 },
  statLabel: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  vline: { width: 1, height: 40, backgroundColor: theme.line },
  day: { fontFamily: theme.display, fontSize: 18, color: theme.ink, marginTop: 6, textTransform: 'capitalize' },
  fabWrap: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    borderRadius: 999,
    shadowColor: theme.mint,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 26, borderRadius: 999 },
  fabText: { fontFamily: theme.bodyBold, fontSize: 16, color: theme.onGradient },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,12,26,0.65)' },
  sheet: { backgroundColor: theme.card, borderTopWidth: 1, borderColor: theme.hairline, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 12, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: theme.line, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: theme.display, fontSize: 22, color: theme.ink },
});
