import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { DiceRoller } from "@/components/dice/DiceRoller";

export default function DiceTab() {
  return (
    <Screen>
      <Text variant="display">Dados</Text>
      <Text variant="body" style={{ marginTop: 4 }}>
        Elegí cuántos dados y tocá el que quieras tirar.
      </Text>

      <DiceRoller />
    </Screen>
  );
}
