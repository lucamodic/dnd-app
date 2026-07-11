import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useClasses, useRaces, useCreateCharacter, Race, Clazz } from "@/api/hooks";
import { abilityMod, formatMod } from "@/lib/format";
import { colors, font, radius } from "@/theme";

type Step = 0 | 1 | 2;

export default function NewCharacter() {
  const { data: races, isLoading: racesLoading } = useRaces();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const createCharacter = useCreateCharacter();

  const [step, setStep] = useState<Step>(0);
  const [race, setRace] = useState<Race | null>(null);
  const [cls, setCls] = useState<Clazz | null>(null);
  const [name, setName] = useState("");

  const onCreate = async () => {
    if (!race || !cls || !name.trim()) return;
    const character = await createCharacter.mutateAsync({
      name: name.trim(),
      raceId: race._id,
      classId: cls._id,
    });
    router.replace(`/character/${character._id}`);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => (step === 0 ? router.back() : setStep((s) => (s - 1) as Step))} />
        <StepDots step={step} />
        <View style={{ width: 24 }} />
      </View>

      <AnimatePresence exitBeforeEnter>
        {step === 0 && (
          <MotiView key="race" {...slide} style={{ flex: 1 }}>
            <Text variant="display">Elegí tu raza</Text>
            <Text variant="body" style={{ marginTop: 4, marginBottom: 16 }}>
              Define de dónde viene tu héroe y sus rasgos.
            </Text>
            {racesLoading && <ActivityIndicator color={colors.accent} />}
            {races?.map((r, i) => (
              <RaceOption key={r._id} race={r} selected={race?._id === r._id} onPress={() => setRace(r)} delay={i * 40} />
            ))}
            <Button label="Siguiente" icon="arrow-forward" onPress={() => setStep(1)} disabled={!race} style={{ marginTop: 12 }} />
          </MotiView>
        )}

        {step === 1 && (
          <MotiView key="class" {...slide} style={{ flex: 1 }}>
            <Text variant="display">Elegí tu clase</Text>
            <Text variant="body" style={{ marginTop: 4, marginBottom: 16 }}>
              Tu rol en el grupo y cómo peleás.
            </Text>
            {classesLoading && <ActivityIndicator color={colors.accent} />}
            {classes?.map((c, i) => (
              <ClassOption key={c._id} cls={c} selected={cls?._id === c._id} onPress={() => setCls(c)} delay={i * 40} />
            ))}
            <Button label="Siguiente" icon="arrow-forward" onPress={() => setStep(2)} disabled={!cls} style={{ marginTop: 12 }} />
          </MotiView>
        )}

        {step === 2 && (
          <MotiView key="name" {...slide} style={{ flex: 1 }}>
            <Text variant="display">¿Cómo se llama?</Text>
            <Text variant="body" style={{ marginTop: 4, marginBottom: 16 }}>
              Ponele nombre a tu {race?.name.toLowerCase()} {cls?.name.toLowerCase()}.
            </Text>

            <View style={styles.field}>
              <Ionicons name="create" size={18} color={colors.muted} />
              <TextInput
                placeholder="Nombre del héroe"
                placeholderTextColor={colors.textFaint}
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
            </View>

            <Card style={{ marginTop: 18 }} accent={cls?.color}>
              <Text variant="label">RESUMEN</Text>
              <Text variant="subtitle" style={{ marginTop: 8 }}>
                {name.trim() || "Tu héroe"}
              </Text>
              <Text variant="caption">
                {race?.name} · {cls?.name} · Nivel 1
              </Text>
              <View style={styles.summaryRow}>
                <SummaryStat label="Dado de vida" value={`d${cls?.hitDie}`} />
                <SummaryStat label="Velocidad" value={`${race?.speed} pies`} />
                <SummaryStat label="Mago" value={cls?.spellcasting ? "Sí" : "No"} />
              </View>
            </Card>

            <Button
              label="Crear héroe"
              icon="sparkles"
              onPress={onCreate}
              loading={createCharacter.isPending}
              disabled={!name.trim()}
              style={{ marginTop: 18 }}
            />
            {createCharacter.error && (
              <Text color={colors.danger} center style={{ marginTop: 8 }}>
                {(createCharacter.error as Error).message}
              </Text>
            )}
          </MotiView>
        )}
      </AnimatePresence>
    </Screen>
  );
}

const slide = {
  from: { opacity: 0, translateX: 30 },
  animate: { opacity: 1, translateX: 0 },
  exit: { opacity: 0, translateX: -30 },
  transition: { type: "timing" as const, duration: 260 },
};

function RaceOption({ race, selected, onPress, delay }: { race: Race; selected: boolean; onPress: () => void; delay: number }) {
  return (
    <Card onPress={onPress} delay={delay} style={[styles.option, selected && styles.optionSelected]}>
      <View style={styles.optionRow}>
        {race.image ? (
          <Image source={{ uri: race.image }} style={styles.raceImg} />
        ) : (
          <LinearGradient colors={[colors.secondary, colors.primary]} style={styles.raceImg}>
            <Text style={{ fontFamily: font.display, fontSize: 20, color: colors.text }}>{race.name.charAt(0)}</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{race.name}</Text>
          <Text variant="body" numberOfLines={3} style={{ marginTop: 2, fontSize: 13 }}>
            {race.description}
          </Text>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
      </View>
    </Card>
  );
}

function ClassOption({ cls, selected, onPress, delay }: { cls: Clazz; selected: boolean; onPress: () => void; delay: number }) {
  return (
    <Card onPress={onPress} delay={delay} accent={cls.color} style={[styles.option, selected && styles.optionSelected]}>
      <View style={styles.optionRow}>
        <View style={[styles.classDot, { backgroundColor: cls.color }]}>
          <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 16 }}>d{cls.hitDie}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{cls.name}</Text>
          <Text variant="caption">Principal: {cls.primaryAbility}</Text>
          <Text variant="body" numberOfLines={3} style={{ marginTop: 2, fontSize: 13 }}>
            {cls.description}
          </Text>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
      </View>
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontFamily: font.display, fontSize: 18, color: colors.accent }}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  dotActive: { backgroundColor: colors.accent, width: 22 },
  dotDone: { backgroundColor: colors.secondary },
  option: { marginBottom: 12 },
  optionSelected: { borderColor: colors.accent, borderWidth: 1.5 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  raceImg: { width: 54, height: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  classDot: { width: 54, height: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
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
  input: { flex: 1, paddingVertical: 15, color: colors.text, fontFamily: font.body, fontSize: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 16 },
});
