import { View, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Section } from "@/components/sheet/Section";
import { CONDITION_OPTIONS } from "@/lib/conditions";
import { CONCENTRATION_INFO } from "@/lib/format";
import { colors, radius } from "@/theme";

const ACTIONS = [
  { name: "Atacar", body: "Hacés un ataque cuerpo a cuerpo o a distancia con un arma o un truco." },
  { name: "Lanzar un hechizo", body: "Usás uno de tus hechizos conocidos, si tenés un espacio de hechizo disponible." },
  { name: "Correr", body: "Duplicás tu velocidad de movimiento este turno." },
  { name: "Esquivar", body: "Te concentrás en esquivar: los ataques contra vos tienen desventaja hasta tu próximo turno." },
  { name: "Ayudar", body: "Ayudás a otro personaje: le das ventaja en su próxima prueba o ataque." },
  { name: "Esconderte", body: "Intentás pasar desapercibido con una tirada de Sigilo." },
  { name: "Preparar una acción", body: "Elegís una acción y una condición para hacerla como reacción más tarde en la ronda." },
  { name: "Interactuar con un objeto", body: "Además de tu acción, podés abrir una puerta, sacar un arma, etc. una vez por turno gratis." },
];

const CONCEPTS = [
  {
    name: "Tirada de salvación",
    body: "Tirada de d20 + tu modificador para resistir un efecto (veneno, hechizo, trampa). La pide el DM cuando algo te afecta de una forma que no es un ataque directo.",
  },
  {
    name: "Tirada de característica",
    body: "Tirada de d20 + el modificador de una característica para intentar algo genérico, sin usar una competencia específica (ej. forzar una puerta con Fuerza).",
  },
  { name: "Clase de Armadura (CA)", body: "Número que el enemigo tiene que igualar o superar en su tirada de ataque para pegarte." },
  {
    name: "Ventaja y desventaja",
    body: "Con ventaja tirás 2d20 y te quedás con el mayor; con desventaja, con el menor. Nunca se suman ambas: se cancelan entre sí.",
  },
  { name: "Competencia", body: "Bono que sumás en las tiradas de las cosas en las que tu personaje es bueno (ciertas habilidades, salvaciones, ataques)." },
  { name: "Espacios de hechizo", body: "Los \"usos\" que tenés para lanzar hechizos de nivel 1 o más. Se gastan al lanzar y se recuperan con un descanso largo." },
  { name: "Concentración", body: CONCENTRATION_INFO.body },
  { name: "Iniciativa", body: "Se tira al empezar un combate (d20 + Destreza) para decidir el orden en que actúa cada uno." },
  {
    name: "Crítico",
    body: "Si sacás un 20 natural en una tirada de ataque, es un golpe crítico: en esta mesa, el daño se tira doble (el doble de dados y el doble del bono).",
  },
];

export default function Glossary() {
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.top}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.text}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        />
        <Text variant="title">Glosario</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text variant="caption" style={{ marginTop: 6, marginBottom: 4 }}>
        Términos y reglas básicas explicados simple, para consultar en plena partida.
      </Text>

      <Section title="Condiciones" icon="medical" defaultOpen>
        <View style={{ gap: 10 }}>
          {CONDITION_OPTIONS.map((c) => (
            <GlossaryEntry key={c.id} name={c.label} body={c.short} />
          ))}
        </View>
      </Section>

      <Section title="Acciones en combate" icon="flash">
        <View style={{ gap: 10 }}>
          {ACTIONS.map((a) => (
            <GlossaryEntry key={a.name} name={a.name} body={a.body} />
          ))}
        </View>
      </Section>

      <Section title="Conceptos" icon="book">
        <View style={{ gap: 10 }}>
          {CONCEPTS.map((c) => (
            <GlossaryEntry key={c.name} name={c.name} body={c.body} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}

function GlossaryEntry({ name, body }: { name: string; body: string }) {
  return (
    <View style={styles.entry}>
      <Text variant="subtitle" style={{ fontSize: 14 }}>
        {name}
      </Text>
      <Text variant="body" style={{ fontSize: 13, marginTop: 2 }}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entry: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
