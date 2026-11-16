import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { paddingTop: insets.top + 12 }, style]}>{children}</View>;
}

/** En-tête éditorial : surtitre discret + grand titre serif. */
export function Header({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function P({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.p, muted && { color: theme.muted }, style]}>{children}</Text>;
}

export function Card({ children, style, tint }: { children: ReactNode; style?: ViewStyle; tint?: boolean }) {
  return <View style={[styles.card, tint && { backgroundColor: theme.cardTint }, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'accent' | 'quiet';
  icon?: ReactNode;
}) {
  const bg = { primary: theme.primary, accent: theme.accent, ghost: theme.primarySoft, quiet: 'transparent' }[variant];
  const fg = { primary: '#fff', accent: '#fff', ghost: theme.primaryDeep, quiet: theme.muted }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: loading ? 0.6 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        variant === 'quiet' && { paddingVertical: 10 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
      <TextInput placeholderTextColor={theme.muted} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

/** Pastille ronde avec l'initiale d'un membre. */
export function Avatar({ name, size = 32, tone = 'primary' }: { name: string; size?: number; tone?: 'primary' | 'sand' }) {
  const bg = tone === 'primary' ? theme.primary : theme.sandDeep;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: theme.bodyBold, fontSize: size * 0.42 }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function Pill({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontFamily: theme.bodyMedium, fontSize: 12 }}>{children}</Text>
    </View>
  );
}

export function Empty({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 4 },
  eyebrow: { fontFamily: theme.bodyMedium, fontSize: 13, color: theme.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontFamily: theme.display, fontSize: 34, color: theme.ink, letterSpacing: -0.5, lineHeight: 40 },
  section: { fontFamily: theme.display, fontSize: 20, color: theme.ink, marginTop: 10 },
  p: { fontFamily: theme.body, fontSize: 16, color: theme.inkSoft, lineHeight: 24 },
  label: { fontFamily: theme.bodyMedium, fontSize: 13, color: theme.muted },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 18,
    gap: 12,
    ...theme.shadow,
  },
  btn: { borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22, alignItems: 'center' },
  btnText: { fontFamily: theme.bodyBold, fontSize: 16, letterSpacing: 0.1 },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: theme.body,
    fontSize: 16,
    color: theme.ink,
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: theme.display, fontSize: 22, color: theme.ink, textAlign: 'center' },
  emptyText: { fontFamily: theme.body, fontSize: 15, color: theme.muted, textAlign: 'center', lineHeight: 22 },
});
