import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SkeletonCard } from "@/components/Skeleton";
import { useBackgrounds, useClasses, useRaces, useCreateCharacter, useRollStats, useSubclasses, Background, Race, Clazz, AbilityScores, Subclass } from "@/api/hooks";
import { abilityMod, classHighlightsAbility, formatMod, raceAbilityBonusPreview, ABILITY_ORDER, ABILITY_LABELS, ABILITY_FULL } from "@/lib/format";
import { SKILLS } from "@/lib/sheet";
import { ClassIcon } from "@/components/ClassIcon";
import { RaceImage } from "@/components/RaceImage";
import { colors, font, radius } from "@/theme";

/**
 * Los pasos del wizard se calculan, no se cuentan a mano: la especialidad solo aparece en las
 * clases que la eligen a nivel 1, así que los índices se corren según la clase.
 */
type StepKey = "race" | "class" | "subclass" | "background" | "name";

export default function NewCharacter() {
  const { data: races, isLoading: racesLoading } = useRaces();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const createCharacter = useCreateCharacter();
  const rollStats = useRollStats();

  const [step, setStep] = useState(0);
  const [race, setRace] = useState<Race | null>(null);
  const [cls, setCls] = useState<Clazz | null>(null);
  const [subclass, setSubclass] = useState<Subclass | null>(null);
  const [background, setBackground] = useState<Background | null>(null);
  const [name, setName] = useState("");
  const [stats, setStats] = useState<AbilityScores | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { data: subclasses, isLoading: subclassesLoading } = useSubclasses(cls?.index);
  const { data: backgrounds, isLoading: backgroundsLoading } = useBackgrounds();
  const [backgroundSearch, setBackgroundSearch] = useState("");

  const steps: StepKey[] = [
    "race",
    "class",
    ...(cls?.subclassLevel === 1 ? (["subclass"] as StepKey[]) : []),
    "background",
    "name",
  ];
  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  const visibleBackgrounds = useMemo(() => {
    const query = backgroundSearch.trim().toLowerCase();
    if (!query) return backgrounds || [];
    return (backgrounds || []).filter(
      (b) => b.name.toLowerCase().includes(query) || b.nameEn.toLowerCase().includes(query)
    );
  }, [backgrounds, backgroundSearch]);
  const bonusPreview = raceAbilityBonusPreview(race, cls, stats);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [step]);

  // Al pasar al paso final, tiramos las características según la clase.
  const goToNaming = async () => {
    if (!cls) return;
    setStep(steps.indexOf("name"));
    try {
      setStats(await rollStats.mutateAsync(cls._id));
    } catch {
      setStats(null);
    }
  };

  const onCreate = async () => {
    if (!race || !cls || !name.trim()) return;
    const character = await createCharacter.mutateAsync({
      name: name.trim(),
      raceId: race._id,
      classId: cls._id,
      ...(subclass ? { subclassIndex: subclass.index } : {}),
      ...(background ? { backgroundIndex: background.index } : {}),
      ...(stats ? { abilityScores: stats } : {}),
    });
    router.replace(`/character/${character._id}`);
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, !isLastStep && { paddingBottom: 150 + insets.bottom }]}
      >
        <View style={styles.header}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
            onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          />
          <StepDots step={step} total={steps.length} />
          <View style={{ width: 24 }} />
        </View>

        <AnimatePresence exitBeforeEnter>
          {current === "race" && (
            <MotiView key="race" {...slide} style={{ flex: 1 }}>
              <Text variant="display">Elegí tu raza</Text>
              <Text variant="body" style={{ marginTop: 4, marginBottom: 16 }}>
                Define de dónde viene tu héroe y sus rasgos.
              </Text>
              {racesLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} avatar />)}
              {races?.map((r, i) => (
                <RaceOption key={r._id} race={r} selected={race?._id === r._id} onPress={() => setRace(r)} delay={i * 40} />
              ))}
            </MotiView>
          )}

          {current === "class" && (
            <MotiView key="class" {...slide} style={{ flex: 1 }}>
              <Text variant="display">Elegí tu clase</Text>
              <Text variant="body" style={{ marginTop: 4, marginBottom: 16 }}>
                Tu rol en el grupo y cómo peleás.
              </Text>
              {classesLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
              {classes?.map((c, i) => (
                <ClassOption key={c._id} cls={c} selected={cls?._id === c._id} onPress={() => { setCls(c); setSubclass(null); }} delay={i * 40} />
              ))}
            </MotiView>
          )}

          {current === "subclass" && cls && (
            <MotiView key="subclass" {...slide} style={{ flex: 1 }}>
              <Text variant="display">Elegí especialidad</Text>
              <Text variant="body" style={{ marginTop: 4, marginBottom: 16 }}>
                {cls.name} elige su camino desde nivel 1. Podés saltearlo y elegirlo después.
              </Text>
              {subclassesLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              {subclasses?.map((s, i) => (
                <SubclassOption key={s.index} subclass={s} selected={subclass?.index === s.index} onPress={() => setSubclass(s)} delay={i * 40} />
              ))}
              {!subclassesLoading && !subclasses?.length && (
                <Card>
                  <Text variant="body">No hay especialidades cargadas para esta clase todavía.</Text>
                </Card>
              )}
            </MotiView>
          )}

          {current === "background" && (
            <MotiView key="background" {...slide} style={{ flex: 1 }}>
              <Text variant="display">Elegí trasfondo</Text>
              <Text variant="body" style={{ marginTop: 4, marginBottom: 12 }}>
                De dónde viene tu personaje antes de ser aventurero. Te da competencias, equipo y una
                habilidad propia. Es opcional: podés elegirlo después desde la ficha.
              </Text>
              <TextInput
                value={backgroundSearch}
                onChangeText={setBackgroundSearch}
                placeholder="Buscar trasfondo..."
                placeholderTextColor={colors.textFaint}
                style={styles.searchInput}
              />
              {backgroundsLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
              {visibleBackgrounds.map((b, i) => (
                <BackgroundOption
                  key={b.index}
                  background={b}
                  selected={background?.index === b.index}
                  onPress={() => setBackground(background?.index === b.index ? null : b)}
                  delay={Math.min(i, 8) * 40}
                />
              ))}
              {!backgroundsLoading && !visibleBackgrounds.length && (
                <Card>
                  <Text variant="body">No encontramos ningún trasfondo con ese nombre.</Text>
                </Card>
              )}
            </MotiView>
          )}

          {current === "name" && (
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
                {!!subclass && (
                  <Text variant="caption" color={colors.accent}>
                    Especialidad: {subclass.name}
                  </Text>
                )}
                <View style={styles.summaryRow}>
                  <SummaryStat label="Dado de vida" value={`d${cls?.hitDie}`} />
                  <SummaryStat label="Velocidad" value={`${race?.speed} pies`} />
                  <SummaryStat label="Mago" value={cls?.spellcasting ? "Sí" : "No"} />
                </View>
              </Card>

              {/* Características generadas (4d6, las mejores para tu clase) */}
              <Card style={{ marginTop: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text variant="label">HABILIDADES</Text>
                  <Button
                    label="Volver a tirar"
                    icon="dice"
                    small
                    variant="secondary"
                    loading={rollStats.isPending}
                    onPress={async () => cls && setStats(await rollStats.mutateAsync(cls._id))}
                  />
                </View>
                <Text variant="caption" style={{ marginTop: 6, marginBottom: 10 }}>
                  Tiramos 6 veces 4d6 y las repartimos según tu clase. Podés cambiarlas después en la ficha.
                </Text>
                {rollStats.isPending && !stats ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <View style={styles.statsGrid}>
                  {ABILITY_ORDER.map((key) => {
                    const raceBonus = bonusPreview.find((b) => b.ability === key)?.bonus || 0;
                    const finalScore = stats ? Math.min(20, stats[key] + raceBonus) : undefined;
                    return (
                      <View key={key} style={[styles.statCell, classHighlightsAbility(cls, key) && styles.statCellPrimary]}>
                        <Text variant="caption">{ABILITY_LABELS[key]}</Text>
                        <Text style={styles.statVal}>{finalScore ?? (stats ? stats[key] : "—")}</Text>
                        <Text variant="caption" color={colors.textFaint}>
                          {stats ? formatMod(abilityMod(finalScore ?? stats[key])) : ""}
                        </Text>
                        {raceBonus > 0 && (
                          <Text variant="caption" color={colors.warning}>
                            Raza +{raceBonus}
                          </Text>
                        )}
                        {cls?.savingThrows?.includes(key) && (
                          <Text variant="caption" color={colors.accent}>
                            Salv prof.
                          </Text>
                        )}
                      </View>
                    );
                  })}
                  </View>
                )}
                {bonusPreview.length > 0 ? (
                  <View style={{ marginTop: 8, gap: 2 }}>
                    {bonusPreview.map((b) => (
                      <Text key={b.ability} variant="caption" color={colors.textDim}>
                        +{b.bonus} {ABILITY_FULL[b.ability]}
                        {b.note ? ` — ${b.note}` : ""}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text variant="caption" style={{ marginTop: 8 }}>
                    Esta raza no suma bonos de característica.
                  </Text>
                )}
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
      </ScrollView>
      {!isLastStep && (
        <View style={[styles.floatingNext, { bottom: 12 + insets.bottom }]}>
          <Button
            label={current === "background" && !background ? "Saltear por ahora" : "Siguiente"}
            icon="arrow-forward"
            onPress={() => (steps[step + 1] === "name" ? goToNaming() : setStep(step + 1))}
            disabled={current === "race" ? !race : current === "class" ? !cls : false}
          />
        </View>
      )}
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
  const [expanded, setExpanded] = useState(false);
  return (
    <Card onPress={onPress} delay={delay} style={[styles.option, selected && styles.optionSelected]}>
      <View style={styles.optionRow}>
        <RaceImage
          uri={race.imageBase64 || race.image}
          style={styles.raceImg}
          fallback={
            <LinearGradient colors={[colors.secondary, colors.primary]} style={styles.raceImg}>
              <Text style={{ fontFamily: font.display, fontSize: 20, color: colors.text }}>{race.name.charAt(0)}</Text>
            </LinearGradient>
          }
        />
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{race.name}</Text>
          <Text variant="body" numberOfLines={expanded ? undefined : 3} style={{ marginTop: 2, fontSize: 13 }}>
            {race.description}
          </Text>
          <Text variant="caption" color={colors.textDim} style={{ marginTop: 4 }}>
            {raceBonusText(race)}
          </Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            hitSlop={6}
            style={{ marginTop: 6 }}
          >
            <Text variant="caption" color={colors.accent}>{expanded ? "Ver menos" : "Leer descripción"}</Text>
          </Pressable>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
      </View>
    </Card>
  );
}

function raceBonusText(race: Race) {
  if (race.flexibleAbilityBonuses) return "Aumento: +2/+1 flexible según clase";
  if (!race.abilityBonuses?.length) return "Aumento: sin bono fijo";
  return `Aumento: ${race.abilityBonuses
    .map((bonus) => `${ABILITY_FULL[bonus.ability as keyof typeof ABILITY_FULL] || bonus.ability} +${bonus.bonus}`)
    .join(", ")}`;
}

function ClassOption({ cls, selected, onPress, delay }: { cls: Clazz; selected: boolean; onPress: () => void; delay: number }) {
  return (
    <Card onPress={onPress} delay={delay} accent={cls.color} style={[styles.option, selected && styles.optionSelected]}>
      <View style={styles.optionRow}>
        <View style={[styles.classDot, { backgroundColor: cls.color }]}>
          <ClassIcon index={cls.index} size={22} color={colors.text} />
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

function SubclassOption({ subclass, selected, onPress, delay }: { subclass: Subclass; selected: boolean; onPress: () => void; delay: number }) {
  return (
    <Card onPress={onPress} delay={delay} style={[styles.option, selected && styles.optionSelected]}>
      <View style={styles.optionRow}>
        <View style={styles.subclassDot}>
          <Ionicons name="sparkles" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{subclass.name}</Text>
          <Text variant="caption">Se elige a nivel {subclass.subclassLevel}</Text>
          <Text variant="body" numberOfLines={3} style={{ marginTop: 2, fontSize: 13 }}>
            {subclass.description}
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

function BackgroundOption({
  background,
  selected,
  onPress,
  delay,
}: {
  background: Background;
  selected: boolean;
  onPress: () => void;
  delay: number;
}) {
  const skills = background.skillProficiencies
    .map((index) => SKILLS.find((s) => s.index === index)?.label)
    .filter(Boolean)
    .join(" · ");

  return (
    <Card delay={delay} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={20}
          color={selected ? colors.accent : colors.muted}
        />
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{background.name}</Text>
          <Text variant="caption" numberOfLines={selected ? undefined : 2} style={{ marginTop: 2 }}>
            {background.description}
          </Text>
          {!!skills && <Text variant="caption" style={{ marginTop: 4 }}>Competencias: {skills}</Text>}
        </View>
      </View>
    </Card>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  dotActive: { backgroundColor: colors.accent, width: 22 },
  dotDone: { backgroundColor: colors.secondary },
  option: { marginBottom: 12 },
  searchInput: {
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: font.body,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionSelected: { borderColor: colors.accent, borderWidth: 1.5 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  raceImg: { width: 54, height: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  classDot: { width: 54, height: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  subclassDot: { width: 54, height: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
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
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  statCell: {
    width: "31%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    gap: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCellPrimary: { borderColor: colors.warning, backgroundColor: colors.surfaceAlt },
  statVal: { fontFamily: font.display, fontSize: 20, color: colors.accent },
  floatingNext: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
