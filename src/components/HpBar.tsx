import { StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { colors, radius } from "@/theme";

interface Props {
  current: number;
  max: number;
  height?: number;
}

/** Barra de vida animada; cambia de color cuando queda poca vida. */
export function HpBar({ current, max, height = 14 }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const color = pct > 0.5 ? colors.success : pct > 0.25 ? colors.warning : colors.danger;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <MotiView
        animate={{ width: `${pct * 100}%`, backgroundColor: color }}
        transition={{ type: "timing", duration: 450 }}
        style={[styles.fill, { borderRadius: height / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.hpTrack, overflow: "hidden", width: "100%" },
  fill: { height: "100%" },
});
