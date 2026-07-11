import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { classIconDef } from "@/lib/classIcons";

/** Ícono de símbolo de una clase (hacha, espada, arco...), resolviendo la familia correcta. */
export function ClassIcon({ index, size, color }: { index?: string; size: number; color: string }) {
  const def = classIconDef(index);
  if (def.family === "mdi") return <MaterialCommunityIcons name={def.name} size={size} color={color} />;
  return <Ionicons name={def.name} size={size} color={color} />;
}
