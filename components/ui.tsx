import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GRADIENT, theme } from '@/lib/theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bgDeep, alignItems: 'center' }}>
      {/* Sur ordinateur, l'app reste une colonne "téléphone" centrée. */}
      <View style={styles.column}>
        <LinearGradient colors={GRADIENT.screen} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.45 }} />
        <View style={[styles.screen, { paddingTop: insets.top + 12 }, style]}>{children}</View>
      </View>
    </View>
  );
}

/** En-tête : surtitre discret + grand titre. */
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

type Variant = 'primary' | 'ghost' | 'accent' | 'quiet';

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
  variant?: Variant;
  icon?: ReactNode;
}) {
  const gradient = variant === 'primary' ? GRADIENT.me : variant === 'accent' ? GRADIENT.partner : null;
  const fg = gradient ? theme.onGradient : variant === 'ghost' ? theme.mint : theme.muted;
  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon}
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [{ opacity: loading ? 0.6 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.btn,
            variant === 'ghost' && { backgroundColor: theme.primarySoft, borderWidth: 1, borderColor: 'rgba(98,212,178,0.28)' },
            variant === 'quiet' && { paddingVertical: 10 },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {props.label ? <Text style={styles.label}>{props.label}</Text> : null}
      <TextInput placeholderTextColor={theme.muted} selectionColor={theme.mint} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

/** Photo de profil si elle existe, sinon l'initiale : dégradé turquoise pour toi, corail pour ton partenaire. */
export function Avatar({
  name,
  uri,
  size = 32,
  tone = 'primary',
}: {
  name: string;
  uri?: string | null;
  size?: number;
  tone?: 'primary' | 'sand' | 'dark';
}) {
  const round = { width: size, height: size, borderRadius: size / 2, alignItems: 'center' as const, justifyContent: 'center' as const };
  const ring = Math.max(2, Math.round(size * 0.06));
  const inner = uri ? (
    <Image source={{ uri }} style={{ width: size - ring * 2, height: size - ring * 2, borderRadius: size / 2, backgroundColor: theme.card }} />
  ) : (
    <Text style={{ color: tone === 'dark' ? theme.ink : theme.onGradient, fontFamily: theme.bodyBold, fontSize: size * 0.42 }}>
      {name.trim().charAt(0).toUpperCase()}
    </Text>
  );
  if (tone === 'dark') return <View style={[round, { backgroundColor: theme.onGradient }]}>{inner}</View>;
  return (
    <LinearGradient colors={tone === 'primary' ? GRADIENT.me : GRADIENT.partner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={round}>
      {inner}
    </LinearGradient>
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
      <View style={styles.emptyIcon}>
        <Text style={{ fontSize: 36 }}>{emoji}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, width: '100%', maxWidth: 480, backgroundColor: theme.bg },
  screen: { flex: 1, paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 4 },
  eyebrow: { fontFamily: theme.bodyMedium, fontSize: 13, color: theme.mint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontFamily: theme.display, fontSize: 34, color: theme.ink, letterSpacing: -0.6, lineHeight: 40 },
  section: { fontFamily: theme.display, fontSize: 20, color: theme.ink, marginTop: 10 },
  p: { fontFamily: theme.body, fontSize: 16, color: theme.inkSoft, lineHeight: 24 },
  label: { fontFamily: theme.bodyMedium, fontSize: 13, color: theme.muted },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 18,
    gap: 12,
    ...theme.shadow,
  },
  btn: { borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22, alignItems: 'center' },
  btnText: { fontFamily: theme.bodyBold, fontSize: 16, letterSpacing: 0.1 },
  input: {
    backgroundColor: theme.field,
    borderWidth: 1.5,
    borderColor: theme.line,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: theme.body,
    fontSize: 16,
    color: theme.ink,
  },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.hairline, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: theme.display, fontSize: 22, color: theme.ink, textAlign: 'center' },
  emptyText: { fontFamily: theme.body, fontSize: 15, color: theme.muted, textAlign: 'center', lineHeight: 22 },
});
