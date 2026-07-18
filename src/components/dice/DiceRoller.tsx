import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { useDice, RollMode } from "@/components/dice/DiceProvider";
import { formatMod } from "@/lib/format";
import { colors, font, radius, shadow } from "@/theme";

const DICE = [4, 6, 8, 10, 12, 20, 100];

const MODES: { value: RollMode; label: string }[] = [
  { value: "disadvantage", label: "Desventaja" },
  { value: "normal", label: "Normal" },
  { value: "advantage", label: "Ventaja" },
];

/** Tirador libre reutilizable: grid de dados + modo ventaja/desventaja + bono + log de tiradas. */
export function DiceRoller() {
  const { roll, history } = useDice();
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<RollMode>("normal");
  const [modifier, setModifier] = useState("0");
  const [historyOpen, setHistoryOpen] = useState(false);

  const modNumber = parseInt(modifier, 10) || 0;

  const rollWithBonus = () => {
    roll(`1d20${formatMod(modNumber)}`, "Tirada con tu bono", { mode, kind: "check" });
  };

  return (
    <View>
      <View style={styles.counter}>
        <Text variant="label">CANTIDAD</Text>
        <View style={styles.counterControls}>
          <Stepper icon="remove" onPress={() => setCount((c) => Math.max(1, c - 1))} />
          <Text style={styles.count}>{count}</Text>
          <Stepper icon="add" onPress={() => setCount((c) => Math.min(20, c + 1))} />
        </View>
      </View>

      <View style={styles.grid}>
        {DICE.map((sides, i) => (
          <DiceButton
            key={sides}
            sides={sides}
            delay={i * 50}
            onPress={() =>
              roll(`${count}d${sides}`, undefined, sides === 20 && count === 1 ? { mode, kind: "check" } : undefined)
            }
          />
        ))}
      </View>

      <Text variant="label" style={{ marginTop: 24, marginBottom: 10 }}>
        MODO (aplica a tiradas de 1d20)
      </Text>
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.value}
            onPress={() => setMode(m.value)}
            style={[styles.modeBtn, mode === m.value && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, mode === m.value && styles.modeBtnTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text variant="label" style={{ marginTop: 24, marginBottom: 10 }}>
        TIRÁ CON TU BONO
      </Text>
      <View style={styles.bonusRow}>
        <TextInput
          value={modifier}
          onChangeText={(t) => setModifier(t.replace(/[^0-9-]/g, ""))}
          keyboardType="numbers-and-punctuation"
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          style={styles.bonusInput}
        />
        <Pressable onPress={rollWithBonus} style={styles.bonusBtn}>
          <Ionicons name="dice" size={18} color={colors.text} />
          <Text style={styles.bonusBtnText}>Tirar 1d20{formatMod(modNumber)}</Text>
        </Pressable>
      </View>

      {history.length > 0 && (
        <>
          <Pressable onPress={() => setHistoryOpen((o) => !o)} style={styles.historyHeader}>
            <Text variant="label">ÚLTIMAS TIRADAS ({history.length})</Text>
            <Ionicons name={historyOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.textFaint} />
          </Pressable>
          {historyOpen && (
            <View style={styles.historyList}>
              {history.map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <Text variant="body" style={{ flex: 1, fontSize: 13 }} numberOfLines={1}>
                    {entry.label}
                  </Text>
                  <Text variant="caption" color={colors.textFaint} style={{ marginRight: 8 }}>
                    {entry.notation}
                  </Text>
                  <Text
                    style={[
                      styles.historyTotal,
                      entry.nat20 && { color: colors.success },
                      entry.nat1 && { color: colors.danger },
                    ]}
                  >
                    {entry.total}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function DiceButton({ sides, onPress, delay }: { sides: number; onPress: () => void; delay: number }) {
  return (
    <Pressable onPress={onPress} style={styles.diceWrap}>
      {({ pressed }) => (
        <MotiView
          from={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: pressed ? 0.92 : 1 }}
          transition={{ type: "spring", damping: 13, delay }}
          style={[styles.dice, shadow.card]}
        >
          <LinearGradient colors={[colors.surfaceAlt, colors.surface]} style={StyleSheet.absoluteFill} />
          <Ionicons name="dice-outline" size={22} color={colors.accent} />
          <Text style={styles.diceLabel}>d{sides}</Text>
        </MotiView>
      )}
    </Pressable>
  );
}

function Stepper({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const label = icon === "add" ? "Sumar un dado" : "Restar un dado";
  return (
    <Pressable onPress={onPress} style={styles.stepper} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  counter: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterControls: { flexDirection: "row", alignItems: "center", gap: 18 },
  count: { fontFamily: font.display, fontSize: 28, color: colors.text, minWidth: 34, textAlign: "center" },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 24, justifyContent: "space-between" },
  diceWrap: { width: "30%" },
  dice: {
    aspectRatio: 1,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  diceLabel: { fontFamily: font.display, fontSize: 22, color: colors.text },
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.accent },
  modeBtnText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.textDim },
  modeBtnTextActive: { color: colors.text },
  bonusRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  bonusInput: {
    width: 64,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: font.display,
    fontSize: 18,
    textAlign: "center",
    paddingVertical: 8,
  },
  bonusBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  bonusBtnText: { fontFamily: font.bodyBold, fontSize: 14, color: colors.text },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 10 },
  historyList: { gap: 2 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyTotal: { fontFamily: font.display, fontSize: 16, color: colors.text, minWidth: 30, textAlign: "right" },
});
