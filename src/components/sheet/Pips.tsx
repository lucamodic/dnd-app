import { Pressable, StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { colors } from "@/theme";

interface Props {
  max: number;
  used: number;
  onChange: (used: number) => void;
  color?: string;
  /** Nombre del recurso para el accessibilityLabel de cada pip (ej. "Furia", "Espacio de nivel 1"). */
  label?: string;
}

/**
 * Fila de "pips" (puntitos) para rastrear un recurso. Los gastados quedan apagados.
 * Tocar un pip lleno lo gasta; tocar uno gastado lo recupera.
 */
export function Pips({ max, used, onChange, color = colors.accent, label = "Punto" }: Props) {
  const handle = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const available = max - used; // pips llenos (a la izquierda)
    // index cuenta desde la izquierda; los primeros `available` están llenos.
    if (index < available) onChange(used + (available - index)); // gasto hasta ese
    else onChange(used - (index - available + 1)); // recupero hasta ese
  };

  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < max - used;
        return (
          <Pressable
            key={i}
            onPress={() => handle(i)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${i + 1} de ${max}, ${filled ? "disponible" : "usado"}`}
          >
            <MotiView
              animate={{
                borderColor: filled ? color : colors.muted,
                scale: filled ? 1 : 0.9,
              }}
              transition={{ type: "timing", duration: 150 }}
              style={styles.pip}
            >
              <MotiView
                animate={{
                  opacity: filled ? 1 : 0,
                  scale: filled ? 1 : 0.3,
                  backgroundColor: color,
                }}
                transition={{ type: "timing", duration: 150 }}
                style={styles.pipFill}
              />
            </MotiView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  pipFill: { width: 12, height: 12, borderRadius: 6 },
});
