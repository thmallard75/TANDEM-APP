import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENT, theme } from '@/lib/theme';

/**
 * Barre de répartition d'une catégorie. Toujours "l'équipe", jamais "X a fait 70 %".
 * Le repère central marque l'équilibre.
 */
export function ScoreBar({ emoji, label, left, right }: { emoji: string; label: string; left: number; right: number }) {
  const total = left + right;
  const pctLeft = total === 0 ? 50 : Math.round((left / total) * 100);
  const balanced = total > 0 && Math.abs(pctLeft - 50) <= 10;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>
          {emoji}  {label}
        </Text>
        <Text style={[styles.pct, balanced && { color: theme.mint }]}>
          {total === 0 ? 'rien cette semaine' : balanced ? 'équilibré' : `${pctLeft} / ${100 - pctLeft}`}
        </Text>
      </View>
      <View style={styles.track}>
        {total > 0 && (
          <>
            <LinearGradient colors={GRADIENT.me} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: pctLeft }} />
            <LinearGradient colors={GRADIENT.partner} start={{ x: 1, y: 0 }} end={{ x: 0, y: 0 }} style={{ flex: 100 - pctLeft }} />
          </>
        )}
        <View style={styles.center} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontFamily: theme.bodyMedium, fontSize: 15, color: theme.ink },
  pct: { fontFamily: theme.bodyMedium, fontSize: 13, color: theme.muted },
  track: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.field },
  center: { position: 'absolute', left: '50%', top: 0, width: 2, height: 12, backgroundColor: theme.card, marginLeft: -1 },
});
