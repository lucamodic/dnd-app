import { ReactNode } from "react";
import { StyleSheet, View, ScrollView, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  padded?: boolean;
}

/** Contenedor base de pantalla: fondo con gradiente sutil + safe area. */
export function Screen({ children, scroll = true, contentStyle, padded = true }: Props) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 };
  const inner: ViewStyle = { ...(padded ? { paddingHorizontal: 20 } : {}), ...contentStyle };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.surface, colors.bg]} style={StyleSheet.absoluteFill} />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[pad, inner]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, pad, inner]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
});
