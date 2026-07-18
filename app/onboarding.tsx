import { useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useAuth } from "@/store/auth";
import { markIntroSeen } from "@/lib/onboarding";
import { colors, radius } from "@/theme";

const { width } = Dimensions.get("window");

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "dice",
    title: "¡Bienvenido a la aventura!",
    body: "D&D es un juego de imaginación con amigos: creás un héroe y vivís historias donde tirás dados para ver qué pasa. No hay que saber nada de antes, se aprende jugando.",
  },
  {
    icon: "people",
    title: "Vos y el DM",
    body: "Uno del grupo es el Director de Juego (DM): narra la historia y maneja a los enemigos. Vos controlás a tu héroe: qué hace, qué dice y cómo pelea.",
  },
  {
    icon: "shield-half",
    title: "Todo está en tu héroe",
    body: "Tocá tu personaje en «Héroes» y ahí adentro tenés todo: vida y stats, mochila, armas y hechizos, notas, el combate y tus dados. Abajo solo quedan Héroes y tu Perfil.",
  },
  {
    icon: "sparkles",
    title: "Listo para jugar",
    body: "Creá tu primer héroe, elegí raza y clase, y te calculamos la vida y todo. Cualquier palabra rara la explicamos tocando el ícono de info.",
  },
];

export default function Onboarding() {
  const user = useAuth((s) => s.user);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    if (user?.username) await markIntroSeen(user.username);
    router.replace("/(tabs)");
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const goNext = () => {
    if (isLast) return finish();
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <Screen scroll={false} padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.skipRow}>
        <Pressable onPress={finish} hitSlop={10}>
          <Text variant="caption" color={colors.textDim}>Saltar</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <MotiView
              from={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 13 }}
              style={styles.iconWrap}
            >
              <Ionicons name={slide.icon} size={56} color={colors.accent} />
            </MotiView>
            <Text variant="title" center style={{ marginTop: 28 }}>{slide.title}</Text>
            <Text variant="body" center style={{ marginTop: 12 }}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button label={isLast ? "Empezar" : "Siguiente"} icon={isLast ? "checkmark" : "arrow-forward"} onPress={goNext} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: { alignItems: "flex-end", paddingHorizontal: 20, paddingTop: 8 },
  slide: { paddingHorizontal: 32, alignItems: "center", justifyContent: "center", flexGrow: 1 },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 18 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 22 },
});
