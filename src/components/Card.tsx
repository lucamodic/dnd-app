import { ReactNode } from "react";
import { Pressable, StyleSheet, StyleProp, View, ViewStyle } from "react-native";
import { MotiView } from "moti";
import { colors, radius, shadow } from "@/theme";

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  accent?: string;
}

/** Card con entrada animada (fade + subida) y borde de acento opcional. */
export function Card({ children, onPress, style, delay = 0, accent }: Props) {
  const content = (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 350, delay }}
      style={[styles.card, accent ? { borderColor: accent, borderLeftWidth: 4 } : null, shadow.card, style]}
    >
      {children}
    </MotiView>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={{ transform: [{ scale: pressed ? 0.98 : 1 }] }}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
