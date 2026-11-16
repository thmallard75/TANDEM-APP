import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/lib/store';
import { theme } from '@/lib/theme';

const COLORS = ['#2098B8', '#62D4B2', '#F06880', '#F8A070', '#F5C451', '#F8F8F8'];

/** Pluie de confettis + petit mot, déclenchée par useStore().celebrate(). */
export function Celebration() {
  const message = useStore((s) => s.celebration);
  const clear = useStore((s) => s.clearCelebration);
  const progress = useRef(new Animated.Value(0)).current;
  const height = Dimensions.get('window').height;

  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: Math.random() * 100,
        size: 6 + Math.random() * 7,
        color: COLORS[i % COLORS.length],
        fall: 0.55 + Math.random() * 0.6,
        drift: (Math.random() - 0.5) * 140,
        spin: (Math.random() - 0.5) * 900,
        round: Math.random() > 0.6,
      })),
    [message],
  );

  useEffect(() => {
    if (!message) return;
    progress.setValue(0);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => clear());
  }, [message]);

  if (!message) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', overflow: 'hidden' }]}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: -24,
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.7,
            borderRadius: p.round ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height * p.fall] }) },
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
      <Animated.View
        style={[
          styles.toastWrap,
          {
            opacity: progress.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.85, 1, 1] }) }],
          },
        ]}
      >
        <View style={styles.toast}>
          <Text style={styles.toastText}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 0, right: 0, top: '38%', alignItems: 'center', paddingHorizontal: 24 },
  toast: { backgroundColor: theme.cardTint, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 22, borderWidth: 1, borderColor: 'rgba(98,212,178,0.4)', ...theme.shadow },
  toastText: { fontFamily: theme.display, fontSize: 18, color: theme.ink, textAlign: 'center' },
});
