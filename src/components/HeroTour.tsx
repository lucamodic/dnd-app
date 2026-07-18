import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, radius, shadow } from "@/theme";

export type HeroTab = "main" | "bag" | "combat" | "notes" | "tracker" | "dice";

export interface HeroTourStep {
  /** "top" enfoca la parte de arriba (vida, subir de nivel); si hay `tab`, enfoca esa pestaña. */
  focus: "top" | "tabs";
  tab?: HeroTab;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const STEPS: HeroTourStep[] = [
  { focus: "top", icon: "heart", title: "Tu vida", body: "Arriba de todo está tu vida. Con los botones −5/−1/+1/+5 marcás el daño que recibís o lo que te curás, y podés cargar vida temporal." },
  { focus: "top", icon: "bed", title: "Descansos", body: "En la misma tarjeta tenés Descanso corto (gastás dados de golpe para curarte) y Descanso largo (recuperás vida, hechizos y todo). Se usan cuando el grupo para a descansar." },
  { focus: "top", icon: "trending-up", title: "Subir de nivel y Combatir", body: "Debajo, «Subir de nivel» cuando el DM lo habilita, y «Combatir» para sumarte al combate: tira tu iniciativa y entrás al orden de turnos." },
  { focus: "tabs", tab: "main", icon: "person", title: "Main", body: "Acá están tus stats. Tocá cualquier cuadro (CA, iniciativa, velocidad, cada característica) para leer qué es, y mantenelo apretado para modificarlo (armadura, velocidad, etc.). También podés tocar tu nombre arriba para cambiarlo. Tocá una habilidad o «Salv» para tirarla, y arriba elegís ventaja o desventaja." },
  { focus: "tabs", tab: "bag", icon: "bag", title: "Mochila", body: "Tus monedas y tus objetos. Agregá lo que vayas juntando en la aventura." },
  { focus: "tabs", tab: "combat", icon: "flash", title: "Combate", body: "Tus armas y hechizos. Desde acá atacás y tirás el daño. Si sos lanzador, gestionás tus hechizos y espacios." },
  { focus: "tabs", tab: "notes", icon: "journal", title: "Notas", body: "Anotá lo que pasa: la campaña, los NPCs que conocés y los lugares que visitás." },
  { focus: "tabs", tab: "tracker", icon: "list", title: "Tracker", body: "El combate del grupo y el orden de turnos. Acá te avisa cuándo es TU turno." },
  { focus: "tabs", tab: "dice", icon: "dice", title: "Dados", body: "Un tirador de dados libre, por si el DM te pide una tirada suelta." },
];

/**
 * Mini-tutorial que la primera vez recorre la ficha de arriba abajo: primero la zona de vida/descansos
 * y después cada pestaña interna. En cada paso pide a la ficha que scrollee y cambie de pestaña
 * (`onFocus`) para que se vea lo que se explica. `onDone` cierra y marca visto.
 */
export function HeroTour({
  visible,
  onFocus,
  onDone,
}: {
  visible: boolean;
  onFocus: (step: HeroTourStep) => void;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  // Al cambiar de paso (y al abrir), la ficha scrollea/cambia de pestaña para mostrar lo que se explica.
  useEffect(() => {
    if (visible) onFocus(STEPS[index]);
  }, [index, visible, onFocus]);

  const next = () => {
    if (isLast) return onDone();
    setIndex((i) => i + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.container} pointerEvents="box-none">
        <MotiView
          key={index}
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 220 }}
          style={[styles.card, shadow.glow]}
        >
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={18} color={colors.accent} />
            </View>
            <Text variant="subtitle" style={{ flex: 1 }}>{step.title}</Text>
            <Text variant="caption" color={colors.textFaint}>{index + 1}/{STEPS.length}</Text>
          </View>
          <Text variant="body" style={{ marginTop: 10 }}>{step.body}</Text>
          <View style={styles.footer}>
            <Pressable onPress={onDone} hitSlop={10}>
              <Text variant="caption" color={colors.textDim}>Saltar tutorial</Text>
            </Pressable>
            <View style={{ minWidth: 130 }}>
              <Button label={isLast ? "Entendido" : "Siguiente"} icon={isLast ? "checkmark" : "arrow-forward"} small onPress={next} />
            </View>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end", padding: 16, paddingBottom: 90 },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
});
