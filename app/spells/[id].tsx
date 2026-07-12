import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AnimatePresence, MotiView } from "moti";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SkeletonCard } from "@/components/Skeleton";
import { useCharacter, useClassSpells, useUpdateCharacter, Clazz, Spell } from "@/api/hooks";
import { CONCENTRATION_INFO, spellLevelLabel } from "@/lib/format";
import { maxUnlockedSpellLevel, cantripLimit, spellsKnownLimit } from "@/lib/sheet";
import { colors, font, radius } from "@/theme";

/** ID de un hechizo conocido, sea el objeto Spell populado o el string suelto. */
const idOf = (s: Spell | string | null | undefined): string | null => {
  if (!s) return null;
  return typeof s === "string" ? s : s._id;
};

/** Pantalla para gestionar los hechizos conocidos: TODOS los de la clase, agrupados por nivel. */
export default function ManageSpells() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: character } = useCharacter(id);
  const cls = character?.classId as Clazz | undefined;
  const { data: spells, isLoading } = useClassSpells(cls?.spellListClassId ?? cls?._id);
  const update = useUpdateCharacter(id);

  // Estado local para feedback instantáneo al tocar (no dependemos del cache optimista,
  // que puede tener otra forma mientras se refetchea).
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [seeded, setSeeded] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (!seeded && character?.knownSpells) {
      const ids = character.knownSpells.map(idOf).filter((x): x is string => !!x);
      setKnownIds(new Set(ids));
      setSeeded(true);
    }
  }, [character?.knownSpells, seeded]);

  const maxLvl = cls && character ? maxUnlockedSpellLevel(cls, character.level) : -1;

  const byLevel = useMemo(() => {
    const groups: Record<number, Spell[]> = {};
    for (const s of spells || []) (groups[s.level] ||= []).push(s);
    return Object.entries(groups)
      .map(([lvl, list]) => ({ level: Number(lvl), list: list.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.level - b.level);
  }, [spells]);

  // Límites por nivel: cuántos trucos y cuántos hechizos "de verdad" puede tener conocidos.
  const cantripMax = cls && character ? cantripLimit(cls, character.level) : 0;
  const spellMax = cls && character ? spellsKnownLimit(cls, character, character.level) : 0;
  const cantripCount = useMemo(
    () => (spells || []).filter((s) => s.level === 0 && knownIds.has(s._id)).length,
    [spells, knownIds]
  );
  const spellCount = useMemo(
    () => (spells || []).filter((s) => s.level > 0 && knownIds.has(s._id)).length,
    [spells, knownIds]
  );

  const flash = (id: string) => {
    setFlashId(id);
    setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 900);
  };

  const toggle = (spell: Spell, locked: boolean) => {
    if (locked) return; // no se puede tocar un hechizo de nivel no desbloqueado
    const isKnown = knownIds.has(spell._id);

    if (!isKnown) {
      // Chequeo de límite antes de agregar.
      const isCantrip = spell.level === 0;
      const atLimit = isCantrip ? cantripCount >= cantripMax : spellCount >= spellMax;
      if (atLimit) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        flash(spell._id);
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = new Set(knownIds);
    if (isKnown) next.delete(spell._id);
    else next.add(spell._id);
    setKnownIds(next);
    setPendingIds((cur) => new Set(cur).add(spell._id));
    update.mutate(
      { knownSpells: Array.from(next) as any },
      { onSettled: () => setPendingIds((cur) => { const out = new Set(cur); out.delete(spell._id); return out; }) }
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.top}>
        <Ionicons name="arrow-back" size={24} color={colors.text} onPress={() => router.back()} />
        <Text variant="title">Gestionar hechizos</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="caption" style={{ marginTop: 6, marginBottom: 10 }}>
        Tocá para elegir cuáles conocés. La ⭐ marca los recomendados. Los de nivel que todavía no
        desbloqueaste aparecen bloqueados.
      </Text>

      {cls?.spellcasting && (
        <View style={styles.limitsRow}>
          <View style={styles.limitPill}>
            <Ionicons name="sparkles" size={13} color={colors.accent} />
            <Text variant="caption" color={colors.textDim}>
              Trucos {cantripCount}/{cantripMax}
            </Text>
          </View>
          <View style={styles.limitPill}>
            <Ionicons name="book" size={13} color={colors.accent} />
            <Text variant="caption" color={colors.textDim}>
              Hechizos {spellCount}/{spellMax}
            </Text>
          </View>
        </View>
      )}

      {isLoading && (
        <View style={{ marginTop: 14 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      )}

      {byLevel.map((group) => (
        <View key={group.level} style={{ marginBottom: 8 }}>
          <Text variant="label" style={{ marginTop: 12, marginBottom: 8 }}>
            {spellLevelLabel(group.level).toUpperCase()}
            {group.level > maxLvl ? "  ·  bloqueado" : ""}
          </Text>
          {group.list.map((spell) => {
            const known = knownIds.has(spell._id);
            const locked = group.level > maxLvl;
            const isCantrip = spell.level === 0;
            const atLimit = !known && (isCantrip ? cantripCount >= cantripMax : spellCount >= spellMax);
            const flashing = flashId === spell._id;
            const pending = pendingIds.has(spell._id);
            return (
              <Pressable
                key={spell._id}
                onPress={() => setOpenIds((cur) => {
                  const next = new Set(cur);
                  if (next.has(spell._id)) next.delete(spell._id);
                  else next.add(spell._id);
                  return next;
                })}
              >
                <Card style={[styles.row, (atLimit && !known) && { opacity: 0.6 }, flashing && styles.rowFlash]}>
                  <View style={styles.spellHeader}>
                    <Pressable onPress={(e) => { e.stopPropagation(); toggle(spell, locked); }} disabled={locked} hitSlop={8}>
                      {pending ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <Ionicons
                          name={known ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={known ? colors.accent : colors.muted}
                        />
                      )}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text variant="subtitle" style={{ fontSize: 15 }}>{spell.name}</Text>
                        {spell.recommended && <Ionicons name="star" size={13} color={colors.warning} />}
                      </View>
                      <Text variant="caption" numberOfLines={1}>
                        {locked ? "Se desbloquea al subir de nivel" : spell.simpleDescription || spell.school}
                      </Text>
                    </View>
                    {!!spell.dice && !locked && (
                      <View style={styles.dice}>
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: colors.text }}>{spell.dice}</Text>
                      </View>
                    )}
                    <Ionicons name={openIds.has(spell._id) ? "chevron-up" : "chevron-down"} size={16} color={colors.textFaint} />
                  </View>
                  <AnimatePresence>
                    {openIds.has(spell._id) && (
                      <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" as any }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: "timing", duration: 180 }}
                      >
                        <Text variant="body" style={{ marginTop: 10, fontSize: 14 }}>
                          {spell.simpleDescription || spell.description?.join("\n\n") || "Sin descripción todavía."}
                        </Text>
                        <View style={styles.infoGrid}>
                          <InfoPill icon="color-palette" label={spell.school} />
                          <InfoPill icon="time" label={spell.castingTime} />
                          <InfoPill icon="navigate" label={spell.range} />
                          <InfoPill icon="hourglass" label={spell.duration} />
                          {spell.concentration && <InfoPill icon="eye" label="Concentración" onPress={() => setInfoModal(CONCENTRATION_INFO)} />}
                          {spell.ritual && <InfoPill icon="book" label="Ritual" />}
                          {!!spell.damageType && <InfoPill icon="flame" label={`Daño: ${spell.damageType}`} />}
                          {!!spell.savingThrow && <InfoPill icon="shield-checkmark" label={`Salvación: ${spell.savingThrow}`} />}
                        </View>
                      </MotiView>
                    )}
                  </AnimatePresence>
                  {locked && (
                    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                      <View style={styles.lockOverlay} />
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </View>
      ))}
      <InfoModal info={infoModal} onClose={() => setInfoModal(null)} />
    </Screen>
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

function InfoPill({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label?: string; onPress?: () => void }) {
  if (!label) return null;
  const content = (
    <>
      <Ionicons name={icon} size={12} color={colors.accent} />
      <Text variant="caption" color={colors.textDim}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8} style={styles.infoPill}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={styles.infoPill}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  limitsRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  limitPill: {
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
  row: { marginBottom: 8, paddingVertical: 12, overflow: "hidden" },
  spellHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowFlash: { borderColor: colors.danger, borderWidth: 1.5 },
  dice: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: radius.lg,
  },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  infoPill: {
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
});
