import { StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { colors, radius } from "@/theme";

interface Props {
  current: number;
  max: number;
  temp?: number;
  height?: number;
}

/** Barra de vida animada; cambia de color cuando queda poca vida. */
export function HpBar({ current, max, temp = 0, height = 14 }: Props) {
  const safeCurrent = Math.max(0, Math.min(max, current));
  const safeTemp = Math.max(0, temp || 0);
  const total = Math.max(1, max + safeTemp);
  const hpPct = Math.max(0, Math.min(1, safeCurrent / total));
  const tempPct = Math.max(0, Math.min(1 - hpPct, safeTemp / total));
  const healthPct = max > 0 ? Math.max(0, Math.min(1, safeCurrent / max)) : 0;
  const color = healthPct > 0.5 ? colors.success : healthPct > 0.25 ? colors.warning : colors.danger;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <MotiView
        animate={{ width: `${hpPct * 100}%`, backgroundColor: color }}
        transition={{ type: "timing", duration: 450 }}
        style={[styles.fill, { borderTopLeftRadius: height / 2, borderBottomLeftRadius: height / 2 }]}
      />
      {safeTemp > 0 && (
        <MotiView
          animate={{ width: `${tempPct * 100}%` }}
          transition={{ type: "timing", duration: 450 }}
          style={[styles.tempFill, { borderTopRightRadius: height / 2, borderBottomRightRadius: height / 2 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.hpTrack, overflow: "hidden", width: "100%", flexDirection: "row" },
  fill: { height: "100%" },
  tempFill: { height: "100%", backgroundColor: "#4EA3FF" },
});
