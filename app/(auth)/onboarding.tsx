import { alert } from '@/lib/alert';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Button, Card, Header, Input, P, Screen } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function Onboarding() {
  const load = useStore((s) => s.load);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [household, setHousehold] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function createHousehold() {
    if (!name.trim()) return alert('Il manque ton prénom');
    if (!household.trim()) return alert('Donne un nom au foyer');
    setLoading(true);
    const { error } = await supabase.rpc('create_household', { p_name: household.trim(), p_display_name: name.trim() });
    setLoading(false);
    if (error) return alert('Oups', error.message);
    await load();
  }

  async function joinHousehold() {
    if (!name.trim()) return alert('Il manque ton prénom');
    if (!code.trim()) return alert('Il manque le code du foyer');
    setLoading(true);
    const { data, error } = await supabase.rpc('join_household', { p_invite_code: code.trim().toLowerCase(), p_display_name: name.trim() });
    setLoading(false);
    if (error || !data) return alert('Code inconnu', 'Vérifie le code avec ton partenaire.');
    await load();
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <Screen>
        <Header eyebrow="Bienvenue" title="On forme l'équipe" />
        <P muted>Tandem fonctionne à deux, mais tu peux commencer seul·e et inviter ton partenaire plus tard.</P>

        <View style={styles.switch}>
          {(['create', 'join'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabOn]}>
              <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m === 'create' ? 'Créer le foyer' : 'J’ai un code'}</Text>
            </Pressable>
          ))}
        </View>

        <Card>
          <Input label="Ton prénom" placeholder="Thomas" value={name} onChangeText={setName} autoCapitalize="words" />
          {mode === 'create' ? (
            <>
              <Input label="Nom du foyer" placeholder="Les Mallard" value={household} onChangeText={setHousehold} autoCapitalize="words" />
              <Button title="Créer notre foyer" onPress={createHousehold} loading={loading} />
            </>
          ) : (
            <>
              <Input label="Code reçu" placeholder="a3f9c1b2d4e5" autoCapitalize="none" value={code} onChangeText={setCode} />
              <Button title="Rejoindre" onPress={joinHousehold} loading={loading} />
            </>
          )}
        </Card>

        <P muted style={{ textAlign: 'center', fontSize: 14 }}>
          Tu as déjà un foyer sur un autre appareil ? Demande-lui son code d'invitation (onglet Foyer), ou reconnecte-toi avec le même email.
        </P>
        <Button title="Changer de compte" onPress={() => supabase.auth.signOut()} variant="quiet" />
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', backgroundColor: theme.field, borderWidth: 1, borderColor: theme.line, borderRadius: 999, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: theme.cardTint },
  tabText: { fontFamily: theme.bodyMedium, fontSize: 14, color: theme.muted },
  tabTextOn: { color: theme.ink },
});
