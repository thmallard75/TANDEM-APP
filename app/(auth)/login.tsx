import { alert } from '@/lib/alert';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Button, H1, Input, P, Screen } from '@/components/ui';

/** Connexion par lien magique : pas de mot de passe à retenir, un parent fatigué dit merci. */
export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!email.includes('@')) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Web : revient sur l'URL courante (Codespace, Vercel…) ; natif : deep link tandem://
      options: { emailRedirectTo: Platform.OS === 'web' ? window.location.origin : Linking.createURL('/') },
    });
    setLoading(false);
    if (error) return alert('Oups', error.message);
    setSent(true);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <H1>Tandem</H1>
        <P muted>Voir enfin qui porte quoi, et rééquilibrer en un geste.</P>
        {sent ? (
          <P>Un lien de connexion vient de partir vers {email}. Ouvre-le sur ce téléphone.</P>
        ) : (
          <>
            <Input
              placeholder="ton@email.fr"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Button title="Recevoir mon lien de connexion" onPress={send} loading={loading} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
