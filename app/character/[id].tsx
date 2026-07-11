import { useState, useEffect } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
  Character,
  Clazz,
  Race,
  Spell,
} from "@/api/hooks";
import { ABILITY_ORDER, ABILITY_LABELS, ABILITY_FULL, abilityMod, formatMod, spellLevelLabel } from "@/lib/format";
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
} from "@/components/sheet/sections";
import { colors, font, radius, shadow } from "@/theme";

export default function CharacterSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: character, isLoading } = useCharacter(id);
  const cls = character?.classId as Clazz | undefined;
  const race = character?.raceId as Race | undefined;

  const setHp = useSetHp(id);
  const updateChar = useUpdateCharacter(id);
  const join = useTrackerJoin();
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [hpEditOpen, setHpEditOpen] = useState(false);
  const [tempHpEditOpen, setTempHpEditOpen] = useState(false);
  const [armorOpen, setArmorOpen] = useState(false);
  const [initEditOpen, setInitEditOpen] = useState(false);
  const [abilityEdit, setAbilityEdit] = useState<keyof typeof ABILITY_FULL | null>(null);

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
        <RaceImage
          uri={race?.imageBase64 || race?.image}
          style={styles.crest}
          fallback={
            <LinearGradient colors={[accent, colors.primary]} style={styles.crest}>
              <ClassIcon index={cls?.index} size={38} color={colors.text} />
            </LinearGradient>
          }
        />
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
          <Button label="Subir de nivel" icon="trending-up" onPress={() => setLevelUpOpen(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={joined ? "En combate" : "Sumarme"}
            icon={joined ? "checkmark-circle" : "flash"}
            variant="secondary"
            onPress={onJoin}
            loading={join.isPending}
            disabled={joined}
          />
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.quickRow}>
        <QuickStat icon="shield" label="CA" value={ac} onPress={() => setArmorOpen(true)} />
        <QuickStat icon="flash" label="Iniciativa" value={formatMod(init)} onPress={() => setInitEditOpen(true)} />
        <QuickStat icon="walk" label="Vel" value={`${character.speed}`} />
        {saveDC != null ? (
          <QuickStat icon="color-wand" label="CD Salv." value={saveDC} />
        ) : (
          <QuickStat icon="ribbon" label="Comp" value={formatMod(character.proficiencyBonus)} />
        )}
      </View>

      {/* Abilities */}
      <Text variant="label" style={{ marginTop: 22, marginBottom: 10 }}>
        CARACTERÍSTICAS
      </Text>
      <View style={styles.abilityGrid}>
        {ABILITY_ORDER.map((key, i) => {
          const score = character.abilityScores[key];
          return (
            <MotiView
              key={key}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 14, delay: i * 45 }}
              style={{ width: "31%" }}
            >
              <Pressable onPress={() => setAbilityEdit(key)} style={styles.ability}>
                <Text variant="caption">{ABILITY_LABELS[key]}</Text>
                <Text style={styles.abilityMod}>{formatMod(abilityMod(score))}</Text>
                <Text variant="caption" color={colors.textFaint}>{score}</Text>
                {cls && (
                  <Text
                    variant="caption"
                    color={cls.savingThrows?.includes(key) ? colors.accent : colors.textDim}
                    style={{ marginTop: 2 }}
                  >
                    Salv {formatMod(saveModifier(key, character, cls))}
                  </Text>
                )}
              </Pressable>
            </MotiView>
          );
        })}
      </View>

      {/* Secciones de la ficha */}
      <View style={{ marginTop: 12 }}>
        <Section title="Inventario" icon="bag">
          <InventorySection character={character} update={updateChar.mutate} />
        </Section>

        <Section title="Competencias" icon="ribbon">
          <SkillsSection character={character} cls={cls!} update={updateChar.mutate} />
        </Section>

        {cls && resourcesCount(cls, character.level) > 0 && (
          <Section title="Recursos" icon="battery-charging" defaultOpen>
            <ResourcesSection character={character} cls={cls} update={updateChar.mutate} />
          </Section>
        )}
      </View>

      {cls && (
        <View style={{ marginTop: 18 }}>
          <Text variant="label" style={{ marginBottom: 8 }}>ARMA</Text>
          <WeaponSection character={character} cls={cls} update={updateChar.mutate} />
        </View>
      )}

      {/* Spells: solo los conocidos y desbloqueados a este nivel */}
      {cls?.spellcasting && (
        <>
          <Section title="Espacios de conjuro" icon="flame">
            <SpellSlotsSection character={character} cls={cls} update={updateChar.mutate} />
          </Section>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 4 }}>
            <Text variant="label">MIS HECHIZOS</Text>
            <Pressable onPress={() => router.push(`/spells/${id}`)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="options" size={14} color={colors.accent} />
              <Text variant="caption" color={colors.accent}>Gestionar</Text>
            </Pressable>
          </View>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Los que sabés usar ahora. Para pegar con un hechizo tirá d20
            {spellAtk != null ? ` ${formatMod(spellAtk)}` : ""}. Tocá "Lanzar" para tirar los dados.
          </Text>
          {visibleSpells.map((s, i) => (
            <SpellRow key={s._id} spell={s} delay={i * 25} character={character} update={updateChar.mutate} />
          ))}
          {visibleSpells.length === 0 && (
            <Text variant="body">
              No tenés hechizos elegidos para tu nivel. Tocá "Gestionar" para agregar.
            </Text>
          )}
        </>
      )}

      {advancedInfoCount > 0 && (
        <Section
          title="Información avanzada"
          icon="information-circle"
          badge={`${advancedInfoCount}`}
        >
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Rasgos, poderes y habilidades desbloqueadas.
          </Text>
          {raceTraitItems.length > 0 && (
            <View style={{ gap: 8, marginBottom: classFeatureItems.length > 0 ? 14 : 0 }}>
              <Text variant="label">RASGOS DE RAZA</Text>
              <FeatureList items={raceTraitItems} />
            </View>
          )}
          {classFeatureItems.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text variant="label">HABILIDADES DE CLASE</Text>
              <FeatureList items={classFeatureItems} />
            </View>
          )}
        </Section>
      )}

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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.quickStat}>
      {onPress && <Ionicons name="pencil" size={10} color={colors.textFaint} style={styles.quickEdit} />}
      <Ionicons name={icon} size={16} color={colors.accent} />
      <Text style={styles.quickValue}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={{ flex: 1 }}>{content}</Pressable> : <View style={{ flex: 1 }}>{content}</View>;
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
  quickEdit: { position: "absolute", top: 6, right: 6 },
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
  abilityMod: { fontFamily: font.display, fontSize: 22, color: colors.accent },
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
