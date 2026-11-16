import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CATEGORY_COLOR, CATEGORY_LABEL, type Task, type Member } from '@/lib/types';
import { theme } from '@/lib/theme';

export function TaskCard({ task, members }: { task: Task; members: Member[] }) {
  const owner = members.find((m) => m.id === task.owner_member_id);
  const due = task.due_at ? new Date(task.due_at) : null;

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/task/${task.id}`)}>
      <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[task.category] }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
        <Text style={styles.meta}>
          {CATEGORY_LABEL[task.category]}
          {due ? ` · ${due.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
          {owner ? ` · ${owner.display_name}` : ' · à attribuer'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.line,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 16, color: theme.text, fontWeight: '600' },
  meta: { fontSize: 13, color: theme.muted, marginTop: 2 },
});
