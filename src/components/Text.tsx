import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { colors, font } from "@/theme";

type Variant = "display" | "title" | "subtitle" | "body" | "label" | "caption";

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** Texto con las tipografías del tema (Cinzel para títulos, Inter para el resto). */
export function Text({ variant = "body", color, center, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[styles[variant], color ? { color } : null, center ? { textAlign: "center" } : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: font.display, fontSize: 30, color: colors.text, letterSpacing: 0.5 },
  title: { fontFamily: font.displaySemi, fontSize: 22, color: colors.text, letterSpacing: 0.3 },
  subtitle: { fontFamily: font.bodySemi, fontSize: 16, color: colors.text },
  body: { fontFamily: font.body, fontSize: 15, color: colors.textDim, lineHeight: 22 },
  label: { fontFamily: font.bodySemi, fontSize: 13, color: colors.accent, letterSpacing: 0.5 },
  caption: { fontFamily: font.bodyMedium, fontSize: 12, color: colors.textFaint },
});
