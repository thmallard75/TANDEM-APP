import { alert } from '@/lib/alert';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Button, Card, Input, P, Screen } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!email.includes('@')) return alert('Entre une adresse email valide');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: Platform.OS === 'web' ? window.location.origin : Linking.createURL('/') },
    });
    setLoading(false);
    if (error) return alert('Oups', error.message);
    setSent(true);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={{ justifyContent: 'center', gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View style={styles.mark}>
            <Image source={require('@/assets/icon.png')} style={{ width: 120, height: 120 }} resizeMode="cover" />
          </View>
          <Text style={styles.brand}>Tandem</Text>
          <Text style={styles.tagline}>
            Vois enfin qui porte quoi.{'\n'}
            <Text style={{ color: theme.mint }}>Rééquilibre en un geste.</Text>
          </Text>
        </View>

        <Card>
          {sent ? (
            <>
              <Text style={styles.cardTitle}>Regarde ta boîte mail ✉️</Text>
              <P muted>Un lien de connexion est parti vers {email}. Ouvre-le ici, sur cet appareil.</P>
              <Button title="Renvoyer" onPress={send} variant="quiet" />
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Pas de mot de passe</Text>
              <P muted>Tu reçois un lien, tu cliques, tu es connecté·e.</P>
              <Input
                placeholder="ton@email.fr"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={send}
              />
              <Button title="Recevoir mon lien" onPress={send} loading={loading} />
            </>
          )}
        </Card>

        <Text style={styles.foot}>Lecture seule sur tes calendriers. Rien n'est modifié, rien n'est partagé.</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mark: { width: 120, height: 120, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(98,212,178,0.35)', shadowColor: theme.mint, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  brand: { fontFamily: theme.display, fontSize: 44, color: theme.ink, letterSpacing: -1 },
  tagline: { fontFamily: theme.display, fontSize: 20, color: theme.inkSoft, textAlign: 'center', lineHeight: 28 },
  cardTitle: { fontFamily: theme.display, fontSize: 22, color: theme.ink },
  foot: { fontFamily: theme.body, fontSize: 13, color: theme.muted, textAlign: 'center', lineHeight: 19 },
});
