import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

/**
 * Barre de répartition de l'équipe. Toujours formulée côté "équipe",
 * jamais "X a fait 70 %".
 */
export function ScoreBar({
  label,
  left,
  right,
  leftName,
  rightName,
}: {
  label: string;
  left: number;
  right: number;
  leftName: string;
  rightName: string;
}) {
  const total = left + right;
  const pctLeft = total === 0 ? 50 : Math.round((left / total) * 100);
  const pctRight = 100 - pctLeft;
  const balanced = Math.abs(pctLeft - 50) <= 10;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.pct, balanced && { color: theme.primary }]}>
          {total === 0 ? '—' : `${pctLeft} / ${pctRight}`}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.fill, { flex: pctLeft, backgroundColor: theme.primary }]} />
        <View style={[styles.fill, { flex: pctRight, backgroundColor: '#C9B8A1' }]} />
      </View>
      <View style={styles.row}>
        <Text style={styles.name}>{leftName}</Text>
        <Text style={styles.name}>{rightName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '600', color: theme.text },
  pct: { fontSize: 15, fontWeight: '600', color: theme.muted },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10 },
  name: { fontSize: 12, color: theme.muted },
});
