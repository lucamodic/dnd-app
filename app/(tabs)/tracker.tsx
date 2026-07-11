import { useState } from "react";
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
  const isAdmin = user?.role === "admin";
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
              Sumá tu personaje desde su ficha (botón "Sumarme al combate").
              {isAdmin ? " Como admin, agregá bichos con el botón de abajo." : ""}
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

  const changeHp = (delta: number) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    patch.mutate({ pid: participant._id, hp: Math.max(0, Math.min(participant.maxHp, participant.hp + delta)) });
  };

  return (
    <MotiView
      from={{ opacity: 0, translateX: 20 }}
      animate={{ opacity: 1, translateX: 0, scale: active ? 1 : 0.99 }}
      transition={{ type: "timing", duration: 300, delay }}
      style={[styles.pRow, active && { borderColor: accent, borderWidth: 1.5 }, shadow.card]}
    >
      {active && <LinearGradient colors={[accent + "22", "transparent"]} style={StyleSheet.absoluteFill} />}
      <View style={styles.initBox}>
        <Text style={[styles.initNum, active && { color: accent }]}>{participant.initiative}</Text>
        <Text variant="caption" color={colors.textFaint}>
          init
        </Text>
      </View>

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
        <View style={{ marginTop: 6 }}>
          <HpBar current={participant.hp} max={participant.maxHp} height={10} />
        </View>
        <Text variant="caption" style={{ marginTop: 3 }}>
          {participant.hp}/{participant.maxHp} PV · CA {participant.ac}
        </Text>
      </View>

      {canEdit && (
        <View style={styles.pActions}>
          <MiniBtn icon="remove" onPress={() => changeHp(-1)} />
          <MiniBtn icon="add" onPress={() => changeHp(1)} />
          {isAdmin && <MiniBtn icon="close" onPress={() => remove.mutate(participant._id)} danger />}
        </View>
      )}
    </MotiView>
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
