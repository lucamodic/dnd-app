import { StyleSheet, View } from "react-native";
import { colors, radius } from "@/theme";

export function SkeletonBlock({ height, width = "100%", round = radius.md, style }: { height: number; width?: number | `${number}%`; round?: number; style?: object }) {
  return <View style={[styles.block, { height, width, borderRadius: round }, style]} />;
}

export function SkeletonCard({ avatar = false }: { avatar?: boolean }) {
  return (
    <View style={styles.card}>
      {avatar && <SkeletonBlock width={54} height={54} round={radius.lg} />}
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock height={16} width="55%" />
        <SkeletonBlock height={12} width="92%" />
        <SkeletonBlock height={12} width="72%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.65,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
});
