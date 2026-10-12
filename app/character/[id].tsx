import { useState, useEffect, useRef, useCallback } from "react";
import { ActivityIndicator, LayoutChangeEvent, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { HpBar } from "@/components/HpBar";
import { useDice } from "@/components/dice/DiceProvider";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { useRollMode } from "@/store/rollMode";
import { RollModeSelector } from "@/components/RollModeSelector";
import { HeroTour, HeroTourStep } from "@/components/HeroTour";
import { hasSeenHeroTour, markHeroTourSeen } from "@/lib/onboarding";
import {
  useCharacter,
  useLevelUp,
  useSetHp,
  useUpdateCharacter,
  useDeleteCharacter,
  useTrackerJoin,
  useTracker,
  useTrackerPatch,
  useTrackerRemove,
  useChooseSubclass,
  useFullRest,
  useShortRest,
  Character,
  Clazz,
  Participant,
  Race,
  Spell,
} from "@/api/hooks";
import { ABILITY_ORDER, ABILITY_FULL, ABILITY_DESCRIPTIONS, CONCENTRATION_INFO, abilityMod, classHighlightsAbility, formatMod, spellLevelLabel } from "@/lib/format";
import {
  featuresUpTo, resourcesCount, computeAc, spellSaveDC, spellAttackBonus, initiative, maxUnlockedSpellLevel, saveModifier,
  spellSlotsAt, setSpellSlotUsed, preparedSpellIds, needsToPrepare,
} from "@/lib/sheet";
import { ClassIcon } from "@/components/ClassIcon";
import { RaceImage } from "@/components/RaceImage";
import { parseDice, rollNotation, doubleForCrit } from "@/lib/dice";
import { CONDITION_OPTIONS, conditionLabel } from "@/lib/conditions";
import { Section } from "@/components/sheet/Section";
import { NumberEditorModal, TextEditorModal, ArmorModal, SubclassModal, RestModal, BackgroundModal, BackgroundSpellsModal, FightingStyleModal } from "@/components/sheet/editors";
import {
  InventorySection,
  WeaponSection,
  SkillsSection,
  FeatureList,
  ResourcesSection,
  SpellSlotsSection,
  NotesSection,
  BackgroundSection,
} from "@/components/sheet/sections";
import { useAuth } from "@/store/auth";
import { colors, font, radius, shadow } from "@/theme";

export default function CharacterSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: character, isLoading, isError, refetch } = useCharacter(id);
  const { data: tracker } = useTracker();
  const user = useAuth((s) => s.user);
  const { roll } = useDice();
  const consumeMode = useRollMode((s) => s.consumeMode);
  const cls = character?.classId as Clazz | undefined;
  const race = character?.raceId as Race | undefined;

  const setHp = useSetHp(id);
  const updateChar = useUpdateCharacter(id);
  const fullRest = useFullRest(id);
  const shortRest = useShortRest(id);
  const [restMode, setRestMode] = useState<"full" | "short" | null>(null);
  const join = useTrackerJoin();
  const removeParticipant = useTrackerRemove();
  const chooseSubclass = useChooseSubclass(id);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [subclassOpen, setSubclassOpen] = useState(false);
  const [fightingStyleOpen, setFightingStyleOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [backgroundSpellsOpen, setBackgroundSpellsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [hpEditOpen, setHpEditOpen] = useState(false);
  const [tempHpEditOpen, setTempHpEditOpen] = useState(false);
  const [armorOpen, setArmorOpen] = useState(false);
  const [initEditOpen, setInitEditOpen] = useState(false);
  const [speedEditOpen, setSpeedEditOpen] = useState(false);
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [abilityEdit, setAbilityEdit] = useState<keyof typeof ABILITY_FULL | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  const [tab, setTab] = useState<"main" | "bag" | "combat" | "notes" | "tracker" | "dice">("main");
  const [tourVisible, setTourVisible] = useState(false);
  const sheetScrollRef = useRef<ScrollView | null>(null);
  const tabsY = useRef(0);

  // Tour de la ficha la primera vez, solo para jugadores (el DM ya conoce la app).
  useEffect(() => {
    const isDMuser = user?.role === "dm" || user?.role === "admin";
    if (!user || isDMuser) return;
    hasSeenHeroTour(user.username).then((seen) => {
      if (!seen) setTourVisible(true);
    });
  }, [user]);

  // En cada paso del tour, movemos la pestaña y scrolleamos para que se vea lo que se explica.
  // useCallback estable: si no, el polling del tracker recrearía la función y re-scrollearía solo.
  const onTourFocus = useCallback((step: HeroTourStep) => {
    if (step.tab) setTab(step.tab);
    requestAnimationFrame(() => {
      const y = step.focus === "top" ? 0 : Math.max(0, tabsY.current - 12);
      sheetScrollRef.current?.scrollTo({ y, animated: true });
    });
  }, []);

  const finishTour = () => {
    setTourVisible(false);
    requestAnimationFrame(() => sheetScrollRef.current?.scrollTo({ y: 0, animated: true }));
    if (user?.username) markHeroTourSeen(user.username);
  };

  if (isError) {
    return (
      <Screen scroll={false}>
        <Card style={{ marginTop: 80, marginHorizontal: 20 }}>
          <Text variant="subtitle">No se pudo cargar el personaje</Text>
          <Text variant="body" style={{ marginTop: 6 }}>
            Revisá tu conexión y probá de nuevo.
          </Text>
          <Button label="Reintentar" icon="refresh" onPress={() => refetch()} style={{ marginTop: 12 }} />
        </Card>
      </Screen>
    );
  }

  if (isLoading || !character) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  const accent = cls?.color || colors.secondary;
  const ac = computeAc(character);
  const init = initiative(character);
  const saveDC = cls ? spellSaveDC(character, cls) : null;
  const spellAtk = cls ? spellAttackBonus(character, cls) : null;
  const maxSpellLvl = cls ? maxUnlockedSpellLevel(cls, character.level) : -1;
  // Hechizos conocidos y desbloqueados a este nivel (los de nivel más alto no se ven aún).
  const visibleSpells = (character.knownSpells || [])
    .filter((s): s is Spell => !!s && typeof s === "object" && "level" in s)
    .filter((s) => s.level <= maxSpellLvl)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const allClassFeatures = cls ? featuresUpTo(cls, character.level) : [];
  const raceTraitItems = race?.traits || [];
  const classFeatureItems = allClassFeatures;
  const advancedInfoCount = raceTraitItems.length + classFeatureItems.length;
  const participants = tracker?.participants || [];
  const trackerParticipant = participants.find((p) => p.characterId === character._id);
  const inCombat = !!trackerParticipant;
  const isMyTurn =
    !!trackerParticipant && tracker?.activeIndex != null && participants[tracker.activeIndex]?._id === trackerParticipant._id;
  const isDM = user?.role === "dm" || user?.role === "admin";
  const canLevelUp = isDM || !!tracker?.levelUpEnabled;
  const needsSubclass = !!cls && character.level >= (cls.subclassLevel || 3) && !character.subclassIndex;
  const needsFightingStyle = cls?.index === "fighter" && !character.fightingStyle;
  const subclassBonusSpells = (character.subclassBonusSpells || [])
    .filter((s): s is Spell => !!s && typeof s === "object" && "level" in s)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const background = character.background || null;
  // Qué tiene listo para lanzar hoy. Si nunca eligió, `preparedSpellIds` devuelve todo lo conocido.
  const preparedIds = preparedSpellIds(cls, character);
  const mustPrepare = needsToPrepare(cls, character);
  const backgroundSpellOptions = character.backgroundSpellOptions || [];
  const backgroundBonusSpells = (character.backgroundBonusSpells || [])
    .filter((s): s is Spell => !!s && typeof s === "object" && "level" in s)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const concentratingSpell = character.concentratingSpell
    ? [...visibleSpells, ...subclassBonusSpells, ...backgroundBonusSpells].find((s) => s.index === character.concentratingSpell)
    : null;
  const concentratingName = concentratingSpell?.name || character.concentratingSpell;

  const pickCharacterImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType || "image/jpeg";
      updateChar.mutate({ imageBase64: `data:${mime};base64,${result.assets[0].base64}` });
    }
  };

  const changeHp = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (delta < 0) {
      const damage = Math.abs(delta);
      const tempAbsorb = Math.min(character.tempHp || 0, damage);
      const nextTempHp = Math.max(0, (character.tempHp || 0) - tempAbsorb);
      const remainingDamage = damage - tempAbsorb;
      const nextCurrentHp = Math.max(0, character.currentHp - remainingDamage);
      updateChar.mutate({ currentHp: nextCurrentHp, tempHp: nextTempHp });
      return;
    }
    setHp.mutate(Math.max(0, Math.min(character.maxHp, character.currentHp + delta)));
  };

  const onJoin = () => {
    // Iniciativa real: d20 + mod de Destreza (init ya incluye Destreza + bono); entramos con ese total.
    roll(`1d20${formatMod(init)}`, `Iniciativa (d20 ${formatMod(init)} de Destreza)`, {
      onResolved: (res) => {
        join.mutate({ characterId: character._id, initiative: res.total });
        setJoined(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    });
  };

  return (
    <Screen scrollViewRef={sheetScrollRef}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.topBar}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.text}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        />
        <Ionicons
          name="trash-outline"
          size={22}
          color={colors.textFaint}
          onPress={() => setDeleteOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Borrar personaje"
        />
      </View>

      <View style={{ alignItems: "center", marginTop: 8 }}>
        <Pressable onPress={pickCharacterImage}>
          <RaceImage
            uri={character.imageBase64 || race?.imageBase64 || race?.image}
            style={styles.crest}
            fallback={
              <LinearGradient colors={[accent, colors.primary]} style={styles.crest}>
                <ClassIcon index={cls?.index} size={38} color={colors.text} />
              </LinearGradient>
            }
          />
          <View style={styles.photoEditBadge}>
            <Ionicons name="camera" size={13} color={colors.text} />
          </View>
        </Pressable>
        <View style={styles.classBadge}>
          <LinearGradient colors={[accent, colors.primary]} style={styles.classBadgeInner}>
            <ClassIcon index={cls?.index} size={15} color={colors.text} />
          </LinearGradient>
        </View>
        <Pressable
          onPress={() => setNameEditOpen(true)}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`Editar nombre, actual ${character.name}`}
        >
          <Text variant="display" center>{character.name}</Text>
          <Ionicons name="pencil" size={14} color={colors.textFaint} />
        </Pressable>
        <Text variant="caption" center>
          {race?.name} · {cls?.name} · Nivel {character.level}
        </Text>
        {!!character.subclassName && (
          <Text variant="caption" center color={colors.accent}>
            Especialidad: {character.subclassName}
          </Text>
        )}
        {!!character.fightingStyleName && (
          <Pressable onPress={() => setFightingStyleOpen(true)} hitSlop={6}>
            <Text variant="caption" center color={colors.accent}>
              Estilo de combate: {character.fightingStyleName}
            </Text>
          </Pressable>
        )}
      </View>

      {/* HP */}
      <Card style={{ marginTop: 20 }} accent={colors.hp}>
        <View style={styles.hpHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="heart" size={16} color={colors.hp} />
            <Text variant="label" color={colors.text}>
              PUNTOS DE VIDA
            </Text>
          </View>
          <Pressable onPress={() => setHpEditOpen(true)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.hpNumbers}>
              {character.currentHp}
              {(character.tempHp || 0) > 0 && <Text style={styles.tempHpNumber}> + {character.tempHp}</Text>}
              <Text style={{ color: colors.textFaint }}> / {character.maxHp}</Text>
            </Text>
            <Ionicons name="pencil" size={13} color={colors.textFaint} />
          </Pressable>
        </View>
        <View style={{ marginTop: 12 }}>
          <HpBar current={character.currentHp} max={character.maxHp} temp={character.tempHp || 0} height={18} />
        </View>
        <View style={styles.hpButtons}>
          <HpButton label="-5" onPress={() => changeHp(-5)} />
          <HpButton label="-1" onPress={() => changeHp(-1)} />
          <HpButton label="+1" onPress={() => changeHp(1)} light />
          <HpButton label="+5" onPress={() => changeHp(5)} light />
        </View>
        <View style={styles.hpUtilityRow}>
          <TempHpButton value={character.tempHp || 0} onPress={() => setTempHpEditOpen(true)} />
          <FullHpButton onPress={() => updateChar.mutate({ currentHp: character.maxHp })} />
        </View>
        {character.currentHp === 0 && (
          <DeathSaveTracker
            character={character}
            update={updateChar.mutate}
            onInfo={() =>
              setInfoModal({
                title: "Salvación de muerte",
                body: "Estás a 0 de vida e inconsciente. Al empezar tu turno tirás 1d20: 10 o más es éxito, menos de 10 es fallo. Sacar 20 natural te levanta con 1 de vida. Sacar 1 natural cuenta como 2 fallos. 3 éxitos te estabilizan, 3 fallos y tu personaje muere. Curarte en cualquier momento borra los éxitos y fallos acumulados.",
              })
            }
          />
        )}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Descanso corto" icon="cafe" variant="secondary" small onPress={() => setRestMode("short")} tintColor={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Descanso largo" icon="moon" variant="secondary" small onPress={() => setRestMode("full")} tintColor={accent} />
          </View>
        </View>
      </Card>

      {/* Level up + Add to combat */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Subir de nivel"
            icon="trending-up"
            onPress={() => setLevelUpOpen(true)}
            disabled={!canLevelUp}
            tintColor={accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={inCombat ? "En combate" : "Combatir"}
            icon={inCombat ? "checkmark-circle" : "flash"}
            variant="secondary"
            onPress={onJoin}
            loading={join.isPending}
            disabled={inCombat}
            tintColor={accent}
          />
        </View>
      </View>
      {!isDM && !canLevelUp && (
        <Text variant="caption" center style={{ marginTop: 8 }}>
          El DM todavía no habilitó la subida de nivel. Podés activarlo desde tu perfil.
        </Text>
      )}

      <View onLayout={(e: LayoutChangeEvent) => { tabsY.current = e.nativeEvent.layout.y; }}>
        <HeroTabs active={tab} onChange={setTab} />
      </View>

      {tab === "main" && (
        <>
          {needsSubclass && (
            <Pressable onPress={() => setSubclassOpen(true)} style={styles.subclassBanner}>
              <Ionicons name="sparkles" size={16} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" style={{ fontSize: 15 }}>Elegí tu especialidad</Text>
                <Text variant="caption">Tu clase ya llegó al nivel para elegir su camino.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          )}
          {needsFightingStyle && (
            <Pressable onPress={() => setFightingStyleOpen(true)} style={styles.subclassBanner}>
              <Ionicons name="shield" size={16} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text variant="subtitle" style={{ fontSize: 15 }}>Elegí tu estilo de combate</Text>
                <Text variant="caption">Ganá un bono permanente según cómo peleás.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          )}
          <View style={styles.quickRow}>
            <QuickStat icon="shield" label="CA" value={ac} onPress={() => setArmorOpen(true)} onInfo={() => setInfoModal({ title: "Clase de Armadura", body: "La CA es el número que el enemigo tiene que igualar o superar para pegarte." })} />
            <QuickStat icon="flash" label="Iniciativa" value={formatMod(init)} onPress={() => setInitEditOpen(true)} onInfo={() => setInfoModal({ title: "Iniciativa", body: "Se tira al empezar combate para decidir el orden de turnos." })} />
            <QuickStat icon="walk" label="Velocidad" value={`${character.speed}`} onPress={() => setSpeedEditOpen(true)} onInfo={() => setInfoModal({ title: "Velocidad", body: "Cuántos pies puede moverse tu personaje en su turno." })} />
            {saveDC != null ? (
              <QuickStat icon="color-wand" label="CD Salv." value={saveDC} onInfo={() => setInfoModal({ title: "CD de salvación", body: "Es la dificultad que deben superar los enemigos cuando tus hechizos piden una salvación." })} />
            ) : (
              <QuickStat icon="ribbon" label="Competencia" value={formatMod(character.proficiencyBonus)} onInfo={() => setInfoModal({ title: "Competencia", body: "Bonus que sumás en cosas que tu personaje sabe hacer bien." })} />
            )}
          </View>

          <RollModeSelector />

          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 22, marginBottom: 10 }}
            onPress={() =>
              setInfoModal({
                title: "Habilidades",
                body: "El borde dorado marca las 2 salvaciones en las que tu clase es competente (suman tu bono de competencia). \"Salv +N\" es tu tirada de salvación con esa característica: tocala para tirar 1d20+N.",
              })
            }
          >
            <Text variant="label">HABILIDADES</Text>
            <Ionicons name="information-circle-outline" size={13} color={colors.textFaint} />
          </Pressable>
          <View style={styles.abilityGrid}>
            {ABILITY_ORDER.map((key, i) => {
              const score = character.abilityScores[key];
              const highlighted = classHighlightsAbility(cls, key);
              return (
                <MotiView key={key} from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 14, delay: i * 45 }} style={{ width: "31%" }}>
                  <Pressable
                    onPress={() => setInfoModal({ title: ABILITY_FULL[key], body: ABILITY_DESCRIPTIONS[key] })}
                    onLongPress={() => setAbilityEdit(key)}
                    style={[styles.ability, highlighted && styles.abilityPrimary]}
                    accessibilityRole="button"
                    accessibilityLabel={`${ABILITY_FULL[key]}, ${score}, modificador ${formatMod(abilityMod(score))}`}
                    accessibilityHint="Mantené presionado para editar el puntaje"
                  >
                    <Text variant="caption">{ABILITY_FULL[key]}</Text>
                    <Text style={styles.abilityMod}>{formatMod(abilityMod(score))}</Text>
                    <Text variant="caption" color={colors.textFaint}>{score}</Text>
                    {cls && (
                      <Pressable
                        hitSlop={6}
                        onPress={() =>
                          roll(`1d20${formatMod(saveModifier(key, character, cls))}`, `Salvación de ${ABILITY_FULL[key]}`, {
                            kind: "save",
                            mode: consumeMode(),
                          })
                        }
                        style={styles.saveTap}
                        accessibilityRole="button"
                        accessibilityLabel={`Tirar salvación de ${ABILITY_FULL[key]}, modificador ${formatMod(saveModifier(key, character, cls))}`}
                      >
                        <Ionicons name="dice-outline" size={11} color={cls.savingThrows?.includes(key) ? colors.accent : colors.textDim} />
                        <Text variant="caption" color={cls.savingThrows?.includes(key) ? colors.accent : colors.textDim}>
                          Salv {formatMod(saveModifier(key, character, cls))}
                        </Text>
                      </Pressable>
                    )}
                  </Pressable>
                </MotiView>
              );
            })}
          </View>

          <Section title="Competencias" icon="ribbon">
            <SkillsSection character={character} cls={cls!} update={updateChar.mutate} />
          </Section>

          {advancedInfoCount > 0 && (
            <Section title="Información adicional" icon="information-circle" badge={`${advancedInfoCount}`}>
              {raceTraitItems.length > 0 && <View style={{ gap: 8, marginBottom: classFeatureItems.length > 0 ? 14 : 0 }}><Text variant="label">RASGOS DE RAZA</Text><FeatureList items={raceTraitItems} /></View>}
              {classFeatureItems.length > 0 && <View style={{ gap: 8 }}><Text variant="label">HABILIDADES DE CLASE</Text><FeatureList items={classFeatureItems} /></View>}
            </Section>
          )}

          <Section title="Trasfondo" icon="book" badge={background ? undefined : "!"}>
            <BackgroundSection
              background={background}
              hasSpellChoices={backgroundSpellOptions.length > 0}
              chosenSpellCount={(character.backgroundSpells || []).length}
              onChange={() => setBackgroundOpen(true)}
              onChooseSpells={() => setBackgroundSpellsOpen(true)}
            />
          </Section>
        </>
      )}

      {tab === "bag" && <Section title="Mochila" icon="bag" defaultOpen><InventorySection character={character} update={updateChar.mutate} /></Section>}

      {tab === "combat" && cls && (
        <>
          <View style={{ marginTop: 18 }}>
            <Text variant="label" style={{ marginBottom: 8 }}>ARMA</Text>
            <WeaponSection character={character} cls={cls} race={race} update={updateChar.mutate} />
          </View>
          {resourcesCount(cls, character.level) > 0 && <Section title="Recursos" icon="battery-charging" defaultOpen><ResourcesSection character={character} cls={cls} update={updateChar.mutate} /></Section>}
          {cls.spellcasting && <Section title="Espacios de hechizos" icon="flame"><SpellSlotsSection character={character} cls={cls} update={updateChar.mutate} /></Section>}
          {cls.spellcasting && (
            <>
              {!!character.concentratingSpell && (
                <View style={styles.concentrationBanner}>
                  <Ionicons name="eye" size={16} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text variant="subtitle" style={{ fontSize: 14 }}>Concentrándote en {concentratingName}</Text>
                    <Text variant="caption">Solo podés concentrarte en un hechizo a la vez.</Text>
                  </View>
                  <Button label="Soltar" icon="close" small variant="secondary" onPress={() => updateChar.mutate({ concentratingSpell: "" })} />
                </View>
              )}
              <Pressable onPress={() => router.push(`/spells/${id}`)} style={styles.manageSpellsButton}>
                <Ionicons name="sparkles" size={18} color={colors.text} />
                <Text style={styles.manageSpellsText}>Gestionar hechizos</Text>
              </Pressable>
              <Text variant="caption" style={{ marginBottom: 10 }}>Para pegar con un hechizo tirá d20{spellAtk != null ? ` ${formatMod(spellAtk)}` : ""}.</Text>
              {mustPrepare && (
                <Pressable onPress={() => router.push(`/spells/${id}`)} style={styles.concentrationBanner}>
                  <Ionicons name="star-outline" size={16} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text variant="subtitle" style={{ fontSize: 14 }}>Todavía no elegiste qué preparar</Text>
                    <Text variant="caption">Tu clase prepara hechizos cada día. Por ahora te mostramos todos los que conocés.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Pressable>
              )}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                const spells = visibleSpells.filter((s) => s.level === lvl);
                if (!spells.length) return null;
                return <View key={lvl}><Text variant="label" style={{ marginTop: 14, marginBottom: 8 }}>{spellLevelLabel(lvl).toUpperCase()}</Text>{spells.map((s, i) => <SpellRow key={s._id} spell={s} delay={i * 25} character={character} cls={cls} update={updateChar.mutate} prepared={preparedIds.has(s._id)} onConcentrationInfo={() => setInfoModal(CONCENTRATION_INFO)} />)}</View>;
              })}
              {backgroundBonusSpells.length > 0 && (
                <View>
                  <Text variant="label" style={{ marginTop: 18, marginBottom: 8 }}>
                    CONJUROS DE TU TRASFONDO
                  </Text>
                  <Text variant="caption" style={{ marginBottom: 10 }}>Siempre preparados. No cuentan contra tus límites.</Text>
                  {backgroundBonusSpells.map((s, i) => (
                    <SpellRow
                      key={s._id}
                      spell={s}
                      delay={i * 25}
                      character={character}
                      cls={cls}
                      update={updateChar.mutate}
                      onConcentrationInfo={() => setInfoModal(CONCENTRATION_INFO)}
                    />
                  ))}
                </View>
              )}
              {subclassBonusSpells.length > 0 && (
                <View>
                  <Text variant="label" style={{ marginTop: 18, marginBottom: 8 }}>
                    CONJUROS DE TU ESPECIALIDAD
                  </Text>
                  <Text variant="caption" style={{ marginBottom: 10 }}>Siempre preparados. No cuentan contra tus límites.</Text>
                  {subclassBonusSpells.map((s, i) => (
                    <SpellRow
                      key={s._id}
                      spell={s}
                      delay={i * 25}
                      character={character}
                      cls={cls}
                      update={updateChar.mutate}
                      onConcentrationInfo={() => setInfoModal(CONCENTRATION_INFO)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}

      {tab === "notes" && <NotesSection character={character} update={updateChar.mutate} />}

      {tab === "dice" && (
        <>
          <Text variant="caption" style={{ marginBottom: 4 }}>
            Tirador libre. Para tiradas con tu modificador (habilidades, salvaciones, ataques), usá las secciones
            correspondientes en Main y Combate.
          </Text>
          <DiceRoller />
        </>
      )}

      {tab === "tracker" && (
        <Section title="Tracker" icon="list" defaultOpen>
          <Text variant="caption" style={{ marginBottom: 10 }}>Combate actual. El DM controla los turnos.</Text>
          {isMyTurn && (
            <View style={styles.myTurnBanner}>
              <Ionicons name="flash" size={18} color={colors.bg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.myTurnTitle}>¡Es tu turno, {character.name}!</Text>
                <Text style={styles.myTurnBody}>Movés, hacés una acción (atacar o lanzar) y quizá una acción adicional.</Text>
              </View>
            </View>
          )}
          {trackerParticipant && (
            <Button
              label="Salir del combate"
              icon="exit-outline"
              variant="secondary"
              small
              loading={removeParticipant.isPending}
              onPress={() => removeParticipant.mutate(trackerParticipant._id)}
              style={{ marginBottom: 10 }}
            />
          )}
          {participants.length === 0 ? (
            <Text variant="body">No hay nadie en combate todavía.</Text>
          ) : (
            participants.map((p, index) => (
              <HeroTrackerRow
                key={p._id}
                participant={p}
                active={index === tracker?.activeIndex}
                delay={index * 35}
              />
            ))
          )}
        </Section>
      )}

      <InfoModal info={infoModal} onClose={() => setInfoModal(null)} />

      <HeroTour visible={tourVisible} onFocus={onTourFocus} onDone={finishTour} />

      <LevelUpModal
        visible={levelUpOpen}
        onClose={() => setLevelUpOpen(false)}
        hitDie={character.hitDie}
        characterId={id}
        onNeedsSubclass={() => setSubclassOpen(true)}
        subclassLevel={cls?.subclassLevel || 3}
        hasSubclass={!!character.subclassIndex}
      />
      <DeleteModal id={id} open={deleteOpen} onClose={() => setDeleteOpen(false)} />

      {/* Editores */}
      <NumberEditorModal
        visible={hpEditOpen}
        title="Vida máxima"
        subtitle="Poné el total de HP de tu personaje."
        value={character.maxHp}
        min={1}
        max={999}
        onClose={() => setHpEditOpen(false)}
        onSave={(v) => updateChar.mutate({ maxHp: v })}
      />
      <NumberEditorModal
        visible={tempHpEditOpen}
        title="Vida temporal"
        subtitle="Se consume antes que tu vida normal cuando recibís daño."
        value={character.tempHp || 0}
        min={0}
        max={999}
        onClose={() => setTempHpEditOpen(false)}
        onSave={(v) => updateChar.mutate({ tempHp: v })}
      />
      <NumberEditorModal
        visible={initEditOpen}
        title="Bonus de iniciativa"
        subtitle={`Tu iniciativa es ${formatMod(abilityMod(character.abilityScores.dex))} de Destreza + este bonus.`}
        value={character.initiativeBonus || 0}
        min={-5}
        max={20}
        onClose={() => setInitEditOpen(false)}
        onSave={(v) => updateChar.mutate({ initiativeBonus: v })}
      />
      <NumberEditorModal
        visible={speedEditOpen}
        title="Velocidad"
        subtitle="Cuántos pies se mueve tu personaje en su turno (normalmente 30)."
        value={character.speed}
        min={0}
        max={120}
        onClose={() => setSpeedEditOpen(false)}
        onSave={(v) => updateChar.mutate({ speed: v })}
      />
      <TextEditorModal
        visible={nameEditOpen}
        title="Nombre del personaje"
        subtitle="Cómo se llama tu héroe."
        value={character.name}
        placeholder="Nombre"
        onClose={() => setNameEditOpen(false)}
        onSave={(v) => updateChar.mutate({ name: v })}
      />
      <NumberEditorModal
        visible={abilityEdit !== null}
        title={abilityEdit ? ABILITY_FULL[abilityEdit] : ""}
        subtitle="Valor de la característica (1 a 30)."
        value={abilityEdit ? character.abilityScores[abilityEdit] : 10}
        min={1}
        max={30}
        onClose={() => setAbilityEdit(null)}
        onSave={(v) =>
          abilityEdit && updateChar.mutate({ abilityScores: { ...character.abilityScores, [abilityEdit]: v } })
        }
      />
      <RestModal
        visible={restMode !== null}
        mode={restMode}
        maxHp={character.maxHp}
        hitDie={character.hitDie}
        level={character.level}
        hitDiceUsed={character.hitDiceUsed || 0}
        conScore={character.abilityScores.con}
        onClose={() => setRestMode(null)}
        onFullRest={async () => { await fullRest.mutateAsync(); setRestMode(null); }}
        onShortRest={async (rolls) => { await shortRest.mutateAsync(rolls); setRestMode(null); }}
        fullRestLoading={fullRest.isPending}
        shortRestLoading={shortRest.isPending}
      />
      <ArmorModal
        visible={armorOpen}
        armor={character.armor}
        shield={character.shield}
        acBonus={character.acBonus}
        onClose={() => setArmorOpen(false)}
        onSave={(patch) => updateChar.mutate(patch)}
      />
      <BackgroundModal
        visible={backgroundOpen}
        selected={character.backgroundIndex}
        onClose={() => setBackgroundOpen(false)}
        loading={updateChar.isPending}
        onSave={async (backgroundIndex) => {
          await updateChar.mutateAsync({ backgroundIndex } as any);
          setBackgroundOpen(false);
        }}
      />
      {!!backgroundSpellOptions.length && (
        <BackgroundSpellsModal
          visible={backgroundSpellsOpen}
          options={backgroundSpellOptions}
          selected={(character.backgroundSpells || []).map((s) => s._id)}
          onClose={() => setBackgroundSpellsOpen(false)}
          loading={updateChar.isPending}
          onSave={async (spellIds) => {
            await updateChar.mutateAsync({ backgroundSpells: spellIds } as any);
            setBackgroundSpellsOpen(false);
          }}
        />
      )}
      <SubclassModal
        visible={subclassOpen}
        classIndex={cls?.index}
        subclassLevel={cls?.subclassLevel || 3}
        currentLevel={character.level}
        selected={character.subclassIndex}
        onClose={() => setSubclassOpen(false)}
        loading={chooseSubclass.isPending}
        onSave={async (subclassIndex) => {
          await chooseSubclass.mutateAsync(subclassIndex);
          setSubclassOpen(false);
        }}
      />
      <FightingStyleModal
        visible={fightingStyleOpen}
        selected={character.fightingStyle}
        onClose={() => setFightingStyleOpen(false)}
        loading={updateChar.isPending}
        onSave={async (fightingStyle) => {
          await updateChar.mutateAsync({ fightingStyle } as any);
          setFightingStyleOpen(false);
        }}
      />
    </Screen>
  );
}

function DeleteModal({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const del = useDeleteCharacter();

  const onDelete = async () => {
    await del.mutateAsync(id);
    onClose();
    router.replace("/(tabs)");
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Card style={{ width: "100%", maxWidth: 340 }}>
          <Text variant="title">¿Borrar personaje?</Text>
          <Text variant="body" style={{ marginTop: 8 }}>
            Esta acción no se puede deshacer.
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancelar" variant="ghost" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Borrar" icon="trash" onPress={onDelete} loading={del.isPending} />
            </View>
          </View>
        </Card>
      </Pressable>
    </Modal>
  );
}

function HpButton({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  const amount = label.replace(/[+-]/, "");
  const a11yLabel = label.startsWith("-") ? `Restar ${amount} de vida` : `Sumar ${amount} de vida`;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.hpBtn, light ? styles.hpBtnLight : styles.hpBtnDark]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <Text style={{ fontFamily: font.bodyBold, color: colors.text, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

function TempHpButton({ value, onPress }: { value: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tempHpBtn}>
      <Text style={styles.tempHpLabel}>TEMP</Text>
      <Text style={styles.tempHpValue}>+{value}</Text>
    </Pressable>
  );
}

function FullHpButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.fullHpBtn}>
      <Ionicons name="heart" size={15} color={colors.text} />
      <Text style={styles.fullHpText}>Full vida</Text>
    </Pressable>
  );
}

/** Se muestra cuando currentHp llega a 0: tracker de 3 éxitos/3 fallos de salvación de muerte. */
function DeathSaveTracker({
  character,
  update,
  onInfo,
}: {
  character: Character;
  update: (patch: Partial<Character>) => void;
  onInfo: () => void;
}) {
  const { roll } = useDice();
  const saves = character.deathSaves || { successes: 0, failures: 0 };
  const stable = saves.successes >= 3;
  const dead = saves.failures >= 3;

  const addSuccess = () =>
    update({ deathSaves: { successes: Math.min(3, saves.successes + 1), failures: saves.failures } });
  const addFailure = () =>
    update({ deathSaves: { successes: saves.successes, failures: Math.min(3, saves.failures + 1) } });

  const rollSave = () => {
    roll("1d20", "Salvación de muerte", {
      kind: "save",
      onResolved: (res) => {
        if (res.nat20) {
          update({ currentHp: 1, deathSaves: { successes: 0, failures: 0 } });
          return;
        }
        if (res.nat1) {
          update({ deathSaves: { successes: saves.successes, failures: Math.min(3, saves.failures + 2) } });
          return;
        }
        if (res.total >= 10) addSuccess();
        else addFailure();
      },
    });
  };

  return (
    <View style={styles.deathSaveBox}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name="skull" size={16} color={colors.danger} />
        <Text variant="label" color={colors.text}>SALVACIÓN DE MUERTE</Text>
        <Pressable onPress={onInfo} hitSlop={8}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textFaint} />
        </Pressable>
      </View>
      {dead ? (
        <Text variant="body" color={colors.danger} style={{ marginTop: 8 }}>
          Tu personaje murió. Hablalo con el DM.
        </Text>
      ) : stable ? (
        <Text variant="body" color={colors.success} style={{ marginTop: 8 }}>
          Estabilizado: seguís inconsciente en 0, pero ya no hace falta tirar más.
        </Text>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 24, marginTop: 10 }}>
            <View>
              <Text variant="caption" color={colors.success}>Éxitos</Text>
              <DeathSaveDots count={saves.successes} color={colors.success} />
            </View>
            <View>
              <Text variant="caption" color={colors.danger}>Fallos</Text>
              <DeathSaveDots count={saves.failures} color={colors.danger} />
            </View>
          </View>
          <Button
            label="Tirar salvación de muerte"
            icon="dice"
            small
            variant="secondary"
            onPress={rollSave}
            style={{ marginTop: 10 }}
          />
          <Text variant="caption" style={{ marginTop: 10 }}>
            ¿Tiraste en la mesa? Cargá el resultado a mano:
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Button label="Éxito" icon="checkmark" small variant="secondary" tintColor={colors.success} onPress={addSuccess} style={{ flex: 1 }} />
            <Button label="Fallo" icon="close" small variant="secondary" tintColor={colors.danger} onPress={addFailure} style={{ flex: 1 }} />
          </View>
        </>
      )}
    </View>
  );
}

function DeathSaveDots({ count, color }: { count: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.deathDot, { borderColor: color, backgroundColor: i < count ? color : "transparent" }]} />
      ))}
    </View>
  );
}

function QuickStat({
  icon,
  label,
  value,
  onPress,
  onInfo,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  onPress?: () => void;
  onInfo?: () => void;
}) {
  const content = (
    <View style={styles.quickStat}>
      <Ionicons name={icon} size={16} color={colors.accent} />
      <Text style={styles.quickValue}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
  return (
    <Pressable onPress={onInfo || onPress} onLongPress={onPress} style={{ flex: 1 }}>
      {content}
    </Pressable>
  );
}

function HeroTabs({
  active,
  onChange,
}: {
  active: "main" | "bag" | "combat" | "notes" | "tracker" | "dice";
  onChange: (tab: "main" | "bag" | "combat" | "notes" | "tracker" | "dice") => void;
}) {
  const tabs = [
    { key: "main", icon: "person", label: "Main" },
    { key: "bag", icon: "bag", label: "Mochila" },
    { key: "combat", icon: "flash", label: "Combate" },
    { key: "notes", icon: "journal", label: "Notas" },
    { key: "tracker", icon: "list", label: "Tracker" },
    { key: "dice", icon: "dice", label: "Dados" },
  ] as const;
  return (
    <View style={styles.heroTabs}>
      {tabs.map((t) => (
        <Pressable key={t.key} onPress={() => onChange(t.key)} style={[styles.heroTab, active === t.key && styles.heroTabActive]}>
          <Ionicons name={t.icon} size={16} color={active === t.key ? colors.text : colors.textFaint} />
          <Text style={[styles.heroTabText, active === t.key && { color: colors.text }]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function HeroTrackerRow({
  participant,
  active,
  delay,
}: {
  participant: Participant;
  active: boolean;
  delay: number;
}) {
  const user = useAuth((s) => s.user);
  const patch = useTrackerPatch();
  const [initEditOpen, setInitEditOpen] = useState(false);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const isMonster = participant.type === "monster";
  const accent = participant.color || (isMonster ? colors.secondary : colors.accent);
  const canSeeHp = participant.hp !== undefined && participant.maxHp !== undefined;
  const canEdit = user?.role === "dm" || user?.role === "admin" || participant.ownerUserId === user?.id;

  return (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0, scale: active ? 1 : 0.99 }}
      transition={{ type: "timing", duration: 280, delay }}
      style={[styles.trackerRow, active && { borderColor: accent, borderWidth: 1.5 }, shadow.card]}
    >
      {active && <LinearGradient colors={[accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />}
      <Pressable
        style={styles.trackerInitBox}
        disabled={!canEdit}
        onPress={() => setInitEditOpen(true)}
        hitSlop={8}
      >
        <Text style={[styles.trackerInitNum, active && { color: accent }]}>{participant.initiative}</Text>
        <Text variant="caption" color={colors.textFaint}>
          init
        </Text>
        {canEdit && <Ionicons name="pencil" size={9} color={colors.textFaint} style={{ marginTop: 2 }} />}
      </Pressable>

      <View style={{ flex: 1 }}>
        <View style={styles.trackerNameRow}>
          <Ionicons name={isMonster ? "skull" : "shield-half"} size={14} color={accent} />
          <Text variant="subtitle" style={{ fontSize: 15, flex: 1 }} numberOfLines={1}>
            {participant.name}
          </Text>
          {active && (
            <View style={[styles.trackerTurnPill, { backgroundColor: accent }]}>
              <Text style={styles.trackerTurnText}>TURNO</Text>
            </View>
          )}
        </View>

        {canSeeHp ? (
          <>
            <View style={{ marginTop: 6 }}>
              <HpBar current={participant.hp || 0} max={participant.maxHp || 1} temp={participant.tempHp || 0} height={10} />
            </View>
            <View style={styles.trackerHpMetaRow}>
              <Text variant="caption">
                {participant.hp}
                {(participant.tempHp || 0) > 0 ? ` + ${participant.tempHp}` : ""}/{participant.maxHp} PV · CA {participant.ac}
              </Text>
              {(participant.tempHp || 0) > 0 && (
                <View style={styles.trackerTempMiniChip}>
                  <Text style={styles.trackerTempMiniText}>Temp {participant.tempHp}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          null
        )}
        <TrackerConditionChips conditions={participant.conditions || []} />
      </View>

      {canEdit && (
        <Pressable onPress={() => setConditionsOpen(true)} hitSlop={8} style={styles.trackerConditionButton}>
          <Ionicons name="medical" size={15} color={colors.text} />
        </Pressable>
      )}

      <NumberEditorModal
        visible={initEditOpen}
        title="Iniciativa"
        subtitle={`Cambiar la iniciativa de ${participant.name}.`}
        value={participant.initiative}
        min={-5}
        max={40}
        onClose={() => setInitEditOpen(false)}
        onSave={(v) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          patch.mutate({ pid: participant._id, initiative: v });
        }}
      />
      <TrackerConditionsModal
        visible={conditionsOpen}
        name={participant.name}
        selected={participant.conditions || []}
        onClose={() => setConditionsOpen(false)}
        onChange={(conditions) => patch.mutate({ pid: participant._id, conditions })}
      />
    </MotiView>
  );
}

function TrackerConditionChips({ conditions }: { conditions: string[] }) {
  if (!conditions.length) return null;
  return (
    <View style={styles.trackerConditionRow}>
      {conditions.map((condition) => (
        <View key={condition} style={styles.trackerConditionChip}>
          <Text style={styles.trackerConditionChipText}>{conditionLabel(condition)}</Text>
        </View>
      ))}
    </View>
  );
}

function TrackerConditionsModal({
  visible,
  name,
  selected,
  onClose,
  onChange,
}: {
  visible: boolean;
  name: string;
  selected: string[];
  onClose: () => void;
  onChange: (conditions: string[]) => void;
}) {
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((condition) => condition !== id) : [...selected, id];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(next);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Card style={{ width: "100%", maxWidth: 360, maxHeight: "82%" }}>
          <Text variant="title">Estados</Text>
          <Text variant="caption" style={{ marginTop: 4, marginBottom: 12 }}>{name}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.trackerConditionGrid}>
              {CONDITION_OPTIONS.map((condition) => {
                const active = selected.includes(condition.id);
                return (
                  <Pressable
                    key={condition.id}
                    onPress={() => toggle(condition.id)}
                    style={[styles.trackerConditionOption, active && styles.trackerConditionOptionActive]}
                  >
                    <View style={styles.trackerConditionOptionTitle}>
                      <Ionicons name={active ? "checkbox" : "square-outline"} size={18} color={active ? colors.accent : colors.muted} />
                      <Text style={styles.trackerConditionOptionLabel}>{condition.label}</Text>
                    </View>
                    <Text variant="caption" color={colors.textDim}>{condition.short}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Button label="Listo" icon="checkmark" onPress={onClose} style={{ marginTop: 14 }} />
        </Card>
      </Pressable>
    </Modal>
  );
}

function InfoModal({ info, onClose }: { info: { title: string; body: string } | null; onClose: () => void }) {
  return (
    <Modal visible={!!info} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Card style={{ width: "100%", maxWidth: 340 }}>
          <Text variant="title">{info?.title}</Text>
          <Text variant="body" style={{ marginTop: 8 }}>{info?.body}</Text>
          <Button label="Entendido" icon="checkmark" onPress={onClose} style={{ marginTop: 16 }} />
        </Card>
      </Pressable>
    </Modal>
  );
}

function InfoChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.infoChip}>
      <Ionicons name={icon} size={12} color={colors.accent} />
      <Text variant="caption" color={colors.textDim}>
        {label}
      </Text>
    </View>
  );
}

function formatDiceNotation(terms: { count: number; sides: number }[], modifier: number) {
  const parts = terms
    .filter((term) => term.count !== 0)
    .map((term) => `${term.count < 0 ? "-" : ""}${Math.abs(term.count)}d${term.sides}`);
  if (modifier) parts.push(`${modifier > 0 ? "+" : "-"}${Math.abs(modifier)}`);
  return parts.join("+").replace(/\+-/g, "-");
}

function multiplyDiceNotation(notation: string, times: number) {
  const parsed = parseDice(notation);
  if (!parsed || times <= 0) return "";
  return formatDiceNotation(
    parsed.terms.map((term) => ({ ...term, count: term.count * times })),
    parsed.modifier * times
  );
}

function upcastStepCount(higherLevelText: string, levelsAbove: number) {
  if (/cada dos niveles/i.test(higherLevelText)) return Math.floor(levelsAbove / 2);
  return levelsAbove;
}

function extraDiceForUpcast(spell: Spell, slotLevel: number) {
  const levelsAbove = slotLevel - spell.level;
  if (levelsAbove <= 0) return "";
  const higherLevelText = (spell.higherLevel || []).join(" ");
  const steps = upcastStepCount(higherLevelText, levelsAbove);
  if (steps <= 0) return "";

  if (spell.index === "magic-missile" || /dardo adicional/i.test(higherLevelText)) {
    return multiplyDiceNotation("1d4+1", steps);
  }
  if (/rayo adicional/i.test(higherLevelText) && spell.dice) {
    return multiplyDiceNotation(spell.dice, steps);
  }

  const diceMatch = higherLevelText.match(/(?:aumenta|aumentan|sube|suben|incrementa|incrementan)\s+(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
  if (!diceMatch) return "";
  return multiplyDiceNotation(diceMatch[1], steps);
}

function castNotationFor(spell: Spell, slotLevel: number) {
  const base = spell.dice || "";
  const extra = extraDiceForUpcast(spell, slotLevel);
  if (base && extra) return `${base}+${extra}`;
  return base || extra;
}

function hasUpcastDamage(spell: Spell) {
  const higherLevelText = (spell.higherLevel || []).join(" ");
  return !!(
    higherLevelText.match(/(?:aumenta|aumentan|sube|suben|incrementa|incrementan)\s+\d+d\d+/i) ||
    /dardo adicional|rayo adicional/i.test(higherLevelText)
  );
}

function SpellRow({
  spell,
  delay,
  character,
  cls,
  update,
  prepared = true,
  onConcentrationInfo,
}: {
  spell: Spell;
  delay: number;
  character: Character;
  cls: Clazz;
  update: (patch: Partial<Character>) => void;
  /** `false` = lo conoce pero hoy no lo preparó. Los de subclase/trasfondo están siempre listos. */
  prepared?: boolean;
  onConcentrationInfo: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [castOpen, setCastOpen] = useState(false);
  const [lastAttackCrit, setLastAttackCrit] = useState(false);
  const [pendingDamageNotation, setPendingDamageNotation] = useState<string | null>(null);
  const { roll } = useDice();
  const consumeMode = useRollMode((s) => s.consumeMode);
  const text = spell.simpleDescription || spell.description?.[0] || "Sin descripción todavía.";
  const higherLevel = (spell.higherLevel || []).filter(Boolean);
  const slots = spellSlotsAt(cls, character);
  const availableSlots = spell.level > 0 ? slots.filter((slot) => slot.spellLevel >= spell.level && slot.used < slot.max) : [];
  const lowestAvailableSlot = availableSlots[0]?.spellLevel;
  const hasHigherAvailableSlot = availableSlots.some((slot) => slot.spellLevel > spell.level);
  const canImproveWithHigherSlot = spell.level > 0 && hasUpcastDamage(spell) && hasHigherAvailableSlot;
  const canCastWithSlot = spell.level === 0 || availableSlots.length > 0;
  const directCastNotation = spell.level > 0 && lowestAvailableSlot ? castNotationFor(spell, lowestAvailableSlot) : spell.dice;
  const mageArmorActive = character.armor === "mage-armor";
  // "melee"/"ranged" -> pide tirada de ataque de conjuro; "" -> impacta solo o pide salvación (ya cubierta por CD Salv.).
  const requiresAttackRoll = !!spell.attackType;
  const spellAtk = spellAttackBonus(character, cls);

  const rollDamage = (notation: string, label: string) => {
    if (requiresAttackRoll) {
      setPendingDamageNotation(notation);
      roll(`1d20${formatMod(spellAtk || 0)}`, `${spell.name} · Ataque`, {
        kind: "attack",
        mode: consumeMode(),
        onResolved: (res) => setLastAttackCrit(!!res.nat20),
      });
      return;
    }
    roll(notation, label);
  };
  // Daño a tirar: el del último ataque (puede ser upcast) o, si no atacaste, el daño base.
  // Así se puede tirar el daño sin apretar Atacar antes (ej. tiraste el ataque en la mesa).
  const attackDamageNotation = pendingDamageNotation ?? directCastNotation;
  const rollSpellDamage = () => {
    if (!attackDamageNotation) return;
    const notation = lastAttackCrit ? doubleForCrit(attackDamageNotation) : attackDamageNotation;
    roll(notation, `${spell.name} · Daño${lastAttackCrit ? " (¡Crítico!)" : ""}`, { kind: "damage" });
    setPendingDamageNotation(null);
    setLastAttackCrit(false);
  };
  // Al lanzar un hechizo de concentración, empezás a concentrarte en él (reemplaza el anterior).
  const startConcentrationIfNeeded = () => {
    if (!spell.concentration) return;
    if (character.concentratingSpell !== spell.index) update({ concentratingSpell: spell.index });
  };
  const castCantrip = () => {
    if (!spell.dice) return;
    startConcentrationIfNeeded();
    rollDamage(spell.dice, `${spell.name} · Truco`);
  };
  const castWithSlot = (slotLevel: number) => {
    const notation = castNotationFor(spell, slotLevel);
    update({ spellSlotsUsed: setSpellSlotUsed(character, slotLevel - 1, (character.spellSlotsUsed?.[slotLevel - 1] || 0) + 1) });
    startConcentrationIfNeeded();
    setCastOpen(false);
    if (notation) rollDamage(notation, `${spell.name} · Nivel ${slotLevel}`);
  };
  const openCast = () => {
    if (spell.level === 0) return castCantrip();
    if (!canImproveWithHigherSlot && lowestAvailableSlot) return castWithSlot(lowestAvailableSlot);
    setCastOpen(true);
  };

  return (
    <>
    <Card delay={delay} style={[{ marginBottom: 10 }, !prepared && { opacity: 0.55 }]} onPress={() => setExpanded((e) => !e)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={styles.spellLevel}>
          <Text style={{ color: colors.text, fontSize: 11, fontFamily: font.bodyBold }}>
            {spell.level === 0 ? "T" : spell.level}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle" style={{ fontSize: 15 }}>
            {spell.name}
          </Text>
          <Text variant="caption">
            {prepared ? `${spellLevelLabel(spell.level)} · ${spell.school}` : "No preparado hoy"}
          </Text>
        </View>
        {spell.concentration && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onConcentrationInfo();
            }}
            hitSlop={8}
            style={styles.spellInfoIcon}
          >
            <Ionicons name="eye" size={14} color={colors.muted} />
          </Pressable>
        )}
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textFaint} />
      </View>

      {expanded && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 140 }}>
            <Text variant="body" style={{ marginTop: 10, fontSize: 14 }}>
              {text}
            </Text>

            {(!!spell.damageType || !!spell.savingThrow) && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {!!spell.damageType && <InfoChip icon="flame" label={`Daño: ${spell.damageType}`} />}
                {!!spell.savingThrow && <InfoChip icon="shield-checkmark" label={`Salvación: ${spell.savingThrow}`} />}
              </View>
            )}

            {(!!spell.dice || spell.level > 0) && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Button
                  label={
                    requiresAttackRoll
                      ? "Atacar"
                      : canImproveWithHigherSlot
                        ? "Lanzar hechizo"
                        : directCastNotation
                          ? `Lanzar ${directCastNotation}`
                          : "Lanzar hechizo"
                  }
                  icon={requiresAttackRoll ? "flash" : "dice"}
                  small
                  disabled={!canCastWithSlot}
                  variant={canCastWithSlot ? "primary" : "secondary"}
                  onPress={openCast}
                />
                {requiresAttackRoll && !!attackDamageNotation && (
                  <Button
                    label={`Tirar daño ${lastAttackCrit ? doubleForCrit(attackDamageNotation) : attackDamageNotation}`}
                    icon="dice"
                    small
                    variant={lastAttackCrit ? undefined : "secondary"}
                    onPress={rollSpellDamage}
                  />
                )}
                {!canCastWithSlot && (
                  <Text variant="caption" color={colors.textDim}>
                    No te quedan espacios disponibles para lanzarlo.
                  </Text>
                )}
              </View>
            )}

            {higherLevel.length > 0 && (
              <View style={styles.higherLevelBox}>
                <View style={styles.higherLevelHeader}>
                  <Ionicons name="trending-up" size={14} color={colors.accent} />
                  <Text variant="label" style={{ color: colors.text }}>
                    A niveles más altos
                  </Text>
                </View>
                {higherLevel.map((line, index) => (
                  <Text key={`${spell._id}-higher-${index}`} variant="body" style={styles.higherLevelText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}

            {spell.index === "mage-armor" && (
              <View style={{ marginTop: 12 }}>
                <Button
                  label={mageArmorActive ? "Desactivar Armadura de Mago" : "Activar Armadura de Mago"}
                  icon={mageArmorActive ? "close-circle" : "shield-checkmark"}
                  variant={mageArmorActive ? "secondary" : undefined}
                  onPress={() => update({ armor: mageArmorActive ? "none" : "mage-armor" })}
                />
              </View>
            )}
          </MotiView>
        )}
    </Card>
    <CastSpellModal
      visible={castOpen}
      spell={spell}
      slots={availableSlots}
      onClose={() => setCastOpen(false)}
      onCast={castWithSlot}
    />
    </>
  );
}

function CastSpellModal({
  visible,
  spell,
  slots,
  onClose,
  onCast,
}: {
  visible: boolean;
  spell: Spell;
  slots: { spellLevel: number; max: number; used: number }[];
  onClose: () => void;
  onCast: (slotLevel: number) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.castSheet} onPress={(e) => e.stopPropagation()}>
          <Text variant="title">{spell.name}</Text>
          <Text variant="caption" style={{ marginTop: 4 }}>
            Elegí con qué espacio de hechizo lo querés lanzar.
          </Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            {slots.map((slot) => {
              const notation = castNotationFor(spell, slot.spellLevel);
              const remaining = slot.max - slot.used;
              return (
                <Pressable key={slot.spellLevel} style={styles.castOption} onPress={() => onCast(slot.spellLevel)}>
                  <View style={{ flex: 1 }}>
                    <Text variant="subtitle" style={{ fontSize: 15 }}>
                      Nivel {slot.spellLevel}
                    </Text>
                    <Text variant="caption">
                      {remaining} / {slot.max} disponibles{notation ? ` · tira ${notation}` : ""}
                    </Text>
                  </View>
                  <Ionicons name="dice" size={18} color={colors.accent} />
                </Pressable>
              );
            })}
          </View>
          <Button label="Cancelar" icon="close" variant="secondary" onPress={onClose} style={{ marginTop: 14 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LevelUpModal({
  visible,
  onClose,
  hitDie,
  characterId,
  onNeedsSubclass,
  subclassLevel,
  hasSubclass,
}: {
  visible: boolean;
  onClose: () => void;
  hitDie: number;
  characterId: string;
  onNeedsSubclass?: () => void;
  subclassLevel: number;
  hasSubclass: boolean;
}) {
  const levelUp = useLevelUp(characterId);
  const [result, setResult] = useState<{ roll: number; gained: number; level: number; needsSubclass: boolean } | null>(null);
  const [manualRoll, setManualRoll] = useState("");

  useEffect(() => {
    if (!visible) { setResult(null); setManualRoll(""); }
  }, [visible]);

  const doLevelUp = async (rolled?: number) => {
    const res = await levelUp.mutateAsync(rolled);
    setResult({
      roll: res.roll,
      gained: res.gained,
      level: res.character.level,
      needsSubclass: !hasSubclass && res.character.level >= subclassLevel && !res.character.subclassIndex,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const closeResult = () => {
    const openSubclass = !!result?.needsSubclass;
    onClose();
    if (openSubclass) setTimeout(() => onNeedsSubclass?.(), 250);
  };

  const rollInApp = () => {
    const r = rollNotation(`1d${hitDie}`);
    if (r) doLevelUp(r.total);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 180 }}
          style={[styles.levelSheet, shadow.glow]}
        >
          <LinearGradient colors={[colors.surfaceAlt, colors.surface]} style={StyleSheet.absoluteFill} />

          {!result ? (
            <>
              <Ionicons name="trending-up" size={34} color={colors.accent} style={{ alignSelf: "center" }} />
              <Text variant="title" center style={{ marginTop: 10 }}>
                Subir de nivel
              </Text>
              <Text variant="body" center style={{ marginTop: 6 }}>
                Tirá tu dado de vida (d{hitDie}) en la mesa y cargá lo que salió; la app le suma tu Constitución.
              </Text>

              <View style={styles.rolledRow}>
                <Text variant="caption">Salió en el d{hitDie}:</Text>
                <TextInput
                  value={manualRoll}
                  onChangeText={(t) => setManualRoll(t.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={colors.textFaint}
                  style={styles.rolledInput}
                  maxLength={2}
                />
              </View>
              <Button
                label="Sumar lo que tiré"
                icon="add-circle"
                onPress={() => {
                  const n = parseInt(manualRoll, 10);
                  if (n > 0) doLevelUp(n);
                }}
                disabled={!manualRoll}
                loading={levelUp.isPending}
                style={{ marginTop: 14 }}
              />
              <Button label={`Tirar d${hitDie} en la app`} icon="dice" variant="secondary" onPress={rollInApp} style={{ marginTop: 10 }} />
            </>
          ) : (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 180 }}>
              <Text variant="display" center color={colors.accent}>
                ¡Nivel {result.level}!
              </Text>
              <View style={styles.gainBadge}>
                <Ionicons name="heart" size={18} color={colors.hp} />
                <Text style={{ fontFamily: font.display, fontSize: 24, color: colors.text }}>+{result.gained}</Text>
                <Text variant="caption">vida</Text>
              </View>
              <Text variant="caption" center>
                Tiraste {result.roll} en el d{hitDie}
              </Text>
              <Button label={result.needsSubclass ? "Elegir especialidad" : "¡Genial!"} icon="checkmark" onPress={closeResult} style={{ marginTop: 18 }} />
            </MotiView>
          )}
        </MotiView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  crest: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  classBadge: { marginTop: -18, marginBottom: 2, borderRadius: radius.pill, padding: 2, backgroundColor: colors.bg },
  photoEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  classBadgeInner: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  higherLevelBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  higherLevelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  higherLevelText: {
    fontSize: 13,
    color: colors.muted,
  },
  castSheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.lg,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  castOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: 12,
  },
  hpHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hpNumbers: { fontFamily: font.display, fontSize: 24, color: colors.text },
  tempHpNumber: { color: "#4EA3FF" },
  tempHpBtn: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4EA3FF22",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#4EA3FF66",
    paddingVertical: 8,
  },
  tempHpLabel: { color: "#8FC5FF", fontFamily: font.bodyBold, fontSize: 9, lineHeight: 11 },
  tempHpValue: { color: "#E6F3FF", fontFamily: font.display, fontSize: 15, lineHeight: 18 },
  hpButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  hpUtilityRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  fullHpBtn: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullHpText: { fontFamily: font.bodyBold, color: colors.text, fontSize: 13 },
  deathSaveBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.danger + "55",
  },
  myTurnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  myTurnTitle: { fontFamily: font.bodyBold, fontSize: 15, color: colors.bg },
  myTurnBody: { fontFamily: font.body, fontSize: 12, color: colors.bg, marginTop: 2 },
  concentrationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.accent + "66",
  },
  deathDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  hpBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  hpBtnDark: { backgroundColor: colors.primary },
  hpBtnLight: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  subclassBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.warning + "18",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + "55",
    padding: 12,
    marginTop: 18,
  },
  heroTabs: {
    flexDirection: "row",
    gap: 6,
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: radius.sm },
  heroTabActive: { backgroundColor: colors.primary },
  heroTabText: { fontFamily: font.bodyBold, fontSize: 10, color: colors.textFaint },
  trackerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  trackerInitBox: { alignItems: "center", width: 42 },
  trackerInitNum: { fontFamily: font.display, fontSize: 24, color: colors.text },
  trackerNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trackerTurnPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  trackerTurnText: { fontSize: 10, color: colors.bg, fontFamily: font.bodyBold },
  trackerHpMetaRow: { marginTop: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  trackerTempMiniChip: {
    backgroundColor: "#4EA3FF22",
    borderColor: "#4EA3FF66",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trackerTempMiniText: { color: "#8FC5FF", fontFamily: font.bodyBold, fontSize: 11 },
  trackerConditionButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  trackerConditionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  trackerConditionChip: {
    backgroundColor: colors.warning + "22",
    borderColor: colors.warning + "88",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trackerConditionChipText: { color: colors.warning, fontFamily: font.bodyBold, fontSize: 11 },
  trackerConditionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trackerConditionOption: {
    width: "48%",
    minHeight: 78,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 5,
  },
  trackerConditionOptionActive: { borderColor: colors.accent, backgroundColor: colors.primary + "66" },
  trackerConditionOptionTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  trackerConditionOptionLabel: { flex: 1, color: colors.text, fontFamily: font.bodyBold, fontSize: 13 },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  quickStat: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickValue: { fontFamily: font.display, fontSize: 18, color: colors.text },
  abilityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  ability: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  abilityPrimary: { borderColor: colors.warning, backgroundColor: colors.surfaceAlt },
  abilityMod: { fontFamily: font.display, fontSize: 22, color: colors.accent },
  saveTap: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2, paddingVertical: 2 },
  manageSpellsButton: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  manageSpellsText: { color: colors.text, fontFamily: font.bodyBold, fontSize: 15 },
  spellLevel: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  spellInfoIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  levelSheet: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radius.xl,
    padding: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  gainBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 12 },
  rolledRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 18 },
  rolledInput: {
    fontFamily: font.display,
    fontSize: 28,
    color: colors.text,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 64,
    textAlign: "center",
    paddingVertical: 6,
  },
});
