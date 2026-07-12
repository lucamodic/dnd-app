import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { HpBar } from "@/components/HpBar";
import { NumberEditorModal } from "@/components/sheet/editors";
import { CONDITION_OPTIONS, conditionLabel } from "@/lib/conditions";
import {
  useTracker,
  useTrackerNext,
  useTrackerSort,
  useTrackerReset,
  useTrackerAddMonster,
  useTrackerRemove,
  useTrackerPatch,
  useMonsters,
  Participant,
} from "@/api/hooks";
import { useAuth } from "@/store/auth";
import { colors, font, radius, shadow } from "@/theme";

export default function TrackerTab() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === "dm" || user?.role === "admin";
  const { data: tracker, isLoading } = useTracker();
  const next = useTrackerNext();
  const sort = useTrackerSort();
  const reset = useTrackerReset();
  const [addOpen, setAddOpen] = useState(false);

  const participants = tracker?.participants || [];

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <View>
          <Text variant="display">Combate</Text>
          <Text variant="caption">
            {participants.length} en la iniciativa · Ronda {tracker?.round ?? 1}
          </Text>
        </View>
        <View style={styles.roundBadge}>
          <Text variant="caption" color={colors.textDim}>
            RONDA
          </Text>
          <Text style={styles.roundNum}>{tracker?.round ?? 1}</Text>
        </View>
      </View>

      {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

      {!isLoading && participants.length === 0 && (
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            <Text variant="subtitle">No hay nadie en combate</Text>
            <Text variant="body" style={{ marginTop: 6 }}>
              Sumá tu personaje desde su ficha (botón "Combatir").
              {isAdmin ? " Como DM, agregá bichos con el botón de abajo." : ""}
            </Text>
          </Card>
        </View>
      )}

      <FlatList
        data={participants}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <ParticipantRow
            participant={item}
            active={index === tracker?.activeIndex}
            isAdmin={isAdmin}
            isOwner={item.ownerUserId === user?.id}
            delay={index * 40}
          />
        )}
      />

      {/* Controles */}
      <View style={styles.controls}>
        <LinearGradient colors={["transparent", colors.bg]} style={styles.controlsFade} pointerEvents="none" />
        {isAdmin && (
          <View style={styles.adminRow}>
            <SmallControl icon="swap-vertical" label="Ordenar" onPress={() => sort.mutate()} />
            <SmallControl icon="refresh" label="Reiniciar" onPress={() => reset.mutate()} />
            <SmallControl icon="add" label="Bicho" onPress={() => setAddOpen(true)} highlight />
          </View>
        )}
        {isAdmin ? (
          <Button
            label="Siguiente turno"
            icon="play-forward"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              next.mutate();
            }}
          />
        ) : (
          <Text variant="caption" center>
            El DM (insomnya) controla los turnos.
          </Text>
        )}
      </View>

      {isAdmin && <AddMonsterModal visible={addOpen} onClose={() => setAddOpen(false)} />}
    </Screen>
  );
}

function ParticipantRow({
  participant,
  active,
  isAdmin,
  isOwner,
  delay,
}: {
  participant: Participant;
  active: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  delay: number;
}) {
  const patch = useTrackerPatch();
  const remove = useTrackerRemove();
  const canEdit = isAdmin || isOwner;
  const isMonster = participant.type === "monster";
  const accent = participant.color || (isMonster ? colors.secondary : colors.accent);
  const [initEditOpen, setInitEditOpen] = useState(false);
  const [hpChange, setHpChange] = useState<"damage" | "heal" | null>(null);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const canSeeHp = participant.hp !== undefined && participant.maxHp !== undefined;

  const changeHp = (amount: number, mode: "damage" | "heal") => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hp = participant.hp || 0;
    const maxHp = participant.maxHp || 0;
    if (mode === "damage") {
      const damage = Math.max(0, amount);
      const tempAbsorb = Math.min(participant.tempHp || 0, damage);
      const nextTempHp = Math.max(0, (participant.tempHp || 0) - tempAbsorb);
      const remainingDamage = damage - tempAbsorb;
      const nextHp = Math.max(0, hp - remainingDamage);
      patch.mutate({ pid: participant._id, hp: nextHp, tempHp: nextTempHp });
      return;
    }
    patch.mutate({ pid: participant._id, hp: Math.max(0, Math.min(maxHp, hp + Math.max(0, amount))) });
  };

  return (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0, scale: active ? 1 : 0.99 }}
      transition={{ type: "timing", duration: 300, delay }}
      style={[styles.pRow, active && { borderColor: accent, borderWidth: 1.5 }, shadow.card]}
    >
      {active && <LinearGradient colors={[accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />}
      <Pressable
        style={styles.initBox}
        disabled={!canEdit}
        onPress={() => setInitEditOpen(true)}
        hitSlop={6}
      >
        <Text style={[styles.initNum, active && { color: accent }]}>{participant.initiative}</Text>
        <Text variant="caption" color={colors.textFaint}>
          init
        </Text>
        {canEdit && <Ionicons name="pencil" size={9} color={colors.textFaint} style={{ marginTop: 2 }} />}
      </Pressable>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name={isMonster ? "skull" : "shield-half"} size={14} color={accent} />
          <Text variant="subtitle" style={{ fontSize: 15 }}>
            {participant.name}
          </Text>
          {active && (
            <View style={[styles.turnPill, { backgroundColor: accent }]}>
              <Text style={{ fontSize: 10, color: colors.bg, fontFamily: font.bodyBold }}>TURNO</Text>
            </View>
          )}
        </View>
        {canSeeHp ? (
          <>
            <View style={{ marginTop: 6 }}>
              <HpBar current={participant.hp || 0} max={participant.maxHp || 1} temp={participant.tempHp || 0} height={10} />
            </View>
            <View style={styles.hpMetaRow}>
              <Text variant="caption">
                {participant.hp}
                {(participant.tempHp || 0) > 0 ? ` + ${participant.tempHp}` : ""}/{participant.maxHp} PV · CA {participant.ac}
              </Text>
              {(participant.tempHp || 0) > 0 && (
                <View style={styles.tempMiniChip}>
                  <Text style={styles.tempMiniText}>Temp {participant.tempHp}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          null
        )}
        <ConditionChips conditions={participant.conditions || []} />
      </View>

      {canEdit && (
        <View style={styles.pActions}>
          <MiniBtn icon="medical" onPress={() => setConditionsOpen(true)} />
          {canSeeHp && (
            <>
              <MiniBtn icon="remove" onPress={() => setHpChange("damage")} />
              <MiniBtn icon="add" onPress={() => setHpChange("heal")} />
            </>
          )}
          {(isAdmin || isOwner) && <MiniBtn icon="close" onPress={() => remove.mutate(participant._id)} danger />}
        </View>
      )}

      <NumberEditorModal
        visible={initEditOpen}
        title="Iniciativa"
        subtitle={`Cambiar la iniciativa de ${participant.name}.`}
        value={participant.initiative}
        min={-5}
        max={40}
        onClose={() => setInitEditOpen(false)}
        onSave={(v) => patch.mutate({ pid: participant._id, initiative: v })}
      />
      <HpChangeModal
        visible={hpChange !== null}
        mode={hpChange || "damage"}
        name={participant.name}
        onClose={() => setHpChange(null)}
        onApply={(n) => {
          changeHp(n, hpChange || "damage");
          setHpChange(null);
        }}
      />
      <ConditionsModal
        visible={conditionsOpen}
        name={participant.name}
        selected={participant.conditions || []}
        onClose={() => setConditionsOpen(false)}
        onChange={(conditions) => patch.mutate({ pid: participant._id, conditions })}
      />
    </MotiView>
  );
}

function ConditionChips({ conditions }: { conditions: string[] }) {
  if (!conditions.length) return null;
  return (
    <View style={styles.conditionRow}>
      {conditions.map((condition) => (
        <View key={condition} style={styles.conditionChip}>
          <Text style={styles.conditionChipText}>{conditionLabel(condition)}</Text>
        </View>
      ))}
    </View>
  );
}

function ConditionsModal({
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <LinearGradient colors={[colors.surfaceAlt, colors.surface]} style={StyleSheet.absoluteFill} />
          <View style={styles.sheetHandle} />
          <Text variant="title">Estados</Text>
          <Text variant="caption" style={{ marginTop: 4, marginBottom: 12 }}>{name}</Text>
          <FlatList
            data={CONDITION_OPTIONS}
            keyExtractor={(condition) => condition.id}
            numColumns={2}
            scrollEnabled
            style={{ maxHeight: 430 }}
            columnWrapperStyle={{ gap: 8 }}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item: condition }) => {
              const active = selected.includes(condition.id);
              return (
                <Pressable
                  onPress={() => toggle(condition.id)}
                  style={[styles.conditionOption, active && styles.conditionOptionActive]}
                >
                  <View style={styles.conditionOptionTitle}>
                    <Ionicons name={active ? "checkbox" : "square-outline"} size={18} color={active ? colors.accent : colors.muted} />
                    <Text style={styles.conditionOptionLabel}>{condition.label}</Text>
                  </View>
                  <Text variant="caption" color={colors.textDim}>{condition.short}</Text>
                </Pressable>
              );
            }}
          />
          <Button label="Listo" icon="checkmark" onPress={onClose} style={{ marginTop: 14 }} />
        </View>
      </View>
    </Modal>
  );
}

function HpChangeModal({
  visible,
  mode,
  name,
  onClose,
  onApply,
}: {
  visible: boolean;
  mode: "damage" | "heal";
  name: string;
  onClose: () => void;
  onApply: (amount: number) => void;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (visible) setValue("");
  }, [visible]);
  const amount = parseInt(value, 10) || 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Card style={{ width: "100%", maxWidth: 320 }}>
          <Text variant="title">{mode === "damage" ? "Hacer daño" : "Curar vida"}</Text>
          <Text variant="caption" style={{ marginTop: 4 }}>{name}</Text>
          <TextInput
            value={value}
            onChangeText={(t) => setValue(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="Cantidad"
            placeholderTextColor={colors.textFaint}
            style={styles.amountInput}
            autoFocus
          />
          <Button
            label={mode === "damage" ? "Aplicar daño" : "Aplicar curación"}
            icon={mode === "damage" ? "remove-circle" : "add-circle"}
            onPress={() => amount > 0 && onApply(amount)}
            disabled={amount <= 0}
          />
        </Card>
      </Pressable>
    </Modal>
  );
}

function AddMonsterModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const add = useTrackerAddMonster();
  const [tab, setTab] = useState<"custom" | "bestiary">("custom");
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");
  const [init, setInit] = useState("");
  const [search, setSearch] = useState("");
  const { data: monsters, isLoading } = useMonsters(search);

  const addCustom = async () => {
    if (!name.trim()) return;
    await add.mutateAsync({
      name: name.trim(),
      hp: Number(hp) || 1,
      ac: Number(ac) || 10,
      initiative: Number(init) || 0,
    });
    setName("");
    setHp("");
    setAc("");
    setInit("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheet}>
          <LinearGradient colors={[colors.surfaceAlt, colors.surface]} style={StyleSheet.absoluteFill} />
          <View style={styles.sheetHandle} />
          <Text variant="title" style={{ marginBottom: 12 }}>
            Agregar bicho
          </Text>

          <View style={styles.tabs}>
            <TabBtn label="Personalizado" active={tab === "custom"} onPress={() => setTab("custom")} />
            <TabBtn label="Bestiario" active={tab === "bestiary"} onPress={() => setTab("bestiary")} />
          </View>

          {tab === "custom" ? (
            <View style={{ gap: 10, marginTop: 14 }}>
              <MiniField placeholder="Nombre (ej. Goblin)" value={name} onChange={setName} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <MiniField placeholder="PV" value={hp} onChange={setHp} numeric flex />
                <MiniField placeholder="CA" value={ac} onChange={setAc} numeric flex />
                <MiniField placeholder="Init" value={init} onChange={setInit} numeric flex />
              </View>
              <Button label="Agregar al combate" icon="add-circle" onPress={addCustom} loading={add.isPending} />
            </View>
          ) : (
            <View style={{ marginTop: 14, maxHeight: 360 }}>
              <MiniField placeholder="Buscar monstruo..." value={search} onChange={setSearch} />
              {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />}
              <FlatList
                data={monsters?.slice(0, 30)}
                keyExtractor={(m) => m._id}
                keyboardShouldPersistTaps="handled"
                style={{ marginTop: 10 }}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.monsterItem}
                    onPress={async () => {
                      await add.mutateAsync({ monsterId: item._id });
                      onClose();
                    }}
                  >
                    <Text variant="subtitle" style={{ fontSize: 14 }}>
                      {item.name}
                    </Text>
                    <Text variant="caption">
                      {item.hp} PV · CA {item.ac} · CR {item.challengeRating}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  !isLoading ? <Text variant="caption" style={{ marginTop: 12 }}>Sin resultados. ¿Importaste el bestiario?</Text> : null
                }
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ---- small pieces ---- */
function SmallControl({ icon, label, onPress, highlight }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; highlight?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.smallControl, highlight && { backgroundColor: colors.primary }]}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text variant="caption" color={colors.textDim}>
        {label}
      </Text>
    </Pressable>
  );
}

function MiniBtn({ icon, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.miniBtn, danger && { backgroundColor: colors.danger + "33" }]}>
      <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.text} />
    </Pressable>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text variant="caption" color={active ? colors.text : colors.textFaint}>
        {label}
      </Text>
    </Pressable>
  );
}

function MiniField({
  placeholder,
  value,
  onChange,
  numeric,
  flex,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  flex?: boolean;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      value={value}
      onChangeText={onChange}
      keyboardType={numeric ? "number-pad" : "default"}
      style={[styles.miniField, flex && { flex: 1 }]}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 14 },
  roundBadge: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  roundNum: { fontFamily: font.display, fontSize: 22, color: colors.accent },
  pRow: {
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
  initBox: { alignItems: "center", width: 42 },
  initNum: { fontFamily: font.display, fontSize: 24, color: colors.text },
  turnPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  hpMetaRow: { marginTop: 3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tempMiniChip: {
    backgroundColor: "#4EA3FF22",
    borderColor: "#4EA3FF66",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tempMiniText: { color: "#8FC5FF", fontFamily: font.bodyBold, fontSize: 11 },
  conditionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  conditionChip: {
    backgroundColor: colors.warning + "22",
    borderColor: colors.warning + "88",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  conditionChipText: { color: colors.warning, fontFamily: font.bodyBold, fontSize: 11 },
  conditionOption: {
    flex: 1,
    minHeight: 78,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 5,
  },
  conditionOptionActive: { borderColor: colors.accent, backgroundColor: colors.primary + "66" },
  conditionOptionTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  conditionOptionLabel: { flex: 1, color: colors.text, fontFamily: font.bodyBold, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  amountInput: {
    marginVertical: 16,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: font.display,
    fontSize: 28,
    textAlign: "center",
    paddingVertical: 10,
  },
  pActions: { gap: 6 },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  controls: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  controlsFade: { position: "absolute", top: -40, left: 0, right: 0, height: 40 },
  adminRow: { flexDirection: "row", gap: 10 },
  smallControl: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 22,
    paddingBottom: 40,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: colors.muted, marginBottom: 16 },
  tabs: { flexDirection: "row", gap: 8, backgroundColor: colors.bg, borderRadius: radius.pill, padding: 4 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill },
  tabBtnActive: { backgroundColor: colors.primary },
  miniField: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: font.body,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monsterItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
});
