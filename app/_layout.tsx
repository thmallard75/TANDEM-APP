import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useAppFonts } from '@/lib/fonts';
import { theme } from '@/lib/theme';
import { captureInviteFromUrl } from '@/lib/invite';

SplashScreen.preventAutoHideAsync().catch(() => {});
captureInviteFromUrl();

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const { household, loading, load, reset } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session) load();
    else reset();
  }, [session]);

  useEffect(() => {
    if (session === undefined || loading || !fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {});
    const inAuth = segments[0] === '(auth)';
    const page = segments[1] as string | undefined;
    if (!session) {
      // Déconnecté : toujours l'écran de connexion (y compris depuis l'onboarding).
      if (!inAuth || page !== 'login') router.replace('/(auth)/login');
    } else if (!household) {
      if (!inAuth || page !== 'onboarding') router.replace('/(auth)/onboarding');
    } else if (inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, household, loading, segments, fontsLoaded]);

  if (!fontsLoaded || session === undefined || (session && loading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.mint} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
