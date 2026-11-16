import { alert } from '@/lib/alert';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { partnerOf, useStore, type TipRequest } from '@/lib/store';
import { submitVoiceNote } from '@/lib/voice';
import { TaskCard } from '@/components/TaskCard';
import { Avatar, Button, Card, Empty, Header, Input, P, Screen } from '@/components/ui';
import { GRADIENT, theme } from '@/lib/theme';
import type { Category, Task } from '@/lib/types';

/** Gestes du quotidien qui ne passent ni par l'agenda ni par une phrase : un tap suffit. */
const GESTURES: { emoji: string; title: string; cat: Category }[] = [
  { emoji: '🥪', title: 'Pensé aux goûters', cat: 'maison' },
  { emoji: '🛒', title: 'Fait la liste et les courses', cat: 'maison' },
  { emoji: '🍽️', title: 'Prévu les repas de la semaine', cat: 'maison' },
  { emoji: '🧺', title: 'Géré une lessive', cat: 'maison' },
  { emoji: '👕', title: 'Trié les habits trop petits', cat: 'maison' },
  { emoji: '🎒', title: 'Préparé les sacs et cartables', cat: 'ecole' },
  { emoji: '📝', title: 'Signé un mot de l’école', cat: 'ecole' },
  { emoji: '📚', title: 'Suivi les devoirs', cat: 'ecole' },
  { emoji: '📞', title: 'Pris un rendez-vous médical', cat: 'sante' },
  { emoji: '💊', title: 'Géré un médicament', cat: 'sante' },
  { emoji: '👶', title: 'Organisé la garde', cat: 'logistique' },
  { emoji: '🚗', title: 'Fait les trajets des activités', cat: 'logistique' },
  { emoji: '🎁', title: 'Trouvé un cadeau', cat: 'social' },
  { emoji: '💌', title: 'Répondu à une invitation', cat: 'social' },
  { emoji: '📂', title: 'Rempli un papier', cat: 'admin' },
  { emoji: '💶', title: 'Payé une facture', cat: 'admin' },
];

const startOfDay = (d: Date | number) => new Date(d).setHours(0, 0, 0, 0);

function dayKey(t: Task) {
  if (!t.due_at) return 'Sans date';
  const d = new Date(t.due_at);
  const diff = Math.round((startOfDay(d) - startOfDay(Date.now())) / 86400000);
  if (diff < 0) return 'En retard';
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() || d.getMinutes() ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;
};

export default function Today() {
  const { tasks, recent, members, children, me, household, thanksIn, thankedTaskIds, tipRequests, load, celebrate } = useStore();
  const partner = partnerOf(me, members);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [childFilter, setChildFilter] = useState<string | null>(null);

  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.display_name ?? '';
  const childName = (id: string | null) => children.find((c) => c.id === id)?.first_name;

  const visible = useMemo(() => (childFilter ? tasks.filter((t) => t.child_id === childFilter) : tasks), [tasks, childFilter]);
  const sections = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of visible) map.set(dayKey(t), [...(map.get(dayKey(t)) ?? []), t]);
    return Array.from(map.entries());
  }, [visible]);

  const today = useMemo(
    () => tasks.filter((t) => t.due_at && startOfDay(new Date(t.due_at)) === startOfDay(Date.now())),
    [tasks],
  );
  const mine = tasks.filter((t) => t.owner_member_id === me?.id).length;

  async function send() {
    if (!text.trim() || !household || !me) return;
    setSending(true);
    try {
      await submitVoiceNote(household.id, me.id, text.trim());
      setText('');
      setOpen(false);
      celebrate('C’est noté ✍️');
      await load();
    } catch (e: any) {
      alert('Oups', e.message ?? 'Réessaie dans un instant');
    } finally {
      setSending(false);
    }
  }

  async function gesture(g: (typeof GESTURES)[number]) {
    const { error } = await supabase.rpc('log_gesture', { p_title: g.title, p_category: g.cat });
    if (error) return alert('Oups', error.message);
    setOpen(false);
    celebrate();
    await load();
  }

  async function thank(taskId: string) {
    const { error } = await supabase.rpc('say_thanks', { p_task_id: taskId });
    if (error) return alert('Oups', error.message);
    celebrate('Merci envoyé 🙏');
    await load();
  }

  async function seenThanks(id: string) {
    await supabase.from('thanks').update({ seen_at: new Date().toISOString() }).eq('id', id);
    await load();
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

        {thanksIn.map((t) => (
          <LinearGradient key={t.id} colors={GRADIENT.partner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thanks}>
            <Text style={{ fontSize: 30 }}>🙏</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.thanksTitle}>{nameOf(t.from_member_id)} te dit merci</Text>
              <Text style={styles.thanksText} numberOfLines={2}>pour « {t.title} »</Text>
            </View>
            <Pressable onPress={() => seenThanks(t.id)} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.onGradient} />
            </Pressable>
          </LinearGradient>
        ))}

        {tipRequests.map((t) => (
          <TipCard key={t.id} req={t} toName={nameOf(t.to_member_id)} onDone={load} />
        ))}

        {today.length > 0 && (
          <Card tint>
            <Text style={styles.briefTitle}>☀️ Aujourd'hui</Text>
            {today.slice(0, 5).map((t) => (
              <View key={t.id} style={styles.briefRow}>
                <Text style={styles.briefTime}>{timeOf(t.due_at!) ?? '·'}</Text>
                <Text style={styles.briefText} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.briefWho}>
                  {t.owner_member_id === me?.id ? 'toi' : t.owner_member_id ? nameOf(t.owner_member_id) : 'à décider'}
                </Text>
              </View>
            ))}
            {today.length > 5 && <Text style={styles.briefWho}>+ {today.length - 5} autre(s)</Text>}
          </Card>
        )}

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
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

        {children.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable onPress={() => setChildFilter(null)} style={[styles.kid, !childFilter && styles.kidOn]}>
              <Text style={[styles.kidText, !childFilter && { color: theme.ink }]}>Tout le monde</Text>
            </Pressable>
            {children.map((c) => {
              const on = childFilter === c.id;
              return (
                <Pressable key={c.id} onPress={() => setChildFilter(on ? null : c.id)} style={[styles.kid, on && styles.kidOn]}>
                  <View style={styles.kidDot}>
                    <Text style={styles.kidInitial}>{c.first_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.kidText, on && { color: theme.ink }]}>{c.first_name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {visible.length === 0 ? (
          <Empty
            emoji="🌿"
            title={childFilter ? `Rien de prévu pour ${childName(childFilter)}` : "Rien dans la tête pour l'instant"}
            text={childFilter ? 'Les tâches liées à cet enfant apparaîtront ici.' : 'Connecte ton agenda dans Foyer, ou dis-moi ce que tu viens de gérer avec le bouton en bas.'}
          />
        ) : (
          sections.map(([day, list]) => (
            <View key={day} style={{ gap: 10 }}>
              <Text style={[styles.day, day === 'En retard' && { color: theme.accent }]}>{day}</Text>
              {list.map((t) => (
                <TaskCard key={t.id} task={t} members={members} meId={me?.id} childName={childName(t.child_id)} />
              ))}
            </View>
          ))
        )}

        {recent.length > 0 && !childFilter && (
          <View style={{ gap: 10 }}>
            <Text style={styles.day}>Fait cette semaine</Text>
            <Card style={{ gap: 14 }}>
              {recent.map((t) => {
                const by = t.done_by_member_id ?? t.owner_member_id;
                const canThank = !!by && by !== me?.id;
                const thanked = thankedTaskIds.includes(t.id);
                return (
                  <View key={t.id} style={styles.doneRow}>
                    <Ionicons name="checkmark-circle" size={22} color={theme.mint} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.doneTitle} numberOfLines={2}>{t.title}</Text>
                      <Text style={styles.doneBy}>{by === me?.id ? 'par toi' : by ? `par ${nameOf(by)}` : ''}</Text>
                    </View>
                    {canThank &&
                      (thanked ? (
                        <Text style={styles.thanked}>Merci envoyé</Text>
                      ) : (
                        <Pressable onPress={() => thank(t.id)} style={styles.thankBtn}>
                          <Text style={styles.thankText}>Merci 🙏</Text>
                        </Pressable>
                      ))}
                  </View>
                );
              })}
            </Card>
          </View>
        )}
      </ScrollView>

      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.fabWrap, pressed && { transform: [{ scale: 0.97 }] }]}>
        <LinearGradient colors={GRADIENT.me} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={22} color={theme.onGradient} />
          <Text style={styles.fabText}>J'ai géré…</Text>
        </LinearGradient>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Qu'est-ce que tu viens de gérer ?</Text>
          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.gestures}>
              {GESTURES.map((g) => (
                <Pressable key={g.title} onPress={() => gesture(g)} style={({ pressed }) => [styles.gesture, pressed && { backgroundColor: theme.primarySoft }]}>
                  <Text style={{ fontSize: 16 }}>{g.emoji}</Text>
                  <Text style={styles.gestureText}>{g.title}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <P muted style={{ fontSize: 14 }}>Ou dis-le avec tes mots (le micro du clavier marche aussi) :</P>
          <Input
            placeholder="J'ai pris le rdv pédiatre de Tom pour mardi"
            value={text}
            onChangeText={setText}
            multiline
            style={{ minHeight: 64, textAlignVertical: 'top' }}
          />
          <Button title="C'est noté" onPress={send} loading={sending} />
        </View>
      </Modal>
    </Screen>
  );
}

/** « X a repris cette tâche : un conseil pour lui faciliter la vie ? » */
function TipCard({ req, toName, onDone }: { req: TipRequest; toName: string; onDone: () => Promise<void> }) {
  const [tip, setTip] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(value: string) {
    setBusy(true);
    const { error } = await supabase.rpc('give_tip', { p_transfer_id: req.id, p_tip: value });
    setBusy(false);
    if (error) return alert('Oups', error.message);
    await onDone();
  }

  return (
    <Card>
      <Text style={styles.briefTitle}>🤝 Passage de relais</Text>
      <P style={{ fontSize: 15 }}>
        {toName} porte maintenant « {req.title} ». Un conseil pour lui faciliter la vie ?
      </P>
      <Input placeholder="Ex. : demander le Dr Martin, il connaît le dossier" value={tip} onChangeText={setTip} multiline />
      <Button title="Envoyer le conseil" onPress={() => (tip.trim() ? send(tip) : alert('Écris un mot, ou touche « Pas besoin »'))} loading={busy} variant="ghost" />
      <Button title="Pas besoin" onPress={() => send('')} variant="quiet" />
    </Card>
  );
}

const styles = StyleSheet.create({
  thanks: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: theme.radius, padding: 16 },
  thanksTitle: { fontFamily: theme.display, fontSize: 18, color: theme.onGradient },
  thanksText: { fontFamily: theme.bodyMedium, fontSize: 14, color: 'rgba(16,23,43,0.8)' },
  briefTitle: { fontFamily: theme.display, fontSize: 18, color: theme.ink },
  briefRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  briefTime: { fontFamily: theme.bodyBold, fontSize: 14, color: theme.mint, width: 48 },
  briefText: { fontFamily: theme.bodyMedium, fontSize: 15, color: theme.ink, flex: 1 },
  briefWho: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  statNum: { fontFamily: theme.display, fontSize: 38, color: theme.mint, lineHeight: 42 },
  statLabel: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  vline: { width: 1, height: 40, backgroundColor: theme.line },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: theme.line },
  kidOn: { borderColor: theme.mint, backgroundColor: theme.primarySoft },
  kidDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.peach, alignItems: 'center', justifyContent: 'center' },
  kidInitial: { fontFamily: theme.bodyBold, fontSize: 11, color: theme.onGradient },
  kidText: { fontFamily: theme.bodyMedium, fontSize: 14, color: theme.muted },
  day: { fontFamily: theme.display, fontSize: 18, color: theme.ink, marginTop: 6, textTransform: 'capitalize' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneTitle: { fontFamily: theme.bodyMedium, fontSize: 15, color: theme.inkSoft },
  doneBy: { fontFamily: theme.body, fontSize: 12, color: theme.muted },
  thankBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: theme.accentSoft, borderWidth: 1, borderColor: 'rgba(240,104,128,0.4)' },
  thankText: { fontFamily: theme.bodyBold, fontSize: 13, color: theme.peach },
  thanked: { fontFamily: theme.body, fontSize: 12, color: theme.muted },
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
  sheet: { backgroundColor: theme.card, borderTopWidth: 1, borderColor: theme.hairline, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, paddingBottom: 32, gap: 12, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: theme.line, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: theme.display, fontSize: 22, color: theme.ink },
  gestures: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gesture: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.field },
  gestureText: { fontFamily: theme.bodyMedium, fontSize: 13, color: theme.inkSoft },
});
