import { View, StyleSheet } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { useAuth } from "@/store/auth"
import { colors, radius } from "@/theme"

export default function Profile() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const isDM = user?.role === "dm" || user?.role === "admin"

  const onLogout = async () => {
    await logout()
    router.replace("/login")
  }

  return (
    <Screen>
      <Text variant="display">Perfil</Text>

      <Card style={{ marginTop: 20 }}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subtitle">{user?.displayName}</Text>
            <Text variant="caption">@{user?.username}</Text>
          </View>
          {isDM && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={13} color={colors.text} />
              <Text style={styles.adminText}>DM</Text>
            </View>
          )}
        </View>
      </Card>

      <Button
        label="Cómo se juega / Glosario"
        icon="book"
        variant="secondary"
        onPress={() => router.push("/glossary")}
        style={{ marginTop: 20 }}
      />

      <Button label="Cerrar sesión" icon="log-out" variant="secondary" onPress={onLogout} style={{ marginTop: 12 }} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  adminText: { color: colors.text, fontSize: 11, fontWeight: "700" },
})
