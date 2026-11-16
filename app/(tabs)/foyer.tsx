import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { partnerOf, useStore } from '@/lib/store';
import { syncDeviceCalendars } from '@/lib/calendar';
import { Button, H1, Input, P, Screen } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function Foyer() {
  const { household, members, me, children, load } = useStore();
  const partner = partnerOf(me, members);
  const [childName, setChildName] = useState('');
  const [syncing, setSyncing] = useState(false);

  async function invite() {
    if (!household) return;
    await Share.share({
      message: `Rejoins notre foyer sur Tandem avec le code ${household.invite_code} — on verra enfin qui porte quoi 😉`,
    });
  }

  async function addChild() {
    if (!childName.trim() || !household) return;
    const { error } = await supabase.from('children').insert({ household_id: household.id, first_name: childName.trim() });
    if (error) return Alert.alert('Oups', error.message);
    setChildName('');
    await load();
  }

  async function sync() {
    if (!household || !me) return;
    setSyncing(true);
    try {
      const r = await syncDeviceCalendars(household.id, me.id);
      if (r.denied) Alert.alert('Accès refusé', 'Autorise le calendrier dans les réglages du téléphone.');
      else Alert.alert('Synchronisé', `${r.synced} nouvelle(s) tâche(s) repérée(s).`);
      await load();
    } catch (e: any) {
      Alert.alert('Oups', e.message ?? 'La synchro a échoué');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ScrollView>
      <Screen>
        <H1>{household?.name}</H1>

        <Text style={styles.h2}>L'équipe</Text>
        <View style={styles.card}>
          {members.map((m) => (
            <Text key={m.id} style={styles.line}>
              {m.display_name}
              {m.id === me?.id ? ' (toi)' : ''}
            </Text>
          ))}
          {!partner && <Button title="Inviter mon partenaire" onPress={invite} variant="ghost" />}
        </View>

        <Text style={styles.h2}>Les enfants</Text>
        <View style={styles.card}>
          {children.map((c) => (
            <Text key={c.id} style={styles.line}>{c.first_name}</Text>
          ))}
          <Input placeholder="Prénom" value={childName} onChangeText={setChildName} />
          <Button title="Ajouter" onPress={addChild} variant="ghost" />
        </View>

        <Text style={styles.h2}>Connecteurs</Text>
        <View style={styles.card}>
          <P>Calendriers du téléphone</P>
          <P muted>Lecture seule. Tandem repère les tâches familiales dans les 30 prochains jours.</P>
          <Button title="Synchroniser maintenant" onPress={sync} loading={syncing} />
          <P muted>Gmail arrive en v1.1, après validation Google.</P>
        </View>

        <Button title="Se déconnecter" onPress={() => supabase.auth.signOut()} variant="ghost" />
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 6 },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 16, gap: 10, borderWidth: 1, borderColor: theme.line },
  line: { fontSize: 16, color: theme.text },
});
