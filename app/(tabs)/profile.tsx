import { useState } from "react";
import { Pressable, View, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useCreateUser, useTracker, useTrackerSettings } from "@/api/hooks";
import { useAuth } from "@/store/auth";
import { colors, radius } from "@/theme";

export default function Profile() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const isDM = user?.role === "dm" || user?.role === "admin";
  const createUser = useCreateUser();
  const { data: tracker } = useTracker();
  const trackerSettings = useTrackerSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const onCreateUser = async () => {
    if (!username.trim() || !password) return;
    await createUser.mutateAsync({ username: username.trim(), password });
    setUsername("");
    setPassword("");
  };

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

      {isDM && (
        <Card style={{ marginTop: 14 }}>
          <Text variant="subtitle">Herramientas de DM</Text>
          <Text variant="body" style={{ marginTop: 6 }}>
            Podés crear Players, ver todos los héroes, agregar bichos, avanzar turnos y ordenar por iniciativa.
          </Text>

          <Pressable
            onPress={() => trackerSettings.mutate({ levelUpEnabled: !tracker?.levelUpEnabled })}
            style={styles.levelGateRow}
          >
            <Ionicons
              name={tracker?.levelUpEnabled ? "checkbox" : "square-outline"}
              size={20}
              color={tracker?.levelUpEnabled ? colors.accent : colors.muted}
            />
            <Text variant="caption" style={{ flex: 1 }}>Permitir que los players suban de nivel</Text>
          </Pressable>

          <View style={{ gap: 10, marginTop: 14 }}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username del Player"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              style={styles.input}
            />
            <Button
              label="Crear Player"
              icon="person-add"
              onPress={onCreateUser}
              loading={createUser.isPending}
              disabled={!username.trim() || !password}
            />
            {createUser.error && <Text color={colors.danger}>{(createUser.error as Error).message}</Text>}
          </View>
        </Card>
      )}

      <Button label="Cerrar sesión" icon="log-out" variant="secondary" onPress={onLogout} style={{ marginTop: 20 }} />
    </Screen>
  );
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
  levelGateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
