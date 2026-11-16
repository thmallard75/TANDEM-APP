import { alert } from '@/lib/alert';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { partnerOf, useStore } from '@/lib/store';
import { syncDeviceCalendars } from '@/lib/calendar';
import { Avatar, Button, Card, Header, Input, P, Screen, SectionTitle } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function Foyer() {
  const { household, members, me, children, load } = useStore();
  const partner = partnerOf(me, members);
  const [childName, setChildName] = useState('');
  const [syncing, setSyncing] = useState(false);

  async function invite() {
    if (!household) return;
    const message = `Rejoins notre foyer sur Tandem avec le code ${household.invite_code} — on verra enfin qui porte quoi 😉`;
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(message);
      return alert('Message copié', 'Colle-le dans WhatsApp ou un SMS à ton partenaire.');
    }
    await Share.share({ message });
  }

  async function addChild() {
    if (!childName.trim() || !household) return;
    const { error } = await supabase.from('children').insert({ household_id: household.id, first_name: childName.trim() });
    if (error) return alert('Oups', error.message);
    setChildName('');
    await load();
  }

  async function sync() {
    if (!household || !me) return;
    if (Platform.OS === 'web') return alert('Depuis le téléphone', 'La lecture des calendriers se fait dans l’app mobile (Expo Go).');
    setSyncing(true);
    try {
      const r = await syncDeviceCalendars(household.id, me.id);
      if (r.denied) alert('Accès refusé', 'Autorise le calendrier dans les réglages du téléphone.');
      else alert('Synchronisé', `${r.synced} nouvelle(s) tâche(s) repérée(s).`);
      await load();
    } catch (e: any) {
      alert('Oups', e.message ?? 'La synchro a échoué');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Header eyebrow="Foyer" title={household?.name ?? ''} />

        <SectionTitle>L'équipe</SectionTitle>
        <Card>
          {members.map((m) => (
            <View key={m.id} style={styles.row}>
              <Avatar name={m.display_name} size={36} tone={m.id === me?.id ? 'primary' : 'sand'} />
              <Text style={styles.name}>{m.display_name}</Text>
              {m.id === me?.id && <Text style={styles.you}>toi</Text>}
            </View>
          ))}
          {!partner && (
            <>
              <View style={styles.inviteBox}>
                <Text style={styles.code}>{household?.invite_code}</Text>
                <Text style={styles.codeLabel}>code d'invitation</Text>
              </View>
              <Button title="Inviter mon partenaire" onPress={invite} icon={<Ionicons name="paper-plane" size={16} color={theme.onGradient} />} />
            </>
          )}
        </Card>

        <SectionTitle>Les enfants</SectionTitle>
        <Card>
          {children.length === 0 && <P muted>Ajoute leurs prénoms : Tandem s'en sert pour relier les tâches au bon enfant.</P>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {children.map((c) => (
              <View key={c.id} style={styles.chip}>
                <Text style={styles.chipText}>{c.first_name}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input placeholder="Prénom" value={childName} onChangeText={setChildName} onSubmitEditing={addChild} autoCapitalize="words" />
            </View>
            <Pressable onPress={addChild} style={styles.addBtn}>
              <Ionicons name="add" size={24} color={theme.onGradient} />
            </Pressable>
          </View>
        </Card>

        <SectionTitle>Connecteurs</SectionTitle>
        <Card>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="calendar" size={20} color={theme.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Calendriers du téléphone</Text>
              <Text style={styles.sub}>Lecture seule · 30 prochains jours</Text>
            </View>
          </View>
          <Button title="Synchroniser maintenant" onPress={sync} loading={syncing} variant="ghost" />
          <View style={[styles.row, { opacity: 0.55 }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="mail" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Gmail</Text>
              <Text style={styles.sub}>Bientôt · en attente de validation Google</Text>
            </View>
          </View>
        </Card>

        <Button title="Se déconnecter" onPress={() => supabase.auth.signOut()} variant="quiet" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: theme.bodyMedium, fontSize: 16, color: theme.ink, flex: 1 },
  sub: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  you: { fontFamily: theme.bodyMedium, fontSize: 12, color: theme.muted },
  inviteBox: { backgroundColor: theme.field, borderWidth: 1, borderColor: theme.line, borderRadius: theme.radiusSm, padding: 14, alignItems: 'center', gap: 2 },
  code: { fontFamily: theme.display, fontSize: 24, color: theme.mint, letterSpacing: 2 },
  codeLabel: { fontFamily: theme.body, fontSize: 12, color: theme.muted },
  chip: { backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipText: { fontFamily: theme.bodyMedium, fontSize: 14, color: theme.mint },
  addBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: theme.mint, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
