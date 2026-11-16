import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '@/lib/theme';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.p, muted && { color: theme.muted }]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.btn, variant === 'ghost' && styles.btnGhost, loading && { opacity: 0.6 }]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : theme.primary} />
      ) : (
        <Text style={[styles.btnText, variant === 'ghost' && { color: theme.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={theme.muted} {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 20, gap: 14 },
  h1: { fontSize: 28, fontWeight: '700', color: theme.text, marginTop: 8 },
  p: { fontSize: 16, color: theme.text, lineHeight: 22 },
  btn: {
    backgroundColor: theme.primary,
    borderRadius: theme.radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGhost: { backgroundColor: theme.primarySoft },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: theme.radius,
    padding: 14,
    fontSize: 16,
    color: theme.text,
  },
});
