import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { colors, font, radius, shadow } from "@/theme";
import { Text } from "./Text";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
  tintColor?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  small,
  tintColor,
}: Props) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const isGhost = variant === "ghost";
  const gradient =
    variant === "primary"
      ? ([tintColor || colors.secondary, colors.primary] as const)
      : ([tintColor ? `${tintColor}44` : colors.surfaceAlt, colors.surface] as const);

  return (
    <Pressable onPress={handlePress} disabled={disabled || loading} style={style}>
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.96 : 1, opacity: disabled ? 0.5 : 1 }}
          transition={{ type: "timing", duration: 120 }}
          style={[!isGhost && shadow.card]}
        >
          <LinearGradient
            colors={isGhost ? (["transparent", "transparent"] as const) : gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.base,
              small && styles.small,
              isGhost && styles.ghost,
              variant === "secondary" && styles.bordered,
              tintColor && variant === "secondary" && { borderColor: `${tintColor}99` },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                {icon && <Ionicons name={icon} size={small ? 16 : 18} color={colors.text} />}
                <Text style={[styles.label, small && styles.labelSmall]}>{label}</Text>
              </>
            )}
          </LinearGradient>
        </MotiView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
  },
  small: { paddingVertical: 9, paddingHorizontal: 14 },
  ghost: { paddingVertical: 8 },
  bordered: { borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: font.bodyBold, fontSize: 15, color: colors.text, letterSpacing: 0.3 },
  labelSmall: { fontSize: 13 },
});
