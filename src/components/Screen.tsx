import { ReactNode, RefObject, useEffect, useRef } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View, ScrollView, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

interface Props {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  padded?: boolean;
  scrollViewRef?: RefObject<ScrollView | null>;
}

/** Contenedor base de pantalla: fondo con gradiente sutil + safe area. */
export function Screen({ children, scroll = true, contentStyle, padded = true, scrollViewRef }: Props) {
  const insets = useSafeAreaInsets();
  const internalScrollRef = useRef<ScrollView | null>(null);
  const currentScrollY = useRef(0);
  const restoreScrollY = useRef<number | null>(null);
  const pad = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 };
  const inner: ViewStyle = { ...(padded ? { paddingHorizontal: 20 } : {}), ...contentStyle };

  useEffect(() => {
    if (!scroll) return;
    const capture = () => {
      if (restoreScrollY.current === null) restoreScrollY.current = currentScrollY.current;
    };
    const restore = () => {
      const y = restoreScrollY.current;
      restoreScrollY.current = null;
      if (y === null) return;
      requestAnimationFrame(() => internalScrollRef.current?.scrollTo({ y, animated: true }));
    };
    const showSub = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", capture);
    const hideSub = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", restore);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scroll]);

  const setScrollRef = (node: ScrollView | null) => {
    internalScrollRef.current = node;
    if (scrollViewRef) (scrollViewRef as any).current = node;
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.surface, colors.bg]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {scroll ? (
          <ScrollView
            ref={setScrollRef}
            style={styles.flex}
            contentContainerStyle={[pad, inner]}
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              currentScrollY.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, pad, inner]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
});
