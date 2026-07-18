import { RefObject, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
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
  const passwordRef = useRef<TextInput>(null);
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
      // Pasamos por "/" para que decida entre onboarding (primera vez) y la app.
      router.replace("/");
    } catch (e: any) {
      setError(e?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            <Field
              icon="person"
              placeholder="Usuario"
              value={username}
              onChange={setUsername}
              autoCap={false}
              returnKeyType="next"
              textContentType="username"
              autoComplete="username"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              inputRef={passwordRef}
              icon="lock-closed"
              placeholder="Contraseña"
              value={password}
              onChange={setPassword}
              secure
              returnKeyType="done"
              textContentType="password"
              autoComplete="password"
              onSubmitEditing={onSubmit}
            />

            {error && (
              <Text color={colors.danger} center style={{ marginTop: 4 }}>
                {error}
              </Text>
            )}

            <Button label="Entrar" icon="log-in" onPress={onSubmit} loading={loading} style={{ marginTop: 8 }} />
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  inputRef,
  icon,
  placeholder,
  value,
  onChange,
  secure,
  autoCap = true,
  returnKeyType,
  textContentType,
  autoComplete,
  blurOnSubmit,
  onSubmitEditing,
}: {
  inputRef?: RefObject<TextInput | null>;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  autoCap?: boolean;
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
  textContentType?: "none" | "username" | "password";
  autoComplete?: "off" | "username" | "password";
  blurOnSubmit?: boolean;
  onSubmitEditing?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure && !visible}
        autoCapitalize={autoCap ? "sentences" : "none"}
        autoComplete={autoComplete}
        autoCorrect={false}
        blurOnSubmit={blurOnSubmit}
        returnKeyType={returnKeyType}
        textContentType={textContentType}
        onSubmitEditing={onSubmitEditing}
        style={styles.input}
      />
      {secure && (
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10} style={styles.eyeButton}>
          <Ionicons name={visible ? "eye-off" : "eye"} size={20} color={colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingBottom: 28 },
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
  eyeButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
});
