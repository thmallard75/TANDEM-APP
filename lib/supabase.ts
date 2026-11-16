import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Clés publiques (publishable) : sûres côté client, le RLS protège les données.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://sttsvpqrvzsyqswejrpc.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_GPqLJF3tin5cstIdavzpyA_okUWhAKz';

// Session stockée dans le Keychain / Keystore, jamais en clair.
const secureStorage = {
  getItem: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(key)) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web' ? Promise.resolve(localStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(localStorage.removeItem(key)) : SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Sur le web, la session arrive dans l'URL du lien magique ; en natif, via le deep link.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
