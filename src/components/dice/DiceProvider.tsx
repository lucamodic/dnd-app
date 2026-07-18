import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, shadow } from "@/theme";
import { Text } from "@/components/Text";
import { parseDice, rollWithMode, RollResult, RollMode } from "@/lib/dice";

export type { RollMode } from "@/lib/dice";

export type RollKind = "attack" | "save" | "skill" | "check" | "damage";

export interface RollOptions {
  mode?: RollMode;
  kind?: RollKind;
  /** Se llama con el resultado apenas se revela, útil para encadenar (ej. daño doblado si el ataque fue crítico). */
  onResolved?: (result: RollResult) => void;
}

export interface RollHistoryEntry {
  id: string;
  label: string;
  notation: string;
  total: number;
  nat20?: boolean;
  nat1?: boolean;
  timestamp: number;
}

interface DiceContextValue {
  /** Tira una notación (ej "2d8") y muestra el modal animado. Con `opts.mode` aplica ventaja/desventaja
   * si la notación es un d20 puro; con `opts.kind` marca el tipo para mostrar el badge de crítico/pifia. */
  roll: (notation: string, label?: string, opts?: RollOptions) => void;
  /** Últimas tiradas (más nueva primero), hasta 30. */
  history: RollHistoryEntry[];
}

const DiceContext = createContext<DiceContextValue | null>(null);

export const useDice = () => {
  const ctx = useContext(DiceContext);
  if (!ctx) throw new Error("useDice debe usarse dentro de <DiceProvider>");
  return ctx;
};

export function DiceProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<RollResult | null>(null);
  const [label, setLabel] = useState<string | undefined>();
  const [history, setHistory] = useState<RollHistoryEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const roll = useCallback((notation: string, lbl?: string, opts?: RollOptions) => {
    const parsed = parseDice(notation);
    if (!parsed) return;
    const mode = opts?.mode ?? "normal";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLabel(lbl || notation);
    setResult(null);
    setRolling(true);
    setVisible(true);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const res = rollWithMode(parsed, mode);
      setResult(res);
      setRolling(false);
      Haptics.notificationAsync(
        res.nat1 ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
      );
      opts?.onResolved?.(res);
      setHistory((h) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            label: lbl || notation,
            notation: res.notation,
            total: res.total,
            nat20: res.nat20,
            nat1: res.nat1,
            timestamp: Date.now(),
          },
          ...h,
        ].slice(0, 30)
      );
    }, 750);
  }, []);

  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  return (
    <DiceContext.Provider value={{ roll, history }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <MotiView
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 14 }}
            style={[styles.sheet, shadow.glow]}
          >
            <LinearGradient colors={[colors.surfaceAlt, colors.surface]} style={StyleSheet.absoluteFill} />
            <Text variant="label" center style={{ marginBottom: 4 }}>
              TIRANDO
            </Text>
            <Text variant="title" center style={{ marginBottom: 18 }}>
              {label}
            </Text>

            <View style={styles.diceRow}>
              {rolling ? (
                <TumblingDice />
              ) : (
                result?.rolls.map((r, i) => (
                  <DieFace key={i} value={r.value} sides={r.sides} delay={i * 70} discarded={r.discarded} />
                ))
              )}
            </View>

            <AnimatePresence>
              {!rolling && result && (
                <MotiView
                  from={{ opacity: 0, translateY: 12 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "timing", duration: 300, delay: 150 }}
                  style={styles.totalWrap}
                >
                  {(result.nat20 || result.nat1) && (
                    <View style={[styles.critBadge, result.nat20 ? styles.critBadgeGood : styles.critBadgeBad]}>
                      <Text style={styles.critBadgeText}>{result.nat20 ? "¡CRÍTICO!" : "PIFIA"}</Text>
                    </View>
                  )}
                  <Text variant="caption" center>
                    {result.rolls.map((r) => (r.discarded ? `(${r.value})` : r.value)).join(" + ")}
                    {result.modifier ? ` ${result.modifier > 0 ? "+" : "−"} ${Math.abs(result.modifier)}` : ""}
                  </Text>
                  <Text style={styles.total}>{result.total}</Text>
                  <Text variant="caption" center>
                    Tocá para cerrar
                  </Text>
                </MotiView>
              )}
            </AnimatePresence>
          </MotiView>
        </Pressable>
      </Modal>
    </DiceContext.Provider>
  );
}

/** Dado individual con la cara revelada, entrada con rebote. Un dado `discarded` (ventaja/desventaja) se ve atenuado. */
function DieFace({ value, sides, delay, discarded }: { value: number; sides: number; delay: number; discarded?: boolean }) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.4, rotate: "-25deg" }}
      animate={{ opacity: discarded ? 0.4 : 1, scale: discarded ? 0.9 : 1, rotate: "0deg" }}
      transition={{ type: "spring", damping: 12, delay }}
      style={styles.die}
    >
      <LinearGradient colors={[colors.secondary, colors.primary]} style={StyleSheet.absoluteFill} />
      <Text style={styles.dieValue}>{value}</Text>
      <Text style={styles.dieSides}>d{sides}</Text>
    </MotiView>
  );
}

/** Animación de dados girando mientras "tira". */
function TumblingDice() {
  return (
    <MotiView
      from={{ rotate: "0deg", scale: 0.9 }}
      animate={{ rotate: "360deg", scale: 1.05 }}
      transition={{ type: "timing", duration: 400, loop: true, repeatReverse: false }}
      style={styles.die}
    >
      <LinearGradient colors={[colors.accent, colors.secondary]} style={StyleSheet.absoluteFill} />
      <Ionicons name="dice" size={40} color={colors.text} />
    </MotiView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    padding: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  diceRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", minHeight: 78 },
  die: {
    width: 66,
    height: 66,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  dieValue: { fontFamily: font.display, fontSize: 26, color: colors.text },
  dieSides: { fontFamily: font.body, fontSize: 10, color: "rgba(255,255,255,0.6)", position: "absolute", bottom: 5 },
  totalWrap: { marginTop: 22, alignItems: "center", gap: 2 },
  total: { fontFamily: font.display, fontSize: 52, color: colors.accent, lineHeight: 58 },
  critBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.pill, marginBottom: 8 },
  critBadgeGood: { backgroundColor: colors.success + "33", borderWidth: 1, borderColor: colors.success },
  critBadgeBad: { backgroundColor: colors.danger + "33", borderWidth: 1, borderColor: colors.danger },
  critBadgeText: { fontFamily: font.bodyBold, fontSize: 13, color: colors.text, letterSpacing: 1 },
});
