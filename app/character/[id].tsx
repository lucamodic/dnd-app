import { useState, useEffect } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { HpBar } from "@/components/HpBar";
import { RollButton } from "@/components/RollButton";
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
  useTrackerSettings,
  Character,
  Clazz,
  Participant,
  Race,
  Spell,
} from "@/api/hooks";
import { ABILITY_ORDER, ABILITY_FULL, ABILITY_DESCRIPTIONS, abilityMod, classHighlightsAbility, formatMod, spellLevelLabel } from "@/lib/format";
import {
  featuresUpTo, resourcesCount, computeAc, spellSaveDC, spellAttackBonus, initiative, maxUnlockedSpellLevel, saveModifier,
} from "@/lib/sheet";
import { ClassIcon } from "@/components/ClassIcon";
import { RaceImage } from "@/components/RaceImage";
import { rollNotation } from "@/lib/dice";
import { Section } from "@/components/sheet/Section";
import { NumberEditorModal, ArmorModal } from "@/components/sheet/editors";
import {
  InventorySection,
  WeaponSection,
  SkillsSection,
  FeatureList,
  ResourcesSection,
  SpellSlotsSection,
  NotesSection,
} from "@/components/sheet/sections";
import { useAuth } from "@/store/auth";
import { colors, font, radius, shadow } from "@/theme";

export default function CharacterSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: character, isLoading } = useCharacter(id);
  const { data: tracker } = useTracker();
  const user = useAuth((s) => s.user);
  const cls = character?.classId as Clazz | undefined;
  const race = character?.raceId as Race | undefined;

  const setHp = useSetHp(id);
  const updateChar = useUpdateCharacter(id);
  const join = useTrackerJoin();
  const removeParticipant = useTrackerRemove();
  const trackerSettings = useTrackerSettings();
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [hpEditOpen, setHpEditOpen] = useState(false);
  const [tempHpEditOpen, setTempHpEditOpen] = useState(false);
  const [armorOpen, setArmorOpen] = useState(false);
  const [initEditOpen, setInitEditOpen] = useState(false);
  const [abilityEdit, setAbilityEdit] = useState<keyof typeof ABILITY_FULL | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  const [tab, setTab] = useState<"main" | "bag" | "combat" | "notes" | "tracker">("main");

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
  const isDM = user?.role === "dm" || user?.role === "admin";
  const canLevelUp = isDM || !!tracker?.levelUpEnabled;

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

  const onJoin = async () => {
    await join.mutateAsync({ characterId: character._id, initiative: init });
    setJoined(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.topBar}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => router.back()} />
        <Ionicons name="trash-outline" size={22} color={colors.textFaint} onPress={() => setDeleteOpen(true)} />
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
        <Text variant="display" center style={{ marginTop: 12 }}>
          {character.name}
        </Text>
        <Text variant="caption" center>
          {race?.name} · {cls?.name} · Nivel {character.level}
        </Text>
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
      </Card>

      {/* Level up + Add to combat */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Subir de nivel"
            icon="trending-up"
            onPress={() => setLevelUpOpen(true)}
            disabled={!canLevelUp}
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
          />
        </View>
      </View>
      {isDM ? (
        <Pressable
          onPress={() => trackerSettings.mutate({ levelUpEnabled: !tracker?.levelUpEnabled })}
          style={styles.levelGateRow}
        >
          <Ionicons name={tracker?.levelUpEnabled ? "checkbox" : "square-outline"} size={20} color={tracker?.levelUpEnabled ? colors.accent : colors.muted} />
          <Text variant="caption" style={{ flex: 1 }}>Permitir que los players suban de nivel</Text>
        </Pressable>
      ) : !canLevelUp ? (
        <Text variant="caption" center style={{ marginTop: 8 }}>El DM todavía no habilitó la subida de nivel.</Text>
      ) : null}

      <HeroTabs active={tab} onChange={setTab} />

      {tab === "main" && (
        <>
          <View style={styles.quickRow}>
            <QuickStat icon="shield" label="CA" value={ac} onPress={() => setArmorOpen(true)} onInfo={() => setInfoModal({ title: "Clase de Armadura", body: "La CA es el número que el enemigo tiene que igualar o superar para pegarte." })} />
            <QuickStat icon="flash" label="Iniciativa" value={formatMod(init)} onPress={() => setInitEditOpen(true)} onInfo={() => setInfoModal({ title: "Iniciativa", body: "Se tira al empezar combate para decidir el orden de turnos." })} />
            <QuickStat icon="walk" label="Velocidad" value={`${character.speed}`} onInfo={() => setInfoModal({ title: "Velocidad", body: "Cuántos pies puede moverse tu personaje en su turno." })} />
            {saveDC != null ? (
              <QuickStat icon="color-wand" label="CD Salv." value={saveDC} onInfo={() => setInfoModal({ title: "CD de salvación", body: "Es la dificultad que deben superar los enemigos cuando tus hechizos piden una salvación." })} />
            ) : (
              <QuickStat icon="ribbon" label="Competencia" value={formatMod(character.proficiencyBonus)} onInfo={() => setInfoModal({ title: "Competencia", body: "Bonus que sumás en cosas que tu personaje sabe hacer bien." })} />
            )}
          </View>

          <Text variant="label" style={{ marginTop: 22, marginBottom: 10 }}>HABILIDADES</Text>
          <View style={styles.abilityGrid}>
            {ABILITY_ORDER.map((key, i) => {
              const score = character.abilityScores[key];
              const highlighted = classHighlightsAbility(cls, key);
              return (
                <MotiView key={key} from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 14, delay: i * 45 }} style={{ width: "31%" }}>
                  <Pressable onPress={() => setInfoModal({ title: ABILITY_FULL[key], body: ABILITY_DESCRIPTIONS[key] })} onLongPress={() => setAbilityEdit(key)} style={[styles.ability, highlighted && styles.abilityPrimary]}>
                    <Text variant="caption">{ABILITY_FULL[key]}</Text>
                    <Text style={styles.abilityMod}>{formatMod(abilityMod(score))}</Text>
                    <Text variant="caption" color={colors.textFaint}>{score}</Text>
                    {cls && <Text variant="caption" color={cls.savingThrows?.includes(key) ? colors.accent : colors.textDim} style={{ marginTop: 2 }}>Salv {formatMod(saveModifier(key, character, cls))}</Text>}
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
              <Pressable onPress={() => router.push(`/spells/${id}`)} style={styles.manageSpellsButton}>
                <Ionicons name="sparkles" size={18} color={colors.text} />
                <Text style={styles.manageSpellsText}>Gestionar hechizos</Text>
              </Pressable>
              <Text variant="caption" style={{ marginBottom: 10 }}>Para pegar con un hechizo tirá d20{spellAtk != null ? ` ${formatMod(spellAtk)}` : ""}.</Text>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                const spells = visibleSpells.filter((s) => s.level === lvl);
                if (!spells.length) return null;
                return <View key={lvl}><Text variant="label" style={{ marginTop: 14, marginBottom: 8 }}>{spellLevelLabel(lvl).toUpperCase()}</Text>{spells.map((s, i) => <SpellRow key={s._id} spell={s} delay={i * 25} character={character} update={updateChar.mutate} />)}</View>;
              })}
            </>
          )}
        </>
      )}

      {tab === "notes" && <NotesSection character={character} update={updateChar.mutate} />}

      {tab === "tracker" && (
        <Section title="Tracker" icon="list" defaultOpen>
          <Text variant="caption" style={{ marginBottom: 10 }}>Combate actual. Para administrar todo el combate, abrí la pestaña Combate.</Text>
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

      <LevelUpModal
        visible={levelUpOpen}
        onClose={() => setLevelUpOpen(false)}
        hitDie={character.hitDie}
        characterId={id}
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
      <ArmorModal
        visible={armorOpen}
        armor={character.armor}
        shield={character.shield}
        acBonus={character.acBonus}
        onClose={() => setArmorOpen(false)}
        onSave={(patch) => updateChar.mutate(patch)}
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
  return (
    <Pressable onPress={onPress} style={[styles.hpBtn, light ? styles.hpBtnLight : styles.hpBtnDark]}>
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
  active: "main" | "bag" | "combat" | "notes" | "tracker";
  onChange: (tab: "main" | "bag" | "combat" | "notes" | "tracker") => void;
}) {
  const tabs = [
    { key: "main", icon: "person", label: "Main" },
    { key: "bag", icon: "bag", label: "Mochila" },
    { key: "combat", icon: "flash", label: "Combate" },
    { key: "notes", icon: "journal", label: "Notas" },
    { key: "tracker", icon: "list", label: "Tracker" },
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
      </View>

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
    </MotiView>
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

function SpellRow({
  spell,
  delay,
  character,
  update,
}: {
  spell: Spell;
  delay: number;
  character: Character;
  update: (patch: Partial<Character>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const text = spell.simpleDescription || spell.description?.[0] || "Sin descripción todavía.";
  const mageArmorActive = character.armor === "mage-armor";

  return (
    <Card delay={delay} style={{ marginBottom: 10 }} onPress={() => setExpanded((e) => !e)}>
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
            {spellLevelLabel(spell.level)} · {spell.school}
          </Text>
        </View>
        {spell.concentration && <Ionicons name="eye" size={14} color={colors.muted} />}
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textFaint} />
      </View>

      <AnimatePresence>
        {expanded && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" as any }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "timing", duration: 220 }}
          >
            <Text variant="body" style={{ marginTop: 10, fontSize: 14 }}>
              {text}
            </Text>

            {(!!spell.damageType || !!spell.savingThrow) && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {!!spell.damageType && <InfoChip icon="flame" label={`Daño: ${spell.damageType}`} />}
                {!!spell.savingThrow && <InfoChip icon="shield-checkmark" label={`Salvación: ${spell.savingThrow}`} />}
              </View>
            )}

            {!!spell.dice && (
              <View style={{ marginTop: 12 }}>
                <RollButton notation={spell.dice} label={`${spell.name} · ${spell.dice}`} />
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
      </AnimatePresence>
    </Card>
  );
}

function LevelUpModal({
  visible,
  onClose,
  hitDie,
  characterId,
}: {
  visible: boolean;
  onClose: () => void;
  hitDie: number;
  characterId: string;
}) {
  const levelUp = useLevelUp(characterId);
  const [result, setResult] = useState<{ roll: number; gained: number; level: number } | null>(null);
  const [manualRoll, setManualRoll] = useState("");

  useEffect(() => {
    if (!visible) { setResult(null); setManualRoll(""); }
  }, [visible]);

  const doLevelUp = async (rolled?: number) => {
    const res = await levelUp.mutateAsync(rolled);
    setResult({ roll: res.roll, gained: res.gained, level: res.character.level });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const rollInApp = () => {
    const r = rollNotation(`1d${hitDie}`);
    if (r) doLevelUp(r.total);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 14 }}
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
            <MotiView from={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 10 }}>
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
              <Button label="¡Genial!" icon="checkmark" onPress={onClose} style={{ marginTop: 18 }} />
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
  hpBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  hpBtnDark: { backgroundColor: colors.primary },
  hpBtnLight: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  levelGateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
