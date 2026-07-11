import { View, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { HpBar } from "@/components/HpBar";
import { useCharacters, Character, Clazz, Race } from "@/api/hooks";
import { useAuth } from "@/store/auth";
import { colors, radius } from "@/theme";

export default function Home() {
  const user = useAuth((s) => s.user);
  const { data: characters, isLoading, error } = useCharacters();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text variant="caption">Bienvenido</Text>
          <Text variant="display">{user?.displayName}</Text>
        </View>
        <Ionicons name="sparkles" size={24} color={colors.accent} />
      </View>

      <Text variant="label" style={{ marginTop: 22, marginBottom: 10 }}>
        TUS PERSONAJES
      </Text>

      {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}
      {error && (
        <Text color={colors.danger}>No se pudieron cargar tus personajes. ¿El backend está corriendo?</Text>
      )}

      {characters?.length === 0 && !isLoading && (
        <Card>
          <Text variant="subtitle">Todavía no tenés héroes</Text>
          <Text variant="body" style={{ marginTop: 6 }}>
            Creá tu primer personaje eligiendo una raza y una clase. Te calculamos la vida y todo automáticamente.
          </Text>
        </Card>
      )}

      {characters?.map((c, i) => (
        <CharacterCard key={c._id} character={c} delay={i * 60} />
      ))}

      <Button
        label="Crear personaje"
        icon="add-circle"
        onPress={() => router.push("/character/new")}
        style={{ marginTop: 18 }}
      />
    </Screen>
  );
}

function CharacterCard({ character, delay }: { character: Character; delay: number }) {
  const race = character.raceId as Race;
  const cls = character.classId as Clazz;
  const accent = cls?.color || colors.secondary;

  return (
    <Card
      accent={accent}
      delay={delay}
      style={{ marginBottom: 12 }}
      onPress={() => router.push(`/character/${character._id}`)}
    >
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: accent + "33", borderColor: accent }]}>
          <Text style={{ fontSize: 22, color: colors.text }}>{character.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{character.name}</Text>
          <Text variant="caption">
            {race?.name} · {cls?.name} · Nivel {character.level}
          </Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{character.level}</Text>
        </View>
      </View>

      <View style={{ marginTop: 14, gap: 6 }}>
        <View style={styles.hpRow}>
          <Text variant="caption">Vida</Text>
          <Text variant="caption" color={colors.textDim}>
            {character.currentHp} / {character.maxHp}
          </Text>
        </View>
        <HpBar current={character.currentHp} max={character.maxHp} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  levelBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: { color: colors.text, fontWeight: "700" },
  hpRow: { flexDirection: "row", justifyContent: "space-between" },
});
