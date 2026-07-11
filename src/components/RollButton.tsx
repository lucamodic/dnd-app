import { Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { colors, font, radius } from "@/theme";
import { Text } from "./Text";
import { useDice } from "./dice/DiceProvider";

/** Botón "Lanzar 2d8" que dispara el modal de dados global. */
export function RollButton({ notation, label }: { notation: string; label?: string }) {
  const { roll } = useDice();
  return (
    <Pressable onPress={() => roll(notation, label)}>
      {({ pressed }) => (
        <MotiView animate={{ scale: pressed ? 0.94 : 1 }} transition={{ type: "timing", duration: 100 }}>
          <LinearGradient
            colors={[colors.accent, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            <Ionicons name="dice" size={15} color={colors.text} />
            <Text style={styles.label}>Lanzar {notation}</Text>
          </LinearGradient>
        </MotiView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: { fontFamily: font.bodyBold, fontSize: 13, color: colors.text },
});
