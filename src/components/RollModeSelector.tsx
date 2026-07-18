import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { useRollMode } from "@/store/rollMode";
import { RollMode } from "@/lib/dice";
import { colors, font, radius } from "@/theme";

const OPTIONS: { value: RollMode; label: string; color: string }[] = [
  { value: "disadvantage", label: "Desventaja", color: colors.danger },
  { value: "normal", label: "Normal", color: colors.accent },
  { value: "advantage", label: "Ventaja", color: colors.success },
];

/**
 * Selector de modo para las tiradas de la ficha. Al elegir Ventaja/Desventaja, la próxima tirada de
 * d20 (habilidad, salvación, ataque) sale con 2d20; después vuelve solo a Normal.
 */
export function RollModeSelector() {
  const mode = useRollMode((s) => s.mode);
  const setMode = useRollMode((s) => s.setMode);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="dice-outline" size={13} color={colors.textFaint} />
        <Text variant="caption">Modo de tirada (se aplica a la próxima tirada con d20)</Text>
      </View>
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const active = mode === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setMode(o.value)}
              style={[styles.btn, active && { borderColor: o.color, backgroundColor: o.color + "22" }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Modo ${o.label}`}
            >
              <Text style={[styles.btnText, active && { color: colors.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 5 },
  row: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: { fontFamily: font.bodyBold, fontSize: 12, color: colors.textDim },
});
