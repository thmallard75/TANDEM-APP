import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontFamily: theme.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          height: 84,
          paddingTop: 10,
          ...theme.shadow,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Semaine', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'today' : 'today-outline'} color={color} size={24} /> }}
      />
      <Tabs.Screen
        name="bilan"
        options={{ title: 'Bilan', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'pie-chart' : 'pie-chart-outline'} color={color} size={24} /> }}
      />
      <Tabs.Screen
        name="foyer"
        options={{ title: 'Foyer', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={24} /> }}
      />
    </Tabs>
  );
}
