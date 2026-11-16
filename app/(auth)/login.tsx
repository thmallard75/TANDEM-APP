import { alert } from '@/lib/alert';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input, P, Screen } from '@/components/ui';
import { theme } from '@/lib/theme';

/**
 * Connexion par email + mot de passe : aucun mail à ouvrir, donc le même compte
 * fonctionne partout (ordinateur, Safari, page ajoutée à l'écran d'accueil).
 * Le lien par mail reste en secours, et le mode invité sert aux tests rapides.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'in' | 'up' | 'link' | 'guest'>(null);

  function check() {
    if (!email.includes('@')) return alert('Entre une adresse email valide'), false;
    if (password.length < 6) return alert('Mot de passe trop court', 'Il faut au moins 6 caractères.'), false;
    return true;
  }

  async function signIn() {
    if (!check()) return;
    setBusy('in');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(null);
    if (error) {
      alert(
        'Connexion refusée',
        'Email ou mot de passe incorrect. Si tu n’as jamais choisi de mot de passe, touche « Créer mon compte », ou « Recevoir un lien par mail » si ton compte existe déjà.',
      );
    }
  }

  async function signUp() {
    if (!check()) return;
    setBusy('up');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(null);
    if (error) {
      return alert(
        'Création impossible',
        /already|registered|exists/i.test(error.message)
          ? 'Un compte existe déjà avec cet email. Touche « Se connecter », ou « Recevoir un lien par mail » puis choisis un mot de passe dans Foyer.'
          : error.message,
      );
    }
    if (!data.session) {
      alert('Presque', 'Un mail de confirmation vient de partir. Clique le lien, puis reviens ici et touche « Se connecter ».');
    }
  }

  async function sendLink() {
    if (!email.includes('@')) return alert('Entre d’abord ton adresse email');
    setBusy('link');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: Platform.OS === 'web' ? window.location.origin : Linking.createURL('/') },
    });
    setBusy(null);
    if (error) return alert('Oups', error.message);
    alert('Mail envoyé', 'Ouvre le lien dans ce navigateur, puis choisis un mot de passe dans l’onglet Foyer pour ne plus en avoir besoin.');
  }

  // Phase de test : compte invité, sans email. Il n'existe que sur cet appareil.
  async function guest() {
    setBusy('guest');
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(null);
    if (error) {
      alert(
        'Mode invité pas encore activé',
        /disabled/i.test(error.message)
          ? 'Dans Supabase : Authentication → Sign In / Providers → activer « Allow anonymous sign-ins ».'
          : error.message,
      );
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={{ paddingHorizontal: 0 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24, gap: 22 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={styles.mark}>
              <Image source={require('@/assets/icon.png')} style={{ width: 104, height: 104 }} resizeMode="cover" />
            </View>
            <Text style={styles.brand}>Tandem</Text>
            <Text style={styles.tagline}>
              Vois enfin qui porte quoi.{'\n'}
              <Text style={{ color: theme.mint }}>Rééquilibre en un geste.</Text>
            </Text>
          </View>

          <Card>
            <Input
              label="Email"
              placeholder="ton@email.fr"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Mot de passe"
              placeholder="6 caractères minimum"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={signIn}
            />
            <Button title="Se connecter" onPress={signIn} loading={busy === 'in'} />
            <Button title="Créer mon compte" onPress={signUp} loading={busy === 'up'} variant="ghost" />
            <Button title="Recevoir un lien par mail" onPress={sendLink} loading={busy === 'link'} variant="quiet" />
          </Card>

          <Button title="Tester sans compte" onPress={guest} loading={busy === 'guest'} variant="quiet" />

          <Text style={styles.foot}>Lecture seule sur tes agendas. Rien n'est modifié, rien n'est partagé.</Text>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mark: { width: 104, height: 104, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(98,212,178,0.35)', shadowColor: theme.mint, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  brand: { fontFamily: theme.display, fontSize: 40, color: theme.ink, letterSpacing: -1 },
  tagline: { fontFamily: theme.display, fontSize: 19, color: theme.inkSoft, textAlign: 'center', lineHeight: 27 },
  foot: { fontFamily: theme.body, fontSize: 13, color: theme.muted, textAlign: 'center', lineHeight: 19 },
});
