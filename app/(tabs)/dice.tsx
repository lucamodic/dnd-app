import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useDice } from "@/components/dice/DiceProvider";
import { colors, font, radius, shadow } from "@/theme";

const DICE = [4, 6, 8, 10, 12, 20, 100];

export default function DiceTab() {
  const { roll } = useDice();
  const [count, setCount] = useState(1);

  return (
    <Screen>
      <Text variant="display">Dados</Text>
      <Text variant="body" style={{ marginTop: 4 }}>
        Elegí cuántos dados y tocá el que quieras tirar.
      </Text>

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
          <DiceButton key={sides} sides={sides} delay={i * 50} onPress={() => roll(`${count}d${sides}`)} />
        ))}
      </View>
    </Screen>
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
  return (
    <Pressable onPress={onPress} style={styles.stepper}>
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
});
