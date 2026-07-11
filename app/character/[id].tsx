import { useState, useEffect } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
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
  useClassSpells,
  useLevelUp,
  useSetHp,
  useUpdateCharacter,
  useDeleteCharacter,
  useTrackerJoin,
  Clazz,
  Race,
  Spell,
} from "@/api/hooks";
import { ABILITY_ORDER, ABILITY_LABELS, abilityMod, formatMod, spellLevelLabel } from "@/lib/format";
import { featuresUpTo, resourcesCount } from "@/lib/sheet";
import { rollNotation } from "@/lib/dice";
import { Section } from "@/components/sheet/Section";
import {
  CurrencySection,
  SkillsSection,
  SavesSection,
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
  const { data: spells } = useClassSpells(cls?.spellcasting ? cls?._id : undefined);

  const setHp = useSetHp(id);
  const updateChar = useUpdateCharacter(id);
  const join = useTrackerJoin();
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [joined, setJoined] = useState(false);

  if (isLoading || !character) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  const accent = cls?.color || colors.secondary;
  const changeHp = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHp.mutate(Math.max(0, Math.min(character.maxHp, character.currentHp + delta)));
  };

  const onJoin = async () => {
    await join.mutateAsync({ characterId: character._id, initiative: 0 });
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
        <LinearGradient colors={[accent, colors.primary]} style={styles.crest}>
          <Text style={{ fontFamily: font.display, fontSize: 34, color: colors.text }}>
            {character.name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
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
          <Text style={styles.hpNumbers}>
            {character.currentHp}
            <Text style={{ color: colors.textFaint }}> / {character.maxHp}</Text>
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <HpBar current={character.currentHp} max={character.maxHp} height={18} />
        </View>
        <View style={styles.hpButtons}>
          <HpButton label="-5" onPress={() => changeHp(-5)} />
          <HpButton label="-1" onPress={() => changeHp(-1)} />
          <HpButton label="+1" onPress={() => changeHp(1)} light />
          <HpButton label="+5" onPress={() => changeHp(5)} light />
        </View>
      </Card>

      {/* Quick stats */}
      <View style={styles.quickRow}>
        <QuickStat icon="shield" label="CA" value={character.ac} />
        <QuickStat icon="walk" label="Vel" value={`${character.speed}`} />
        <QuickStat icon="ribbon" label="Comp" value={formatMod(character.proficiencyBonus)} />
        <QuickStat icon="cube" label="Dado" value={`d${character.hitDie}`} />
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
              style={styles.ability}
            >
              <Text variant="caption">{ABILITY_LABELS[key]}</Text>
              <Text style={styles.abilityMod}>{formatMod(abilityMod(score))}</Text>
              <Text variant="caption" color={colors.textFaint}>
                {score}
              </Text>
            </MotiView>
          );
        })}
      </View>

      {/* Secciones de la ficha */}
      <View style={{ marginTop: 12 }}>
        <Section title="Monedas" icon="cash">
          <CurrencySection character={character} update={updateChar.mutate} />
        </Section>

        <Section title="Competencias" icon="ribbon">
          <SkillsSection character={character} cls={cls!} update={updateChar.mutate} />
        </Section>

        <Section title="Salvaciones" icon="shield-checkmark">
          <SavesSection character={character} cls={cls!} />
        </Section>

        {!!race?.traits?.length && (
          <Section title="Rasgos de raza" icon="sparkles" badge={`${race.traits.length}`}>
            <FeatureList items={race.traits} />
          </Section>
        )}

        <Section title="Habilidades de clase" icon="flash" defaultOpen>
          <FeatureList items={featuresUpTo(cls!, character.level)} />
        </Section>

        {cls && resourcesCount(cls, character.level) > 0 && (
          <Section title="Recursos" icon="battery-charging" defaultOpen>
            <ResourcesSection character={character} cls={cls} update={updateChar.mutate} />
          </Section>
        )}

        {cls?.spellcasting && (
          <Section title="Espacios de conjuro" icon="flame">
            <SpellSlotsSection character={character} cls={cls} update={updateChar.mutate} />
          </Section>
        )}
      </View>

      {/* Level up */}
      <Button
        label="Subir de nivel"
        icon="trending-up"
        onPress={() => setLevelUpOpen(true)}
        style={{ marginTop: 22 }}
      />

      {/* Add to combat */}
      <Button
        label={joined ? "Agregado al combate" : "Sumarme al combate"}
        icon={joined ? "checkmark-circle" : "flash"}
        variant="secondary"
        onPress={onJoin}
        loading={join.isPending}
        disabled={joined}
        style={{ marginTop: 12 }}
      />

      {/* Spells */}
      {cls?.spellcasting && (
        <>
          <Text variant="label" style={{ marginTop: 26, marginBottom: 4 }}>
            HECHIZOS DE {cls.name.toUpperCase()}
          </Text>
          <Text variant="caption" style={{ marginBottom: 10 }}>
            Explicados simple. Tocá "Lanzar" para tirar los dados.
          </Text>
          {!spells && <ActivityIndicator color={colors.accent} />}
          {spells?.slice(0, 40).map((s, i) => (
            <SpellRow key={s._id} spell={s} delay={i * 25} />
          ))}
          {spells && spells.length === 0 && (
            <Text variant="body">Todavía no hay hechizos cargados para esta clase.</Text>
          )}
        </>
      )}

      <LevelUpModal
        visible={levelUpOpen}
        onClose={() => setLevelUpOpen(false)}
        hitDie={character.hitDie}
        characterId={id}
      />
      <DeleteModal id={id} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
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

function QuickStat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number }) {
  return (
    <View style={styles.quickStat}>
      <Ionicons name={icon} size={16} color={colors.accent} />
      <Text style={styles.quickValue}>{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
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

function SpellRow({ spell, delay }: { spell: Spell; delay: number }) {
  const [expanded, setExpanded] = useState(false);
  const text = spell.simpleDescription || spell.description?.[0] || "Sin descripción todavía.";

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

  useEffect(() => {
    if (!visible) setResult(null);
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
                Tirá tu dado de vida (d{hitDie}) en la mesa y sumamos el resultado, o tiralo acá mismo.
              </Text>
              <Button label={`Tirar d${hitDie} en la app`} icon="dice" onPress={rollInApp} loading={levelUp.isPending} style={{ marginTop: 18 }} />
              <Button
                label="Ya lo tiré (máximo)"
                variant="secondary"
                onPress={() => doLevelUp(hitDie)}
                style={{ marginTop: 10 }}
              />
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
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  hpHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hpNumbers: { fontFamily: font.display, fontSize: 24, color: colors.text },
  hpButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
  hpBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: "center" },
  hpBtnDark: { backgroundColor: colors.primary },
  hpBtnLight: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  quickStat: {
    flex: 1,
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
    width: "31%",
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
});
