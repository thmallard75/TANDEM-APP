import { alert } from '@/lib/alert';
import { useState } from 'react';
import { ScrollView } from 'react-native';
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
    if (!name.trim()) return alert('Il manque ton prénom');
    if (!household.trim()) return alert('Donne un nom au foyer');
    setLoading(true);
    const { error } = await supabase.rpc('create_household', {
      p_name: household.trim(),
      p_display_name: name.trim(),
    });
    setLoading(false);
    if (error) return alert('Oups', error.message);
    await load();
  }

  async function joinHousehold() {
    if (!name.trim()) return alert('Il manque ton prénom');
    if (!code.trim()) return alert('Il manque le code du foyer');
    setLoading(true);
    const { data, error } = await supabase.rpc('join_household', {
      p_invite_code: code.trim().toLowerCase(),
      p_display_name: name,
    });
    setLoading(false);
    if (error || !data) return alert('Code inconnu', 'Vérifie le code avec ton partenaire.');
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
