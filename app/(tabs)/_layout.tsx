import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { colors, font } from "@/theme";

export default function TabsLayout() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const insets = useSafeAreaInsets();
  if (!token) return <Redirect href="/login" />;
  const isDM = user?.role === "dm" || user?.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        } as any,
        tabBarLabelStyle: { fontFamily: font.bodySemi, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Héroes",
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-half" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dice"
        options={{
          title: "Dados",
          tabBarIcon: ({ color, size }) => <Ionicons name="dice" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: "Combate",
          tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dm"
        options={{
          title: "DM",
          href: isDM ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
