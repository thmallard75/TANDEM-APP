import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { Button, H1, Input, P, Screen } from '@/components/ui';

/**
 * Deux chemins : créer un foyer, ou rejoindre celui du partenaire avec son code.
 * Le mode solo est un foyer à un seul membre : tout fonctionne, le score attend le duo.
 */
export default function Onboarding() {
  const load = useStore((s) => s.load);
  const [name, setName] = useState('');
  const [household, setHousehold] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function createHousehold() {
    if (!name || !household) return;
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data: h, error } = await supabase.from('households').insert({ name: household }).select().single();
    if (error || !h) {
      setLoading(false);
      return Alert.alert('Oups', error?.message ?? 'Impossible de créer le foyer');
    }
    const { error: e2 } = await supabase
      .from('members')
      .insert({ household_id: h.id, user_id: auth.user!.id, display_name: name });
    setLoading(false);
    if (e2) return Alert.alert('Oups', e2.message);
    await load();
  }

  async function joinHousehold() {
    if (!name || !code) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('join_household', {
      p_invite_code: code.trim().toLowerCase(),
      p_display_name: name,
    });
    setLoading(false);
    if (error || !data) return Alert.alert('Code inconnu', 'Vérifie le code avec ton partenaire.');
    await load();
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <Screen>
        <H1>Bienvenue</H1>
        <P muted>Comment t'appelle-t-on à la maison ?</P>
        <Input placeholder="Ton prénom" value={name} onChangeText={setName} />

        <P>Créer notre foyer</P>
        <Input placeholder="Nom du foyer (ex. Les Mallard)" value={household} onChangeText={setHousehold} />
        <Button title="Créer le foyer" onPress={createHousehold} loading={loading} />

        <P muted>— ou —</P>

        <P>Rejoindre le foyer de mon partenaire</P>
        <Input placeholder="Code reçu (ex. a3f9c1b2d4e5)" autoCapitalize="none" value={code} onChangeText={setCode} />
        <Button title="Rejoindre" onPress={joinHousehold} loading={loading} variant="ghost" />
      </Screen>
    </ScrollView>
  );
}
