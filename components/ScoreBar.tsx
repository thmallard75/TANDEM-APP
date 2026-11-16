import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

/**
 * Barre de répartition d'une catégorie. Toujours "l'équipe", jamais "X a fait 70 %".
 * Le point central marque l'équilibre ; la zone ±10 est verte.
 */
export function ScoreBar({
  emoji,
  label,
  left,
  right,
}: {
  emoji: string;
  label: string;
  left: number;
  right: number;
}) {
  const total = left + right;
  const pctLeft = total === 0 ? 50 : Math.round((left / total) * 100);
  const balanced = Math.abs(pctLeft - 50) <= 10;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>
          {emoji}  {label}
        </Text>
        <Text style={[styles.pct, balanced && { color: theme.primary }]}>
          {total === 0 ? 'rien cette semaine' : balanced ? 'équilibré' : `${pctLeft} / ${100 - pctLeft}`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.left, { flex: pctLeft }]} />
        <View style={[styles.right, { flex: 100 - pctLeft }]} />
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
  track: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.bgDeep },
  left: { backgroundColor: theme.primary, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  right: { backgroundColor: theme.sand, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  center: { position: 'absolute', left: '50%', top: -2, width: 2, height: 16, backgroundColor: theme.bg, marginLeft: -1 },
});
