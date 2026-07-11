import { ReactNode, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/theme";
import { Text } from "@/components/Text";

interface Props {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

/** Sección colapsable de la ficha, para no abrumar al novato con todo abierto. */
export function Section({ title, icon, children, defaultOpen = false, badge }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.header}>
        <View style={styles.left}>
          <View style={styles.iconBox}>
            <Ionicons name={icon} size={16} color={colors.accent} />
          </View>
          <Text variant="subtitle" style={{ fontSize: 15 }}>
            {title}
          </Text>
          {!!badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textFaint} />
      </Pressable>

      <AnimatePresence>
        {open && (
          <MotiView
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "timing", duration: 200 }}
            style={styles.body}
          >
            {children}
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: "700" },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
});
