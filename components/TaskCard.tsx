import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Pill } from '@/components/ui';
import { CATEGORY_STYLE, theme } from '@/lib/theme';
import type { Task, Member } from '@/lib/types';

export function TaskCard({ task, members, meId, childName }: { task: Task; members: Member[]; meId?: string; childName?: string }) {
  const owner = members.find((m) => m.id === task.owner_member_id);
  const cat = CATEGORY_STYLE[task.category];
  const due = task.due_at ? new Date(task.due_at) : null;
  const time = due && (due.getHours() || due.getMinutes()) ? due.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 }]}
    >
      <View style={[styles.emoji, { backgroundColor: cat.bg }]}>
        <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Pill bg={cat.bg} fg={cat.fg}>{cat.label}</Pill>
          {childName ? <Pill bg="rgba(255,255,255,0.08)" fg={theme.inkSoft}>{childName}</Pill> : null}
          {time ? <Text style={styles.meta}>{time}</Text> : null}
        </View>
      </View>
      {owner ? (
        <Avatar name={owner.display_name} uri={owner.avatar_url} size={30} tone={owner.id === meId ? 'primary' : 'sand'} />
      ) : (
        <View style={styles.unassigned}><Text style={{ color: theme.muted, fontSize: 16 }}>?</Text></View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.hairline,
  },
  emoji: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: theme.bodyMedium, fontSize: 16, color: theme.ink, lineHeight: 21 },
  meta: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  unassigned: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: theme.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
