import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { api } from "@/api/client";
import { useAuth, AuthUser } from "@/store/auth";
import { colors, font, radius } from "@/theme";

export default function Login() {
  const setSession = useAuth((s) => s.setSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        auth: false,
        body: { username: username.trim(), password },
      });
      await setSession(data.token, data.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <MotiView
            from={{ opacity: 0, scale: 0.6, rotate: "-15deg" }}
            animate={{ opacity: 1, scale: 1, rotate: "0deg" }}
            transition={{ type: "spring", damping: 12 }}
            style={styles.badge}
          >
            <Ionicons name="dice" size={44} color={colors.accent} />
          </MotiView>
          <Text variant="display" center style={{ marginTop: 18 }}>
            Dragones{"\n"}& Principiantes
          </Text>
          <Text variant="body" center style={{ marginTop: 8 }}>
            Creá tu héroe y viví la aventura
          </Text>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 150 }}
          style={styles.form}
        >
          <Field icon="person" placeholder="Usuario" value={username} onChange={setUsername} autoCap={false} />
          <Field icon="lock-closed" placeholder="Contraseña" value={password} onChange={setPassword} secure />

          {error && (
            <Text color={colors.danger} center style={{ marginTop: 4 }}>
              {error}
            </Text>
          )}

          <Button label="Entrar" icon="log-in" onPress={onSubmit} loading={loading} style={{ marginTop: 8 }} />
        </MotiView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  secure,
  autoCap = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  autoCap?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize={autoCap ? "sentences" : "none"}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: 40 },
  badge: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  form: { gap: 14 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, paddingVertical: 15, color: colors.text, fontFamily: font.body, fontSize: 15 },
});
